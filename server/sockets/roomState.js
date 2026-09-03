const rooms = new Map();

export const createRoom = (roomCode, roomData) => {
  rooms.set(roomCode, {
    ...roomData,

    roomCode,

    players: roomData.players || [],

    answers: roomData.answers || {},

    currentQuestionIndex:
      roomData.currentQuestionIndex ?? -1,

    status:
      roomData.status || "WAITING",
  });
};

export const getRoom = (roomCode) => {
  return rooms.get(roomCode);
};

export const startQuestion = (
  roomCode,
  questionIndex,
  timeLimit
) => {
  const room = rooms.get(roomCode);

  if (!room) return;

  room.currentQuestionIndex =
    questionIndex;

  room.questionStartedAt =
    Date.now();

  room.questionEndsAt =
    Date.now() +
    timeLimit * 1000;
};

export const resetAnsweredFlags = (
  roomCode
) => {
  const room = rooms.get(roomCode);

  if (!room) return;

  room.players.forEach(
    (player) => {
      player.answered = false;
    }
  );
};

export const recordAnswer = (
  roomCode,
  questionIndex,
  userId,
  selectedAnswer,
  timeTaken,
  correct,
  points
) => {
  const room = rooms.get(roomCode);

  if (!room) return;

  if (!room.answers[questionIndex]) {
    room.answers[questionIndex] = {};
  }

  room.answers[questionIndex][userId] = {
    selectedAnswer,
    timeTaken,
    correct,
    points,
  };

  const player =
    room.players.find(
      (p) =>
        String(p.userId) ===
        String(userId)
    );

  if (player) {
    player.score =
      (player.score || 0) +
      points;

    player.answered = true;
  }
};