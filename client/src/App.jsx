import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyQuizzes from "./pages/MyQuizzes";
import CreateQuiz from "./pages/CreateQuiz";
import QuizDetail from "./pages/QuizDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import GenerateQuiz from "./pages/GenerateQuiz";
import TakeQuiz from "./pages/TakeQuiz";
import AttemptResult from "./pages/AttemptResult";
import SocketTest from "./pages/SocketTest";
import HostLobby from "./pages/HostLobby";
import JoinRoom from "./pages/JoinRoom";
import PlayerLobby from "./pages/PlayerLobby";
import HostQuiz from "./pages/HostQuiz";
import PlayerQuiz from "./pages/PlayerQuiz";
import RoomAnalytics from "./pages/RoomAnalytics";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes"
        element={
          <ProtectedRoute>
            <MyQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/create"
        element={
          <ProtectedRoute>
            <CreateQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/generate"
        element={
          <ProtectedRoute>
            <GenerateQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id"
        element={
          <ProtectedRoute>
            <QuizDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id/take"
        element={
          <ProtectedRoute>
            <TakeQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attempts/:id"
        element={
          <ProtectedRoute>
            <AttemptResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/socket-test"
        element={
          <ProtectedRoute>
            <SocketTest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organize/room/:roomCode"
        element={
          <ProtectedRoute>
            <HostLobby />
          </ProtectedRoute>
        }
      />
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/quiz/:roomCode" element={<PlayerLobby />} />
      <Route
        path="/organize/room/:roomCode/play"
        element={
          <ProtectedRoute>
            <HostQuiz />
          </ProtectedRoute>
        }
      />
      <Route path="/quiz/:roomCode/play" element={<PlayerQuiz />} />
      <Route
        path="/organize/analytics/:roomCode"
        element={
          <ProtectedRoute>
            <RoomAnalytics />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;