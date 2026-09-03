const rooms = new Map();

export const createRoom = (roomCode, roomData) => {
  rooms.set(roomCode, roomData);
  return rooms.get(roomCode);
};

export const getRoom = (roomCode) => {
  return rooms.get(roomCode);
};

export const updateRoom = (roomCode, updates) => {
  const room = rooms.get(roomCode);
  if (!room) return null;
  Object.assign(room, updates);
  return room;
};

export const deleteRoom = (roomCode) => {
  rooms.delete(roomCode);
};

export const roomExists = (roomCode) => {
  return rooms.has(roomCode);
};

// --- Quiz-progression helpers ---

export const startQuestion = (roomCode, questionIndex, timeLimitSeconds) => {
  const room = getRoom(roomCode);
  if (!room) return null;

  const now = Date.now();
  room.currentQuestionIndex = questionIndex;
  room.questionStartedAt = now;
  room.questionEndsAt = now + timeLimitSeconds * 1000;
  room.answers[questionIndex] = {}; // userId -> { selectedAnswer, timeTaken, correct }

  return room;
};

export const recordAnswer = (roomCode, questionIndex, userId, selectedAnswer, timeTaken, correct, points) => {
  const room = getRoom(roomCode);
  if (!room) return null;

  room.answers[questionIndex][userId] = { selectedAnswer, timeTaken, correct, points };

  const player = room.players.find((p) => p.userId === userId);
  if (player) {
    player.score = (player.score || 0) + points;
    player.answered = true;
  }

  return room;
};

export const resetAnsweredFlags = (roomCode) => {
  const room = getRoom(roomCode);
  if (!room) return null;
  room.players.forEach((p) => (p.answered = false));
  return room;
};

export const getCurrentQuestionSnapshot = (room) => {
  if (!room || room.currentQuestionIndex < 0 || !room.questionEndsAt) {
    return null;
  }
  return {
    questionIndex: room.currentQuestionIndex,
    questionEndsAt: room.questionEndsAt,
  };
};