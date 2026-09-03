import express from "express";
import {
  createQuiz,
  getMyQuizzes,
  getQuizById,
  deleteQuiz,
  generateQuiz,
} from "../controllers/quizController.js";
import { protect } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/generate", protect, aiLimiter, generateQuiz);
router.post("/", protect, createQuiz);
router.get("/", protect, getMyQuizzes);
router.get("/:id", protect, getQuizById);
router.delete("/:id", protect, deleteQuiz);

export default router;