import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchQuizById, clearCurrentQuiz } from "../redux/slices/quizSlice";
import { submitAttempt } from "../redux/slices/attemptSlice";

function TakeQuiz() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currentQuiz, loading: quizLoading } = useSelector((state) => state.quiz);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const questionStartRef = useRef(0);
  const selectedOptionRef = useRef(null);

  useEffect(() => {
    dispatch(fetchQuizById(id));
    return () => dispatch(clearCurrentQuiz());
  }, [dispatch, id]);

  const currentQuestion = currentQuiz?.questions?.[currentIndex];

  const [prevIndex, setPrevIndex] = useState(currentIndex);
  if (prevIndex !== currentIndex) {
    setPrevIndex(currentIndex);
    setSelectedOption(null);
    if (currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit);
    }
  }

  const goToNext = useCallback(
    (chosenOption) => {
      const timeTaken = Math.round((Date.now() - (questionStartRef.current || Date.now())) / 1000);

      const newAnswer = {
        questionId: currentQuestion._id,
        selectedAnswer: chosenOption,
        timeTaken,
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      if (currentIndex + 1 < currentQuiz.questions.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        dispatch(
          submitAttempt({ quizId: currentQuiz._id, answers: updatedAnswers })
        ).then((result) => {
          if (submitAttempt.fulfilled.match(result)) {
            navigate(`/attempts/${result.payload._id}`);
          }
        });
      }
    },
    [answers, currentIndex, currentQuestion, currentQuiz, dispatch, navigate]
  );

  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  // Single effect: resets AND runs the countdown for the current question
  useEffect(() => {
    if (!currentQuestion) return;

    questionStartRef.current = Date.now();
    let remaining = currentQuestion.timeLimit;

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        goToNext(selectedOptionRef.current);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, currentQuestion, goToNext]);

  const handleSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNextClick = () => {
    goToNext(selectedOption);
  };

  if (quizLoading || !currentQuiz || !currentQuestion) {
    return <div className="p-8 text-center">Loading quiz...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
          <span>
            Question {currentIndex + 1} / {currentQuiz.questions.length}
          </span>
          <span
            className={`font-semibold ${
              timeLeft <= 5 ? "text-red-600" : "text-gray-700"
            }`}
          >
            {timeLeft}s
          </span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">{currentQuestion.question}</h2>

          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-3 rounded border transition ${
                  selectedOption === option
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white hover:bg-gray-50 border-gray-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextClick}
            disabled={selectedOption === null}
            className="w-full mt-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-40"
          >
            {currentIndex + 1 < currentQuiz.questions.length ? "Next" : "Submit Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TakeQuiz;