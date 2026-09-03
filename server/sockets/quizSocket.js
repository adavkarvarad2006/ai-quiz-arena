import Quiz from "../models/Quiz.js";
import LiveRoom from "../models/LiveRoom.js";
import {
  getRoom,
  startQuestion,
  recordAnswer,
  resetAnsweredFlags,
} from "./roomState.js";
import { calculatePoints } from "../utils/liveScoring.js";
import { computeRoomAnalytics } from "../utils/computeRoomAnalytics.js";

const questionTimers = new Map();

const clearRoomTimer = (roomCode) => {
  const timer = questionTimers.get(roomCode);

  if (timer) {
    clearTimeout(timer);
    questionTimers.delete(roomCode);
  }
};

// --------------------------------------------------
// SEND QUESTION
// --------------------------------------------------

const sendQuestion = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) {
    console.log("sendQuestion: room not found:", roomCode);
    return;
  }

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    console.error("sendQuestion: quiz not found:", room.quizId);
    return;
  }

  const index = room.currentQuestionIndex;
  const question = quiz.questions[index];

  if (!question) {
    await endQuiz(io, roomCode);
    return;
  }

  startQuestion(roomCode, index, question.timeLimit);
  resetAnsweredFlags(roomCode);

  console.log(
    `Sending question ${index + 1}/${quiz.questions.length} to room ${roomCode}`
  );

  io.to(roomCode).emit("new-question", {
    questionIndex: index,
    totalQuestions: quiz.questions.length,
    question: question.question,
    options: question.options,
    timeLimit: question.timeLimit,
    questionEndsAt: room.questionEndsAt,
  });

  clearRoomTimer(roomCode);

  const timer = setTimeout(() => {
    endQuestion(io, roomCode);
  }, question.timeLimit * 1000);

  questionTimers.set(roomCode, timer);
};

// --------------------------------------------------
// END CURRENT QUESTION
// --------------------------------------------------

const endQuestion = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) {
    console.log("endQuestion: room not found:", roomCode);
    return;
  }

  clearRoomTimer(roomCode);

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    console.error("endQuestion: quiz not found:", room.quizId);
    return;
  }

  const question = quiz.questions[room.currentQuestionIndex];

  if (!question) {
    return;
  }

  const sortedPlayers = [...room.players]
    .filter((p) => !p.isHost)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const previousRanking = room.previousRanking || [];

  const leaderboard = sortedPlayers.map((p, index) => {
    const prevIndex = previousRanking.indexOf(p.userId);

    let trend = "same";

    if (prevIndex === -1) {
      trend = "new";
    } else if (prevIndex > index) {
      trend = "up";
    } else if (prevIndex < index) {
      trend = "down";
    }

    return {
      userId: p.userId,
      name: p.name,
      score: p.score || 0,
      rank: index + 1,
      trend,
    };
  });

  room.previousRanking = sortedPlayers.map((p) => p.userId);

  console.log("Question ended:", room.currentQuestionIndex + 1);

  io.to(roomCode).emit("question-ended", {
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    leaderboard,
  });
};

// --------------------------------------------------
// END QUIZ
// --------------------------------------------------

