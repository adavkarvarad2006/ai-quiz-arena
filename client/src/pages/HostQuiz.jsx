import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { socket } from "../socket/socket";
import Leaderboard from "../components/Leaderboard";

function HostQuiz() {
    const { roomCode } = useParams();
    const { user } = useSelector((state) => state.auth);

    const [question, setQuestion] = useState(null);
    const [answered, setAnswered] = useState({ answered: 0, total: 0 });
    const [ended, setEnded] = useState(null); // { correctAnswer, explanation, leaderboard }
    const [finished, setFinished] = useState(null); // { leaderboard }
    const [paused, setPaused] = useState(false);
    const [playerCount, setPlayerCount] = useState(null);

    useEffect(() => {
        socket.on("new-question", (q) => {
            setQuestion(q);
            setEnded(null);
            setAnswered({ answered: 0, total: 0 });
        });

        socket.on("answer-progress", (progress) => setAnswered(progress));
        socket.on("question-ended", (data) => setEnded(data));
        socket.on("quiz-finished", (data) => setFinished(data));

        socket.on("room-state", (state) => {
            if (state.question) {
                setQuestion(state.question);
            }
        });

        socket.on("host-disconnected", () => setPaused(true));
        socket.on("host-reconnected", () => setPaused(false));

        socket.on("player-joined", (players) => {
            setPlayerCount(
                players.filter((p) => !p.isHost && p.connected !== false).length
            );
        });

        // Catch up in case new-question already fired before we mounted
        socket.emit("get-room-state", { roomCode });

        // If our own connection drops and Socket.IO auto-reconnects,
        // re-announce ourselves so the server treats us as the same host
        // (score/session preserved) rather than a brand-new stranger.
        const handleReconnect = () => {
            socket.emit("join-room", {
                roomCode,
                name: user.name,
                userId: user._id,
                isHost: true,
            });
            socket.emit("get-room-state", { roomCode });
        };
        socket.io.on("reconnect", handleReconnect);

        return () => {
            socket.off("new-question");
            socket.off("answer-progress");
            socket.off("question-ended");
            socket.off("quiz-finished");
            socket.off("room-state");
            socket.off("host-disconnected");
            socket.off("host-reconnected");
            socket.off("player-joined");
            socket.io.off("reconnect", handleReconnect);
        };
    }, [roomCode, user]);

    const handleNext = () => {
        socket.emit("next-question", { roomCode });
    };

    const handleEndQuiz = () => {
        socket.emit("end-quiz", { roomCode });
    };

    if (finished) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center space-y-4">
            <h1 className="text-2xl font-bold">Quiz Finished</h1>
            <Leaderboard entries={finished.leaderboard} title="" />
            <Link
                to={`/organize/analytics/${roomCode}`}
                className="block bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
            >
            View Analytics
            </Link>
            </div>
            </div>
        );
    }

    if (!question) {
        return <div className="p-8 text-center">Waiting for first question...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-xl mx-auto space-y-4">
                {paused && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded text-center">
                        Connection lost — reconnecting...
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm text-gray-500 mb-2">
                        Question {question.questionIndex + 1} / {question.totalQuestions}
                    </p>
                    <h2 className="text-lg font-semibold mb-4">{question.question}</h2>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {question.options.map((opt) => (
                            <div key={opt} className="border rounded px-3 py-2 text-sm">
                                {opt}
                            </div>
                        ))}
                    </div>

                    <p className="text-sm text-gray-600">
                        Players answered: {answered.answered} / {answered.total}
                    </p>
                    {playerCount !== null && (
                        <p className="text-xs text-gray-400 mt-1">
                            {playerCount} player(s) connected
                        </p>
                    )}
                </div>

                {ended && (
                    <div className="bg-white p-6 rounded-lg shadow space-y-3">
                        <p className="font-semibold text-green-600">
                            Correct Answer: {ended.correctAnswer}
                        </p>
                        {ended.explanation && (
                            <p className="text-sm text-gray-500">{ended.explanation}</p>
                        )}

                        <Leaderboard entries={ended.leaderboard} />

                        <div className="flex gap-2">
                            <button
                                onClick={handleNext}
                                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            >
                                Next Question
                            </button>
                            <button
                                onClick={handleEndQuiz}
                                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
                            >
                                End Quiz
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HostQuiz;