import { scoreAttempt } from "./scoreAttempt.js";

const mockQuiz = {
  questions: [
    { _id: { toString: () => "q1" }, correctAnswer: "A", timeLimit: 15 },
    { _id: { toString: () => "q2" }, correctAnswer: "B", timeLimit: 15 },
  ],
};

describe("scoreAttempt", () => {
  test("scores all-correct attempt as 100%", () => {
    const submitted = [
      { questionId: "q1", selectedAnswer: "A", timeTaken: 5 },
      { questionId: "q2", selectedAnswer: "B", timeTaken: 5 },
    ];
    const result = scoreAttempt(mockQuiz, submitted);
    expect(result.correctAnswers).toBe(2);
    expect(result.wrongAnswers).toBe(0);
    expect(result.percentage).toBe(100);
  });

  test("scores all-wrong attempt as 0%", () => {
    const submitted = [
      { questionId: "q1", selectedAnswer: "X", timeTaken: 5 },
      { questionId: "q2", selectedAnswer: "Y", timeTaken: 5 },
    ];
    const result = scoreAttempt(mockQuiz, submitted);
    expect(result.correctAnswers).toBe(0);
    expect(result.percentage).toBe(0);
  });

  test("treats an unanswered question as wrong, not a crash", () => {
    const submitted = [{ questionId: "q1", selectedAnswer: "A", timeTaken: 5 }];
    const result = scoreAttempt(mockQuiz, submitted);
    expect(result.correctAnswers).toBe(1);
    expect(result.wrongAnswers).toBe(1);
    expect(result.answers[1].selectedAnswer).toBeNull();
  });
});