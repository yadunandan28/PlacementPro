// ============================================================
//  pages/MyQuizzesPage.jsx  —  Student: My Assigned Quizzes
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/layout/AppLayout";
import { Clock, CheckCircle, Play, BarChart2, RefreshCw, AlertCircle, Calendar, Timer } from "lucide-react";

const STATUS_STYLE = {
  draft:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
  scheduled: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active:    "text-green-400 bg-green-500/10 border-green-500/20",
  completed: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function MyQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/quiz/my");
      setQuizzes(data.data?.quizzes || []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load quizzes");
    }
    setLoading(false);
  }

  const active    = quizzes.filter(q => q.status === "active");
  const upcoming  = quizzes.filter(q => q.status === "scheduled" || q.status === "draft");
  const completed = quizzes.filter(q => q.status === "completed");

  return (
    <AppLayout>
      <div className="fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Student</p>
            <h1 className="text-2xl font-bold text-white">My Quizzes</h1>
            <p className="text-slate-500 text-sm mt-1">AI-generated quizzes assigned by your instructors</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-[#0f1623] border border-[#1c2a42] text-slate-500 hover:text-slate-300">
            <RefreshCw size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-slate-500">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-10 text-center">
            <div className="text-3xl mb-3">📝</div>
            <p className="text-slate-400">No quizzes assigned yet.</p>
            <p className="text-slate-600 text-sm mt-1">Your instructor will assign quizzes here.</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Active */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-mono text-green-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Now ({active.length})
                </h2>
                <div className="space-y-3">
                  {active.map(q => (
                    <QuizCard key={q._id} quiz={q} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-3">Upcoming ({upcoming.length})</h2>
                <div className="space-y-3">
                  {upcoming.map(q => (
                    <QuizCard key={q._id} quiz={q} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Past ({completed.length})</h2>
                <div className="space-y-3">
                  {completed.map(q => (
                    <QuizCard key={q._id} quiz={q} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function QuizCard({ quiz, navigate }) {
  const attempt = quiz.myAttempt;
  const isActive = quiz.status === "active";
  const isCompleted = quiz.status === "completed";
  const hasSubmitted = attempt?.status === "completed";

  return (
    <div className={`bg-[#0d1526] border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4
      ${isActive ? "border-green-500/30" : "border-[#1c2a42]"}`}>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${STATUS_STYLE[quiz.status]}`}>
            {quiz.status.toUpperCase()}
          </span>
          <h3 className="text-white font-semibold truncate">{quiz.title}</h3>
        </div>
        {quiz.description && (
          <p className="text-slate-500 text-xs mb-2 line-clamp-1">{quiz.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><BarChart2 size={11} /> {quiz.totalQuestions} questions</span>
          <span className="flex items-center gap-1"><Timer size={11} /> {quiz.durationMinutes} min</span>
          {quiz.scheduledAt && (
            <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(quiz.scheduledAt).toLocaleString()}</span>
          )}
          <span className="flex items-center gap-1 text-slate-600">By {quiz.createdBy?.name || "Instructor"}</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        {hasSubmitted ? (
          <div className="text-right">
            <div className={`text-2xl font-bold ${attempt.percentage >= 70 ? "text-green-400" : attempt.percentage >= 40 ? "text-amber-400" : "text-red-400"}`}>
              {attempt.percentage}%
            </div>
            <div className="text-xs text-slate-500">{attempt.score}/{quiz.totalQuestions}</div>
            <button onClick={() => navigate(`/quiz/${quiz._id}/result`)}
              className="text-xs text-blue-400 hover:underline mt-1">View details</button>
          </div>
        ) : isActive ? (
          <button onClick={() => navigate(`/quiz/${quiz._id}/take`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition">
            <Play size={14} /> {attempt?.status === "in_progress" ? "Resume" : "Start Quiz"}
          </button>
        ) : isCompleted ? (
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <Clock size={14} /> Not attempted
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <Clock size={14} /> Waiting for instructor
          </div>
        )}
      </div>
    </div>
  );
}
