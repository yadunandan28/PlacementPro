// ============================================================
//  pages/ScheduleInterviewPage.jsx  —  Staff: Mock Interviews
// ============================================================
import { useState, useEffect } from "react";
import api from "../api";
import axios from "axios";
import AppLayout from "../components/layout/AppLayout";
import { Card, Button, Badge, EmptyState, LoadingScreen } from "../components/ui";
import {
  Calendar, Clock, Plus, CheckCircle, XCircle,
  RefreshCw, Eye, X, Play, Download, Mic, Code2,
  BarChart2, FileText, AlertCircle, Video
} from "lucide-react";

// ── Interview-service axios instance ──────────────────────
const iApi = axios.create({ baseURL: "http://localhost:5001/api" });
iApi.interceptors.request.use((cfg) => {
  try {
    const raw = localStorage.getItem("placementpro-auth");
    const tok = raw ? JSON.parse(raw)?.state?.accessToken : null;
    if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  } catch {}
  return cfg;
});

const STATUS_COLOR = { scheduled:"blue", in_progress:"amber", completed:"green", cancelled:"red" };
const EMPTY_FORM   = { studentId:"", scheduledAt:"", duration:45, jdText:"", jdFileName:"", notes:"" };
const nowLocal     = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); };

// ── Score badge ───────────────────────────────────────────
function ScoreBadge({ score }) {
  const c = score >= 7 ? "text-green-400 bg-green-400/10 border-green-500/30"
          : score >= 4 ? "text-amber-400 bg-amber-400/10 border-amber-500/30"
          :              "text-red-400   bg-red-400/10   border-red-500/30";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${c}`}>{score}/10</span>;
}

// ── Interview Detail Modal ─────────────────────────────────
function InterviewDetailModal({ slot, onClose }) {
  const [session,    setSession]    = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("overview");
  const [playingUrl, setPlayingUrl] = useState(null);

  useEffect(() => {
    if (!slot?.interviewSession?._id && !slot?.interviewSession) return;
    const sid = slot.interviewSession?._id || slot.interviewSession;
    loadDetail(sid);
  }, [slot]);

  async function loadDetail(sid) {
    setLoading(true);
    try {
      const [sessRes, recRes] = await Promise.allSettled([
        iApi.get(`/interview/sessions/${sid}/result`),
        iApi.get(`/interview/sessions/${sid}/recordings`),
      ]);
      if (sessRes.status === "fulfilled") setSession(sessRes.value.data.data.session);
      if (recRes.status  === "fulfilled") setRecordings(recRes.value.data.data.recordings || []);
    } catch {}
    setLoading(false);
  }

  const activeRecs = recordings.filter(r => !r.expired && r.cloudinaryUrl);
  const expiredRecs = recordings.filter(r => r.expired);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0e1a] border border-[#1c2a42] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1c2a42] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-white text-base">Interview Details</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {slot.student?.name} · {new Date(slot.scheduledAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading interview data…</p>
            </div>
          </div>
        ) : !session ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Interview not yet started or data unavailable.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Score summary bar */}
            <div className="px-6 py-4 border-b border-[#1c2a42] bg-[#0f1623] shrink-0">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    session.percentageScore >= 70 ? "text-green-400" :
                    session.percentageScore >= 40 ? "text-amber-400" : "text-red-400"
                  }`}>{session.percentageScore ?? "—"}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{session.totalScore}/{session.maxScore}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">
                    {session.questions?.filter(q=>q.type==="verbal").reduce((s,q)=>s+(q.score||0),0)}/50
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Verbal</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">
                    {session.questions?.filter(q=>q.type==="coding").reduce((s,q)=>s+(q.score||0),0)}/20
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Coding</div>
                </div>
                {activeRecs.length > 0 && (
                  <div className="text-center">
                    <div className="text-xl font-bold text-teal-400">{activeRecs.length}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Recordings</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-[#1c2a42] flex gap-1 shrink-0">
              {[
                { id:"overview",  label:"Overview",   icon: BarChart2 },
                { id:"questions", label:"Questions",  icon: FileText  },
                { id:"videos",    label:`Recordings (${activeRecs.length})`, icon: Video },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition
                    ${activeTab === tab.id
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"}`}
                >
                  <tab.icon size={13} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* ── OVERVIEW TAB ── */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* Score bars */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">Score Breakdown</h3>
                    <div className="space-y-3">
                      {session.questions?.map((q, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-xs font-mono w-16 shrink-0 ${q.type==="verbal"?"text-blue-400":"text-purple-400"}`}>
                            Q{q.order} {q.type==="verbal"?"🎤":"💻"}
                          </span>
                          <div className="flex-1 h-2 bg-[#1c2a42] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${
                              q.score >= 7 ? "bg-green-500" : q.score >= 4 ? "bg-amber-500" : "bg-red-500"
                            }`} style={{ width: `${(q.score/10)*100}%` }} />
                          </div>
                          <ScoreBadge score={q.score || 0} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Report */}
                  {session.aiReport && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">AI Evaluation Report</h3>
                      <div className="bg-[#060912] border border-[#1c2a42] rounded-xl p-4">
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{session.aiReport}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── QUESTIONS TAB ── */}
              {activeTab === "questions" && (
                <div className="space-y-4">
                  {session.questions?.map((q, i) => (
                    <div key={i} className="bg-[#060912] border border-[#1c2a42] rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${
                          q.type==="verbal"
                          ? "text-blue-400 bg-blue-400/10 border-blue-500/30"
                          : "text-purple-400 bg-purple-400/10 border-purple-500/30"
                        }`}>{q.type === "verbal" ? "🎤 Verbal" : "💻 Coding"}</span>
                        <p className="text-sm text-white font-medium flex-1">{q.question}</p>
                        <ScoreBadge score={q.score || 0} />
                      </div>

                      {/* Answer */}
                      {q.type === "verbal" && q.transcript && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Student's Answer</p>
                          <p className="text-sm text-slate-300 bg-[#0f1623] rounded-lg p-3 italic">"{q.transcript}"</p>
                        </div>
                      )}
                      {q.type === "coding" && q.code && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Code ({q.language})</p>
                          <pre className="text-xs text-green-300 bg-[#0f1623] rounded-lg p-3 overflow-x-auto font-mono">{q.code}</pre>
                          {q.codeOutput && (
                            <div className="mt-2">
                              <p className="text-xs text-slate-500 mb-1">Output</p>
                              <pre className="text-xs text-slate-400 bg-[#0f1623] rounded-lg p-2 font-mono">{q.codeOutput}</pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feedback */}
                      {q.feedback && (
                        <div className="bg-[#0a0e1a] border border-[#1c2a42] rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">AI Feedback</p>
                          <p className="text-xs text-slate-400 leading-relaxed">{q.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── RECORDINGS TAB ── */}
              {activeTab === "videos" && (
                <div className="space-y-4">
                  {activeRecs.length === 0 && expiredRecs.length === 0 && (
                    <div className="text-center py-10">
                      <Video size={32} className="text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No recordings uploaded for this interview.</p>
                      <p className="text-slate-600 text-xs mt-1">Recordings are uploaded by the student after completing the interview.</p>
                    </div>
                  )}

                  {/* Active recordings */}
                  {activeRecs.map((rec, i) => (
                    <div key={i} className="bg-[#060912] border border-[#1c2a42] rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1c2a42]">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          rec.questionType === "verbal"
                          ? "text-blue-400 bg-blue-400/10 border-blue-500/30"
                          : "text-purple-400 bg-purple-400/10 border-purple-500/30"
                        }`}>Q{rec.questionIndex + 1} · {rec.questionType}</span>
                        <div className="flex-1" />
                        <span className="text-xs text-amber-400 font-mono">
                          🗑 Auto-deletes {new Date(rec.deleteAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                        </span>
                        <a href={rec.cloudinaryUrl} download target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-600/30 transition">
                          <Download size={11} /> Download
                        </a>
                      </div>

                      {/* Video player */}
                      {playingUrl === rec.cloudinaryUrl ? (
                        <video
                          src={rec.cloudinaryUrl}
                          controls autoPlay
                          className="w-full max-h-80 bg-black"
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center h-40 bg-[#060912] cursor-pointer group hover:bg-[#0f1623] transition"
                          onClick={() => setPlayingUrl(rec.cloudinaryUrl)}
                        >
                          <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-600/30 transition">
                            <Play size={22} className="text-blue-400 ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Expired recordings notice */}
                  {expiredRecs.length > 0 && (
                    <div className="bg-[#060912] border border-[#2a1f1f] rounded-xl p-4">
                      <p className="text-xs text-red-400/70 flex items-center gap-2">
                        <XCircle size={13} />
                        {expiredRecs.length} recording(s) were automatically deleted after 2 days.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function ScheduleInterviewPage() {
  const [slots,    setSlots]    = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [detail,   setDetail]   = useState(null); // slot for modal
  const [form,     setForm]     = useState(EMPTY_FORM);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    // Students from main server — try multiple endpoints
    let studentList = [];
    for (const fn of [
      () => api.get("/users?role=student&limit=300"),
      () => api.get("/analytics/students?limit=300"),
      () => api.get("/cohorts/students"),
    ]) {
      try {
        const r = await fn();
        const d = r.data?.data;
        const arr = d?.students || d?.users || d || [];
        if (Array.isArray(arr) && arr.length > 0) { studentList = arr; break; }
      } catch {}
    }
    setStudents(studentList);

    // Slots from interview service
    try {
      const r = await iApi.get("/interview/slots");
      setSlots(r.data?.data?.slots || []);
    } catch (e) {
      console.warn("Slots load:", e.message);
      setSlots([]);
    }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.studentId)   { setError("Please select a student.");           return; }
    if (!form.scheduledAt) { setError("Please pick a scheduled date/time."); return; }
    setCreating(true); setError("");
    try {
      await iApi.post("/interview/slots", form);
      setSuccess("Interview slot created!");
      setShowForm(false);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(""), 4000);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create slot.");
    } finally { setCreating(false); }
  }

  const patch = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  if (loading) return <LoadingScreen />;

  return (
    <AppLayout>
      <div className="fade-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Staff</p>
            <h1 className="text-2xl font-bold text-white">Mock Interviews</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAll} className="p-2 rounded-lg bg-[#0f1623] border border-[#1c2a42] text-slate-500 hover:text-slate-300 transition">
              <RefreshCw size={16} />
            </button>
            <Button onClick={() => { setShowForm(v => !v); setError(""); }}>
              <Plus size={16} /> Schedule Interview
            </Button>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <XCircle size={16} /> {error}
          </div>
        )}

        {/* Schedule form */}
        {showForm && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="font-bold text-white text-sm uppercase tracking-widest font-mono mb-5">Schedule New Interview</h2>
              <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">Student *</label>
                  <select value={form.studentId} onChange={patch("studentId")} required
                    className="bg-[#0f1623] border border-[#1c2a42] rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60">
                    <option value="" disabled>— Select a student —</option>
                    {students.map(s => {
                      const id   = s.user?._id   || s._id;
                      const name = s.user?.name   || s.name   || "Unnamed";
                      const roll = s.user?.rollNumber || s.rollNumber || s.user?.email || s.email || "";
                      return <option key={id} value={id}>{name}{roll ? `  (${roll})` : ""}</option>;
                    })}
                  </select>
                  {students.length === 0 && <p className="text-xs text-amber-400 mt-0.5">⚠ No students found.</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">Date & Time *</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={patch("scheduledAt")} required
                    min={nowLocal()} style={{ colorScheme:"dark" }}
                    className="bg-[#0f1623] border border-[#1c2a42] rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">Duration</label>
                  <select value={form.duration} onChange={patch("duration")}
                    className="bg-[#0f1623] border border-[#1c2a42] rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none">
                    {[30,45,60,90].map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">JD File Name (optional)</label>
                  <input type="text" value={form.jdFileName} onChange={patch("jdFileName")}
                    placeholder="e.g. SWE – Google.pdf"
                    className="bg-[#0f1623] border border-[#1c2a42] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60" />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
                    Job Description Text
                    <span className="ml-2 text-slate-500 normal-case font-normal text-xs">— AI generates questions from this</span>
                  </label>
                  <textarea value={form.jdText} onChange={patch("jdText")} rows={5}
                    placeholder="Paste the full job description here…"
                    className="bg-[#0f1623] border border-[#1c2a42] rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 resize-y" />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 tracking-widest uppercase">Notes for Student (optional)</label>
                  <input type="text" value={form.notes} onChange={patch("notes")}
                    placeholder="e.g. Focus on system design and DSA"
                    className="bg-[#0f1623] border border-[#1c2a42] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60" />
                </div>

                <div className="sm:col-span-2 flex gap-3 justify-end pt-1">
                  <Button variant="secondary" type="button" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
                  <Button type="submit" loading={creating}>Create Interview Slot</Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Slots table */}
        {slots.length === 0 ? (
          <EmptyState icon="🎤" title="No interviews scheduled yet"
            description="Click 'Schedule Interview' to assign a mock interview to a student." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1c2a42]">
                    {["Student","Scheduled At","Dur.","JD","Status","Score",""].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 font-mono tracking-widest uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot._id} className="border-b border-[#1c2a42]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-sm text-slate-200">{slot.student?.name || "—"}</div>
                        <div className="text-xs text-slate-500 font-mono">{slot.student?.rollNumber || slot.student?.email || ""}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-slate-300">
                          <Calendar size={13} className="text-slate-500" />
                          {new Date(slot.scheduledAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Clock size={11} />
                          {new Date(slot.scheduledAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">{slot.duration}m</td>
                      <td className="px-5 py-4 text-xs text-slate-500 font-mono max-w-[120px] truncate" title={slot.jdFileName}>
                        {slot.jdFileName || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge color={STATUS_COLOR[slot.status] || "slate"}>{slot.status}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        {slot.interviewSession?.percentageScore != null ? (
                          <span className={`font-bold text-sm ${
                            slot.interviewSession.percentageScore >= 70 ? "text-green-400" :
                            slot.interviewSession.percentageScore >= 40 ? "text-amber-400" : "text-red-400"
                          }`}>{slot.interviewSession.percentageScore}%</span>
                        ) : <span className="text-slate-600 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {(slot.status === "completed" || slot.interviewSession) && (
                          <button
                            onClick={() => setDetail(slot)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 border border-blue-500/20
                                       text-blue-400 text-xs hover:bg-blue-600/25 transition font-medium"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {detail && <InterviewDetailModal slot={detail} onClose={() => setDetail(null)} />}
    </AppLayout>
  );
}