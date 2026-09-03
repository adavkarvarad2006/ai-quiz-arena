import Quiz from "../models/Quiz.js";
import LiveRoom from "../models/LiveRoom.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import { createRoom as createRoomInMemory } from "../sockets/roomState.js";

// @route POST /api/rooms
export const createRoom = async (req, res) => {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({
        message: "quizId is required",
      });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found",
      });
    }

    let roomCode;
    let attempts = 0;

    do {
      roomCode = generateRoomCode();
      attempts++;
    } while (
      (await LiveRoom.findOne({ roomCode })) &&
      attempts < 5
    );

    const room = await LiveRoom.create({
      roomCode,
      quizId,
      hostId: req.user._id,
      status: "WAITING",
    });

    // Seed the in-memory live state used by Socket.IO
    createRoomInMemory(roomCode, {
      quizId: quiz._id.toString(),
      hostId: req.user._id.toString(),
      status: "WAITING",
      currentQuestionIndex: -1,
      players: [],
      answers: {},
    });

    return res.status(201).json(room);
  } catch (err) {
    console.error("Create room error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// @route GET /api/rooms/:roomCode
export const getRoomByCode = async (req, res) => {
  try {
    const room = await LiveRoom.findOne({
      roomCode: req.params.roomCode,
    }).populate(
      "quizId",
      "title topic difficulty"
    );

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    return res.json(room);
  } catch (err) {
    console.error("Get room error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// @route GET /api/rooms/:roomCode/analytics
export const getRoomAnalytics = async (req, res) => {
  try {
    const room = await LiveRoom.findOne({
      roomCode: req.params.roomCode,
    }).populate(
      "quizId",
      "title topic difficulty"
    );

    // ---------------------------------------------
    // ROOM NOT FOUND
    // ---------------------------------------------

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    // ---------------------------------------------
    // CHECK HOST AUTHORIZATION
    // ---------------------------------------------

    if (
      room.hostId.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Not authorized to view this analytics",
      });
    }

    // ---------------------------------------------
    // QUIZ MUST BE FINISHED
    // ---------------------------------------------

    if (room.status !== "FINISHED") {
      return res.status(400).json({
        message: "Quiz has not finished yet",
      });
    }

    // ---------------------------------------------
    // SAFE DEFAULTS
    // ---------------------------------------------

    const participants =
      room.participants || [];

    const questionStats =
      room.questionStats || [];

    // ---------------------------------------------
    // PARTICIPANT STATISTICS
    // ---------------------------------------------

    const totalParticipants =
      participants.length;

    const scores = participants.map(
      (p) => p.finalScore || 0
    );

    const averageScore =
      totalParticipants > 0
        ? Math.round(
            scores.reduce(
              (sum, score) =>
                sum + score,
              0
            ) / totalParticipants
          )
        : 0;

    const highestScore =
      totalParticipants > 0
        ? Math.max(...scores)
        : 0;

    const lowestScore =
      totalParticipants > 0
        ? Math.min(...scores)
        : 0;

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return res.json({
      roomCode: room.roomCode,

      quiz: room.quizId,

      status: room.status,

      totalParticipants,

      averageScore,

      highestScore,

      lowestScore,

      participants,

      questionStats,

      startedAt: room.startedAt,

      endedAt: room.endedAt,
    });
  } catch (err) {
    console.error(
      "Get analytics error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};