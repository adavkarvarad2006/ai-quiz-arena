export const scoreAttempt = (quiz, submittedAnswers) => {
  let correctAnswers = 0;
  const answers = [];

  quiz.questions.forEach((question) => {
    const submitted = submittedAnswers.find(
      (a) => a.questionId === question._id.toString()
    );

    const selectedAnswer = submitted?.selectedAnswer ?? null;
    const timeTaken = submitted?.timeTaken ?? question.timeLimit;
    const correct = selectedAnswer === question.correctAnswer;

    if (correct) correctAnswers++;

    answers.push({
      questionId: question._id,
      selectedAnswer,
      correct,
      timeTaken,
    });
  });

  const total = quiz.questions.length;
  const wrongAnswers = total - correctAnswers;
  const percentage = Math.round((correctAnswers / total) * 100);
  const score = correctAnswers; // simple 1-point-per-question for practice mode

  return { answers, score, percentage, correctAnswers, wrongAnswers };
};