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

// =====================================================
// SEND QUESTION
// =====================================================

const sendQuestion = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) return;

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) return;

  const index = room.currentQuestionIndex;
  const question = quiz.questions[index];

  // No more questions
  if (!question) {
    await endQuiz(io, roomCode);
    return;
  }

  startQuestion(
    roomCode,
    index,
    question.timeLimit
  );

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

// =====================================================
// END QUESTION
// =====================================================

const endQuestion = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) return;

  clearRoomTimer(roomCode);

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) return;

  const question =
    quiz.questions[room.currentQuestionIndex];

  if (!question) return;

  const players = room.players
    .filter((p) => !p.isHost)
    .sort(
      (a, b) =>
        (b.score || 0) - (a.score || 0)
    );

  const previousRanking =
    room.previousRanking || [];

  const leaderboard = players.map(
    (p, index) => {
      const prevIndex =
        previousRanking.indexOf(p.userId);

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
    }
  );

  room.previousRanking =
    players.map((p) => p.userId);

  io.to(roomCode).emit(
    "question-ended",
    {
      correctAnswer:
        question.correctAnswer,
      explanation:
        question.explanation,
      leaderboard,
    }
  );
};

// =====================================================
// END QUIZ
// =====================================================

const endQuiz = async (io, roomCode) => {
  const room = getRoom(roomCode);

  if (!room) return;

  clearRoomTimer(roomCode);

  const quiz = await Quiz.findById(room.quizId);

  if (!quiz) return;

  // Update in-memory room
  room.status = "FINISHED";

  const players = room.players
    .filter((p) => !p.isHost)
    .sort(
      (a, b) =>
        (b.score || 0) - (a.score || 0)
    );

  const previousRanking =
    room.previousRanking || [];

  const leaderboard = players.map(
    (p, index) => {
      const prevIndex =
        previousRanking.indexOf(p.userId);

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
    }
  );

  const {
    questionStats,
    participants,
  } = computeRoomAnalytics(
    room,
    quiz
  );

  // =====================================================
  // SAVE FINISHED STATUS TO MONGODB
  // =====================================================

  try {
    const liveRoom =
      await LiveRoom.findOne({
        roomCode,
      });

    if (!liveRoom) {
      console.error(
        "LiveRoom not found:",
        roomCode
      );

      return;
    }

    liveRoom.status = "FINISHED";
    liveRoom.endedAt = new Date();
    liveRoom.participants =
      participants;
    liveRoom.questionStats =
      questionStats;

    await liveRoom.save();

    console.log(
      "ROOM SAVED SUCCESSFULLY:",
      liveRoom.roomCode,
      liveRoom.status
    );
  } catch (error) {
    console.error(
      "FAILED TO SAVE FINISHED ROOM:",
      error
    );

    return;
  }

  // =====================================================
  // SEND RESULTS TO PLAYERS
  // =====================================================

  players.forEach(
    (player, index) => {
      const stats =
        participants.find(
          (p) =>
            String(p.userId) ===
            String(player.userId)
        );

      if (player.socketId) {
        io.to(
          player.socketId
        ).emit(
          "quiz-finished",
          {
            leaderboard,

            myResult: stats
              ? {
                  ...stats,
                  rank: index + 1,
                  totalQuestions:
                    quiz.questions
                      .length,

                  accuracy:
                    quiz.questions
                      .length > 0
                      ? Math.round(
                          (stats.correctAnswers /
                            quiz
                              .questions
                              .length) *
                            100
                        )
                      : 0,
                }
              : null,
          }
        );
      }
    }
  );

  // =====================================================
  // SEND RESULTS TO HOST
  // =====================================================

  const host =
    room.players.find(
      (p) => p.isHost
    );

  if (host?.socketId) {
    io.to(
      host.socketId
    ).emit(
      "quiz-finished",
      {
        leaderboard,
      }
    );
  }
};

// =====================================================
// SOCKET INITIALIZATION
// =====================================================

export const initQuizSocket = (io) => {
  io.on(
    "connection",
    (socket) => {
      console.log(
        "Socket connected:",
        socket.id
      );

      // =====================================================
      // JOIN ROOM
      // =====================================================

      socket.on(
        "join-room",
        ({
          roomCode,
          name,
          userId,
          isHost,
        }) => {
          const room =
            getRoom(roomCode);

          if (!room) {
            socket.emit(
              "room-error",
              {
                message:
                  "Room not found. Check the code and try again.",
              }
            );

            return;
          }

          const normalizedUserId =
            String(userId);

          const normalizedHostId =
            String(room.hostId);

          console.log(
            "HOST CHECK:",
            {
              roomHostId:
                normalizedHostId,
              socketUserId:
                normalizedUserId,
              isHost,
            }
          );

          const existingPlayer =
            room.players.find(
              (p) =>
                String(p.userId) ===
                normalizedUserId
            );

          // Finished room
          if (
            room.status ===
              "FINISHED" &&
            !existingPlayer
          ) {
            socket.emit(
              "room-error",
              {
                message:
                  "This quiz has already finished.",
              }
            );

            return;
          }

          // Don't allow new players after quiz starts
          if (
            room.status ===
              "IN_PROGRESS" &&
            !existingPlayer
          ) {
            socket.emit(
              "room-error",
              {
                message:
                  "This quiz is already in progress. You can't join mid-game.",
              }
            );

            return;
          }

          if (existingPlayer) {
            existingPlayer.socketId =
              socket.id;

            existingPlayer.connected =
              true;

            existingPlayer.name =
              name;

            // Make sure the actual host
            // is marked as host
            if (
              normalizedHostId ===
              normalizedUserId
            ) {
              existingPlayer.isHost =
                true;
            }
          } else {
            room.players.push({
              socketId: socket.id,
              userId:
                normalizedUserId,
              name,

              isHost:
                !!isHost &&
                normalizedHostId ===
                  normalizedUserId,

              score: 0,
              answered: false,
              connected: true,
            });
          }

          socket.join(roomCode);

          socket.data.roomCode =
            roomCode;

          socket.data.userId =
            normalizedUserId;

          io.to(roomCode).emit(
            "player-joined",
            room.players
          );

          // Host reconnect
          if (
            normalizedHostId ===
              normalizedUserId &&
            room.status === "PAUSED"
          ) {
            room.status =
              "IN_PROGRESS";

            io.to(roomCode).emit(
              "host-reconnected"
            );
          }
        }
      );

      // =====================================================
      // GET ROOM STATE
      // =====================================================

      socket.on(
        "get-room-state",
        async ({ roomCode }) => {
          const room =
            getRoom(roomCode);

          if (!room) {
            socket.emit(
              "room-error",
              {
                message:
                  "Room not found",
              }
            );

            return;
          }

          if (
            room.status !==
              "IN_PROGRESS" ||
            room.currentQuestionIndex <
              0
          ) {
            socket.emit(
              "room-state",
              {
                status:
                  room.status,
                question: null,
              }
            );

            return;
          }

          const quiz =
            await Quiz.findById(
              room.quizId
            );

          if (!quiz) return;

          const question =
            quiz.questions[
              room
                .currentQuestionIndex
            ];

          if (!question) return;

          socket.emit(
            "room-state",
            {
              status:
                room.status,

              question: {
                questionIndex:
                  room.currentQuestionIndex,

                totalQuestions:
                  quiz.questions
                    .length,

                question:
                  question.question,

                options:
                  question.options,

                timeLimit:
                  question.timeLimit,

                questionEndsAt:
                  room.questionEndsAt,
              },
            }
          );
        }
      );

      // =====================================================
      // START QUIZ
      // =====================================================

      socket.on(
        "start-quiz",
        async ({ roomCode }) => {
          console.log(
            "START QUIZ:",
            roomCode
          );

          const room =
            getRoom(roomCode);

          if (!room) {
            socket.emit(
              "room-error",
              {
                message:
                  "Room not found",
              }
            );

            return;
          }

          if (
            String(room.hostId) !==
            String(
              socket.data.userId
            )
          ) {
            socket.emit(
              "room-error",
              {
                message:
                  "Only the host can start the quiz",
              }
            );

            return;
          }

          room.status =
            "IN_PROGRESS";

          room.currentQuestionIndex =
            0;

          room.previousRanking =
            [];

          io.to(roomCode).emit(
            "quiz-started"
          );

          await sendQuestion(
            io,
            roomCode
          );
        }
      );

      // =====================================================
      // SUBMIT ANSWER
      // =====================================================

      socket.on(
        "submit-answer",
        async ({
          roomCode,
          questionIndex,
          selectedAnswer,
        }) => {
          const room =
            getRoom(roomCode);

          if (!room) return;

          const userId =
            String(
              socket.data.userId
            );

          if (
            room.currentQuestionIndex !==
            questionIndex
          ) {
            return;
          }

          if (
            room.answers[
              questionIndex
            ]?.[userId]
          ) {
            return;
          }

          if (
            Date.now() >
            room.questionEndsAt
          ) {
            return;
          }

          const quiz =
            await Quiz.findById(
              room.quizId
            );

          if (!quiz) return;

          const question =
            quiz.questions[
              questionIndex
            ];

          if (!question) return;

          const correct =
            selectedAnswer ===
            question.correctAnswer;

          const timeTaken =
            (Date.now() -
              room.questionStartedAt) /
            1000;

          const points =
            calculatePoints(
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

          socket.emit(
            "answer-received",
            {
              correct,
              points,
            }
          );

          const players =
            room.players.filter(
              (p) => !p.isHost
            );

          const answeredCount =
            Object.keys(
              room.answers[
                questionIndex
              ] || {}
            ).length;

          io.to(roomCode).emit(
            "answer-progress",
            {
              answered:
                answeredCount,
              total:
                players.length,
            }
          );

          if (
            players.length > 0 &&
            answeredCount >=
              players.length
          ) {
            await endQuestion(
              io,
              roomCode
            );
          }
        }
      );

      // =====================================================
      // NEXT QUESTION
      // =====================================================

      socket.on(
        "next-question",
        async ({ roomCode }) => {
          console.log(
            "NEXT QUESTION:",
            roomCode
          );

          const room =
            getRoom(roomCode);

          if (!room) {
            socket.emit(
              "room-error",
              {
                message:
                  "Room not found",
              }
            );

            return;
          }

          console.log(
            "HOST CHECK:",
            {
              roomHostId:
                String(
                  room.hostId
                ),

              socketUserId:
                String(
                  socket.data.userId
                ),
            }
          );

          if (
            String(room.hostId) !==
            String(
              socket.data.userId
            )
          ) {
            socket.emit(
              "room-error",
              {
                message:
                  "Only the host can move to the next question",
              }
            );

            return;
          }

          if (
            room.status !==
            "IN_PROGRESS"
          ) {
            socket.emit(
              "room-error",
              {
                message:
                  "The quiz is not currently in progress",
              }
            );

            return;
          }

          room.currentQuestionIndex++;

          await sendQuestion(
            io,
            roomCode
          );
        }
      );

      // =====================================================
      // END QUIZ
      // =====================================================

      socket.on(
        "end-quiz",
        async ({ roomCode }) => {
          console.log(
            "END QUIZ:",
            roomCode
          );

          const room =
            getRoom(roomCode);

          if (!room) {
            socket.emit(
              "room-error",
              {
                message:
                  "Room not found",
              }
            );

            return;
          }

          console.log(
            "HOST CHECK:",
            {
              roomHostId:
                String(
                  room.hostId
                ),

              socketUserId:
                String(
                  socket.data.userId
                ),
            }
          );

          if (
            String(room.hostId) !==
            String(
              socket.data.userId
            )
          ) {
            socket.emit(
              "room-error",
              {
                message:
                  "Only the host can end the quiz",
              }
            );

            return;
          }

          await endQuiz(
            io,
            roomCode
          );
        }
      );

      // =====================================================
      // DISCONNECT
      // =====================================================

      socket.on(
        "disconnect",
        () => {
          console.log(
            "Socket disconnected:",
            socket.id
          );

          const roomCode =
            socket.data.roomCode;

          if (!roomCode) return;

          const room =
            getRoom(roomCode);

          if (!room) return;

          const player =
            room.players.find(
              (p) =>
                p.socketId ===
                socket.id
            );

          if (player) {
            player.connected =
              false;
          }

          // Remove players who disconnect
          // while waiting
          if (
            room.status ===
            "WAITING"
          ) {
            room.players =
              room.players.filter(
                (p) =>
                  p.socketId !==
                  socket.id
              );
          }

          io.to(roomCode).emit(
            "player-joined",
            room.players
          );

          // Pause if host disconnects
          if (
            player?.isHost &&
            room.status ===
              "IN_PROGRESS"
          ) {
            room.status =
              "PAUSED";

            clearRoomTimer(
              roomCode
            );

            io.to(roomCode).emit(
              "host-disconnected"
            );
          }
        }
      );
    }
  );
};