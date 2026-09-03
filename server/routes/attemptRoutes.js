import express from "express";
import {
  submitAttempt,
  getMyAttempts,
  getAttemptById,
} from "../controllers/attemptController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, submitAttempt);
router.get("/my", protect, getMyAttempts);
router.get("/:id", protect, getAttemptById);

export default router;