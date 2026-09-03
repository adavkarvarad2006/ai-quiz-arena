import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    finalScore: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
  },
  { _id: false }
);

const questionStatSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    questionText: { type: String, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
  },
  { _id: false }
);

const liveRoomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["WAITING", "IN_PROGRESS", "FINISHED"],
      default: "WAITING",
    },
    participants: { type: [participantSchema], default: [] },
    questionStats: { type: [questionStatSchema], default: [] },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

const LiveRoom = mongoose.model("LiveRoom", liveRoomSchema);
export default LiveRoom;