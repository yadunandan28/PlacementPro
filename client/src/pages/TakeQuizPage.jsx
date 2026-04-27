// ============================================================
//  pages/TakeQuizPage.jsx  —  Student: Live Quiz + Result View
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/layout/AppLayout";
import { Clock, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Send, BarChart2, Timer } from "lucide-react";

const DIFF_COLOR = { easy: "text-green-400", medium: "text-amber-400", hard: "text-red-400" };
const DIFF_BG    = { easy: "bg-green-500/10 border-green-500/20", medium: "bg-amber-500/10 border-amber-500/20", hard: "bg-red-500/10 border-red-500/20" };

// ── Result View ───────────────────────────────────────────
function ResultView({ quizId }) {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/quiz/${quizId}/my-result`)
      .then(({ data }) => setResult(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) return <div className="flex justify-center py-20 text-slate-500">Loading results...</div>;
  if (!result)  return <div className="text-center py-20 text-slate-400">Result not found.</div>;

  const { score, percentage, totalQuestions, timingStats, answers, quizTitle, submittedAt } = result;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Score card */}
      <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-6 text-center">
        <p className="text-slate-500 text-sm mb-2">{quizTitle}</p>
        <div className={`text-6xl font-black mb-2 ${percentage >= 70 ? "text-green-400" : percentage >= 40 ? "text-amber-400" : "text-red-400"}`}>
          {percentage}%
        </div>
        <p className="text-slate-400">{score} / {totalQuestions} correct</p>
        {submittedAt && <p className="text-slate-600 text-xs mt-1">{new Date(submittedAt).toLocaleString()}</p>}
      </div>

      {/* Timing by difficulty */}
      {timingStats && (
        <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-5">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Speed Analysis by Difficulty</p>
          <div className="grid grid-cols-3 gap-4">
            {["easy", "medium", "hard"].map(d => {
              const s = timingStats[d];
              if (!s?.count) return (
                <div key={d} className={`rounded-xl border p-3 text-center ${DIFF_BG[d]}`}>
                  <p className={`font-bold text-sm uppercase ${DIFF_COLOR[d]}`}>{d}</p>
                  <p className="text-slate-500 text-xs mt-1">No questions</p>
                </div>
              );
              return (
                <div key={d} className={`rounded-xl border p-3 text-center ${DIFF_BG[d]}`}>
                  <p className={`font-bold text-sm uppercase ${DIFF_COLOR[d]}`}>{d}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      <p className="text-slate-400">Avg time</p>
                      <p className="text-white font-semibold">{(s.avgMs / 1000).toFixed(1)}s</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Correct avg</p>
                      <p className="text-white font-semibold">{s.correctCount > 0 ? (s.correctAvgMs / 1000).toFixed(1) + "s" : "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Score</p>
                      <p className="text-white font-semibold">{s.correctCount}/{s.count}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-question review */}
      <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-5">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Question Review</p>
        <div className="space-y-4">
          {answers.map((a, i) => (
            <div key={i} className={`p-4 rounded-xl border ${a.isCorrect ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 ${a.isCorrect ? "text-green-400" : "text-red-400"}`}>
                  {a.isCorrect ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono ${DIFF_COLOR[a.difficulty]}`}>{a.difficulty}</span>
                    <span className="text-xs text-slate-600">· {a.topic}</span>
                    <span className="ml-auto text-xs text-slate-600 flex items-center gap-1"><Timer size={10} /> {(a.timeSpentMs / 1000).toFixed(1)}s</span>
                  </div>
                  <p className="text-sm text-white mb-2">{a.questionText}</p>
                  <p className="text-xs text-slate-400">Your answer: <span className={a.isCorrect ? "text-green-400" : "text-red-400"}>{a.selectedText || "Not answered"}</span></p>
                  {!a.isCorrect && <p className="text-xs text-green-400 mt-0.5">Correct: {a.correctText}</p>}
                  {a.explanation && <p className="text-xs text-slate-500 mt-2 italic">{a.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => navigate("/my-quizzes")}
        className="w-full py-3 bg-[#0f1623] border border-[#1c2a42] text-slate-400 hover:text-white rounded-xl text-sm transition">
        ← Back to Quizzes
      </button>
    </div>
  );
}

