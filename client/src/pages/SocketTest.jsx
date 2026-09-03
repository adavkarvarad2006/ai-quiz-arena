import { useEffect, useState } from "react";
import { socket } from "../socket/socket";

function SocketTest() {
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState([]);
  const [roomCode, setRoomCode] = useState("TEST1");
  const [name, setName] = useState("");

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("player-joined", (updatedPlayers) => setPlayers(updatedPlayers));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("player-joined");
      socket.disconnect();
    };
  }, []);

  const handleJoin = () => {
    socket.emit("join-room", { roomCode, name });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow space-y-4">
        <h1 className="text-xl font-bold">Socket Test</h1>
        <p className="text-sm">
          Status:{" "}
          <span className={connected ? "text-green-600" : "text-red-600"}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </p>

        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          placeholder="Room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          onClick={handleJoin}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Join Room
        </button>

        <div>
          <h2 className="font-semibold text-sm mb-1">Players in room:</h2>
          <ul className="text-sm">
            {players.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SocketTest;