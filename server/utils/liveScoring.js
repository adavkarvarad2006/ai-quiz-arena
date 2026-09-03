// Base points for a correct answer, scaled down by how much time was used.
// Answering instantly (timeTaken ≈ 0) yields close to full base points.
// Answering right at the deadline yields close to half base points.
// Wrong answers always score 0.
const BASE_POINTS = 1000;
const MIN_POINTS_RATIO = 0.5; // slowest correct answer still gets 50% of base

export const calculatePoints = (correct, timeTaken, timeLimit) => {
  if (!correct) return 0;

  const clampedTime = Math.min(Math.max(timeTaken, 0), timeLimit);
  const speedRatio = 1 - clampedTime / timeLimit; // 1 = instant, 0 = used all time
  const points = BASE_POINTS * (MIN_POINTS_RATIO + (1 - MIN_POINTS_RATIO) * speedRatio);

  return Math.round(points);
};