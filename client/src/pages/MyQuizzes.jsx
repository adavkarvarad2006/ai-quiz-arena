import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchMyQuizzes } from "../redux/slices/quizSlice";

function MyQuizzes() {
  const dispatch = useDispatch();
  const { quizzes, loading, error } = useSelector((state) => state.quiz);

  useEffect(() => {
    dispatch(fetchMyQuizzes());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Quizzes</h1>
          <div className="flex gap-2">
            <Link
              to="/quizzes/generate"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              ✨ Generate with AI
            </Link>
            <Link
              to="/quizzes/create"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Create Manually
            </Link>
          </div>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && quizzes.length === 0 && (
          <p className="text-gray-500">No quizzes yet. Create your first one.</p>
        )}

        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Link
              key={quiz._id}
              to={`/quizzes/${quiz._id}`}
              className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition"
            >
              <h2 className="font-semibold">{quiz.title}</h2>
              <p className="text-sm text-gray-500">
                {quiz.topic} • {quiz.difficulty} • {quiz.questions.length} questions
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyQuizzes;