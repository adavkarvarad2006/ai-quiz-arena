import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { socket } from "../socket/socket";

function HostLobby() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.emit("join-room", {
      roomCode,
      name: user.name,
      userId: user._id,
      isHost: true,
    });

    socket.on("player-joined", (updatedPlayers) => setPlayers(updatedPlayers));
    socket.on("room-error", ({ message }) => setError(message));
    socket.on("quiz-started", () => {
      navigate(`/organize/room/${roomCode}/play`);
    });

    return () => {
      socket.off("player-joined");
      socket.off("room-error");
      socket.off("quiz-started");
      // Don't disconnect here — we're navigating to a page that reuses this connection
    };
  }, [roomCode, user, navigate]);

  const handleStart = () => {
    socket.emit("start-quiz", { roomCode });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const nonHostPlayers = players.filter((p) => !p.isHost);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center space-y-4">
        <h1 className="text-lg font-semibold text-gray-500">AI Quiz Arena</h1>

        <div className="text-3xl font-bold tracking-widest bg-gray-100 py-3 rounded">
          {roomCode}
        </div>
        <p className="text-sm text-gray-500">Share this code with players</p>

        <div className="text-left">
          <h2 className="font-semibold mb-2">Players: {nonHostPlayers.length}</h2>
          <ul className="space-y-1">
            {nonHostPlayers.map((p) => (
              <li key={p.socketId} className="text-sm">
                ✓ {p.name}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleStart}
          disabled={nonHostPlayers.length === 0}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-40"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}

export default HostLobby;