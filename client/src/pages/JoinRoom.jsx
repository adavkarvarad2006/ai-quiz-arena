import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

function JoinRoom() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState(user?.name || "");

  const handleJoin = (e) => {
    e.preventDefault();
    navigate(`/quiz/${roomCode.trim().toUpperCase()}`, { state: { name } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleJoin}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm space-y-3"
      >
        <h1 className="text-2xl font-bold text-center mb-4">Join Quiz</h1>

        <input
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="w-full border rounded px-3 py-2 uppercase tracking-widest text-center"
          required
        />
        <input
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Join
        </button>
      </form>
    </div>
  );
}

export default JoinRoom;