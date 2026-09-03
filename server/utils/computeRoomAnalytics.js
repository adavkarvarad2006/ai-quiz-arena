export const computeRoomAnalytics = (room, quiz) => {
  const nonHostPlayers = room.players.filter((p) => !p.isHost);

  // Per-question aggregates
  const questionStats = quiz.questions.map((question, index) => {
    const answersForQuestion = room.answers[index] || {};
    const entries = Object.values(answersForQuestion);

    const correctCount = entries.filter((a) => a.correct).length;
    const wrongCount = entries.length - correctCount;
    const avgResponseTime =
      entries.length > 0
        ? entries.reduce((sum, a) => sum + a.timeTaken, 0) / entries.length
        : 0;

    return {
      questionIndex: index,
      questionText: question.question,
      correctCount,
      wrongCount,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
    };
  });

  // Per-participant aggregates
  const participants = nonHostPlayers.map((player) => {
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalTime = 0;
    let answeredCount = 0;

    quiz.questions.forEach((_, index) => {
      const answer = room.answers[index]?.[String(player.userId)];
      if (answer) {
        answeredCount++;
        totalTime += answer.timeTaken;
        if (answer.correct) correctAnswers++;
        else wrongAnswers++;
      }
    });

    return {
      userId: String(player.userId),
      name: player.name,
      finalScore: player.score || 0,
      correctAnswers,
      wrongAnswers,
      avgResponseTime:
        answeredCount > 0 ? Math.round((totalTime / answeredCount) * 10) / 10 : 0,
    };
  });

  return { questionStats, participants };
};