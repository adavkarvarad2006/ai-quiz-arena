import express from "express";
import { createRoom, getRoomByCode, getRoomAnalytics } from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createRoom);
router.get("/:roomCode", protect, getRoomByCode);
router.get("/:roomCode/analytics", protect, getRoomAnalytics);

export default router;