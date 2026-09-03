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

const sendQuestion = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) return;

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    console.error(`Quiz not found for room ${roomCode}`);
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

const endQuestion = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) return;

  clearRoomTimer(roomCode);

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    console.error(`Quiz not found while ending question for ${roomCode}`);
    return;
  }

  const question = quiz.questions[room.currentQuestionIndex];

  if (!question) return;

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

  io.to(roomCode).emit("question-ended", {
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    leaderboard,
  });
};

const endQuiz = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) return;

  // Prevent endQuiz from running multiple times
  if (room.status === "FINISHED") {
    console.log(`Quiz ${roomCode} is already finished.`);
    return;
  }

  clearRoomTimer(roomCode);

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) {
    console.error(`Quiz not found while ending room ${roomCode}`);
    return;
  }

  // Mark in-memory room as finished
  room.status = "FINISHED";

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

  room.previousRanking = sortedPlayers.map((p) => p.userId);

  const { questionStats, participants } = computeRoomAnalytics(room, quiz);

  /*
   * IMPORTANT:
   *
   * Save the finished state to MongoDB BEFORE notifying
   * the frontend that the quiz has finished.
   *
   * Otherwise the frontend can click "View Analytics"
   * before MongoDB has been updated.
   */
  try {
    await LiveRoom.findOneAndUpdate(
      { roomCode },
      {
        status: "FINISHED",
        endedAt: new Date(),
        participants,
        questionStats,
      },
      {
        new: true,
      }
    );

    console.log(`Room ${roomCode} successfully saved as FINISHED.`);
  } catch (err) {
    console.error("Failed to persist finished room:", err);

    /*
     * Do NOT tell the frontend that the quiz finished if
     * we couldn't save the final analytics.
     *
     * This prevents the user from immediately opening
     * analytics while the database is in an inconsistent state.
     */
    return;
  }

  /*
   * MongoDB is now updated.
   *
   * Only after this point do we notify players and host.
   */

  sortedPlayers.forEach((player, index) => {
    const myStats = participants.find(
      (p) => p.userId === player.userId
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
                    (myStats.correctAnswers /
                      quiz.questions.length) *
                      100
                  )
                : 0,
          }
        : null,
    });
  });

  const hostPlayer = room.players.find((p) => p.isHost);

  if (hostPlayer) {
    io.to(hostPlayer.socketId).emit("quiz-finished", {
      leaderboard: finalLeaderboard,
    });
  }

  console.log(`Quiz ${roomCode} finished successfully.`);
};

