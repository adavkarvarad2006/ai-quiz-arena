import { validateQuizData } from "./validateQuizData.js";

const validQuestion = {
  question: "What is 2+2?",
  options: ["1", "2", "3", "4"],
  correctAnswer: "4",
  explanation: "Basic math",
  timeLimit: 15,
};

describe("validateQuizData", () => {
  test("accepts a well-formed quiz", () => {
    const result = validateQuizData({
      title: "Math Quiz",
      questions: [validQuestion],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects a quiz with no questions", () => {
    const result = validateQuizData({ title: "Empty Quiz", questions: [] });
    expect(result.valid).toBe(false);
  });

  test("rejects a question with fewer than 4 options", () => {
    const badQuestion = { ...validQuestion, options: ["1", "2", "3"] };
    const result = validateQuizData({ title: "Bad Quiz", questions: [badQuestion] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/4 options/);
  });

  test("rejects a correctAnswer that doesn't match any option", () => {
    const badQuestion = { ...validQuestion, correctAnswer: "banana" };
    const result = validateQuizData({ title: "Bad Quiz", questions: [badQuestion] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/does not match/);
  });

  test("rejects completely malformed input without crashing", () => {
    const result = validateQuizData(null);
    expect(result.valid).toBe(false);
  });
});