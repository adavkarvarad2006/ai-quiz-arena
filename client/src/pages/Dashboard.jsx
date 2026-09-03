import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { fetchMyQuizzes } from "../redux/slices/quizSlice";
import { createRoom } from "../redux/slices/roomSlice";
import { useNavigate, Link } from "react-router-dom";

function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const { quizzes, loading: quizLoading } = useSelector((state) => state.quiz);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState("");
  const [hostingId, setHostingId] = useState(null);

  useEffect(() => {
    dispatch(fetchMyQuizzes());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      navigate(`/quiz/${joinCode.trim().toUpperCase()}`);
    }
  };

  const handleHostQuiz = async (quizId) => {
    setHostingId(quizId);
    const result = await dispatch(createRoom(quizId));
    setHostingId(null);
    if (createRoom.fulfilled.match(result)) {
      navigate(`/organize/room/${result.payload.roomCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
              ⚡
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI Quiz Arena
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer"
            >
              Logout 🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 md:p-10 shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block px-3 py-1 bg-indigo-500/30 text-indigo-200 text-xs font-semibold rounded-full border border-indigo-400/30 backdrop-blur-sm">
              ✨ Welcome back
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to test knowledge, {user?.name}?
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
              Generate instant quizzes with Gemini AI, host live multiplayer arenas with realtime scoring, or join an active room code.
            </p>

            {/* Quick Join Bar */}
            <form onSubmit={handleQuickJoin} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter Room Code (e.g. ABCD)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-400 backdrop-blur-md flex-1"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold transition shadow-lg cursor-pointer flex items-center justify-center gap-1"
              >
                🎮 Join Room
              </button>
            </form>
          </div>

          {/* Decorative background blur circles */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Feature Cards Grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* AI Generator Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  ✨
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Generate with AI</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Create custom multiple-choice quizzes automatically powered by Google Gemini.
                </p>
              </div>
              <Link
                to="/quizzes/generate"
                className="w-full py-2.5 text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
              >
                Generate Quiz
              </Link>
            </div>

            {/* Create Manually Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  ✏️
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Create Manually</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Build your quiz question-by-question with custom options, answers, and timers.
                </p>
              </div>
              <Link
                to="/quizzes/create"
                className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
              >
                Build Quiz
              </Link>
            </div>

            {/* My Quizzes Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  📚
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Quiz Library</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Manage all your created quizzes, take solo attempts, or launch live host lobbies.
                </p>
              </div>
              <Link
                to="/quizzes"
                className="w-full py-2.5 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
              >
                View Library ({quizzes.length})
              </Link>
            </div>

            {/* Join Room Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Join Game Room</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Have a room code from a host? Join the live multiplayer arena right away.
                </p>
              </div>
              <Link
                to="/join"
                className="w-full py-2.5 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
              >
                Join Arena
              </Link>
            </div>

          </div>
        </div>

        {/* Recent Quizzes List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Your Recent Quizzes</h2>
              <p className="text-xs text-slate-500">Quickly host or take one of your saved quizzes</p>
            </div>
            <Link to="/quizzes" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All ({quizzes.length}) →
            </Link>
          </div>

          {quizLoading && (
            <div className="py-8 text-center text-sm text-slate-400">Loading your quizzes...</div>
          )}

          {!quizLoading && quizzes.length === 0 && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-500">You haven't created any quizzes yet.</p>
              <Link
                to="/quizzes/generate"
                className="inline-block px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition"
              >
                ✨ Generate First Quiz
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quizzes.slice(0, 4).map((quiz) => (
              <div
                key={quiz._id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition flex flex-col justify-between space-y-3 bg-slate-50/50"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{quiz.title}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-indigo-100 text-indigo-700 shrink-0">
                      {quiz.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {quiz.topic} • {quiz.questions.length} Question{quiz.questions.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => handleHostQuiz(quiz._id)}
                    disabled={hostingId === quiz._id}
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {hostingId === quiz._id ? "Creating Room..." : "📡 Host Live"}
                  </button>

                  <Link
                    to={`/quizzes/${quiz._id}/take`}
                    className="flex-1 py-1.5 text-center bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition"
                  >
                    ✍️ Take Solo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;