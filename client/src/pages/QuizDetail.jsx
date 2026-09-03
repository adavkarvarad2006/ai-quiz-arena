import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchQuizById, clearCurrentQuiz } from "../redux/slices/quizSlice";
import { createRoom } from "../redux/slices/roomSlice";

function QuizDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentQuiz, loading } = useSelector((state) => state.quiz);

  useEffect(() => {
    dispatch(fetchQuizById(id));
    return () => dispatch(clearCurrentQuiz());
  }, [dispatch, id]);

  const handleHost = async () => {
    const result = await dispatch(createRoom(currentQuiz._id));
    if (createRoom.fulfilled.match(result)) {
      navigate(`/organize/room/${result.payload.roomCode}`);
    }
  };

  if (loading || !currentQuiz) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/quizzes" className="text-blue-600 text-sm">
          ← Back to My Quizzes
        </Link>

        <div className="bg-white p-6 rounded-lg shadow mt-4">
          <h1 className="text-2xl font-bold mb-1">{currentQuiz.title}</h1>
          <p className="text-gray-500 mb-4">
            {currentQuiz.topic} • {currentQuiz.difficulty}
          </p>

          <Link
            to={`/quizzes/${currentQuiz._id}/take`}
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4"
          >
            Take Quiz
          </Link>

          <button
            onClick={handleHost}
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mb-4 ml-2"
          >
            Host Live Quiz
          </button>

          <div className="space-y-4">
            {currentQuiz.questions.map((q, i) => (
              <div key={q._id} className="border rounded p-3">
                <p className="font-medium mb-2">
                  {i + 1}. {q.question}
                </p>
                <ul className="text-sm space-y-1">
                  {q.options.map((opt) => (
                    <li
                      key={opt}
                      className={
                        opt === q.correctAnswer
                          ? "text-green-600 font-medium"
                          : "text-gray-600"
                      }
                    >
                      {opt}
                      {opt === q.correctAnswer && " ✓"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizDetail;