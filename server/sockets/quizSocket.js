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

/* =========================================================
   TIMER HELPERS
========================================================= */

const clearRoomTimer = (roomCode) => {
  const timer = questionTimers.get(roomCode);

  if (timer) {
    clearTimeout(timer);
    questionTimers.delete(roomCode);
  }
};

/* =========================================================
   SEND QUESTION
========================================================= */

const sendQuestion = async (io, roomCode) => {
  try {
    const room = getRoom(roomCode);

    if (!room) {
      console.log("SEND QUESTION: Room not found:", roomCode);
      return;
    }

    const quiz = await Quiz.findById(room.quizId);

    if (!quiz) {
      console.log("SEND QUESTION: Quiz not found:", room.quizId);
      return;
    }

    const index = room.currentQuestionIndex;
    const question = quiz.questions[index];

    /*
      If there are no more questions,
      finish the quiz.
    */
    if (!question) {
      console.log(
        "SEND QUESTION: No more questions. Ending quiz:",
        roomCode
      );

      await endQuiz(io, roomCode);
      return;
    }

    startQuestion(
      roomCode,
      index,
      question.timeLimit
    );

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
  } catch (error) {
    console.error(
      "SEND QUESTION ERROR:",
      error
    );
  }
};

/* =========================================================
   END CURRENT QUESTION
========================================================= */

const endQuestion = async (io, roomCode) => {
  try {
    const room = getRoom(roomCode);

    if (!room) {
      console.log(
        "END QUESTION: Room not found:",
        roomCode
      );
      return;
    }

    clearRoomTimer(roomCode);

    const quiz = await Quiz.findById(room.quizId);

    if (!quiz) {
      console.log(
        "END QUESTION: Quiz not found:",
        room.quizId
      );
      return;
    }

    const question =
      quiz.questions[room.currentQuestionIndex];

    if (!question) {
      return;
    }

    const sortedPlayers = [...room.players]
      .filter((p) => !p.isHost)
      .sort(
        (a, b) =>
          (b.score || 0) -
          (a.score || 0)
      );

    const previousRanking =
      room.previousRanking || [];

    const leaderboard =
      sortedPlayers.map(
        (player, index) => {
          const prevIndex =
            previousRanking.indexOf(
              player.userId
            );

          let trend = "same";

          if (prevIndex === -1) {
            trend = "new";
          } else if (prevIndex > index) {
            trend = "up";
          } else if (prevIndex < index) {
            trend = "down";
          }

          return {
            userId: player.userId,
            name: player.name,
            score: player.score || 0,
            rank: index + 1,
            trend,
          };
        }
      );

    room.previousRanking =
      sortedPlayers.map(
        (player) => player.userId
      );

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

    console.log(
      "QUESTION ENDED:",
      roomCode,
      "Question:",
      room.currentQuestionIndex + 1
    );
  } catch (error) {
    console.error(
      "END QUESTION ERROR:",
      error
    );
  }
};

/* =========================================================
   END QUIZ
========================================================= */

