import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAttemptById,
  clearCurrentAttempt,
} from "../redux/slices/attemptSlice";

function AttemptResult() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { currentAttempt, loading } = useSelector(
    (state) => state.attempt
  );

  useEffect(() => {
    dispatch(fetchAttemptById(id));

    return () => dispatch(clearCurrentAttempt());
  }, [dispatch, id]);

  const quiz = currentAttempt?.quizId;

  if (loading || !currentAttempt || !quiz || !quiz.questions) {
    return (
      <div className="p-8 text-center">
        Loading result...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Result Summary */}
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold mb-1">
            Quiz Completed
          </h1>

          <p className="text-gray-500 mb-4">
            {quiz.title}
          </p>

          <div className="text-4xl font-bold text-blue-600 mb-1">
            {currentAttempt.percentage}%
          </div>

          <p className="text-gray-600 mb-4">
            {currentAttempt.correctAnswers} /{" "}
            {currentAttempt.answers.length} correct
          </p>

          <div className="flex justify-center gap-6 text-sm">
            <span className="text-green-600 font-medium">
              ✓ {currentAttempt.correctAnswers} correct
            </span>

            <span className="text-red-600 font-medium">
              ✗ {currentAttempt.wrongAnswers} wrong
            </span>
          </div>
        </div>

        {/* Review */}
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">
            Review
          </h2>

          {quiz.questions.map((q, i) => {
            const yourAnswer = currentAttempt.answers.find(
              (a) => a.questionId === q._id
            );

            // Check if the user didn't select an answer
            const noAnswer =
              !yourAnswer || yourAnswer.selectedAnswer === null;

            return (
              <div
                key={q._id}
                className="border rounded p-3"
              >
                <p className="font-medium mb-2">
                  {i + 1}. {q.question}
                </p>

                {/* No Answer / Time Ran Out */}
                {noAnswer && (
                  <p className="text-xs text-orange-600 font-medium mb-2">
                    ⏱ Time ran out — no answer selected
                  </p>
                )}

                <ul className="text-sm space-y-1 mb-2">
                  {q.options.map((opt) => {
                    const isCorrect =
                      opt === q.correctAnswer;

                    const wasSelected =
                      opt === yourAnswer?.selectedAnswer;

                    return (
                      <li
                        key={opt}
                        className={
                          isCorrect
                            ? "text-green-600 font-medium"
                            : wasSelected
                            ? "text-red-600 font-medium"
                            : "text-gray-600"
                        }
                      >
                        {opt}

                        {isCorrect && " ✓"}

                        {wasSelected &&
                          !isCorrect &&
                          " (your answer)"}
                      </li>
                    );
                  })}
                </ul>

                {/* Explanation */}
                {q.explanation && (
                  <p className="text-xs text-gray-400">
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <Link
          to="/quizzes"
          className="block text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Back to My Quizzes
        </Link>
      </div>
    </div>
  );
}

export default AttemptResult;
