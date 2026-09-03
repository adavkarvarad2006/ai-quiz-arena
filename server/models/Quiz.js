import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => arr.length === 4,
      message: "Each question must have exactly 4 options",
    },
  },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: "" },
  timeLimit: { type: Number, default: 15 }, // seconds
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "A quiz must have at least one question",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", quizSchema);
export default Quiz;