// ── Main Take Quiz Page ───────────────────────────────────
export default function TakeQuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // "result" mode when navigating to /quiz/:id/result
  const isResultMode = window.location.pathname.endsWith("/result");

  const [stage,     setStage]     = useState("LOADING"); // LOADING | QUIZ | SUBMITTED | ERROR
  const [questions, setQuestions] = useState([]);
  const [qIndex,    setQIndex]    = useState(0);
  const [answers,   setAnswers]   = useState({}); // questionId → selectedText
  const [timeLeft,  setTimeLeft]  = useState(null);
  const [error,     setError]     = useState("");
  const [submitting, setSubmitting]= useState(false);

  // Per-question timing
  const qStartTime    = useRef(Date.now());
  const questionTimes = useRef({}); // questionId → timeSpentMs

  const durationRef   = useRef(null);
  const timerRef      = useRef(null);

  // ── Load quiz ────────────────────────────────────────────
  useEffect(() => {
    if (isResultMode) return;
    (async () => {
      try {
        const { data } = await api.post(`/quiz/${id}/start`);
        const { questions: qs, durationMinutes, startedAt } = data.data;
        setQuestions(qs);
        durationRef.current = durationMinutes * 60;

        // Remaining time if resuming
        if (startedAt) {
          const elapsed = Math.floor((Date.now() - new Date(startedAt)) / 1000);
          const remaining = Math.max(0, durationRef.current - elapsed);
          setTimeLeft(remaining);
        } else {
          setTimeLeft(durationRef.current);
        }

        qStartTime.current = Date.now();
        setStage("QUIZ");
      } catch (err) {
        setError(err.response?.data?.message || "Could not start quiz");
        setStage("ERROR");
      }
    })();
  }, [id, isResultMode]);

  // ── Countdown timer ──────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || stage !== "QUIZ") return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, stage]);

  // ── Track time per question ──────────────────────────────
  const recordQuestionTime = useCallback((qId) => {
    const spent = Date.now() - qStartTime.current;
    questionTimes.current[qId] = (questionTimes.current[qId] || 0) + spent;
    qStartTime.current = Date.now();
  }, []);

  function goTo(idx) {
    if (questions[qIndex]) recordQuestionTime(questions[qIndex]._id);
    setQIndex(idx);
    qStartTime.current = Date.now();
  }

  function selectOption(questionId, optionText) {
    setAnswers(prev => ({ ...prev, [questionId]: optionText }));
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSubmit(auto = false) {
    if (!auto && !confirm("Submit quiz? You won't be able to change answers.")) return;
    clearTimeout(timerRef.current);

    // Record time for current question
    if (questions[qIndex]) recordQuestionTime(questions[qIndex]._id);

    const payload = questions.map(q => ({
      questionId:   q._id,
      selectedText: answers[q._id] || "",
      timeSpentMs:  questionTimes.current[q._id] || 0,
    }));

    setSubmitting(true);
    try {
      await api.post(`/quiz/${id}/submit`, { answers: payload });
      setStage("SUBMITTED");
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed");
      setStage("ERROR");
    }
    setSubmitting(false);
  }

  // ── Render guards ─────────────────────────────────────────
  if (isResultMode) {
    return (
      <AppLayout>
        <div className="fade-in max-w-3xl mx-auto">
          <div className="mb-6">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">Student</p>
            <h1 className="text-2xl font-bold text-white">Quiz Result</h1>
          </div>
          <ResultView quizId={id} />
        </div>
      </AppLayout>
    );
  }

  if (stage === "SUBMITTED") {
    return (
      <AppLayout>
        <div className="fade-in max-w-3xl mx-auto">
          <div className="mb-6">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">Student</p>
            <h1 className="text-2xl font-bold text-white">Quiz Submitted</h1>
          </div>
          <ResultView quizId={id} />
        </div>
      </AppLayout>
    );
  }

  if (stage === "ERROR") return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-white font-semibold">{error}</p>
        <button onClick={() => navigate("/my-quizzes")} className="px-4 py-2 bg-[#0f1623] border border-[#1c2a42] text-slate-400 rounded-lg text-sm">← Back</button>
      </div>
    </AppLayout>
  );

  if (stage === "LOADING") return (
    <AppLayout>
      <div className="flex justify-center py-20 text-slate-500">Loading quiz...</div>
    </AppLayout>
  );

  const q = questions[qIndex];
  const answered = Object.keys(answers).length;
  const mins = Math.floor((timeLeft || 0) / 60);
  const secs = String((timeLeft || 0) % 60).padStart(2, "0");
  const isUrgent = timeLeft !== null && timeLeft < 120;

  return (
    <AppLayout>
      <div className="fade-in max-w-2xl mx-auto">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Question {qIndex + 1} of {questions.length}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${DIFF_BG[q?.difficulty]} ${DIFF_COLOR[q?.difficulty]}`}>
                {q?.difficulty}
              </span>
              {q?.topic && <span className="text-xs text-slate-500">{q.topic}</span>}
            </div>
          </div>

          <div className={`flex items-center gap-2 font-mono text-lg font-bold rounded-xl px-4 py-2 border
            ${isUrgent ? "text-red-400 bg-red-500/10 border-red-500/30 animate-pulse" : "text-white bg-[#0f1623] border-[#1c2a42]"}`}>
            <Clock size={16} /> {mins}:{secs}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="w-full h-1 bg-[#1c2a42] rounded-full mb-6">
          <div className="h-1 bg-blue-500 rounded-full transition-all"
            style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
        </div>

        {/* ── Question ── */}
        <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-6 mb-4">
          <p className="text-white text-base leading-relaxed mb-6">{q?.text}</p>

          <div className="space-y-3">
            {(q?.options || []).map((opt, i) => {
              const selected = answers[q._id] === opt;
              return (
                <button key={i} onClick={() => selectOption(q._id, opt)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition
                    ${selected
                      ? "border-blue-500 bg-blue-600/20 text-white"
                      : "border-[#1c2a42] bg-[#0f1623] text-slate-300 hover:border-slate-500 hover:text-white"}`}>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold mr-3
                    ${selected ? "border-blue-400 bg-blue-500/30 text-blue-300" : "border-slate-600 text-slate-500"}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => goTo(qIndex - 1)} disabled={qIndex === 0}
            className="flex items-center gap-1 px-4 py-2 bg-[#0f1623] border border-[#1c2a42] text-slate-400 hover:text-white rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Prev
          </button>

          <div className="text-xs text-slate-500 font-mono">
            {answered}/{questions.length} answered
          </div>

          {qIndex < questions.length - 1 ? (
            <button onClick={() => goTo(qIndex + 1)}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={() => handleSubmit(false)} disabled={submitting}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white rounded-lg text-sm font-semibold">
              {submitting ? "Submitting..." : <><Send size={14} /> Submit</>}
            </button>
          )}
        </div>

        {/* ── Question grid ── */}
        <div className="mt-5 bg-[#0d1526] border border-[#1c2a42] rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-widest">Question Map</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((qq, i) => (
              <button key={qq._id} onClick={() => goTo(i)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition
                  ${i === qIndex ? "border-blue-500 bg-blue-600/30 text-white"
                    : answers[qq._id] ? "border-green-500/40 bg-green-500/10 text-green-400"
                    : "border-[#1c2a42] bg-[#0f1623] text-slate-500 hover:border-slate-500"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