const endQuiz = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) {
    console.log("endQuiz: room not found:", roomCode);
    return;
  }

  clearRoomTimer(roomCode);

  room.status = "FINISHED";

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    console.error("endQuiz: quiz not found:", room.quizId);
    return;
  }

  const sortedPlayers = [...room.players]
    .filter((p) => !p.isHost)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const previousRanking = room.previousRanking || [];

  const finalLeaderboard = sortedPlayers.map((p, index) => {
    const prevIndex = previousRanking.indexOf(p.userId);

    let trend = "same";

    if (prevIndex === -1) {
      trend = "new";
    } else if (prevIndex > index) {
      trend = "up";
    } else if (prevIndex < index) {
      trend = "down";
    }

    return {
      userId: p.userId,
      name: p.name,
      score: p.score || 0,
      rank: index + 1,
      trend,
    };
  });

  const { questionStats, participants } = computeRoomAnalytics(room, quiz);

  // Send result to players
  sortedPlayers.forEach((player, index) => {
    const myStats = participants.find(
      (p) => String(p.userId) === String(player.userId)
    );

    io.to(player.socketId).emit("quiz-finished", {
      leaderboard: finalLeaderboard,

      myResult: myStats
        ? {
            ...myStats,
            rank: index + 1,
            totalQuestions: quiz.questions.length,
            accuracy:
              quiz.questions.length > 0
                ? Math.round(
                    (myStats.correctAnswers / quiz.questions.length) * 100
                  )
                : 0,
          }
        : null,
    });
  });

  // Send result to host
  const hostPlayer = room.players.find((p) => p.isHost);

  if (hostPlayer) {
    io.to(hostPlayer.socketId).emit("quiz-finished", {
      leaderboard: finalLeaderboard,
    });
  }

  try {
    await LiveRoom.findOneAndUpdate(
      { roomCode },
      {
        status: "FINISHED",
        endedAt: new Date(),
        participants,
        questionStats,
      }
    );

    console.log("Quiz finished and saved:", roomCode);
  } catch (err) {
    console.error("Failed to persist finished room:", err);
  }
};

// --------------------------------------------------
// SOCKET INITIALIZATION
// --------------------------------------------------

