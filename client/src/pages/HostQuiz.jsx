import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { socket } from "../socket/socket";
import Leaderboard from "../components/Leaderboard";

function HostQuiz() {
    const { roomCode } = useParams();
    const { user } = useSelector((state) => state.auth);

    const [question, setQuestion] = useState(null);

    const [answered, setAnswered] = useState({
        answered: 0,
        total: 0,
    });

    const [ended, setEnded] = useState(null);

    const [finished, setFinished] = useState(null);

    const [paused, setPaused] = useState(false);

    const [playerCount, setPlayerCount] = useState(null);

    useEffect(() => {
        if (!user || !roomCode) {
            return;
        }

        // ==================================================
        // NEW QUESTION
        // ==================================================

        const handleNewQuestion = (q) => {
            console.log("NEW QUESTION:", q);

            setQuestion(q);

            setEnded(null);

            setFinished(null);

            setAnswered({
                answered: 0,
                total: 0,
            });
        };

        // ==================================================
        // ANSWER PROGRESS
        // ==================================================

        const handleAnswerProgress = (progress) => {
            console.log(
                "ANSWER PROGRESS:",
                progress
            );

            setAnswered(progress);
        };

        // ==================================================
        // QUESTION ENDED
        // ==================================================

        const handleQuestionEnded = (data) => {
            console.log(
                "QUESTION ENDED:",
                data
            );

            setEnded(data);
        };

        // ==================================================
        // QUIZ FINISHED
        // ==================================================

        const handleQuizFinished = (data) => {
            console.log(
                "QUIZ FINISHED:",
                data
            );

            setFinished(data);
        };

        // ==================================================
        // ROOM STATE
        // ==================================================

        const handleRoomState = (state) => {
            console.log(
                "ROOM STATE:",
                state
            );

            if (state.question) {
                setQuestion(state.question);
            }

            if (state.answered) {
                setAnswered(state.answered);
            }

            if (state.ended) {
                setEnded(state.ended);
            }

            if (state.finished) {
                setFinished(state.finished);
            }
        };

        // ==================================================
        // HOST DISCONNECTED
        // ==================================================

        const handleHostDisconnected = () => {
            console.log("HOST DISCONNECTED");

            setPaused(true);
        };

        // ==================================================
        // HOST RECONNECTED
        // ==================================================

        const handleHostReconnected = () => {
            console.log("HOST RECONNECTED");

            setPaused(false);
        };

        // ==================================================
        // PLAYER JOINED
        // ==================================================

        const handlePlayerJoined = (players) => {
            console.log(
                "PLAYERS:",
                players
            );

            const connectedPlayers =
                players.filter(
                    (p) =>
                        !p.isHost &&
                        p.connected !== false
                );

            setPlayerCount(
                connectedPlayers.length
            );
        };

        // ==================================================
        // ROOM ERROR
        // ==================================================

        const handleRoomError = (data) => {
            console.error(
                "ROOM ERROR:",
                data
            );

            alert(
                data?.message ||
                "Something went wrong with the room."
            );
        };

        // ==================================================
        // REGISTER EVENTS
        // ==================================================

        socket.on(
            "new-question",
            handleNewQuestion
        );

        socket.on(
            "answer-progress",
            handleAnswerProgress
        );

        socket.on(
            "question-ended",
            handleQuestionEnded
        );

        socket.on(
            "quiz-finished",
            handleQuizFinished
        );

        socket.on(
            "room-state",
            handleRoomState
        );

        socket.on(
            "host-disconnected",
            handleHostDisconnected
        );

        socket.on(
            "host-reconnected",
            handleHostReconnected
        );

        socket.on(
            "player-joined",
            handlePlayerJoined
        );

        socket.on(
            "room-error",
            handleRoomError
        );

        // ==================================================
        // JOIN ROOM AS HOST
        // ==================================================

        console.log(
            "Joining room as host:",
            roomCode
        );

        socket.emit("join-room", {
            roomCode,
            name: user.name,
            userId: user._id,
            isHost: true,
        });

        // ==================================================
        // GET CURRENT ROOM STATE
        // ==================================================

        console.log(
            "Requesting room state:",
            roomCode
        );

        socket.emit(
            "get-room-state",
            {
                roomCode,
            }
        );

        // ==================================================
        // SOCKET RECONNECT
        // ==================================================

        const handleReconnect = () => {
            console.log(
                "SOCKET RECONNECTED"
            );

            socket.emit("join-room", {
                roomCode,
                name: user.name,
                userId: user._id,
                isHost: true,
            });

            socket.emit(
                "get-room-state",
                {
                    roomCode,
                }
            );
        };

        socket.io.on(
            "reconnect",
            handleReconnect
        );

        // ==================================================
        // CLEANUP
        // ==================================================

        return () => {
            socket.off(
                "new-question",
                handleNewQuestion
            );

            socket.off(
                "answer-progress",
                handleAnswerProgress
            );

            socket.off(
                "question-ended",
                handleQuestionEnded
            );

            socket.off(
                "quiz-finished",
                handleQuizFinished
            );

            socket.off(
                "room-state",
                handleRoomState
            );

            socket.off(
                "host-disconnected",
                handleHostDisconnected
            );

            socket.off(
                "host-reconnected",
                handleHostReconnected
            );

            socket.off(
                "player-joined",
                handlePlayerJoined
            );

            socket.off(
                "room-error",
                handleRoomError
            );

            socket.io.off(
                "reconnect",
                handleReconnect
            );
        };
    }, [roomCode, user]);

    // ==================================================
    // NEXT QUESTION
    // ==================================================

    const handleNext = () => {
        console.log(
            "NEXT BUTTON CLICKED"
        );

        console.log(
            "Socket connected:",
            socket.connected
        );

        console.log(
            "Socket ID:",
            socket.id
        );

        console.log(
            "Room:",
            roomCode
        );

        socket.emit(
            "next-question",
            {
                roomCode,
            }
        );
    };

    // ==================================================
    // END QUIZ
    // ==================================================

    const handleEndQuiz = () => {
        console.log(
            "END BUTTON CLICKED"
        );

        console.log(
            "Socket connected:",
            socket.connected
        );

        console.log(
            "Socket ID:",
            socket.id
        );

        console.log(
            "Room:",
            roomCode
        );

        socket.emit(
            "end-quiz",
            {
                roomCode,
            }
        );
    };

    // ==================================================
    // FINISHED
    // ==================================================

    if (finished) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow text-center space-y-4">

                    <h1 className="text-2xl font-bold">
                        Quiz Finished
                    </h1>

                    <Leaderboard
                        entries={
                            finished.leaderboard
                        }
                        title=""
                    />

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

    // ==================================================
    // WAITING
    // ==================================================

    if (!question) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">

                <div className="text-center">

                    <p className="p-8 text-center">
                        {paused
                            ? "Connection lost — reconnecting..."
                            : "Waiting for first question..."}
                    </p>

                    <p className="text-xs text-gray-400">
                        Room: {roomCode}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                        Socket:{" "}
                        {socket.connected
                            ? "Connected"
                            : "Disconnected"}
                    </p>

                </div>

            </div>
        );
    }

    // ==================================================
    // HOST QUIZ
    // ==================================================

    return (
        <div className="min-h-screen bg-gray-100 p-8">

            <div className="max-w-xl mx-auto space-y-4">

                {/* CONNECTION STATUS */}

                {paused && (
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded text-center">
                        Connection lost — reconnecting...
                    </div>
                )}

                {/* QUESTION */}

                <div className="bg-white p-6 rounded-lg shadow">

                    <p className="text-sm text-gray-500 mb-2">
                        Question{" "}
                        {question.questionIndex + 1}{" "}
                        /{" "}
                        {question.totalQuestions}
                    </p>

                    <h2 className="text-lg font-semibold mb-4">
                        {question.question}
                    </h2>

                    <div className="grid grid-cols-2 gap-2 mb-4">

                        {question.options.map(
                            (opt) => (
                                <div
                                    key={opt}
                                    className="border rounded px-3 py-2 text-sm"
                                >
                                    {opt}
                                </div>
                            )
                        )}

                    </div>

                    <p className="text-sm text-gray-600">
                        Players answered:{" "}
                        {answered.answered}{" "}
                        /{" "}
                        {answered.total}
                    </p>

                    {playerCount !== null && (
                        <p className="text-xs text-gray-400 mt-1">
                            {playerCount} player(s)
                            connected
                        </p>
                    )}

                </div>

                {/* QUESTION ENDED */}

                {ended && (
                    <div className="bg-white p-6 rounded-lg shadow space-y-3">

                        <p className="font-semibold text-green-600">
                            Correct Answer:{" "}
                            {ended.correctAnswer}
                        </p>

                        {ended.explanation && (
                            <p className="text-sm text-gray-500">
                                {ended.explanation}
                            </p>
                        )}

                        <Leaderboard
                            entries={
                                ended.leaderboard
                            }
                        />

                        {/* BUTTONS */}

                        <div className="flex gap-2">

                            <button
                                type="button"
                                onClick={
                                    handleNext
                                }
                                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 cursor-pointer"
                            >
                                Next Question
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleEndQuiz
                                }
                                className="flex-1 bg-gray-300 text-black py-2 rounded hover:bg-gray-400 cursor-pointer"
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