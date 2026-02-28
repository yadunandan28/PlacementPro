import { useState, useEffect, useRef } from "react";
import api from "../api";
import AppLayout from "../components/layout/AppLayout";

// ── Priority badge colors ──────────────────────────────────
const PRIORITY_COLORS = [
  { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    badge: "High" },
  { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    badge: "High" },
  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  badge: "Medium" },
  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  badge: "Medium" },
  { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   badge: "Moderate" },
  { bg: "bg-slate-500/10",  border: "border-slate-500/30",  text: "text-slate-400",  badge: "Low" },
  { bg: "bg-slate-500/10",  border: "border-slate-500/30",  text: "text-slate-400",  badge: "Low" },
];

export default function ChatbotPage() {
  const [session,     setSession]     = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [dragOver,    setDragOver]    = useState(false);

  const fileInputRef  = useRef(null);
  const chatBottomRef = useRef(null);

  // ── Load existing session on mount ──────────────────────
  useEffect(() => {
    loadSession();
  }, []);

  // ── Auto-scroll chat ─────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSession() {
    try {
      const { data } = await api.get("/chatbot/session");
      if (data.data.session) {
        setSession(data.data.session);
        const history = data.data.session.chatHistory.map((m) => ({
          role:    m.role,
          content: m.content,
        }));
        setMessages(history.length > 0 ? history : getWelcomeMessages(data.data.session));
      } else {
        setMessages([]);
      }
    } catch {
      // No session or not logged in — silent fail
    }
  }

  function getWelcomeMessages(sess) {
    return [{
      role:    "assistant",
      content: `I've analyzed **${sess.originalName}**! Here's what I found:\n\n**Top Focus Areas:**\n${sess.focusAreas.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nAsk me anything about this role — what to study, how to prepare, or specific requirements!`,
    }];
  }

  // ── File upload ──────────────────────────────────────────
  async function handleUpload(file) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Max 10MB.");
      return;
    }

    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("jd", file);

    try {
      const { data } = await api.post("/chatbot/upload-jd", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newSession = {
        _id:          data.data.sessionId,
        originalName: file.name,
        focusAreas:   data.data.focusAreas,
        chatHistory:  [],
      };
      setSession(newSession);
      setMessages([{
        role:    "assistant",
        content: `✅ I've analyzed **${file.name}**!\n\n**Top Focus Areas for this role:**\n${data.data.focusAreas.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nAsk me anything — what to study, interview tips, or skills to strengthen!`,
      }]);
    } catch (err) {
      setUploadError(
        err.response?.data?.message || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  // ── Clear session ────────────────────────────────────────
  async function handleClear() {
    try {
      await api.delete("/chatbot/session");
      setSession(null);
      setMessages([]);
      setUploadError("");
    } catch {
      // silent
    }
  }

  // ── Send chat message ────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !session) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    // Typing indicator
    setMessages((prev) => [...prev, { role: "assistant", content: "__typing__" }]);

    try {
      const { data } = await api.post("/chatbot/chat", {
        message:   text,
        sessionId: session._id,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.content !== "__typing__"),
        { role: "assistant", content: data.data.message },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== "__typing__"),
        {
          role:    "assistant",
          content: err.response?.data?.message || "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // ── Drag and drop ────────────────────────────────────────
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  // ── Suggested questions ──────────────────────────────────
  const suggestions = [
    "What are the most important skills for this role?",
    "What DSA topics should I focus on?",
    "How should I prepare for the technical round?",
    "What projects should I build for this role?",
    "What questions might they ask in HR round?",
  ];

  // ── Render message ────────────────────────────────────────
  function renderMessage(msg, idx) {
    const isUser   = msg.role === "user";
    const isTyping = msg.content === "__typing__";

    if (isTyping) {
      return (
        <div key={idx} className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-sm flex-shrink-0">
            🤖
          </div>
          <div className="bg-[#0f1623] border border-[#1c2a42] rounded-xl rounded-tl-sm px-4 py-3">
            <div className="flex gap-1 items-center h-5">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      );
    }

    function formatContent(text) {
      return text.split("\n").map((line, i) => {
        const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        if (line.match(/^\d+\./))
          return <p key={i} className="ml-2 mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
        if (line.startsWith("- ") || line.startsWith("• "))
          return <p key={i} className="ml-2 mb-1" dangerouslySetInnerHTML={{ __html: "▸ " + formatted.slice(2) }} />;
        if (line.trim() === "")
          return <br key={i} />;
        return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
      });
    }

    return (
      <div key={idx} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
            : "bg-gradient-to-br from-amber-500 to-red-500"
        }`}>
          {isUser ? "U" : "🤖"}
        </div>

        <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-xl rounded-tr-sm"
            : "bg-[#0f1623] border border-[#1c2a42] text-slate-200 rounded-xl rounded-tl-sm"
        }`}>
          {isUser
            ? <p>{msg.content}</p>
            : <div>{formatContent(msg.content)}</div>
          }
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="fade-in">

        {/* Page Header */}
        <div className="mb-6">
          <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mb-1">AI Assistant</p>
          <h1 className="text-2xl font-bold text-white">🤖 JD Analyzer</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload a company's Job Description — AI will tell you exactly what to study
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT PANEL ─────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Upload Card */}
            <div className="bg-[#0f1623] border border-[#1c2a42] rounded-2xl p-5">
              <h2 className="text-xs font-bold text-slate-500 mb-4 tracking-widest uppercase font-mono">
                📄 Job Description PDF
              </h2>

              {!session ? (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-blue-400 bg-blue-500/10"
                        : "border-[#1c2a42] hover:border-blue-500/50 hover:bg-blue-500/5"
                    } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-400">Uploading & analyzing...</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-sm font-semibold text-slate-300">Drop JD PDF here</p>
                        <p className="text-xs text-slate-500 mt-1">or click to browse · PDF only · Max 10MB</p>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files[0])}
                  />

                  {uploadError && (
                    <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      ⚠️ {uploadError}
                    </p>
                  )}
                </>
              ) : (
                <div>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
                    <div className="text-2xl">📄</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-400 truncate">
                        {session.originalName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">✅ Indexed & ready</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClear}
                    className="w-full py-2 text-xs text-slate-400 border border-[#1c2a42] rounded-lg hover:border-red-500/40 hover:text-red-400 transition-colors"
                  >
                    🗑 Upload different JD
                  </button>
                </div>
              )}
            </div>

            {/* Focus Areas Card */}
            <div className="bg-[#0f1623] border border-[#1c2a42] rounded-2xl p-5 flex-1">
              <h2 className="text-xs font-bold text-slate-500 mb-4 tracking-widest uppercase font-mono">
                🎯 Focus Areas
              </h2>

              {session?.focusAreas?.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {session.focusAreas.map((area, i) => {
                    const color = PRIORITY_COLORS[i] || PRIORITY_COLORS[PRIORITY_COLORS.length - 1];
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border ${color.bg} ${color.border}`}
                      >
                        <span className="text-sm text-slate-200">{area}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 ${color.text}`}>
                          {color.badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <p className="text-3xl mb-2">🎯</p>
                  <p className="text-sm">Upload a JD to see what areas to focus on</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL — CHAT ─────────────────────────── */}
          <div
            className="lg:col-span-2 bg-[#0f1623] border border-[#1c2a42] rounded-2xl flex flex-col"
            style={{ minHeight: "70vh" }}
          >
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[#1c2a42] bg-[#0a0e1a] rounded-t-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <p className="text-sm font-semibold text-white">JD Analyzer · AI Assistant</p>
                <p className={`text-xs ${session ? "text-green-400" : "text-slate-500"}`}>
                  {session ? "● Online · RAG powered" : "● Waiting for JD upload"}
                </p>
              </div>
              {session && (
                <div className="ml-auto text-xs text-slate-500 font-mono bg-[#151e30] px-3 py-1 rounded-full border border-[#1c2a42]">
                  Groq · LLaMA 3
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div className="text-5xl">📋</div>
                  <div>
                    <p className="text-slate-300 font-semibold">Upload a JD to get started</p>
                    <p className="text-slate-500 text-sm mt-1">
                      The AI will analyze the job description and help you prepare
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 w-full max-w-sm">
                    {suggestions.slice(0, 3).map((s, i) => (
                      <button
                        key={i}
                        disabled={!session}
                        onClick={() => setInput(s)}
                        className="text-left text-xs px-4 py-2.5 bg-[#151e30] border border-[#1c2a42] rounded-xl text-slate-400 hover:border-blue-500/40 hover:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => renderMessage(msg, i))}

                  {!sending && session && messages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestions.slice(0, 3).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(s)}
                          className="text-xs px-3 py-1.5 bg-[#151e30] border border-[#1c2a42] rounded-full text-slate-400 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Row */}
            <div className="p-4 border-t border-[#1c2a42] bg-[#0a0e1a] rounded-b-2xl">
              {!session ? (
                <div className="text-center text-slate-500 text-sm py-2">
                  Upload a JD PDF on the left to start chatting →
                </div>
              ) : (
                <div className="flex gap-3 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask about the JD... e.g. What skills should I focus on?"
                    rows={1}
                    className="flex-1 bg-[#0f1623] border border-[#1c2a42] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none focus:border-blue-500/50 transition-colors"
                    style={{ maxHeight: "120px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Send ↑"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}