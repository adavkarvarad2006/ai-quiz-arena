import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { socket } from "../socket/socket";
import Leaderboard from "../components/Leaderboard";

const getGuestId = () => {
    let guestId = sessionStorage.getItem("guestId");
    if (!guestId) {
        guestId = `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;
        sessionStorage.setItem("guestId", guestId);
    }
    return guestId;
};

function PlayerQuiz() {
    const { roomCode } = useParams();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const name = location.state?.name || user?.name || "Player";
    const userId = user?._id || getGuestId();

    const [question, setQuestion] = useState(null);
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [ended, setEnded] = useState(null);
    const [finished, setFinished] = useState(null);
    const [myResult, setMyResult] = useState(null);
    const [disconnected, setDisconnected] = useState(false);

    const tickRef = useRef(null);

    // Socket listeners + catch-up request on mount
    useEffect(() => {
        socket.on("new-question", (q) => {
            setQuestion(q);
            setSelected(null);
            setSubmitted(false);
            setEnded(null);
            setMyResult(null);
        });

        socket.on("answer-received", (result) => setMyResult(result));
        socket.on("question-ended", (data) => setEnded(data));
        socket.on("quiz-finished", (data) => setFinished(data));

        socket.on("room-state", (state) => {
            if (state.question) {
                setQuestion(state.question);
            }
        });

        socket.emit("get-room-state", { roomCode });

        // If our connection drops and Socket.IO auto-reconnects, re-announce
        // ourselves with the same userId so the server treats us as the same
        // player (score preserved) rather than a new stranger.
        const handleReconnect = () => {
            setDisconnected(false);
            socket.emit("join-room", { roomCode, name, userId, isHost: false });
            socket.emit("get-room-state", { roomCode });
        };
        const handleDisconnect = () => setDisconnected(true);

        socket.io.on("reconnect", handleReconnect);
        socket.on("disconnect", handleDisconnect);

        return () => {
            socket.off("new-question");
            socket.off("answer-received");
            socket.off("question-ended");
            socket.off("quiz-finished");
            socket.off("room-state");
            socket.off("disconnect", handleDisconnect);
            socket.io.off("reconnect", handleReconnect);
        };
    }, [roomCode, name, userId]);

    // Countdown display, driven by the server's questionEndsAt timestamp
    useEffect(() => {
        if (!question) return;

        clearInterval(tickRef.current);

        const update = () => {
            const remaining = Math.max(
                0,
                Math.ceil((question.questionEndsAt - Date.now()) / 1000)
            );
            setTimeLeft(remaining);
        };

        update();
        tickRef.current = setInterval(update, 250);

        return () => clearInterval(tickRef.current);
    }, [question]);

    const handleSelect = (option) => {
        if (submitted) return;
        setSelected(option);
    };

    const handleSubmit = () => {
        if (submitted || selected === null || !question) return;
        setSubmitted(true);
        socket.emit("submit-answer", {
            roomCode,
            questionIndex: question.questionIndex,
            selectedAnswer: selected,
        });
    };

    if (finished) {
        const { myResult } = finished;
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center space-y-4">
                    <h1 className="text-2xl font-bold">Quiz Finished!</h1>

                    {myResult && (
                        <div className="bg-blue-50 rounded p-4 text-left space-y-1">
                            <p className="font-semibold text-center mb-2">Your Result</p>
                            <div className="flex justify-between text-sm">
                                <span>Score</span>
                                <span className="font-semibold">{myResult.finalScore}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Rank</span>
                                <span className="font-semibold">
                                    {myResult.rank} / {finished.leaderboard.length}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Accuracy</span>
                                <span className="font-semibold">{myResult.accuracy}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Correct</span>
                                <span className="font-semibold">
                                    {myResult.correctAnswers} / {myResult.totalQuestions}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Avg Response Time</span>
                                <span className="font-semibold">{myResult.avgResponseTime}s</span>
                            </div>
                        </div>
                    )}

                    <Leaderboard entries={finished.leaderboard} title="Final Leaderboard" />
                </div>
            </div>
        );
    }

    if (!question) {
        return <div className="p-8 text-center">Waiting for the host to start...</div>;
    }

    if (ended) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center space-y-3">
                    <p className="font-semibold text-green-600">
                        Correct Answer: {ended.correctAnswer}
                    </p>
                    {ended.explanation && (
                        <p className="text-sm text-gray-500">{ended.explanation}</p>
                    )}
                    {myResult && (
                        <p className={myResult.correct ? "text-green-600" : "text-red-600"}>
                            {myResult.correct ? `+${myResult.points} points!` : "Incorrect"}
                        </p>
                    )}
                    <p className="text-sm text-gray-400">Waiting for host to continue...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-md mx-auto">
                {disconnected && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded text-center mb-4">
                        Connection lost — reconnecting...
                    </div>
                )}

                <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                    <span>
                        Question {question.questionIndex + 1} / {question.totalQuestions}
                    </span>
                    <span className={timeLeft <= 5 ? "text-red-600 font-semibold" : ""}>
                        {timeLeft}s
                    </span>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="font-semibold mb-4">{question.question}</h2>

                    <div className="space-y-2 mb-4">
                        {question.options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => handleSelect(opt)}
                                disabled={submitted}
                                className={`w-full text-left px-4 py-3 rounded border transition ${selected === opt
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white hover:bg-gray-50 border-gray-300"
                                    } ${submitted ? "opacity-60" : ""}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>

                    {submitted ? (
                        <p className="text-center text-sm text-gray-500">
                            Answer submitted. Waiting for other players...
                        </p>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={selected === null}
                            className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-40"
                        >
                            Submit Answer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PlayerQuiz;