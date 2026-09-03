import { computeRoomAnalytics } from "./computeRoomAnalytics.js";

describe("computeRoomAnalytics", () => {
  test("computes analytics correctly for guest and registered users", () => {
    const room = {
      players: [
        { userId: "host123", name: "Host", isHost: true },
        { userId: "guest-abc-123", name: "Guest Player", isHost: false, score: 200 },
        { userId: "user456", name: "Registered Player", isHost: false, score: 100 },
      ],
      answers: {
        0: {
          "guest-abc-123": { selectedAnswer: "A", timeTaken: 5, correct: true, points: 100 },
          user456: { selectedAnswer: "B", timeTaken: 10, correct: false, points: 0 },
        },
        1: {
          "guest-abc-123": { selectedAnswer: "C", timeTaken: 3, correct: true, points: 100 },
          user456: { selectedAnswer: "C", timeTaken: 4, correct: true, points: 100 },
        },
      },
    };

    const quiz = {
      questions: [
        { question: "Q1?", correctAnswer: "A" },
        { question: "Q2?", correctAnswer: "C" },
      ],
    };

    const { questionStats, participants } = computeRoomAnalytics(room, quiz);

    expect(participants.length).toBe(2);

    const guestParticipant = participants.find((p) => p.userId === "guest-abc-123");
    expect(guestParticipant).toBeDefined();
    expect(guestParticipant.finalScore).toBe(200);
    expect(guestParticipant.correctAnswers).toBe(2);
    expect(guestParticipant.wrongAnswers).toBe(0);
    expect(guestParticipant.avgResponseTime).toBe(4);

    expect(questionStats.length).toBe(2);
    expect(questionStats[0].correctCount).toBe(1);
    expect(questionStats[0].wrongCount).toBe(1);
  });
});
