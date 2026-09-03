import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchRoomAnalytics } from "../redux/slices/roomSlice";

function RoomAnalytics() {
  const { roomCode } = useParams();
  const dispatch = useDispatch();
  const { analytics, error } = useSelector((state) => state.room);

  useEffect(() => {
    dispatch(fetchRoomAnalytics(roomCode));
  }, [dispatch, roomCode]);

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  if (!analytics) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/quizzes" className="text-blue-600 text-sm">
          ← Back to My Quizzes
        </Link>

        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-1">{analytics.quiz.title}</h1>
          <p className="text-gray-500 mb-4">Room {analytics.roomCode}</p>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{analytics.totalParticipants}</p>
              <p className="text-xs text-gray-500">Participants</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.averageScore}</p>
              <p className="text-xs text-gray-500">Average Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.highestScore}</p>
              <p className="text-xs text-gray-500">Highest Score</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3">Participants</h2>
          <div className="space-y-2">
            {analytics.participants
              .sort((a, b) => b.finalScore - a.finalScore)
              .map((p, i) => (
                <div key={p.userId} className="flex justify-between text-sm border-b pb-2">
                  <span>{i + 1}. {p.name}</span>
                  <span>
                    {p.finalScore} pts • {p.correctAnswers}✓ {p.wrongAnswers}✗ •{" "}
                    {p.avgResponseTime}s avg
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3">Question Breakdown</h2>
          <div className="space-y-3">
            {analytics.questionStats.map((q) => {
              const total = q.correctCount + q.wrongCount;
              const accuracy = total > 0 ? Math.round((q.correctCount / total) * 100) : 0;
              return (
                <div key={q.questionIndex} className="border rounded p-3">
                  <p className="font-medium text-sm mb-1">
                    Q{q.questionIndex + 1}. {q.questionText}
                  </p>
                  <p className="text-xs text-gray-500">
                    Accuracy: {accuracy}% ({q.correctCount}/{total}) • Avg response:{" "}
                    {q.avgResponseTime}s
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomAnalytics;