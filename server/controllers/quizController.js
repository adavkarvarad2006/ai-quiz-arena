import Quiz from "../models/Quiz.js";
import { generateQuizWithAI } from "../services/aiService.js";
import { validateQuizData } from "../utils/validateQuizData.js";
import { recommendTimeLimit } from "../utils/recommendTimeLimit.js";

// @route POST /api/quizzes
export const createQuiz = async (req, res) => {
  try {
    const { title, topic, difficulty, questions } = req.body;

    if (!title || !topic || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Missing required quiz fields" });
    }

    const quiz = await Quiz.create({
      title,
      topic,
      difficulty,
      questions,
      createdBy: req.user._id,
    });

    res.status(201).json(quiz);
  } catch (err) {
    console.error("Create quiz error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route GET /api/quizzes
export const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(quizzes);
  } catch (err) {
    console.error("Get quizzes error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route GET /api/quizzes/:id
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json(quiz);
  } catch (err) {
    console.error("Get quiz error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route DELETE /api/quizzes/:id
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this quiz" });
    }

    await quiz.deleteOne();
    res.json({ message: "Quiz deleted" });
  } catch (err) {
    console.error("Delete quiz error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route POST /api/quizzes/generate
export const generateQuiz = async (req, res) => {
  try {
    const { topic, numQuestions, difficulty, instructions, timePerQuestion } = req.body;

    if (!topic || !numQuestions || !difficulty) {
      return res.status(400).json({ message: "topic, numQuestions, and difficulty are required" });
    }

    if (numQuestions < 1 || numQuestions > 20) {
      return res.status(400).json({ message: "numQuestions must be between 1 and 20" });
    }

    const resolvedTimeLimit =
      Number.isFinite(timePerQuestion) && timePerQuestion >= 5 && timePerQuestion <= 120
        ? timePerQuestion
        : recommendTimeLimit(difficulty);

    const aiData = await generateQuizWithAI({ topic, numQuestions, difficulty, instructions });

    const { valid, errors } = validateQuizData(aiData);
    if (!valid) {
      console.error("AI validation failed:", errors);
      return res.status(502).json({
        message: "AI generated an invalid quiz. Please try again.",
        errors,
      });
    }

    // Enforce the requested time limit server-side, regardless of what the AI returned
    const questionsWithTimeLimit = aiData.questions.map((q) => ({
      ...q,
      timeLimit: resolvedTimeLimit,
    }));

    res.json({
      title: aiData.title,
      topic,
      difficulty,
      questions: questionsWithTimeLimit,
    });
  } catch (err) {
    console.error("AI generation error:", err);
    res.status(500).json({ message: "Failed to generate quiz", error: err.message });
  }
};