export const initQuizSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ==================================================
    // JOIN ROOM
    // ==================================================

    socket.on(
      "join-room",
      ({ roomCode, name, userId, isHost }) => {
        console.log("JOIN ROOM:", {
          socketId: socket.id,
          roomCode,
          userId,
          isHost,
        });

        const room = getRoom(roomCode);

        if (!room) {
          socket.emit("room-error", {
            message:
              "Room not found. Check the code and try again.",
          });

          return;
        }

        const existingPlayer = room.players.find(
          (p) => String(p.userId) === String(userId)
        );

        // Player cannot join a finished quiz unless already part
        // of the room.
        if (room.status === "FINISHED" && !existingPlayer) {
          socket.emit("room-error", {
            message: "This quiz has already finished.",
          });

          return;
        }

        // Player cannot join a quiz already in progress
        // unless they are reconnecting.
        if (room.status === "IN_PROGRESS" && !existingPlayer) {
          socket.emit("room-error", {
            message:
              "This quiz is already in progress. You can't join mid-game.",
          });

          return;
        }

        // ----------------------------------------------
        // Existing player / reconnect
        // ----------------------------------------------

        if (existingPlayer) {
          existingPlayer.socketId = socket.id;
          existingPlayer.connected = true;

          // Update host status if this is the host
          if (isHost) {
            existingPlayer.isHost = true;
          }

          console.log(
            "Existing player reconnected:",
            existingPlayer.name
          );
        } else {
          // --------------------------------------------
          // New player
          // --------------------------------------------

          room.players.push({
            socketId: socket.id,
            userId,
            name,
            isHost: !!isHost,
            score: 0,
            answered: false,
            connected: true,
          });

          console.log(
            "New player joined:",
            name,
            "Host:",
            !!isHost
          );
        }

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.userId = userId;
        socket.data.isHost = !!isHost;

        console.log(
          `Socket ${socket.id} joined room ${roomCode}`
        );

        io.to(roomCode).emit("player-joined", room.players);

        // ----------------------------------------------
        // Host reconnect
        // ----------------------------------------------

        if (isHost && room.status === "PAUSED") {
          room.status = "IN_PROGRESS";

          io.to(roomCode).emit("host-reconnected");

          // Send current question again
          awaitSendCurrentQuestion(io, roomCode);
        }

        // ----------------------------------------------
        // Send current state to newly joined socket
        // ----------------------------------------------

        if (
          room.status === "IN_PROGRESS" &&
          room.currentQuestionIndex >= 0
        ) {
          awaitSendCurrentQuestion(io, roomCode, socket);
        }
      }
    );

    // ==================================================
    // GET ROOM STATE
    // ==================================================

    socket.on("get-room-state", async ({ roomCode }) => {
      console.log("GET ROOM STATE:", {
        roomCode,
        socketId: socket.id,
      });

      const room = getRoom(roomCode);

      if (!room) {
        socket.emit("room-error", {
          message: "Room not found",
        });

        return;
      }

      if (
        room.status !== "IN_PROGRESS" ||
        room.currentQuestionIndex < 0
      ) {
        console.log("Room has no active question:", {
          status: room.status,
          currentQuestionIndex: room.currentQuestionIndex,
        });

        socket.emit("room-state", {
          status: room.status,
          question: null,
        });

        return;
      }

      const quiz = await Quiz.findById(room.quizId);

      if (!quiz) {
        socket.emit("room-error", {
          message: "Quiz not found",
        });

        return;
      }

      const question =
        quiz.questions[room.currentQuestionIndex];

      if (!question) {
        socket.emit("room-state", {
          status: room.status,
          question: null,
        });

        return;
      }

      console.log(
        "Sending room state. Question:",
        room.currentQuestionIndex + 1
      );

      socket.emit("room-state", {
        status: room.status,

        question: {
          questionIndex: room.currentQuestionIndex,
          totalQuestions: quiz.questions.length,
          question: question.question,
          options: question.options,
          timeLimit: question.timeLimit,
          questionEndsAt: room.questionEndsAt,
        },
      });
    });

    // ==================================================
    // START QUIZ
    // ==================================================

    socket.on("start-quiz", async ({ roomCode }) => {
      console.log("START QUIZ:", {
        roomCode,
        socketId: socket.id,
        userId: socket.data.userId,
      });

      const room = getRoom(roomCode);

      if (!room) {
        socket.emit("room-error", {
          message: "Room not found",
        });

        return;
      }

      // IMPORTANT:
      // Convert both IDs to strings before comparison.
      if (
        String(room.hostId) !==
        String(socket.data.userId)
      ) {
        console.log("START QUIZ REJECTED");
        console.log("room.hostId:", room.hostId);
        console.log("socket userId:", socket.data.userId);

        socket.emit("room-error", {
          message: "Only the host can start the quiz",
        });

        return;
      }

      room.status = "IN_PROGRESS";
      room.currentQuestionIndex = 0;
      room.previousRanking = [];

      io.to(roomCode).emit("quiz-started");

      await sendQuestion(io, roomCode);
    });

    // ==================================================
    // SUBMIT ANSWER
    // ==================================================

    socket.on(
      "submit-answer",
      async ({
        roomCode,
        questionIndex,
        selectedAnswer,
      }) => {
        const room = getRoom(roomCode);

        if (!room) {
          return;
        }

        const userId = socket.data.userId;

        if (
          room.currentQuestionIndex !== questionIndex
        ) {
          return;
        }

        if (room.answers[questionIndex]?.[userId]) {
          return;
        }

        if (Date.now() > room.questionEndsAt) {
          return;
        }

        const quiz = await Quiz.findById(room.quizId);

        if (!quiz) {
          return;
        }

        const question =
          quiz.questions[questionIndex];

        const correct =
          selectedAnswer === question.correctAnswer;

        const timeTaken =
          (Date.now() - room.questionStartedAt) /
          1000;

        const points = calculatePoints(
          correct,
          timeTaken,
          question.timeLimit
        );

        recordAnswer(
          roomCode,
          questionIndex,
          userId,
          selectedAnswer,
          timeTaken,
          correct,
          points
        );

        socket.emit("answer-received", {
          correct,
          points,
        });

        const nonHostPlayers = room.players.filter(
          (p) => !p.isHost
        );

        const answeredCount = Object.keys(
          room.answers[questionIndex] || {}
        ).length;

        io.to(roomCode).emit("answer-progress", {
          answered: answeredCount,
          total: nonHostPlayers.length,
        });

        // If all players answered, end question
        if (
          nonHostPlayers.length > 0 &&
          answeredCount >= nonHostPlayers.length
        ) {
          await endQuestion(io, roomCode);
        }
      }
    );

    // ==================================================
    // NEXT QUESTION
    // ==================================================

    socket.on("next-question", async ({ roomCode }) => {
      console.log("NEXT QUESTION REQUEST:", {
        roomCode,
        socketId: socket.id,
        userId: socket.data.userId,
      });

      const room = getRoom(roomCode);

      if (!room) {
        socket.emit("room-error", {
          message: "Room not found",
        });

        return;
      }

      // IMPORTANT:
      // Convert IDs to strings before comparison.
      if (
        String(room.hostId) !==
        String(socket.data.userId)
      ) {
        console.log("NEXT QUESTION REJECTED");
        console.log("room.hostId:", room.hostId);
        console.log(
          "socket userId:",
          socket.data.userId
        );

        socket.emit("room-error", {
          message:
            "Only the host can move to the next question.",
        });

        return;
      }

      if (room.status !== "IN_PROGRESS") {
        socket.emit("room-error", {
          message:
            "Quiz is not currently in progress.",
        });

        return;
      }

      room.currentQuestionIndex += 1;

      console.log(
        "Moving to question:",
        room.currentQuestionIndex + 1
      );

      await sendQuestion(io, roomCode);
    });

    // ==================================================
    // END QUIZ
    // ==================================================

    socket.on("end-quiz", async ({ roomCode }) => {
      console.log("END QUIZ REQUEST:", {
        roomCode,
        socketId: socket.id,
        userId: socket.data.userId,
      });

      const room = getRoom(roomCode);

      if (!room) {
        socket.emit("room-error", {
          message: "Room not found",
        });

        return;
      }

      // IMPORTANT:
      // Convert IDs to strings before comparison.
      if (
        String(room.hostId) !==
        String(socket.data.userId)
      ) {
        console.log("END QUIZ REJECTED");
        console.log("room.hostId:", room.hostId);
        console.log(
          "socket userId:",
          socket.data.userId
        );

        socket.emit("room-error", {
          message:
            "Only the host can end the quiz.",
        });

        return;
      }

      await endQuiz(io, roomCode);
    });

    // ==================================================
    // DISCONNECT
    // ==================================================

    socket.on("disconnect", () => {
      console.log(
        "Socket disconnected:",
        socket.id
      );

      const roomCode = socket.data.roomCode;

      if (!roomCode) {
        return;
      }

      const room = getRoom(roomCode);

      if (!room) {
        return;
      }

      const player = room.players.find(
        (p) => p.socketId === socket.id
      );

      if (player) {
        player.connected = false;
      }

      // Remove waiting-room players completely
      if (room.status === "WAITING") {
        room.players = room.players.filter(
          (p) => p.socketId !== socket.id
        );
      }

      io.to(roomCode).emit(
        "player-joined",
        room.players
      );

      // Pause quiz if host disconnects
      if (
        player?.isHost &&
        room.status === "IN_PROGRESS"
      ) {
        room.status = "PAUSED";

        clearRoomTimer(roomCode);

        io.to(roomCode).emit(
          "host-disconnected"
        );
      }
    });
  });
};

// --------------------------------------------------
// SEND CURRENT QUESTION TO A SOCKET OR WHOLE ROOM
// --------------------------------------------------

const awaitSendCurrentQuestion = async (
  io,
  roomCode,
  targetSocket = null
) => {
  const room = getRoom(roomCode);

  if (!room) {
    return;
  }

  if (
    room.status !== "IN_PROGRESS" ||
    room.currentQuestionIndex < 0
  ) {
    return;
  }

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    return;
  }

  const question =
    quiz.questions[room.currentQuestionIndex];

  if (!question) {
    return;
  }

  const data = {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: quiz.questions.length,
    question: question.question,
    options: question.options,
    timeLimit: question.timeLimit,
    questionEndsAt: room.questionEndsAt,
  };

  if (targetSocket) {
    targetSocket.emit("room-state", {
      status: room.status,
      question: data,
    });
  } else {
    io.to(roomCode).emit("room-state", {
      status: room.status,
      question: data,
    });
  }
};