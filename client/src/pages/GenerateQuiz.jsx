import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  generateQuizWithAI,
  createQuiz,
  clearGeneratedPreview,
} from "../redux/slices/quizSlice";
import { recommendTimeLimit } from "../utils/recommendTimeLimit";

function GenerateQuiz() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { generatedPreview, loading, error } = useSelector((state) => state.quiz);

  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [instructions, setInstructions] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(recommendTimeLimit("Medium"));

  const handleGenerate = async (e) => {
    e.preventDefault();
    dispatch(clearGeneratedPreview());
    dispatch(
      generateQuizWithAI({
        topic,
        numQuestions: Number(numQuestions),
        difficulty,
        instructions,
        timePerQuestion,
      })
    );
  };

  const handleSave = async () => {
    const result = await dispatch(createQuiz(generatedPreview));
    if (createQuiz.fulfilled.match(result)) {
      dispatch(clearGeneratedPreview());
      navigate(`/quizzes/${result.payload._id}`);
    }
  };

  const handleDiscard = () => {
    dispatch(clearGeneratedPreview());
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Generate Quiz with AI</h1>

        {error && (
          <p className="bg-red-100 text-red-700 text-sm p-2 rounded">{error}</p>
        )}

        {!generatedPreview && (
          <form onSubmit={handleGenerate} className="bg-white p-4 rounded-lg shadow space-y-3">
            <input
              placeholder="Topic (e.g. JavaScript, World History)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />

            <div className="flex gap-3">
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setTimePerQuestion(recommendTimeLimit(e.target.value));
                }}
                className="flex-1 border rounded px-3 py-2"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>

              <input
                type="number"
                min="1"
                max="20"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                className="w-28 border rounded px-3 py-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                Time per question (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                className="w-20 border rounded px-2 py-1"
              />
              <span className="text-xs text-gray-400">
                Recommended: {recommendTimeLimit(difficulty)}s
              </span>
            </div>

            <textarea
              placeholder="Optional instructions (e.g. focus on beginner concepts)"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={2}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Quiz"}
            </button>
          </form>
        )}

        {generatedPreview && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <div>
              <h2 className="text-xl font-bold">{generatedPreview.title}</h2>
              <p className="text-gray-500 text-sm">
                {generatedPreview.topic} • {generatedPreview.difficulty} •{" "}
                {generatedPreview.questions.length} questions
              </p>
            </div>

            <div className="space-y-3">
              {generatedPreview.questions.map((q, i) => (
                <div key={i} className="border rounded p-3">
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
                  {q.explanation && (
                    <p className="text-xs text-gray-400 mt-2">{q.explanation}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Time limit: {q.timeLimit}s
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Save Quiz
              </button>
              <button
                onClick={handleDiscard}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                Discard & Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateQuiz;