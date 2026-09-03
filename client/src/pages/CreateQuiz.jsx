import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createQuiz } from "../redux/slices/quizSlice";
import { recommendTimeLimit } from "../utils/recommendTimeLimit";

const emptyQuestion = (difficulty) => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
  timeLimit: recommendTimeLimit(difficulty),
});

function CreateQuiz() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error } = useSelector((state) => state.quiz);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([emptyQuestion("Medium")]);

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const addQuestion = () => setQuestions([...questions, emptyQuestion(difficulty)]);

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(
      createQuiz({ title, topic, difficulty, questions })
    );
    if (createQuiz.fulfilled.match(result)) {
      navigate(`/quizzes/${result.payload._id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Create Quiz</h1>

        {error && (
          <p className="bg-red-100 text-red-700 text-sm p-2 rounded">{error}</p>
        )}

        <div className="bg-white p-4 rounded-lg shadow space-y-3">
          <input
            placeholder="Quiz title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            placeholder="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>

        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white p-4 rounded-lg shadow space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Question {qIndex + 1}</h3>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <input
              placeholder="Question text"
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />

            {q.options.map((opt, optIndex) => (
              <input
                key={optIndex}
                placeholder={`Option ${optIndex + 1}`}
                value={opt}
                onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
            ))}

            <select
              value={q.correctAnswer}
              onChange={(e) => updateQuestion(qIndex, "correctAnswer", e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select correct answer</option>
              {q.options
                .filter((o) => o.trim() !== "")
                .map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>

            <input
              placeholder="Explanation (optional)"
              value={q.explanation}
              onChange={(e) => updateQuestion(qIndex, "explanation", e.target.value)}
              className="w-full border rounded px-3 py-2"
            />

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                Time limit (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={q.timeLimit}
                onChange={(e) =>
                  updateQuestion(qIndex, "timeLimit", Number(e.target.value))
                }
                className="w-20 border rounded px-2 py-1"
              />
              <button
                type="button"
                onClick={() =>
                  updateQuestion(qIndex, "timeLimit", recommendTimeLimit(difficulty))
                }
                className="text-xs text-blue-600 underline"
              >
                Use recommended ({recommendTimeLimit(difficulty)}s)
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="text-blue-600 text-sm"
        >
          + Add another question
        </button>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Create Quiz
        </button>
      </form>
    </div>
  );
}

export default CreateQuiz;