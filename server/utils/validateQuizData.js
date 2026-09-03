export const validateQuizData = (data) => {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Response is not an object"] };
  }

  if (!data.title || typeof data.title !== "string") {
    errors.push("Missing or invalid title");
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push("Missing or empty questions array");
    return { valid: false, errors };
  }

  data.questions.forEach((q, i) => {
    const prefix = `Question ${i + 1}:`;

    if (!q.question || typeof q.question !== "string") {
      errors.push(`${prefix} missing question text`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${prefix} must have exactly 4 options`);
    }

    if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
      errors.push(`${prefix} missing correctAnswer`);
    } else if (Array.isArray(q.options) && !q.options.includes(q.correctAnswer)) {
      errors.push(`${prefix} correctAnswer does not match any option`);
    }

    if (q.timeLimit && typeof q.timeLimit !== "number") {
      errors.push(`${prefix} timeLimit must be a number`);
    }
  });

  return { valid: errors.length === 0, errors };
};