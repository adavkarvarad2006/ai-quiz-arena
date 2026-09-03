import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { scoreAttempt } from "../utils/scoreAttempt.js";

// @route POST /api/attempts
export const submitAttempt = async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ message: "quizId and answers are required" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const scored = scoreAttempt(quiz, answers);

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      quizId,
      ...scored,
    });

    res.status(201).json(attempt);
  } catch (err) {
    console.error("Submit attempt error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route GET /api/attempts/my
export const getMyAttempts = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ userId: req.user._id })
      .populate("quizId", "title topic difficulty")
      .sort({ completedAt: -1 });

    res.json(attempts);
  } catch (err) {
    console.error("Get attempts error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route GET /api/attempts/:id
export const getAttemptById = async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id).populate("quizId");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this attempt" });
    }

    res.json(attempt);
  } catch (err) {
    console.error("Get attempt error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};