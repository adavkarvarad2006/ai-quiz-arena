# AI Quiz Arena

A full-stack MERN application for creating AI-generated quizzes and taking them either solo (**Practice Mode**) or as a live multiplayer game (**Organizer Mode**), powered by Socket.IO for real-time gameplay.

---

## Features

### Core
- JWT authentication (register, login, persistent sessions)
- AI-powered quiz generation (Google Gemini) with server-side validation of AI output
- Manual quiz creation as an alternative to AI generation
- A quiz is a reusable entity — the same quiz can be taken solo or hosted live, with no duplication

### Practice Mode
- Take any quiz solo, one question at a time, with a per-question countdown timer
- Automatic scoring, percentage, correct/wrong breakdown
- Full review screen with explanations and clearly flagged unanswered questions
- Attempt history saved per user

### Organizer Mode (Live Multiplayer)
- Host a quiz in a live room with a shareable room code
- Real-time lobby — players join and appear instantly for the host
- Synchronized questions across all players, with a server-authoritative timer
- Server-side scoring (correctness + speed), never trusting the client
- Live leaderboard with rank-change indicators (↑ / ↓ / –)
- Per-player personal results at the end (score, rank, accuracy, avg response time)
- Host-only post-game analytics: per-question accuracy, average response time, participant breakdown
- Reconnection handling for both host and players (score/session preserved)
- Guests can join and play without creating an account

---

## Tech Stack

**Frontend:** React (Vite), React Router, Redux Toolkit, Tailwind CSS, Axios, Socket.IO Client

**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, bcrypt

**AI:** Google Gemini API (`@google/genai`), isolated behind a swappable service layer

**Testing:** Jest, Supertest, mongodb-memory-server

---

## Project Structure

```
ai-quiz-arena/
├── client/
│   ├── src/
│   │   ├── components/       # Shared UI (ProtectedRoute, Leaderboard, etc.)
│   │   ├── pages/             # Route-level pages
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   └── slices/        # auth, quiz, attempt, room
│   │   ├── services/          # Axios instance + interceptor
│   │   ├── socket/            # Socket.IO client instance
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/
│   ├── config/                # DB connection
│   ├── controllers/
│   ├── models/                 # User, Quiz, QuizAttempt, LiveRoom
│   ├── routes/
│   ├── middleware/             # auth, rate limiting
│   ├── services/
│   │   └── aiService.js        # AI provider logic, isolated for easy swapping
│   ├── sockets/
│   │   ├── quizSocket.js       # Real-time game loop
│   │   └── roomState.js        # In-memory live room state
│   ├── utils/
│   ├── tests/
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local instance or a MongoDB Atlas cluster)
- A Google Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier available)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/ai-quiz-arena.git
cd ai-quiz-arena

cd server && npm install
cd ../client && npm install
```

### 2. Environment variables

Create `server/.env`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ai-quiz-arena
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
```

Create `client/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

### 3. Run it

Two terminals:

```bash
# terminal 1
cd server
npm run dev
```

```bash
# terminal 2
cd client
npm run dev
```

Visit `http://localhost:5173`.

---

## Running Tests

```bash
cd server
npm test
```

Covers scoring logic, live-scoring math, AI output validation, and the full auth API flow against an in-memory MongoDB instance. Multiplayer/socket flows are covered by the manual test checklist below rather than automated tests, since they require real concurrent connections.

### Manual test checklist (multiplayer)

- [ ] Register → login → create a quiz manually → generate one with AI
- [ ] Take a quiz in Practice Mode, let a question time out, confirm it's flagged in the review
- [ ] Host a room, join with 2+ separate (unauthenticated) player tabs, start the quiz
- [ ] Confirm synced questions/timers, correct scoring, and leaderboard trend arrows
- [ ] Finish a game — confirm host analytics and each player's personal result
- [ ] Try an invalid room code and a finished room's code on `/join`
- [ ] Disconnect a player mid-game and confirm the host's connected count updates

---

## Deployment

- **Database:** MongoDB Atlas (free M0 tier)
- **Backend:** Render, Railway, or Fly.io — needs to support persistent WebSocket connections, so avoid pure serverless platforms
- **Frontend:** Vercel or Netlify

Set the deployed backend's `CLIENT_URL` to include your deployed frontend origin, and the frontend's `VITE_API_URL` to point at your deployed backend's `/api` path.

---

## Architecture Notes

- **REST vs. Socket.IO:** anything CRUD-like and non-time-sensitive (auth, quiz management, attempt history) goes through REST. Anything that needs to push updates to multiple connected clients instantly (lobby state, live questions, leaderboard) goes through Socket.IO.
- **Live room state** lives in memory on the server during an active game (`server/sockets/roomState.js`), not in MongoDB — only the final summary is persisted once a room finishes. This keeps the hot path fast and leaves room to introduce Redis later for multi-instance scaling without touching game logic.
- **Server-authoritative game loop:** the server owns the current question, the countdown deadline, correctness, and scoring at every point. Clients only ever send which option they picked — never a claimed "correct" or "time's up" state.
- **AI output is never trusted blindly:** every AI-generated quiz is validated server-side (exactly 4 options, a correct answer that matches one of them, well-formed structure) before it's shown to the user or saved.

---

## License

This project was built as a learning exercise following a phased MERN development plan.
