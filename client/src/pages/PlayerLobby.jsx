import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { socket } from "../socket/socket";

const getGuestId = () => {
  let guestId = sessionStorage.getItem("guestId");
  if (!guestId) {
    guestId = `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    sessionStorage.setItem("guestId", guestId);
  }
  return guestId;
};

function PlayerLobby() {
    const { roomCode } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const name = location.state?.name || user?.name || "Player";
    const userId = user?._id || getGuestId();

    const [players, setPlayers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        socket.connect();

        socket.emit("join-room", {
            roomCode,
            name,
            userId,
            isHost: false,
        });

        socket.on("player-joined", (updatedPlayers) => setPlayers(updatedPlayers));
        socket.on("room-error", ({ message }) => setError(message));
        socket.on("quiz-started", () => {
            navigate(`/quiz/${roomCode}/play`);
        });

        return () => {
            socket.off("player-joined");
            socket.off("room-error");
            socket.off("quiz-started");
        };
    }, [roomCode, name, userId, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-sm">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate("/join")}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center space-y-4">
                <h1 className="text-lg font-semibold">Room {roomCode}</h1>

                <div className="text-left">
                    <h2 className="font-semibold mb-2">Players:</h2>
                    <ul className="space-y-1">
                        {players.map((p) => (
                            <li key={p.socketId} className="text-sm">
                                {p.name} {p.isHost && "(Host)"}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-sm text-gray-500 animate-pulse">
                    Waiting for host to start...
                </p>
            </div>
        </div>
    );
}

export default PlayerLobby;