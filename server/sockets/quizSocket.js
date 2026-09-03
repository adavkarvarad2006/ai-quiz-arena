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
  const index = room.currentQuestionIndex;
  const question = quiz.questions[index];

  if (!question) {
    return endQuiz(io, roomCode);
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
  const question = quiz.questions[room.currentQuestionIndex];

  const sortedPlayers = [...room.players]
    .filter((p) => !p.isHost)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const previousRanking = room.previousRanking || [];

  const leaderboard = sortedPlayers.map((p, index) => {
    const prevIndex = previousRanking.indexOf(p.userId);
    let trend = "same";
    if (prevIndex === -1) trend = "new";
    else if (prevIndex > index) trend = "up";
    else if (prevIndex < index) trend = "down";

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

  clearRoomTimer(roomCode);
  room.status = "FINISHED";

  const quiz = await Quiz.findById(room.quizId);

  const sortedPlayers = [...room.players]
    .filter((p) => !p.isHost)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const previousRanking = room.previousRanking || [];

  const finalLeaderboard = sortedPlayers.map((p, index) => {
    const prevIndex = previousRanking.indexOf(p.userId);
    let trend = "same";
    if (prevIndex === -1) trend = "new";
    else if (prevIndex > index) trend = "up";
    else if (prevIndex < index) trend = "down";

    return {
      userId: p.userId,
      name: p.name,
      score: p.score || 0,
      rank: index + 1,
      trend,
    };
  });

  const { questionStats, participants } = computeRoomAnalytics(room, quiz);

  sortedPlayers.forEach((player, index) => {
    const myStats = participants.find((p) => p.userId === player.userId);
    io.to(player.socketId).emit("quiz-finished", {
      leaderboard: finalLeaderboard,
      myResult: myStats
        ? {
            ...myStats,
            rank: index + 1,
            totalQuestions: quiz.questions.length,
            accuracy:
              quiz.questions.length > 0
                ? Math.round((myStats.correctAnswers / quiz.questions.length) * 100)
                : 0,
          }
        : null,
    });
  });

  const hostPlayer = room.players.find((p) => p.isHost);
  if (hostPlayer) {
    io.to(hostPlayer.socketId).emit("quiz-finished", { leaderboard: finalLeaderboard });
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
  } catch (err) {
    console.error("Failed to persist finished room:", err);
  }
};

export const initQuizSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomCode, name, userId, isHost }) => {
      const room = getRoom(roomCode);

      if (!room) {
        socket.emit("room-error", { message: "Room not found. Check the code and try again." });
        return;
      }

      const existingPlayer = room.players.find((p) => p.userId === userId);

      if (room.status === "FINISHED" && !existingPlayer) {
        socket.emit("room-error", { message: "This quiz has already finished." });
        return;
      }

      if (room.status === "IN_PROGRESS" && !existingPlayer) {
        socket.emit("room-error", { message: "This quiz is already in progress. You can't join mid-game." });
        return;
      }

      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true;
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

      io.to(roomCode).emit("player-joined", room.players);

      if (isHost && room.status === "PAUSED") {
        room.status = "IN_PROGRESS";
        io.to(roomCode).emit("host-reconnected");
      }
    });

    socket.on("get-room-state", async ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) {
        socket.emit("room-error", { message: "Room not found" });
        return;
      }

      if (room.status !== "IN_PROGRESS" || room.currentQuestionIndex < 0) {
        socket.emit("room-state", { status: room.status, question: null });
        return;
      }

      const quiz = await Quiz.findById(room.quizId);
      const question = quiz.questions[room.currentQuestionIndex];

      if (!question) {
        socket.emit("room-state", { status: room.status, question: null });
        return;
      }

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

    socket.on("start-quiz", async ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.data.userId) {
        socket.emit("room-error", { message: "Only the host can start the quiz" });
        return;
      }

      room.status = "IN_PROGRESS";
      room.currentQuestionIndex = 0;
      room.previousRanking = [];

      io.to(roomCode).emit("quiz-started");
      await sendQuestion(io, roomCode);
    });

    socket.on("submit-answer", async ({ roomCode, questionIndex, selectedAnswer }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      const userId = socket.data.userId;

      if (room.currentQuestionIndex !== questionIndex) return;
      if (room.answers[questionIndex]?.[userId]) return;
      if (Date.now() > room.questionEndsAt) return;

      const quiz = await Quiz.findById(room.quizId);
      const question = quiz.questions[questionIndex];
      const correct = selectedAnswer === question.correctAnswer;
      const timeTaken = (Date.now() - room.questionStartedAt) / 1000;
      const points = calculatePoints(correct, timeTaken, question.timeLimit);

      recordAnswer(roomCode, questionIndex, userId, selectedAnswer, timeTaken, correct, points);

      socket.emit("answer-received", { correct, points });

      const nonHostPlayers = room.players.filter((p) => !p.isHost);
      const answeredCount = Object.keys(room.answers[questionIndex]).length;

      io.to(roomCode).emit("answer-progress", {
        answered: answeredCount,
        total: nonHostPlayers.length,
      });

      if (answeredCount >= nonHostPlayers.length) {
        endQuestion(io, roomCode);
      }
    });

    socket.on("next-question", async ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.data.userId) return;

      room.currentQuestionIndex += 1;
      await sendQuestion(io, roomCode);
    });

    socket.on("end-quiz", async ({ roomCode }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      if (room.hostId !== socket.data.userId) return;

      await endQuiz(io, roomCode);
    });

    socket.on("disconnect", () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        player.connected = false;
      }

      if (room.status === "WAITING") {
        room.players = room.players.filter((p) => p.socketId !== socket.id);
      }

      io.to(roomCode).emit("player-joined", room.players);

      if (player?.isHost && room.status === "IN_PROGRESS") {
        room.status = "PAUSED";
        clearRoomTimer(roomCode);
        io.to(roomCode).emit("host-disconnected");
      }
    });
  });
};