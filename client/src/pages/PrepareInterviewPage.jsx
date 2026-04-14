import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Button, Card, LoadingScreen } from "../components/ui";
import { interviewPrepAPI } from "../api";
import {
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Circle,
  FileText,
  Target,
} from "lucide-react";

function planProgress(prep) {
  const phases = prep?.preparationPlan?.phases || [];
  let total = 0;
  let done = 0;
  for (const ph of phases) {
    for (const t of ph.tasks || []) {
      total += 1;
      if (t.done) done += 1;
    }
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function statusLabel(status) {
  switch (status) {
    case "uploaded":
      return { text: "JD ready", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    case "generating":
      return { text: "Generating…", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    case "ready":
      return { text: "Plan ready", color: "text-green-400 bg-green-500/10 border-green-500/20" };
    case "failed":
      return { text: "Failed", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    default:
      return { text: status, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
  }
}

export default function PrepareInterviewPage() {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [openPhases, setOpenPhases] = useState({});
  const fileRef = useRef(null);

  const selected = useMemo(
    () => list.find((p) => p._id === selectedId) || detail,
    [list, selectedId, detail]
  );

  const loadList = useCallback(async () => {
    const { data } = await interviewPrepAPI.list();
    const items = data.data.preparations || [];
    setList(items);
    return items;
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const { data } = await interviewPrepAPI.get(id);
      setDetail(data.data.preparation);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const items = await loadList();
        if (items.length && !selectedId) {
          setSelectedId(items[0]._id);
        }
      } catch (e) {
        const msg =
          e.response?.data?.message ||
          (!e.response && e.message === "Network Error"
            ? "Cannot reach API. Is the server running on port 5000?"
            : null) ||
          e.message ||
          "Could not load preparations.";
        setError(msg);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function refreshAll() {
    const items = await loadList();
    if (selectedId) await loadDetail(selectedId);
    if (!items.find((x) => x._id === selectedId) && items[0]) {
      setSelectedId(items[0]._id);
    }
  }

  async function handleUpload(file) {
    if (!file || file.type !== "application/pdf") {
      setError("Please upload a PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Max file size 10MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { data } = await interviewPrepAPI.upload(file);
      const prep = data.data.preparation;
      await refreshAll();
      setSelectedId(prep._id);
    } catch (e) {
      setError(e.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleGenerate() {
    if (!selectedId) return;
    setError("");
    setGenerating(true);
    try {
      await interviewPrepAPI.generatePlan(selectedId);
      await refreshAll();
    } catch (e) {
      setError(e.response?.data?.message || "Could not generate plan.");
      await refreshAll();
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleTask(phaseId, taskId, done) {
    if (!selectedId) return;
    try {
      const { data } = await interviewPrepAPI.toggleTask(selectedId, phaseId, taskId, done);
      const p = data.data.preparation;
      setDetail(p);
      setList((prev) => prev.map((x) => (x._id === p._id ? { ...x, ...p } : x)));
    } catch (e) {
      setError(e.response?.data?.message || "Could not update task.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this JD and its plan from your list?")) return;
    try {
      const wasSelected = selectedId === id;
      await interviewPrepAPI.remove(id);
      const { data } = await interviewPrepAPI.list();
      const items = data.data.preparations || [];
      setList(items);
      if (wasSelected) {
        setSelectedId(items[0]?._id ?? null);
        setDetail(null);
      } else {
        await loadDetail(selectedId);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Could not delete.");
    }
  }

  const displayPrep = detail || selected;
  const prog = planProgress(displayPrep);

  if (loadingList) return <LoadingScreen />;

  return (
    <AppLayout>
      <div className="fade-in max-w-[1400px] mx-auto">
        <div className="mb-8">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">Interview prep</p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-blue-400" size={28} />
            Prepare for interview
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Upload multiple job descriptions (PDFs). For each one, generate a full preparation plan—phases, tasks, and tips—then check off tasks as you complete them.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* JD list */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="p-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">
                Your job descriptions
              </h2>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#1c2a42] hover:border-blue-500/40 hover:bg-blue-500/5 text-slate-400 text-sm transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="animate-pulse">Uploading…</span>
                ) : (
                  <>
                    <Upload size={18} />
                    Add JD (PDF)
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <p className="text-[11px] text-slate-600 mt-2 text-center">Up to 15 JDs · max 10MB each</p>
            </Card>

            <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {list.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-sm border border-[#1c2a42] rounded-xl">
                  No JDs yet. Upload a PDF to start.
                </div>
              ) : (
                list.map((p) => {
                  const st = statusLabel(p.planStatus);
                  const pr = planProgress(p);
                  const active = selectedId === p._id;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setSelectedId(p._id);
                        setError("");
                      }}
                      className={`text-left rounded-xl border p-3 transition-all ${
                        active
                          ? "border-blue-500/50 bg-blue-500/10"
                          : "border-[#1c2a42] bg-[#0f1623] hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{p.originalName}</p>
                            <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border ${st.color}`}>
                              {st.text}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p._id);
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {p.planStatus === "ready" && pr.total > 0 && (
                        <div className="mt-2 h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500/80 rounded-full transition-all"
                            style={{ width: `${pr.pct}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-8">
            {!selectedId || !displayPrep ? (
              <Card className="p-12 text-center text-slate-500">
                <Sparkles className="mx-auto mb-3 text-slate-600" size={40} />
                <p>Select a job description or add a new PDF.</p>
              </Card>
            ) : loadingDetail && !detail ? (
              <Card className="p-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {displayPrep.originalName}
                      </h2>
                      {displayPrep.roleSummary && (
                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{displayPrep.roleSummary}</p>
                      )}
                      {displayPrep.focusAreas?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {displayPrep.focusAreas.map((f, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded-lg bg-[#1c2a42] text-slate-300 font-mono"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {displayPrep.planStatus === "uploaded" && (
                        <Button onClick={handleGenerate} disabled={generating} loading={generating} size="lg">
                          <Sparkles size={16} className="mr-2 inline" />
                          Generate full plan
                        </Button>
                      )}
                      {displayPrep.planStatus === "generating" && (
                        <span className="text-sm text-blue-400 animate-pulse">Creating your plan…</span>
                      )}
                      {displayPrep.planStatus === "failed" && (
                        <div className="text-right">
                          <p className="text-xs text-red-400 mb-2 max-w-xs">{displayPrep.planError}</p>
                          <Button onClick={handleGenerate} disabled={generating} size="sm" variant="secondary">
                            Retry
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {displayPrep.planStatus === "ready" && (
                    <div className="mt-4 pt-4 border-t border-[#1c2a42] flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Plan progress</span>
                          <span>
                            {prog.done}/{prog.total} tasks · {prog.pct}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#1c2a42] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-green-500 rounded-full transition-all"
                            style={{ width: `${prog.pct}%` }}
                          />
                        </div>
                      </div>
                      {displayPrep.preparationPlan?.timelineWeeks != null && (
                        <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                          ~{displayPrep.preparationPlan.timelineWeeks} wk timeline
                        </span>
                      )}
                    </div>
                  )}
                </Card>

                {displayPrep.planStatus === "ready" && displayPrep.preparationPlan?.topicsToDrill?.length > 0 && (
                  <Card className="p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">
                      Topics to drill
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {displayPrep.preparationPlan.topicsToDrill.map((t, i) => (
                        <li
                          key={i}
                          className="text-sm px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {displayPrep.planStatus === "ready" &&
                  (displayPrep.preparationPlan?.phases || []).map((phase, pi) => {
                    const open = openPhases[phase._id] !== false;
                    return (
                      <Card key={phase._id || pi} className="overflow-hidden">
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02]"
                          onClick={() =>
                            setOpenPhases((o) => ({ ...o, [phase._id]: !open }))
                          }
                        >
                          {open ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                          <div className="flex-1">
                            <h3 className="font-bold text-white">{phase.title}</h3>
                            {phase.summary && (
                              <p className="text-sm text-slate-500 mt-1">{phase.summary}</p>
                            )}
                          </div>
                        </button>
                        {open && (
                          <div className="px-4 pb-4 space-y-4 border-t border-[#1c2a42] pt-4">
                            {phase.goals?.length > 0 && (
                              <div>
                                <p className="text-xs text-slate-500 font-mono mb-2">Goals</p>
                                <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                                  {phase.goals.map((g, i) => (
                                    <li key={i}>{g}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="space-y-2">
                              {(phase.tasks || []).map((task) => (
                                <label
                                  key={task._id}
                                  className="flex gap-3 p-3 rounded-xl border border-[#1c2a42] bg-[#0a0e1a] cursor-pointer hover:border-slate-600"
                                >
                                  <button
                                    type="button"
                                    className="mt-0.5 flex-shrink-0 text-slate-500 hover:text-green-400"
                                    onClick={() => handleToggleTask(phase._id, task._id, !task.done)}
                                  >
                                    {task.done ? (
                                      <CheckCircle2 size={22} className="text-green-500" />
                                    ) : (
                                      <Circle size={22} />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${task.done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                                      {task.title}
                                    </p>
                                    {task.detail && (
                                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.detail}</p>
                                    )}
                                    <p className="text-[10px] text-slate-600 mt-1 font-mono">
                                      ~{task.estimatedHours}h
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                            {phase.resources?.filter((r) => r.title).length > 0 && (
                              <div>
                                <p className="text-xs text-slate-500 font-mono mb-2">Resources</p>
                                <ul className="space-y-1">
                                  {phase.resources
                                    .filter((r) => r.title)
                                    .map((r, i) => (
                                      <li key={i} className="text-sm">
                                        {r.url ? (
                                          <a
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline"
                                          >
                                            {r.title}
                                          </a>
                                        ) : (
                                          <span className="text-slate-400">{r.title}</span>
                                        )}
                                        <span className="text-slate-600 text-xs ml-2">({r.type})</span>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}

                {displayPrep.planStatus === "ready" && displayPrep.preparationPlan?.interviewTips?.length > 0 && (
                  <Card className="p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">
                      Interview tips
                    </h3>
                    <ul className="space-y-2">
                      {displayPrep.preparationPlan.interviewTips.map((tip, i) => (
                        <li key={i} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-amber-500">→</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