export const initQuizSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on(
      "join-room",
      ({ roomCode, name, userId, isHost }) => {
        const room = getRoom(roomCode);

        if (!room) {
          socket.emit("room-error", {
            message:
              "Room not found. Check the code and try again.",
          });
          return;
        }

        const existingPlayer = room.players.find(
          (p) => p.userId === userId
        );

        if (room.status === "FINISHED" && !existingPlayer) {
          socket.emit("room-error", {
            message: "This quiz has already finished.",
          });
          return;
        }

        if (room.status === "IN_PROGRESS" && !existingPlayer) {
          socket.emit("room-error", {
            message:
              "This quiz is already in progress. You can't join mid-game.",
          });
          return;
        }

        if (existingPlayer) {
          existingPlayer.socketId = socket.id;
          existingPlayer.connected = true;

          // Make sure the host flag remains correct
          if (isHost) {
            existingPlayer.isHost = true;
          }
        } else {
          room.players.push({
            socketId: socket.id,
            userId,
            name,
            isHost: !!isHost,
            score: 0,
            answered: false,
            connected: true,
          });
        }

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.userId = userId;
        socket.data.isHost = !!isHost;

        io.to(roomCode).emit(
          "player-joined",
          room.players
        );

        if (isHost && room.status === "PAUSED") {
          room.status = "IN_PROGRESS";

          io.to(roomCode).emit(
            "host-reconnected"
          );
        }
      }
    );

    socket.on(
      "get-room-state",
      async ({ roomCode }) => {
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

        socket.emit("room-state", {
          status: room.status,
          question: {
            questionIndex:
              room.currentQuestionIndex,
            totalQuestions:
              quiz.questions.length,
            question: question.question,
            options: question.options,
            timeLimit: question.timeLimit,
            questionEndsAt:
              room.questionEndsAt,
          },
        });
      }
    );

    socket.on(
      "start-quiz",
      async ({ roomCode }) => {
        const room = getRoom(roomCode);

        if (!room) return;

        if (room.hostId !== socket.data.userId) {
          socket.emit("room-error", {
            message:
              "Only the host can start the quiz",
          });
          return;
        }

        room.status = "IN_PROGRESS";
        room.currentQuestionIndex = 0;
        room.previousRanking = [];

        io.to(roomCode).emit("quiz-started");

        await sendQuestion(io, roomCode);
      }
    );

    socket.on(
      "submit-answer",
      async ({
        roomCode,
        questionIndex,
        selectedAnswer,
      }) => {
        const room = getRoom(roomCode);

        if (!room) return;

        const userId = socket.data.userId;

        if (
          room.currentQuestionIndex !==
          questionIndex
        ) {
          return;
        }

        if (
          room.answers[questionIndex]?.[userId]
        ) {
          return;
        }

        if (
          Date.now() > room.questionEndsAt
        ) {
          return;
        }

        const quiz = await Quiz.findById(
          room.quizId
        );

        if (!quiz) return;

        const question =
          quiz.questions[questionIndex];

        if (!question) return;

        const correct =
          selectedAnswer ===
          question.correctAnswer;

        const timeTaken =
          (Date.now() -
            room.questionStartedAt) /
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

        const nonHostPlayers =
          room.players.filter(
            (p) => !p.isHost
          );

        const answeredCount = Object.keys(
          room.answers[questionIndex] || {}
        ).length;

        io.to(roomCode).emit(
          "answer-progress",
          {
            answered: answeredCount,
            total: nonHostPlayers.length,
          }
        );

        if (
          nonHostPlayers.length > 0 &&
          answeredCount >=
            nonHostPlayers.length
        ) {
          await endQuestion(
            io,
            roomCode
          );
        }
      }
    );

    socket.on(
      "next-question",
      async ({ roomCode }) => {
        const room = getRoom(roomCode);

        if (!room) return;

        if (
          room.hostId !== socket.data.userId
        ) {
          console.log(
            "NEXT QUESTION REJECTED: not host"
          );
          return;
        }

        if (room.status !== "IN_PROGRESS") {
          console.log(
            `NEXT QUESTION REJECTED: room status is ${room.status}`
          );
          return;
        }

        room.currentQuestionIndex += 1;

        console.log(
          `Moving to question ${room.currentQuestionIndex + 1}`
        );

        await sendQuestion(
          io,
          roomCode
        );
      }
    );

    socket.on(
      "end-quiz",
      async ({ roomCode }) => {
        const room = getRoom(roomCode);

        if (!room) return;

        if (
          room.hostId !== socket.data.userId
        ) {
          console.log(
            "END QUIZ REJECTED: not host"
          );
          return;
        }

        console.log(
          `Ending quiz ${roomCode}`
        );

        await endQuiz(
          io,
          roomCode
        );
      }
    );

    socket.on("disconnect", () => {
      const roomCode =
        socket.data.roomCode;

      if (!roomCode) return;

      const room = getRoom(roomCode);

      if (!room) return;

      const player = room.players.find(
        (p) => p.socketId === socket.id
      );

      if (player) {
        player.connected = false;
      }

      if (room.status === "WAITING") {
        room.players =
          room.players.filter(
            (p) =>
              p.socketId !== socket.id
          );
      }

      io.to(roomCode).emit(
        "player-joined",
        room.players
      );

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