const endQuiz = async (io, roomCode) => {
  try {
    const room = getRoom(roomCode);

    if (!room) {
      console.log(
        "END QUIZ: Room not found:",
        roomCode
      );
      return;
    }

    console.log(
      "END QUIZ CALLED:",
      roomCode
    );

    clearRoomTimer(roomCode);

    room.status = "FINISHED";

    const quiz = await Quiz.findById(
      room.quizId
    );

    if (!quiz) {
      console.log(
        "END QUIZ: Quiz not found:",
        room.quizId
      );
      return;
    }

    const sortedPlayers = [
      ...room.players,
    ]
      .filter((p) => !p.isHost)
      .sort(
        (a, b) =>
          (b.score || 0) -
          (a.score || 0)
      );

    const previousRanking =
      room.previousRanking || [];

    const finalLeaderboard =
      sortedPlayers.map(
        (player, index) => {
          const prevIndex =
            previousRanking.indexOf(
              player.userId
            );

          let trend = "same";

          if (prevIndex === -1) {
            trend = "new";
          } else if (prevIndex > index) {
            trend = "up";
          } else if (prevIndex < index) {
            trend = "down";
          }

          return {
            userId: player.userId,
            name: player.name,
            score: player.score || 0,
            rank: index + 1,
            trend,
          };
        }
      );

    /*
      Calculate analytics BEFORE saving.
    */

    const {
      questionStats,
      participants,
    } =
      computeRoomAnalytics(
        room,
        quiz
      );

    /*
      IMPORTANT:
      Save FINISHED status to MongoDB FIRST.
      
      This prevents the race condition where
      frontend navigates to analytics before
      MongoDB has been updated.
    */

    try {
      await LiveRoom.findOneAndUpdate(
        {
          roomCode,
        },
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

      console.log(
        "QUIZ SAVED AS FINISHED:",
        roomCode
      );
    } catch (dbError) {
      console.error(
        "FAILED TO SAVE FINISHED ROOM:",
        dbError
      );

      /*
        Don't tell frontend quiz finished
        if MongoDB update failed.
      */

      return;
    }

    /*
      Send results to players.
    */

    sortedPlayers.forEach(
      (player, index) => {
        const myStats =
          participants.find(
            (p) =>
              String(p.userId) ===
              String(player.userId)
          );

        if (!player.socketId) {
          return;
        }

        io.to(
          player.socketId
        ).emit(
          "quiz-finished",
          {
            leaderboard:
              finalLeaderboard,

            myResult: myStats
              ? {
                  ...myStats,

                  rank:
                    index + 1,

                  totalQuestions:
                    quiz.questions.length,

                  accuracy:
                    quiz.questions.length >
                    0
                      ? Math.round(
                          (myStats.correctAnswers /
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
    );

    /*
      Send finished event to host.
    */

    const hostPlayer =
      room.players.find(
        (player) =>
          player.isHost
      );

    if (
      hostPlayer &&
      hostPlayer.socketId
    ) {
      console.log(
        "Sending quiz-finished to host:",
        hostPlayer.socketId
      );

      io.to(
        hostPlayer.socketId
      ).emit(
        "quiz-finished",
        {
          leaderboard:
            finalLeaderboard,
        }
      );
    }

    /*
      Also emit to the entire room.
      This makes the finish event more reliable
      if the host/player socket state changed.
    */

    io.to(roomCode).emit(
      "quiz-completed",
      {
        leaderboard:
          finalLeaderboard,
      }
    );

    console.log(
      "QUIZ FINISHED SUCCESSFULLY:",
      roomCode
    );
  } catch (error) {
    console.error(
      "END QUIZ ERROR:",
      error
    );
  }
};

/* =========================================================
   SOCKET INITIALIZATION
========================================================= */

export const initQuizSocket = (io) => {
  io.on(
    "connection",
    (socket) => {
      console.log(
        "SOCKET CONNECTED:",
        socket.id
      );

      /* =====================================================
         JOIN ROOM
      ===================================================== */

      socket.on(
        "join-room",
        ({
          roomCode,
          name,
          userId,
          isHost,
        }) => {
          console.log(
            "JOIN ROOM:",
            roomCode,
            "User:",
            userId,
            "Host:",
            isHost
          );

          const room =
            getRoom(roomCode);

          if (!room) {
            console.log(
              "JOIN ROOM FAILED - ROOM NOT FOUND:",
              roomCode
            );

            socket.emit(
              "room-error",
              {
                message:
                  "Room not found. Check the code and try again.",
              }
            );

            return;
          }

          /*
            Compare user IDs as strings.
          */

          const existingPlayer =
            room.players.find(
              (player) =>
                String(
                  player.userId
                ) ===
                String(userId)
            );

          /*
            Don't allow new players
            to join a finished quiz.
          */

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

          /*
            Don't allow new players
            to join after quiz started.
          */

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

          /*
            Reconnecting player
          */

          if (existingPlayer) {
            existingPlayer.socketId =
              socket.id;

            existingPlayer.connected =
              true;

            console.log(
              "PLAYER RECONNECTED:",
              userId
            );
          }

          /*
            New player
          */

          else {
            room.players.push({
              socketId:
                socket.id,

              userId,

              name,

              isHost:
                !!isHost,

              score: 0,

              answered: false,

              connected: true,
            });

            console.log(
              "NEW PLAYER ADDED:",
              name
            );
          }

          socket.join(roomCode);

          socket.data.roomCode =
            roomCode;

          socket.data.userId =
            userId;

          socket.data.isHost =
            !!isHost;

          io.to(roomCode).emit(
            "player-joined",
            room.players
          );

          /*
            Host reconnecting after pause.
          */

          if (
            isHost &&
            room.status ===
              "PAUSED"
          ) {
            room.status =
              "IN_PROGRESS";

            io.to(roomCode).emit(
              "host-reconnected"
            );

            console.log(
              "HOST RECONNECTED:",
              roomCode
            );
          }
        }
      );

      /* =====================================================
         GET ROOM STATE
      ===================================================== */

      socket.on(
        "get-room-state",
        async ({
          roomCode,
        }) => {
          try {
            console.log(
              "GET ROOM STATE:",
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

                  question:
                    null,
                }
              );

              return;
            }

            const quiz =
              await Quiz.findById(
                room.quizId
              );

            if (!quiz) {
              return;
            }

            const question =
              quiz.questions[
                room.currentQuestionIndex
              ];

            if (!question) {
              socket.emit(
                "room-state",
                {
                  status:
                    room.status,

                  question:
                    null,
                }
              );

              return;
            }

            socket.emit(
              "room-state",
              {
                status:
                  room.status,

                question: {
                  questionIndex:
                    room.currentQuestionIndex,

                  totalQuestions:
                    quiz.questions.length,

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
          } catch (error) {
            console.error(
              "GET ROOM STATE ERROR:",
              error
            );
          }
        }
      );

      /* =====================================================
         START QUIZ
      ===================================================== */

      socket.on(
        "start-quiz",
        async ({
          roomCode,
        }) => {
          try {
            console.log(
              "START QUIZ REQUEST:",
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
              "Room hostId:",
              room.hostId
            );

            console.log(
              "Socket userId:",
              socket.data.userId
            );

            /*
              IMPORTANT FIX:
              Compare IDs as strings.
            */

            if (
              String(
                room.hostId
              ) !==
              String(
                socket.data.userId
              )
            ) {
              console.log(
                "START QUIZ DENIED - NOT HOST"
              );

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

            console.log(
              "QUIZ STARTED:",
              roomCode
            );

            await sendQuestion(
              io,
              roomCode
            );
          } catch (error) {
            console.error(
              "START QUIZ ERROR:",
              error
            );
          }
        }
      );

      /* =====================================================
         SUBMIT ANSWER
      ===================================================== */

      socket.on(
        "submit-answer",
        async ({
          roomCode,
          questionIndex,
          selectedAnswer,
        }) => {
          try {
            const room =
              getRoom(roomCode);

            if (!room) {
              return;
            }

            const userId =
              socket.data.userId;

            /*
              Ignore old question answers.
            */

            if (
              room.currentQuestionIndex !==
              questionIndex
            ) {
              return;
            }

            /*
              Prevent duplicate answers.
            */

            if (
              room.answers[
                questionIndex
              ]?.[userId]
            ) {
              return;
            }

            /*
              Don't accept answers
              after timer expires.
            */

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

            if (!quiz) {
              return;
            }

            const question =
              quiz.questions[
                questionIndex
              ];

            if (!question) {
              return;
            }

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

            const nonHostPlayers =
              room.players.filter(
                (player) =>
                  !player.isHost
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
                  nonHostPlayers.length,
              }
            );

            /*
              Only auto-end when
              there is at least one player.
            */

            if (
              nonHostPlayers.length >
                0 &&
              answeredCount >=
                nonHostPlayers.length
            ) {
              await endQuestion(
                io,
                roomCode
              );
            }
          } catch (error) {
            console.error(
              "SUBMIT ANSWER ERROR:",
              error
            );
          }
        }
      );

      /* =====================================================
         NEXT QUESTION
      ===================================================== */

      socket.on(
        "next-question",
        async ({
          roomCode,
        }) => {
          try {
            console.log(
              "NEXT QUESTION REQUEST:",
              roomCode
            );

            const room =
              getRoom(roomCode);

            if (!room) {
              console.log(
                "NEXT QUESTION: ROOM NOT FOUND"
              );

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
              "Room hostId:",
              room.hostId
            );

            console.log(
              "Socket userId:",
              socket.data.userId
            );

            /*
              IMPORTANT FIX:
              Compare IDs as strings.
            */

            if (
              String(
                room.hostId
              ) !==
              String(
                socket.data.userId
              )
            ) {
              console.log(
                "NEXT QUESTION DENIED - NOT HOST"
              );

              socket.emit(
                "room-error",
                {
                  message:
                    "Only the host can move to the next question",
                }
              );

              return;
            }

            room.currentQuestionIndex +=
              1;

            console.log(
              "Moving to question index:",
              room.currentQuestionIndex
            );

            await sendQuestion(
              io,
              roomCode
            );
          } catch (error) {
            console.error(
              "NEXT QUESTION ERROR:",
              error
            );
          }
        }
      );

      /* =====================================================
         END QUIZ BUTTON
      ===================================================== */

      socket.on(
        "end-quiz",
        async ({
          roomCode,
        }) => {
          try {
            console.log(
              "END QUIZ REQUEST:",
              roomCode
            );

            const room =
              getRoom(roomCode);

            if (!room) {
              console.log(
                "END QUIZ: ROOM NOT FOUND"
              );

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
              "Room hostId:",
              room.hostId
            );

            console.log(
              "Socket userId:",
              socket.data.userId
            );

            /*
              IMPORTANT FIX:
              Compare IDs as strings.
            */

            if (
              String(
                room.hostId
              ) !==
              String(
                socket.data.userId
              )
            ) {
              console.log(
                "END QUIZ DENIED - NOT HOST"
              );

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
          } catch (error) {
            console.error(
              "END QUIZ REQUEST ERROR:",
              error
            );
          }
        }
      );

      /* =====================================================
         DISCONNECT
      ===================================================== */

      socket.on(
        "disconnect",
        () => {
          console.log(
            "SOCKET DISCONNECTED:",
            socket.id
          );

          const roomCode =
            socket.data.roomCode;

          if (!roomCode) {
            return;
          }

          const room =
            getRoom(roomCode);

          if (!room) {
            return;
          }

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

          /*
            Remove players from
            waiting rooms.
          */

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

          /*
            Pause quiz if host disconnects.
          */

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

            console.log(
              "HOST DISCONNECTED - QUIZ PAUSED:",
              roomCode
            );
          }
        }
      );
    }
  );
};