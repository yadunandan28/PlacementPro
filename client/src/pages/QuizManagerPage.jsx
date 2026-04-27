// ============================================================
//  pages/QuizManagerPage.jsx  —  Staff: AI Quiz Manager
// ============================================================
import { useState, useEffect } from "react";
import api from "../api";
import AppLayout from "../components/layout/AppLayout";
import {
  Upload, Plus, Play, Clock, CheckCircle, Users, BarChart2,
  RefreshCw, Trash2, Calendar, AlertCircle, ChevronDown, ChevronUp,
  FileText, Zap, Timer, Target, Edit2, TrendingUp, Award
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend
} from "recharts";

const STATUS_COLOR = {
  review:    "text-amber-400 bg-amber-500/10 border-amber-500/20",
  draft:     "text-slate-400 bg-slate-500/10 border-slate-500/20",
  scheduled: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active:    "text-green-400 bg-green-500/10 border-green-500/20",
  completed: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};
const DIFF_COLOR = { easy: "text-green-400", medium: "text-amber-400", hard: "text-red-400" };

export default function QuizManagerPage() {
  const BATCHES = ["22", "23", "24", "25", "26"];

  const [quizzes,    setQuizzes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [msg,        setMsg]        = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [results,    setResults]    = useState({});  // quizId → result data

  // ── Create form state ──────────────────────────────────
  const [showForm,        setShowForm]        = useState(false);
  const [syllabus,        setSyllabus]        = useState(null);
  const [materials,       setMaterials]       = useState([]);
  const [title,           setTitle]           = useState("");
  const [description,     setDescription]     = useState("");
  const [duration,        setDuration]        = useState(30);
  const [numQ,            setNumQ]            = useState(24);
  const [selectedBatches, setSelectedBatches] = useState([]);
  // "now" = start immediately after create | "scheduled" = pick a datetime
  const [startMode,       setStartMode]       = useState("scheduled");
  const [scheduledAt,     setScheduledAt]     = useState("");

  // ── Reschedule modal ────────────────────────────────────
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newScheduledAt,  setNewScheduledAt]  = useState("");
  const [newDuration,     setNewDuration]     = useState(30);

  // ── Review panel ─────────────────────────────────────────
  const [reviewQuiz,      setReviewQuiz]      = useState(null);   // full quiz object with questions
  const [reviewLoading,   setReviewLoading]   = useState(false);
  const [comments,        setComments]        = useState({});      // { [qIdx]: string }
  const [regenIdx,        setRegenIdx]        = useState(null);    // which question is regenerating
  const [approveModal,    setApproveModal]    = useState(null);    // quiz object to approve
  const [approveMode,     setApproveMode]     = useState("draft");
  const [approveSched,    setApproveSched]    = useState("");

  // ── Per-quiz expanded student (for drill-down) ──────────
  const [expandedStudent, setExpandedStudent] = useState({}); // quizId → studentId

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/quiz/staff");
      setQuizzes(data.data.quizzes || []);
    } catch { setMsg("Could not load quizzes"); }
    setLoading(false);
  }

  function toggleBatch(b) {
    setSelectedBatches(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!syllabus) return setMsg("Please upload a syllabus PDF");
    if (!title.trim()) return setMsg("Title is required");
    if (startMode === "scheduled" && !scheduledAt) return setMsg("Please pick a start date & time");
    setCreating(true);
    setMsg("Generating quiz with AI — this may take 30–60 seconds...");
    try {
      const form = new FormData();
      form.append("syllabus", syllabus);
      materials.forEach(f => form.append("materials", f));
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("durationMinutes", duration);
      form.append("numQuestions", numQ);
      form.append("batches", JSON.stringify(selectedBatches));
      form.append("startMode", startMode);
      if (startMode === "scheduled") form.append("scheduledAt", scheduledAt);

      const { data } = await api.post("/quiz/staff/create", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg(`✅ ${data.message}`);
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to create quiz");
    }
    setCreating(false);
  }

  function resetForm() {
    setSyllabus(null); setMaterials([]); setTitle(""); setDescription("");
    setDuration(30); setNumQ(24); setSelectedBatches([]);
    setStartMode("scheduled"); setScheduledAt("");
  }

  async function startManually(quizId) {
    try {
      await api.patch(`/quiz/staff/${quizId}/start`);
      setMsg("Quiz is now live! Students can start.");
      load();
    } catch (err) { setMsg(err.response?.data?.message || "Failed to start"); }
  }

  async function endQuiz(quizId) {
    if (!confirm("End quiz? All in-progress attempts will be auto-submitted.")) return;
    try {
      await api.patch(`/quiz/staff/${quizId}/end`);
      setMsg("Quiz ended.");
      load();
    } catch (err) { setMsg(err.response?.data?.message || "Failed to end"); }
  }

  async function handleReschedule(e) {
    e.preventDefault();
    try {
      const { data } = await api.patch(`/quiz/staff/${rescheduleModal._id}/reschedule`, {
        scheduledAt: newScheduledAt,
        durationMinutes: newDuration,
      });
      setMsg(`✅ ${data.message}`);
      setRescheduleModal(null);
      load();
    } catch (err) { setMsg(err.response?.data?.message || "Failed to reschedule"); }
  }

  async function deleteQuiz(quizId) {
    if (!confirm("Delete this quiz and all its attempts?")) return;
    try {
      await api.delete(`/quiz/staff/${quizId}`);
      setMsg("Deleted.");
      load();
    } catch (err) { setMsg(err.response?.data?.message || "Failed to delete"); }
  }

  async function openReview(quizId) {
    setReviewLoading(true);
    try {
      const { data } = await api.get(`/quiz/staff/${quizId}`);
      setReviewQuiz(data.data.quiz);
      setComments({});
    } catch { setMsg("Could not load quiz questions"); }
    setReviewLoading(false);
  }

  async function handleRegenerate(qIdx) {
    const comment = comments[qIdx]?.trim();
    if (!comment) return setMsg("Please write feedback before regenerating");
    setRegenIdx(qIdx);
    try {
      const { data } = await api.patch(
        `/quiz/staff/${reviewQuiz._id}/questions/${qIdx}/regenerate`,
        { comment }
      );
      // Update the local review copy
      setReviewQuiz(prev => {
        const qs = [...prev.questions];
        qs[qIdx] = data.data.question;
        return { ...prev, questions: qs };
      });
      setComments(prev => ({ ...prev, [qIdx]: "" }));
      setMsg("Question regenerated successfully");
    } catch (err) { setMsg(err.response?.data?.message || "Regeneration failed"); }
    setRegenIdx(null);
  }

  async function handleApprove(e) {
    e.preventDefault();
    try {
      const { data } = await api.patch(`/quiz/staff/${approveModal._id}/approve`, {
        startMode: approveMode,
        scheduledAt: approveSched || undefined,
      });
      setMsg(`✅ ${data.message}`);
      setApproveModal(null);
      setReviewQuiz(null);
      load();
    } catch (err) { setMsg(err.response?.data?.message || "Approval failed"); }
  }

  async function loadResults(quizId) {
    if (results[quizId]) { setExpandedId(quizId === expandedId ? null : quizId); return; }
    try {
      const { data } = await api.get(`/quiz/staff/${quizId}/results`);
      setResults(r => ({ ...r, [quizId]: data.data }));
      setExpandedId(quizId);
    } catch { setMsg("Could not load results"); }
  }

  return (
    <AppLayout>
      <div className="fade-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Staff</p>
            <h1 className="text-2xl font-bold text-white">AI Quiz Manager</h1>
            <p className="text-slate-500 text-sm mt-1">Upload syllabus & materials → AI generates quiz → assign to students</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-lg bg-[#0f1623] border border-[#1c2a42] text-slate-500 hover:text-slate-300">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
            >
              <Plus size={16} /> New Quiz
            </button>
          </div>
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm">
            {msg}
          </div>
        )}

        {/* ── Create Form ── */}
        {showForm && (
          <div className="mb-6 bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Zap size={16} className="text-blue-400" /> Create AI-Generated Quiz
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Title + Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Quiz Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} required
                    placeholder="e.g. Data Structures Mid-Term"
                    className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/60 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description</label>
                  <input value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Optional short description"
                    className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/60 focus:outline-none" />
                </div>
              </div>

              {/* Syllabus upload */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Syllabus PDF * <span className="text-slate-600">(primary content for question generation)</span></label>
                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 bg-[#0f1c30] border border-dashed border-[#2a3a52] rounded-lg text-sm text-slate-300 hover:border-blue-500/50">
                  <Upload size={14} className="text-blue-400" />
                  {syllabus ? syllabus.name : "Choose syllabus PDF"}
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={e => setSyllabus(e.target.files[0])} />
                </label>
              </div>

              {/* Materials upload */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Additional Materials <span className="text-slate-600">(up to 8 PDFs — notes, textbook chapters)</span></label>
                <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 bg-[#0f1c30] border border-dashed border-[#2a3a52] rounded-lg text-sm text-slate-300 hover:border-blue-500/50">
                  <Plus size={14} className="text-blue-400" />
                  Add material PDFs
                  <input type="file" accept="application/pdf" multiple className="hidden"
                    onChange={e => setMaterials(Array.from(e.target.files))} />
                </label>
                {materials.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {materials.map((f, i) => (
                      <span key={i} className="text-xs bg-[#0f1c30] border border-[#1c2a42] rounded px-2 py-1 text-slate-400 flex items-center gap-1">
                        <FileText size={10} /> {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Questions</label>
                  <select value={numQ} onChange={e => setNumQ(e.target.value)}
                    className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    {[10, 15, 20, 24, 30, 40].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Duration (min)</label>
                  <input type="number" value={duration} min={5} max={180}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
              </div>

              {/* Start mode */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">When should the quiz start?</label>
                <div className="flex gap-3">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm transition
                    ${startMode === "scheduled" ? "border-blue-500 bg-blue-600/15 text-blue-300" : "border-[#1c2a42] text-slate-400 hover:border-slate-500"}`}>
                    <input type="radio" name="startMode" value="scheduled" checked={startMode === "scheduled"}
                      onChange={() => setStartMode("scheduled")} className="accent-blue-500" />
                    <Calendar size={14} /> Schedule a date & time
                  </label>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm transition
                    ${startMode === "now" ? "border-green-500 bg-green-600/15 text-green-300" : "border-[#1c2a42] text-slate-400 hover:border-slate-500"}`}>
                    <input type="radio" name="startMode" value="now" checked={startMode === "now"}
                      onChange={() => setStartMode("now")} className="accent-green-500" />
                    <Play size={14} /> Start immediately
                  </label>
                </div>
                {startMode === "scheduled" && (
                  <div className="mt-3">
                    <label className="text-xs text-slate-400 mb-1 block">Start Date & Time *</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required
                      className="w-full md:w-72 bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
                  </div>
                )}
              </div>

              {/* Batch selection */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">
                  Assign to Batch(es)
                  <span className="text-slate-600 ml-1">
                    — students whose roll no starts with the selected batch year
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {BATCHES.map(b => {
                    const active = selectedBatches.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBatch(b)}
                        className={`px-5 py-2 rounded-xl border text-sm font-semibold transition
                          ${active
                            ? "bg-blue-600/25 border-blue-500 text-blue-300"
                            : "bg-[#0f1c30] border-[#1c2a42] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                          }`}
                      >
                        Batch {b}
                      </button>
                    );
                  })}
                </div>
                {selectedBatches.length === 0 && (
                  <p className="text-xs text-amber-400/70 mt-2 flex items-center gap-1">
                    <AlertCircle size={11} /> No batch selected — quiz will be created without student assignments.
                  </p>
                )}
                {selectedBatches.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Selected: <span className="text-blue-300 font-semibold">{selectedBatches.map(b => `Batch ${b}`).join(", ")}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition">
                  {creating ? <><RefreshCw size={14} className="animate-spin" /> Generating...</> : <><Zap size={14} /> Generate & Create</>}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 bg-[#0f1623] border border-[#1c2a42] text-slate-400 rounded-lg text-sm hover:text-white transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Quiz List ── */}
        {loading ? (
          <div className="flex justify-center py-16 text-slate-500">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-10 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-slate-400">No quizzes yet. Create your first AI quiz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map(quiz => {
              const isExpanded = expandedId === quiz._id;
              const res        = results[quiz._id];
              const selStu     = expandedStudent[quiz._id] || null;

              // ── Aggregate chart data ──
              const scoreDistData = res ? (() => {
                const buckets = { "0–39": 0, "40–59": 0, "60–79": 0, "80–100": 0 };
                res.attempts.forEach(a => {
                  if (a.percentage <= 39) buckets["0–39"]++;
                  else if (a.percentage <= 59) buckets["40–59"]++;
                  else if (a.percentage <= 79) buckets["60–79"]++;
                  else buckets["80–100"]++;
                });
                return Object.entries(buckets).map(([range, count]) => ({ range, count }));
              })() : [];

              const diffAvgData = res ? ["easy", "medium", "hard"].map(d => {
                const allTimes = res.attempts
                  .filter(a => a.timingStats?.[d]?.count > 0)
                  .map(a => a.timingStats[d].avgMs / 1000);
                return {
                  difficulty: d[0].toUpperCase() + d.slice(1),
                  avgSec: allTimes.length ? +(allTimes.reduce((s, v) => s + v, 0) / allTimes.length).toFixed(1) : 0,
                };
              }) : [];

              const passCount = res ? res.attempts.filter(a => a.percentage >= 60).length : 0;
              const failCount = res ? res.attempts.length - passCount : 0;
              const pieData   = [{ name: "Pass (≥60%)", value: passCount }, { name: "Fail (<60%)", value: failCount }];

              const selAttempt = selStu && res ? res.attempts.find(a => String(a.student?._id) === selStu) : null;

              return (
                <div key={quiz._id} className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl overflow-hidden">

                  {/* ── Header row ── */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${STATUS_COLOR[quiz.status]}`}>
                          {quiz.status.toUpperCase()}
                        </span>
                        <h3 className="text-white font-semibold truncate">{quiz.title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Target size={11} /> {quiz.totalQuestions} q</span>
                        <span className="flex items-center gap-1"><Timer size={11} /> {quiz.durationMinutes} min</span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {quiz.assignedStudents?.length || 0} students
                          {quiz.batches?.length > 0 && (
                            <span className="text-blue-400 ml-1">
                              ({quiz.batches.map(b => `Batch ${b}`).join(", ")})
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1"><BarChart2 size={11} /> {quiz.attemptStats?.completed || 0} submitted</span>
                        {quiz.scheduledAt && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Calendar size={11} /> {new Date(quiz.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Review — only for quizzes pending review */}
                      {quiz.status === "review" && (
                        <button onClick={() => openReview(quiz._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600/30 rounded-lg text-xs font-semibold">
                          <FileText size={12} /> Review Questions
                        </button>
                      )}
                      {/* Edit schedule — only for scheduled quizzes */}
                      {quiz.status === "scheduled" && (
                        <button onClick={() => {
                          setRescheduleModal(quiz);
                          setNewScheduledAt(quiz.scheduledAt ? new Date(quiz.scheduledAt).toISOString().slice(0,16) : "");
                          setNewDuration(quiz.durationMinutes);
                        }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#0f1623] border border-[#1c2a42] text-slate-400 hover:text-blue-400 hover:border-blue-500/40 rounded-lg text-xs">
                          <Edit2 size={12} /> Edit Time
                        </button>
                      )}
                      {(quiz.status === "draft" || quiz.status === "scheduled") && (
                        <button onClick={() => startManually(quiz._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 rounded-lg text-xs">
                          <Play size={12} /> Start Now
                        </button>
                      )}
                      {quiz.status === "active" && (
                        <button onClick={() => endQuiz(quiz._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 rounded-lg text-xs">
                          <CheckCircle size={12} /> End Quiz
                        </button>
                      )}
                      {quiz.status === "completed" && (
                        <button onClick={() => loadResults(quiz._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 rounded-lg text-xs">
                          <TrendingUp size={12} /> Analytics
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      {quiz.status !== "active" && (
                        <button onClick={() => deleteQuiz(quiz._id)}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Review Panel ── */}
                  {reviewQuiz?._id === quiz._id && (
                    <div className="border-t border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-amber-300 font-semibold flex items-center gap-2">
                          <FileText size={15} /> Question Review — verify and refine before publishing
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setApproveModal(quiz);
                              setApproveMode(quiz.pendingStartMode || "draft");
                              setApproveSched(
                                quiz.pendingScheduledAt
                                  ? new Date(quiz.pendingScheduledAt).toISOString().slice(0, 16)
                                  : ""
                              );
                            }}
                            className="flex items-center gap-1 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold">
                            <CheckCircle size={12} /> Approve & Publish
                          </button>
                          <button onClick={() => setReviewQuiz(null)}
                            className="px-3 py-1.5 bg-[#0f1623] border border-[#1c2a42] text-slate-400 rounded-lg text-xs hover:text-white">
                            Close
                          </button>
                        </div>
                      </div>

                      {reviewLoading ? (
                        <p className="text-slate-500 text-sm">Loading questions...</p>
                      ) : (
                        <div className="space-y-4">
                          {reviewQuiz.questions?.map((q, idx) => (
                            <div key={q._id || idx} className="bg-[#0d1526] border border-[#1c2a42] rounded-xl p-4">
                              {/* Question header */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-slate-500">Q{idx + 1}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
                                      ${q.difficulty === "easy" ? "text-green-400 border-green-500/30 bg-green-500/10"
                                        : q.difficulty === "medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                                        : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                                      {q.difficulty}
                                    </span>
                                    <span className="text-xs text-slate-500 bg-[#0f1623] border border-[#1c2a42] px-2 py-0.5 rounded-full">
                                      {q.topic}
                                    </span>
                                  </div>
                                  <p className="text-white text-sm font-medium">{q.text}</p>
                                </div>
                              </div>

                              {/* Options */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                {q.options?.map((opt, oi) => (
                                  <div key={oi} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border
                                    ${opt.isCorrect
                                      ? "border-green-500/40 bg-green-500/10 text-green-300"
                                      : "border-[#1c2a42] bg-[#0f1623] text-slate-400"}`}>
                                    <span className={`font-bold shrink-0 ${opt.isCorrect ? "text-green-400" : "text-slate-600"}`}>
                                      {["A","B","C","D"][oi]}
                                    </span>
                                    {opt.text}
                                    {opt.isCorrect && <CheckCircle size={11} className="ml-auto text-green-400 shrink-0" />}
                                  </div>
                                ))}
                              </div>

                              {/* Explanation */}
                              {q.explanation && (
                                <p className="text-xs text-slate-500 italic mb-3 pl-2 border-l-2 border-slate-700">
                                  {q.explanation}
                                </p>
                              )}

                              {/* Comment + regenerate */}
                              <div className="flex gap-2 items-start">
                                <textarea
                                  rows={2}
                                  placeholder="Write feedback to improve this question (e.g. 'Make it harder', 'Wrong answer marked', 'Not relevant to syllabus')"
                                  value={comments[idx] || ""}
                                  onChange={e => setComments(prev => ({ ...prev, [idx]: e.target.value }))}
                                  className="flex-1 bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-amber-500/50 placeholder-slate-600"
                                />
                                <button
                                  onClick={() => handleRegenerate(idx)}
                                  disabled={regenIdx === idx || !comments[idx]?.trim()}
                                  className="flex items-center gap-1 px-3 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600/30 disabled:opacity-40 rounded-lg text-xs font-semibold shrink-0 self-start">
                                  {regenIdx === idx
                                    ? <><RefreshCw size={12} className="animate-spin" /> Regenerating...</>
                                    : <><RefreshCw size={12} /> Regenerate</>}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Analytics Panel ── */}
                  {isExpanded && res && (
                    <div className="border-t border-[#1c2a42] p-5 space-y-6">

                      {/* ── Overview KPIs ── */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Submissions", val: res.attempts.length, icon: <Users size={14} /> },
                          { label: "Avg Score", val: res.attempts.length ? Math.round(res.attempts.reduce((s, a) => s + a.percentage, 0) / res.attempts.length) + "%" : "—", icon: <Award size={14} /> },
                          { label: "Pass Rate", val: res.attempts.length ? Math.round((passCount / res.attempts.length) * 100) + "%" : "—", icon: <CheckCircle size={14} /> },
                          { label: "Highest", val: res.attempts.length ? Math.max(...res.attempts.map(a => a.percentage)) + "%" : "—", icon: <TrendingUp size={14} /> },
                        ].map(({ label, val, icon }) => (
                          <div key={label} className="bg-[#0f1623] border border-[#1c2a42] rounded-xl p-3 text-center">
                            <div className="flex justify-center mb-1 text-slate-500">{icon}</div>
                            <p className="text-xl font-bold text-white">{val}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>

                      {res.attempts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Score distribution bar chart */}
                          <div className="md:col-span-2 bg-[#0f1623] border border-[#1c2a42] rounded-xl p-4">
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Score Distribution</p>
                            <ResponsiveContainer width="100%" height={160}>
                              <BarChart data={scoreDistData} barSize={32}>
                                <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid #1c2a42", borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                  {scoreDistData.map((_, i) => (
                                    <Cell key={i} fill={["#ef4444","#f59e0b","#3b82f6","#22c55e"][i]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Pass/Fail pie */}
                          <div className="bg-[#0f1623] border border-[#1c2a42] rounded-xl p-4">
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Pass / Fail</p>
                            <ResponsiveContainer width="100%" height={160}>
                              <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                                  <Cell fill="#22c55e" />
                                  <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid #1c2a42", borderRadius: 8, fontSize: 12 }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Avg time by difficulty */}
                          <div className="md:col-span-3 bg-[#0f1623] border border-[#1c2a42] rounded-xl p-4">
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Average Response Time by Difficulty (seconds)</p>
                            <ResponsiveContainer width="100%" height={120}>
                              <BarChart data={diffAvgData} barSize={40}>
                                <XAxis dataKey="difficulty" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid #1c2a42", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}s`, "Avg Time"]} />
                                <Bar dataKey="avgSec" radius={[4, 4, 0, 0]}>
                                  <Cell fill="#22c55e" />
                                  <Cell fill="#f59e0b" />
                                  <Cell fill="#ef4444" />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* ── Student list (click to drill-down) ── */}
                      <div>
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
                          Students — click a row to view individual details
                        </p>
                        {res.attempts.length === 0 ? (
                          <p className="text-sm text-slate-500">No submissions yet.</p>
                        ) : (
                          <div className="space-y-1">
                            {res.attempts.map(a => {
                              const sid      = String(a.student?._id);
                              const isSelStu = selStu === sid;
                              return (
                                <div key={a._id}>
                                  <button
                                    onClick={() => setExpandedStudent(prev => ({
                                      ...prev, [quiz._id]: isSelStu ? null : sid
                                    }))}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition
                                      ${isSelStu ? "border-blue-500/40 bg-blue-500/10" : "border-[#1c2a42] bg-[#0a0e1a] hover:border-slate-600"}`}>
                                    <div className="w-8 h-8 rounded-full bg-[#1c2a42] flex items-center justify-center text-xs font-bold text-white shrink-0">
                                      {(a.student?.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white font-medium truncate">{a.student?.name}</p>
                                      <p className="text-xs text-slate-500">{a.student?.rollNumber} · {a.student?.department}</p>
                                    </div>
                                    {/* Mini diff timing */}
                                    <div className="hidden md:flex gap-3 text-xs">
                                      {["easy","medium","hard"].map(d => a.timingStats?.[d]?.count > 0 && (
                                        <span key={d} className={`font-mono ${DIFF_COLOR[d]}`}>
                                          {d[0].toUpperCase()}: {(a.timingStats[d].avgMs/1000).toFixed(1)}s
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <span className={`text-base font-bold ${a.percentage >= 70 ? "text-green-400" : a.percentage >= 40 ? "text-amber-400" : "text-red-400"}`}>
                                        {a.percentage}%
                                      </span>
                                      <p className="text-xs text-slate-500">{a.score}/{a.totalQuestions}</p>
                                    </div>
                                    {isSelStu ? <ChevronUp size={14} className="text-blue-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-600 shrink-0" />}
                                  </button>

                                  {/* Individual drill-down */}
                                  {isSelStu && selAttempt && (
                                    <div className="ml-4 mt-1 p-4 bg-[#0d1526] border border-blue-500/20 rounded-xl space-y-4">
                                      {/* Timing stats */}
                                      <div className="grid grid-cols-3 gap-3">
                                        {["easy","medium","hard"].map(d => {
                                          const s = selAttempt.timingStats?.[d];
                                          return (
                                            <div key={d} className={`rounded-lg border p-3 text-center text-xs
                                              ${d==="easy" ? "border-green-500/20 bg-green-500/5"
                                               : d==="medium" ? "border-amber-500/20 bg-amber-500/5"
                                               : "border-red-500/20 bg-red-500/5"}`}>
                                              <p className={`font-bold uppercase mb-1 ${DIFF_COLOR[d]}`}>{d}</p>
                                              {s?.count > 0 ? (
                                                <>
                                                  <p className="text-white font-semibold">{(s.avgMs/1000).toFixed(1)}s avg</p>
                                                  <p className="text-slate-400">{(s.correctAvgMs/1000).toFixed(1)}s correct avg</p>
                                                  <p className="text-slate-500">{s.correctCount}/{s.count} correct</p>
                                                </>
                                              ) : <p className="text-slate-600">No questions</p>}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Question-by-question */}
                                      {res.questionStats?.length > 0 && (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="text-slate-500 border-b border-[#1c2a42]">
                                                <th className="text-left py-1.5 pr-3">Question</th>
                                                <th className="text-center py-1.5 px-2">Diff</th>
                                                <th className="text-center py-1.5 px-2">Accuracy</th>
                                                <th className="text-center py-1.5 px-2">Avg Time</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {res.questionStats.map((qs, i) => (
                                                <tr key={i} className="border-b border-[#0f1623]">
                                                  <td className="py-1.5 pr-3 text-slate-300 max-w-xs truncate">{qs.text}</td>
                                                  <td className="py-1.5 px-2 text-center"><span className={`font-semibold ${DIFF_COLOR[qs.difficulty]}`}>{qs.difficulty}</span></td>
                                                  <td className="py-1.5 px-2 text-center">
                                                    <span className={qs.accuracy >= 70 ? "text-green-400" : qs.accuracy >= 40 ? "text-amber-400" : "text-red-400"}>{qs.accuracy}%</span>
                                                  </td>
                                                  <td className="py-1.5 px-2 text-center text-slate-400">{(qs.avgTimeMs/1000).toFixed(1)}s</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Approve Modal ── */}
        {approveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <CheckCircle size={15} className="text-green-400" /> Approve & Publish Quiz
              </h3>
              <p className="text-slate-500 text-xs mb-4">
                Questions are finalised. Choose when this quiz goes live for students.
              </p>
              <form onSubmit={handleApprove} className="space-y-4">
                <div className="flex flex-col gap-2">
                  {[
                    { val: "now",       label: "Start immediately", icon: <Play size={13} />, color: "green" },
                    { val: "scheduled", label: "Schedule a date & time", icon: <Calendar size={13} />, color: "blue" },
                    { val: "draft",     label: "Save as draft (start later)", icon: <Clock size={13} />, color: "slate" },
                  ].map(({ val, label, icon, color }) => (
                    <label key={val} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer text-sm transition
                      ${approveMode === val
                        ? `border-${color}-500 bg-${color}-600/15 text-${color}-300`
                        : "border-[#1c2a42] text-slate-400 hover:border-slate-500"}`}>
                      <input type="radio" name="approveMode" value={val}
                        checked={approveMode === val} onChange={() => setApproveMode(val)} className="accent-blue-500" />
                      {icon} {label}
                    </label>
                  ))}
                </div>
                {approveMode === "scheduled" && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Start Date & Time *</label>
                    <input type="datetime-local" value={approveSched} onChange={e => setApproveSched(e.target.value)} required
                      className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="submit"
                    className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold">
                    Confirm & Publish
                  </button>
                  <button type="button" onClick={() => setApproveModal(null)}
                    className="flex-1 py-2 bg-[#0f1623] border border-[#1c2a42] text-slate-400 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Reschedule Modal ── */}
        {rescheduleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1526] border border-[#1c2a42] rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <Edit2 size={15} className="text-blue-400" /> Edit Quiz Schedule
              </h3>
              <p className="text-slate-500 text-xs mb-4">
                Locked within 5 minutes of start. Current: <span className="text-slate-300">{new Date(rescheduleModal.scheduledAt).toLocaleString()}</span>
              </p>
              <form onSubmit={handleReschedule} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">New Start Date & Time *</label>
                  <input type="datetime-local" value={newScheduledAt} onChange={e => setNewScheduledAt(e.target.value)} required
                    className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/60" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Duration (minutes)</label>
                  <input type="number" value={newDuration} min={5} max={180} onChange={e => setNewDuration(e.target.value)}
                    className="w-full bg-[#0f1c30] border border-[#1c2a42] rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">
                    Save Changes
                  </button>
                  <button type="button" onClick={() => setRescheduleModal(null)}
                    className="flex-1 py-2 bg-[#0f1623] border border-[#1c2a42] text-slate-400 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
