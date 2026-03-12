// ============================================================
//  pages/MockInterviewPage.jsx  —  Student: Live Interview
//  Features: TTS questions, mic+camera recording, Whisper STT,
//            AI evaluation, coding round, final report + video download
// ============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mic, MicOff, Square, Play, ChevronRight,
  CheckCircle, XCircle, Clock, Code2, Volume2,
  RotateCcw, Send, Loader, Camera, CameraOff,
  Download, Eye, EyeOff, AlertCircle
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

// ── States ────────────────────────────────────────────────
const S = {
  LOADING:    "LOADING",
  LOBBY:      "LOBBY",
  SPEAKING:   "SPEAKING",
  IDLE:       "IDLE",
  RECORDING:  "RECORDING",
  REVIEWING:  "REVIEWING",
  EVALUATING: "EVALUATING",
  CODING:     "CODING",
  RUNNING:    "RUNNING",
  UPLOADING:  "UPLOADING",
  FINISHED:   "FINISHED",
  ERROR:      "ERROR",
};

// ── Helpers ───────────────────────────────────────────────
function ScoreBadge({ score }) {
  const c = score >= 7 ? "text-green-400 bg-green-400/10 border-green-500/30"
          : score >= 4 ? "text-amber-400 bg-amber-400/10 border-amber-500/30"
          :              "text-red-400   bg-red-400/10   border-red-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${c}`}>
      {score}/10
    </span>
  );
}

function CodeEditor({ value, onChange, language }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      spellCheck={false}
      className="w-full h-56 bg-[#0a0e1a] border border-[#1c2a42] rounded-lg p-4
                 text-sm text-green-300 font-mono resize-none focus:outline-none
                 focus:border-blue-500/60 leading-relaxed"
      placeholder={`# Write your ${language} solution here...`}
    />
  );
}

