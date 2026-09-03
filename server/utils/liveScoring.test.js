import { calculatePoints } from "./liveScoring.js";

describe("calculatePoints", () => {
  test("wrong answer always scores 0, regardless of speed", () => {
    expect(calculatePoints(false, 0, 15)).toBe(0);
    expect(calculatePoints(false, 14, 15)).toBe(0);
  });

  test("instant correct answer scores close to full points", () => {
    const points = calculatePoints(true, 0, 15);
    expect(points).toBe(1000);
  });

  test("correct answer at the deadline still scores at least the minimum floor", () => {
    const points = calculatePoints(true, 15, 15);
    expect(points).toBe(500); // 50% floor
  });

  test("faster correct answers score more than slower correct answers", () => {
    const fast = calculatePoints(true, 2, 15);
    const slow = calculatePoints(true, 12, 15);
    expect(fast).toBeGreaterThan(slow);
  });
});