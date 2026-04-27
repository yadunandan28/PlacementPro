// ============================================================
//  pages/MyInterviewsPage.jsx  —  Student: My Mock Interviews
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AppLayout from "../components/layout/AppLayout";
import { Card, Badge, EmptyState, LoadingScreen, Button } from "../components/ui";
import { Calendar, Clock, Mic, FileText, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

// ── Interview-service axios instance ───────────────────────
// In Docker/production Nginx proxies /api/interview/ → interview-service:5001
// In local dev VITE_INTERVIEW_URL can be set to http://localhost:5001/api
const iApi = axios.create({ baseURL: import.meta.env.VITE_INTERVIEW_URL || "/api" });
iApi.interceptors.request.use((cfg) => {
  try {
    const raw = localStorage.getItem("placementpro-auth");
    const tok = raw ? JSON.parse(raw)?.state?.accessToken : null;
    if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
  } catch {}
  return cfg;
});

const STATUS_COLOR  = { scheduled: "blue", in_progress: "amber", completed: "green", cancelled: "red" };
const STATUS_LABEL  = { scheduled: "Upcoming", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };

export default function MyInterviewsPage() {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await iApi.get("/interview/my-slots");
      setSlots(r.data?.data?.slots || []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load interviews. Is the interview service running on port 5001?");
    }
    setLoading(false);
  }

  const upcoming  = slots.filter(s => s.status === "scheduled" || s.status === "in_progress");
  const completed = slots.filter(s => s.status === "completed"  || s.status === "cancelled");

  if (loading) return <LoadingScreen />;

  return (
    <AppLayout>
      <div className="fade-in">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Student</p>
            <h1 className="text-2xl font-bold text-white">My Mock Interviews</h1>
            <p className="text-slate-500 text-sm mt-1">AI-powered interview practice scheduled by your placement cell</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-[#0f1623] border border-[#1c2a42] text-slate-500 hover:text-slate-300 transition">
            <RefreshCw size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ── Upcoming ── */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-500 font-mono tracking-widest uppercase mb-3">
            Upcoming ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <div className="text-3xl mb-3">🎤</div>
                <p className="text-slate-400 text-sm">No upcoming interviews scheduled.</p>
                <p className="text-slate-600 text-xs mt-1">Your placement staff will schedule one for you.</p>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {upcoming.map(slot => (
                <Card key={slot._id} className="border border-blue-500/20 bg-blue-500/5">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">

                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Mic size={20} className="text-blue-400" />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color={STATUS_COLOR[slot.status]}>{STATUS_LABEL[slot.status]}</Badge>
                        {slot.jdFileName && (
                          <span className="text-xs text-slate-500 font-mono">{slot.jdFileName}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-600" />
                          {new Date(slot.scheduledAt).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-600" />
                          {new Date(slot.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          ⏱ {slot.duration} minutes
                        </span>
                      </div>
                      {slot.notes && (
                        <p className="mt-2 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 inline-block">
                          📌 {slot.notes}
                        </p>
                      )}
                    </div>

                    {/* Join button */}
                    <Button
                      onClick={() => navigate(`/interview/${slot._id}`)}
                      className="shrink-0"
                    >
                      {slot.status === "in_progress" ? "▶ Resume" : "Join Interview"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Past ── */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 font-mono tracking-widest uppercase mb-3">
              Past Interviews ({completed.length})
            </h2>
            <Card>
              <div className="divide-y divide-[#1c2a42]">
                {completed.map(slot => (
                  <div key={slot._id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0f1623] border border-[#1c2a42] flex items-center justify-center shrink-0">
                      {slot.status === "completed"
                        ? <CheckCircle size={18} className="text-green-400" />
                        : <AlertCircle size={18} className="text-slate-600" />
                      }
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge color={STATUS_COLOR[slot.status]}>{STATUS_LABEL[slot.status]}</Badge>
                        {slot.jdFileName && (
                          <span className="text-xs text-slate-600 font-mono flex items-center gap-1">
                            <FileText size={11} /> {slot.jdFileName}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-slate-600 mt-0.5">
                        <span>{new Date(slot.scheduledAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
                        <span>{slot.duration}m</span>
                      </div>
                    </div>

                    {/* Score */}
                    {slot.interviewSession?.percentageScore != null ? (
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          slot.interviewSession.percentageScore >= 70 ? "text-green-400" :
                          slot.interviewSession.percentageScore >= 40 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {slot.interviewSession.percentageScore}%
                        </div>
                        <div className="text-xs text-slate-600">
                          {slot.interviewSession.totalScore}/{slot.interviewSession.maxScore} pts
                        </div>
                        <button
                          onClick={() => navigate(`/interview/${slot._id}`)}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline"
                        >
                          View Report
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

      </div>
    </AppLayout>
  );
}