// ── Webcam Preview Component ──────────────────────────────
function WebcamPreview({ stream, minimized, onToggle, recording }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  if (!stream) return null;

  return (
    <div className={`fixed z-50 transition-all duration-300 shadow-2xl rounded-xl overflow-hidden border-2
      ${recording ? "border-red-500/60" : "border-[#1c2a42]"}
      ${minimized ? "bottom-4 right-4 w-20 h-16" : "bottom-4 right-4 w-52 h-40"}`}
    >
      <video
        ref={videoRef}
        autoPlay muted playsInline
        className="w-full h-full object-cover scale-x-[-1]"
      />
      {/* Overlay controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-1.5">
        {recording && !minimized && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-300 font-mono font-bold">REC</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded-lg bg-black/40 text-white hover:bg-black/60 transition"
          title={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function MockInterviewPage() {
  const { slotId } = useParams();
  const navigate   = useNavigate();

  // Interview state
  const [stage,      setStage]      = useState(S.LOADING);
  const [error,      setError]      = useState("");
  const [sessionId,  setSessionId]  = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [qIndex,     setQIndex]     = useState(0);
  const [transcript, setTranscript] = useState("");
  const [code,       setCode]       = useState("");
  const [language,   setLanguage]   = useState("python");
  const [codeOutput, setCodeOutput] = useState("");
  const [results,    setResults]    = useState(null);
  const [elapsed,    setElapsed]    = useState(0);

  // Video/media state
  const [cameraStream,   setCameraStream]   = useState(null);  // live preview stream
  const [cameraAllowed,  setCameraAllowed]  = useState(false);
  const [micAllowed,     setMicAllowed]     = useState(false);
  const [camMinimized,   setCamMinimized]   = useState(false);
  const [videoBlobs,     setVideoBlobs]     = useState([]);    // array of {qIndex, url, name}
  const [uploadProgress, setUploadProgress] = useState(null);  // {current, total, name}
  const [currentRecUrl,  setCurrentRecUrl]  = useState(null);  // last recording for review

  // Refs
  const mediaRecRef  = useRef(null);  // MediaRecorder (audio+video)
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);

  const currentQ = questions[qIndex];
  const progress = questions.length ? Math.round((qIndex / questions.length) * 100) : 0;

  // ── Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (stage === S.RECORDING) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (stage !== S.REVIEWING) setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [stage]);

  // ── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      cameraStream?.getTracks().forEach(t => t.stop());
      videoBlobs.forEach(b => URL.revokeObjectURL(b.url));
    };
  }, []);

  // ── Load interview ─────────────────────────────────────
  useEffect(() => { loadInterview(); }, [slotId]);

  async function loadInterview() {
    setStage(S.LOADING);
    try {
      const res = await iApi.post(`/interview/slots/${slotId}/start`);
      const { sessionId: sid, questions: qs, currentQuestionIndex: idx } = res.data.data;
      setSessionId(sid);
      setQuestions(qs);
      setQIndex(idx || 0);
      setStage(S.LOBBY);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not connect to interview service.");
      setStage(S.ERROR);
    }
  }

  // ── Request camera + mic ───────────────────────────────
  async function requestPermissions() {
    let stream = null;
    try {
      // Try video+audio first
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraAllowed(true);
      setMicAllowed(true);
    } catch {
      // Fallback: audio only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicAllowed(true);
        setCameraAllowed(false);
      } catch {
        alert("Microphone access is required. Please allow permissions and refresh.");
        return false;
      }
    }

    // Keep a SEPARATE preview-only stream for the webcam widget
    if (stream.getVideoTracks().length > 0) {
      try {
        const previewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCameraStream(previewStream);
      } catch {
        // Preview failed, skip
      }
    }
    return true;
  }

  // ── TTS ─────────────────────────────────────────────────
  function speak(text, onDone) {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u   = new SpeechSynthesisUtterance(text);
    u.rate    = 0.9;
    u.onend   = () => onDone?.();
    u.onerror = () => onDone?.();
    window.speechSynthesis.speak(u);
  }

  // ── Begin a question ────────────────────────────────────
  function beginQuestion(q) {
    setTranscript("");
    setCode("");
    setCodeOutput("");
    setCurrentRecUrl(null);
    setStage(S.SPEAKING);
    speak(q.question, () => setStage(q.type === "coding" ? S.CODING : S.IDLE));
  }

  // ── Start recording (video + audio) ────────────────────
  async function startRecording() {
    chunksRef.current = [];
    try {
      // Get fresh audio+video stream for recording
      const constraints = cameraAllowed
        ? { video: { width: 640, height: 480, facingMode: "user" }, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Pick best supported mimeType
      const mimeType = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "audio/webm",
      ].find(m => MediaRecorder.isTypeSupported(m)) || "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        processRecording();
      };
      mediaRecRef.current = mr;
      mr.start(250); // collect chunks every 250ms
      setStage(S.RECORDING);
    } catch (err) {
      alert("Could not start recording: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop();
      setStage(S.EVALUATING);
    }
  }

  // ── Process recorded blob → Whisper STT ────────────────
  async function processRecording() {
    const mimeType = mediaRecRef.current?.mimeType || "video/webm";
    const blob     = new Blob(chunksRef.current, { type: mimeType });

    // Save video URL for download
    const url  = URL.createObjectURL(blob);
    const name = `Q${qIndex + 1}_${currentQ?.type}_answer.webm`;
    setCurrentRecUrl(url);
    setVideoBlobs(prev => [...prev, { qIndex, url, name, type: currentQ?.type }]);

    // Send audio to Whisper (extract audio blob if video, else use as-is)
    const audioBlob = mimeType.startsWith("video")
      ? new Blob(chunksRef.current, { type: "audio/webm" })
      : blob;

    const fd = new FormData();
    fd.append("audio", audioBlob, "answer.webm");

    try {
      const res = await iApi.post("/interview/transcribe", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTranscript(res.data.data.transcript || "");
    } catch {
      setTranscript(""); // let user type manually
    }
    setStage(S.REVIEWING);
  }

  // ── Submit verbal ──────────────────────────────────────
  async function submitVerbal() {
    if (!transcript.trim()) return;
    setStage(S.EVALUATING);
    try {
      const res = await iApi.post(`/interview/sessions/${sessionId}/verbal`, {
        transcript, timeSpent: elapsed,
      });
      const { isLastQuestion, nextIndex } = res.data.data;
      setQIndex(nextIndex);
      if (isLastQuestion) {
        await doFinish();
      } else {
        beginQuestion(questions[nextIndex]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit.");
      setStage(S.REVIEWING);
    }
  }

  // ── Run code ───────────────────────────────────────────
  async function runCode() {
    setStage(S.RUNNING);
    try {
      const res = await iApi.post(`/interview/sessions/${sessionId}/run-code`, { code, language });
      setCodeOutput(res.data.data.stdout || res.data.data.stderr || "No output");
    } catch { setCodeOutput("Error connecting to code runner"); }
    setStage(S.CODING);
  }

  // ── Submit code ────────────────────────────────────────
  async function submitCode() {
    setStage(S.EVALUATING);
    try {
      const res = await iApi.post(`/interview/sessions/${sessionId}/code`, {
        code, language, timeSpent: elapsed,
      });
      const { isLastQuestion, nextIndex } = res.data.data;
      setQIndex(nextIndex);
      if (isLastQuestion) {
        await doFinish();
      } else {
        beginQuestion(questions[nextIndex]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit.");
      setStage(S.CODING);
    }
  }

  // ── Finish + upload videos ────────────────────────────
  async function doFinish() {
    cameraStream?.getTracks().forEach(t => t.stop());
    setStage(S.UPLOADING);
    try {
      const res = await iApi.post(`/interview/sessions/${sessionId}/finish`);
      const finishData = res.data.data;

      // Upload each recorded video blob to Cloudinary
      if (videoBlobs.length > 0) {
        for (let i = 0; i < videoBlobs.length; i++) {
          const v = videoBlobs[i];
          setUploadProgress({ current: i + 1, total: videoBlobs.length, name: v.name });
          try {
            const blob = await fetch(v.url).then(r => r.blob());
            const fd   = new FormData();
            fd.append("video",         blob, v.name);
            fd.append("questionIndex", v.qIndex);
            fd.append("questionType",  v.type);
            fd.append("duration",      v.duration || 0);
            await iApi.post(`/interview/sessions/${finishData.sessionId || sessionId}/upload-recording`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 120000,
            });
          } catch (uploadErr) {
            console.warn("Video upload failed for Q" + (v.qIndex + 1), uploadErr.message);
            // Don't block — continue with other videos
          }
        }
      }

      setResults(finishData);
      setStage(S.FINISHED);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate report.");
      setStage(S.ERROR);
    }
  }

  // ── Download helper ────────────────────────────────────
  function downloadVideo(url, name) {
    const a = document.createElement("a");
    a.href  = url;
    a.download = name;
    a.click();
  }

  // ─────────────────────────────────────────────────────
  //  SCREENS
  // ─────────────────────────────────────────────────────

  if (stage === S.LOADING) return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center">
      <div className="text-center">
        <Loader size={40} className="text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Preparing your interview…</p>
        <p className="text-slate-600 text-xs mt-1">AI is generating questions based on the JD</p>
      </div>
    </div>
  );

  if (stage === S.ERROR) return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-bold text-lg mb-2">Could not load interview</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={loadInterview}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
            <RotateCcw size={14} /> Retry
          </button>
          <button onClick={() => navigate("/my-interviews")}
            className="px-4 py-2 bg-[#0f1623] border border-[#1c2a42] text-slate-300 rounded-lg text-sm hover:bg-[#1c2a42] transition">
            Back
          </button>
        </div>
      </div>
    </div>
  );

  // ── UPLOADING ─────────────────────────────────────────
  if (stage === S.UPLOADING) return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-5">
          <Loader size={28} className="text-blue-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          {uploadProgress ? "Uploading Recordings…" : "Generating Report…"}
        </h2>
        {uploadProgress ? (
          <>
            <p className="text-slate-400 text-sm mb-4">
              Uploading {uploadProgress.current} of {uploadProgress.total}: {uploadProgress.name}
            </p>
            <div className="w-full h-2 bg-[#1c2a42] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-3">Videos will be available to staff for 2 days</p>
          </>
        ) : (
          <p className="text-slate-400 text-sm">AI is writing your evaluation report…</p>
        )}
      </div>
    </div>
  );

  // ── FINISHED ──────────────────────────────────────────
  if (stage === S.FINISHED && results) return (
    <div className="min-h-screen bg-[#060912] p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">

        {/* Score */}
        <div className="text-center mb-8">
          <CheckCircle size={52} className="text-green-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-white mb-2">Interview Complete!</h1>
          <div className={`text-6xl font-bold mb-1 ${
            results.percentageScore >= 70 ? "text-green-400" :
            results.percentageScore >= 40 ? "text-amber-400" : "text-red-400"
          }`}>{results.percentageScore}%</div>
          <p className="text-slate-400">{results.totalScore} / {results.maxScore} points</p>
        </div>

        {/* Video recordings download */}
        {videoBlobs.length > 0 && (
          <div className="bg-[#0f1623] border border-blue-500/20 rounded-xl p-5 mb-6">
            <h3 className="text-xs font-bold text-slate-400 font-mono tracking-widest uppercase mb-3 flex items-center gap-2">
              <Camera size={14} className="text-blue-400" /> Your Recorded Answers
            </h3>
            <div className="space-y-2">
              {videoBlobs.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#060912] rounded-lg border border-[#1c2a42]">
                  <div>
                    <p className="text-sm text-slate-300 font-medium">{v.name}</p>
                    <p className="text-xs text-slate-600">Question {v.qIndex + 1} · {v.type}</p>
                  </div>
                  <div className="flex gap-2">
                    {/* Preview inline */}
                    <a href={v.url} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#1c2a42] text-slate-300 text-xs hover:bg-[#263552] transition flex items-center gap-1.5">
                      <Eye size={12} /> Preview
                    </a>
                    <button onClick={() => downloadVideo(v.url, v.name)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-600/30 transition flex items-center gap-1.5">
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">⚠ Videos are stored in your browser temporarily. Download them before closing this tab.</p>
          </div>
        )}

        {/* AI Report */}
        {results.aiReport && (
          <div className="bg-[#0f1623] border border-[#1c2a42] rounded-xl p-5 mb-6">
            <h3 className="text-xs font-bold text-slate-500 font-mono tracking-widest uppercase mb-3">AI Evaluation Report</h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{results.aiReport}</p>
          </div>
        )}

        {/* Question breakdown */}
        <div className="bg-[#0f1623] border border-[#1c2a42] rounded-xl divide-y divide-[#1c2a42] mb-6">
          <div className="px-5 py-3">
            <h3 className="text-xs font-bold text-slate-500 font-mono tracking-widest uppercase">Question Breakdown</h3>
          </div>
          {results.questions?.map((q, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  q.type === "verbal"
                  ? "text-blue-400 bg-blue-400/10 border-blue-500/30"
                  : "text-purple-400 bg-purple-400/10 border-purple-500/30"
                }`}>{q.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 font-medium mb-1">{q.question}</p>
                  {q.transcript && <p className="text-xs text-slate-500 mb-1 italic">"{q.transcript}"</p>}
                  {q.feedback   && <p className="text-xs text-slate-400">{q.feedback}</p>}
                </div>
                <ScoreBadge score={q.score || 0} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button onClick={() => navigate("/my-interviews")}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition">
            Back to My Interviews
          </button>
        </div>
      </div>
    </div>
  );

  // ── LOBBY ─────────────────────────────────────────────
  if (stage === S.LOBBY) return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="bg-[#0f1623] border border-[#1c2a42] rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
              <Mic size={28} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ready for your Interview?</h1>
            <p className="text-slate-400 text-sm">
              <strong className="text-white">{questions.length} questions</strong>
              {" "}— {questions.filter(q => q.type === "verbal").length} verbal + {questions.filter(q => q.type === "coding").length} coding.
              Your camera and mic will be recorded.
            </p>
          </div>

          {/* Permissions status */}
          <div className="bg-[#060912] rounded-xl border border-[#1c2a42] p-4 mb-6">
            <p className="text-xs text-slate-500 font-mono mb-3 uppercase tracking-wider">Required Permissions</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Mic size={14} className={micAllowed ? "text-green-400" : "text-slate-600"} /> Microphone
                </div>
                <span className={`text-xs font-mono ${micAllowed ? "text-green-400" : "text-slate-600"}`}>
                  {micAllowed ? "✓ Allowed" : "Required"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Camera size={14} className={cameraAllowed ? "text-green-400" : "text-slate-600"} /> Camera (for video recording)
                </div>
                <span className={`text-xs font-mono ${cameraAllowed ? "text-green-400" : "text-amber-400"}`}>
                  {cameraAllowed ? "✓ Allowed" : "Optional"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-600 text-center">
              By starting, you agree to your responses being recorded for evaluation.
            </p>
            <div className="flex gap-3">
              <button onClick={() => navigate("/my-interviews")}
                className="flex-1 py-2.5 rounded-xl border border-[#1c2a42] text-slate-400 text-sm hover:bg-white/5 transition">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const ok = await requestPermissions();
                  if (ok) beginQuestion(questions[0]);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <Play size={16} /> Start Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── MAIN INTERVIEW LAYOUT ─────────────────────────────
  return (
    <>
      {/* Floating webcam preview */}
      <WebcamPreview
        stream={cameraStream}
        recording={stage === S.RECORDING}
        minimized={camMinimized}
        onToggle={() => setCamMinimized(v => !v)}
      />

      <div className="min-h-screen bg-[#060912] flex flex-col">

        {/* Top bar */}
        <div className="border-b border-[#1c2a42] bg-[#0a0e1a] px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">P</div>
            <span className="text-sm font-semibold text-white">Mock Interview</span>
          </div>
          <div className="flex items-center gap-5">
            {/* Camera indicator */}
            {cameraAllowed && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Camera size={13} className={stage === S.RECORDING ? "text-red-400 animate-pulse" : "text-slate-600"} />
                <span className={stage === S.RECORDING ? "text-red-400" : "text-slate-600"}>
                  {stage === S.RECORDING ? "Recording" : "Camera on"}
                </span>
              </div>
            )}
            {/* Timer */}
            {stage === S.RECORDING && (
              <div className="flex items-center gap-1.5 text-red-400 text-sm font-mono">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
              </div>
            )}
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-[#1c2a42] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-500 font-mono">{qIndex}/{questions.length}</span>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">

            {currentQ && (
              <div className="bg-[#0f1623] border border-[#1c2a42] rounded-2xl overflow-hidden">

                {/* Question header */}
                <div className="px-6 py-4 border-b border-[#1c2a42] flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    currentQ.type === "verbal"
                    ? "text-blue-400 bg-blue-400/10 border-blue-500/30"
                    : "text-purple-400 bg-purple-400/10 border-purple-500/30"
                  }`}>
                    {currentQ.type === "verbal" ? "🎤 Verbal" : "💻 Coding"} · Q{qIndex + 1}/{questions.length}
                  </span>
                  {stage === S.SPEAKING && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400">
                      <Volume2 size={12} className="animate-pulse" /> Reading question…
                    </span>
                  )}
                </div>

                {/* Question text */}
                <div className="px-6 py-5">
                  <p className="text-white text-base leading-relaxed">{currentQ.question}</p>
                </div>

                {/* ── VERBAL CONTROLS ── */}
                {currentQ.type === "verbal" && (
                  <div className="px-6 pb-6 space-y-3">

                    {/* IDLE */}
                    {(stage === S.IDLE || stage === S.SPEAKING) && (
                      <button
                        disabled={stage === S.SPEAKING}
                        onClick={startRecording}
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed
                                   text-white font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <Mic size={18} />
                        {stage === S.SPEAKING ? "Wait for question to finish…" : `Start Recording${cameraAllowed ? " (Camera + Mic)" : " (Mic only)"}`}
                      </button>
                    )}

                    {/* RECORDING */}
                    {stage === S.RECORDING && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-400 font-mono text-sm">Recording in progress — speak clearly</span>
                          {cameraAllowed && <Camera size={14} className="text-red-400" />}
                        </div>
                        <button
                          onClick={stopRecording}
                          className="w-full py-3 rounded-xl bg-[#1c2a42] hover:bg-[#263552] border border-[#2a3a55]
                                     text-white font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <Square size={16} /> Stop Recording
                        </button>
                      </div>
                    )}

                    {/* EVALUATING / TRANSCRIBING */}
                    {stage === S.EVALUATING && (
                      <div className="text-center py-6">
                        <Loader size={26} className="text-blue-400 animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Transcribing your answer…</p>
                        <p className="text-slate-600 text-xs mt-1">AI is evaluating your response</p>
                      </div>
                    )}

                    {/* REVIEWING */}
                    {stage === S.REVIEWING && (
                      <div className="space-y-3">
                        {/* Video preview of their recording */}
                        {currentRecUrl && (
                          <div className="rounded-xl overflow-hidden border border-[#1c2a42] bg-[#060912]">
                            <p className="text-xs text-slate-600 px-3 pt-2 pb-1 font-mono">Your recording preview</p>
                            <video src={currentRecUrl} controls className="w-full max-h-40 object-cover" />
                          </div>
                        )}
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Your Answer (edit if needed)
                        </label>
                        <textarea
                          value={transcript}
                          onChange={e => setTranscript(e.target.value)}
                          rows={4}
                          placeholder="Your transcribed answer will appear here. You can also type your answer directly."
                          className="w-full bg-[#060912] border border-[#1c2a42] rounded-xl px-4 py-3 text-sm text-slate-200
                                     placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                        />
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setStage(S.IDLE); setTranscript(""); setCurrentRecUrl(null); }}
                            className="flex-1 py-2.5 rounded-xl border border-[#1c2a42] text-slate-400 text-sm hover:bg-white/5 transition flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw size={14} /> Re-record
                          </button>
                          <button
                            onClick={submitVerbal}
                            disabled={!transcript.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                                       text-white font-semibold text-sm transition flex items-center justify-center gap-1.5"
                          >
                            <Send size={14} /> Submit Answer
                          </button>
                        </div>
                      </div>
                    )}


                  </div>
                )}

                {/* ── CODING CONTROLS ── */}
                {currentQ.type === "coding" && (
                  <div className="px-6 pb-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Language</label>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="bg-[#060912] border border-[#1c2a42] rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                    </div>

                    <CodeEditor value={code} onChange={setCode} language={language} />

                    {codeOutput && (
                      <div className="bg-[#060912] border border-[#1c2a42] rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1 font-mono uppercase">Output</p>
                        <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">{codeOutput}</pre>
                      </div>
                    )}

                    {stage === S.EVALUATING && (
                      <div className="text-center py-4">
                        <Loader size={22} className="text-blue-400 animate-spin mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Evaluating your solution…</p>
                      </div>
                    )}



                    {(stage === S.CODING || stage === S.RUNNING) && (
                      <div className="flex gap-2">
                        <button
                          onClick={runCode}
                          disabled={stage === S.RUNNING || !code.trim()}
                          className="flex-1 py-2.5 rounded-xl border border-[#1c2a42] text-slate-300 text-sm
                                     hover:bg-white/5 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
                        >
                          {stage === S.RUNNING ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                          {stage === S.RUNNING ? "Running…" : "Run Code"}
                        </button>
                        <button
                          onClick={submitCode}
                          disabled={!code.trim()}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                                     text-white font-semibold text-sm transition flex items-center justify-center gap-1.5"
                        >
                          <Send size={14} /> Submit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}