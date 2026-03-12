const asyncHandler = require("express-async-handler");
const cloudinary   = require("cloudinary").v2;
const pdfParse     = require("pdf-parse");
const Groq         = require("groq-sdk");
const JdSession    = require("../models/JdSession");

// ── Cloudinary config ─────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Groq client ───────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Helpers ───────────────────────────────────────────────

// Split text into overlapping chunks (~800 chars each)
function chunkText(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  let i = 0;
  const clean = text.replace(/\s+/g, " ").trim();
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

// Keyword-based retrieval — returns top N most relevant chunks
function retrieveRelevantChunks(chunks, query, topN = 6) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = chunks.map((chunk, idx) => {
    const lower = chunk.toLowerCase();
    const score = queryWords.reduce((sum, word) => {
      const matches = (lower.match(new RegExp(word, "g")) || []).length;
      return sum + matches;
    }, 0);
    return { chunk, score, idx };
  });

  // Always include first chunk (usually has role title + summary)
  const top = scored.sort((a, b) => b.score - a.score).slice(0, topN);
  const hasFirst = top.some(t => t.idx === 0);
  if (!hasFirst && scored.length > 0) {
    top[top.length - 1] = scored.find(s => s.idx === 0);
  }

  return top
    .sort((a, b) => a.idx - b.idx) // restore original order
    .map(s => s.chunk);
}

// ── Extract focus areas (improved prompt) ─────────────────
async function extractFocusAreas(jdText) {
  const prompt = `You are a senior technical recruiter and placement expert.

Read this Job Description carefully and extract EXACTLY 6-7 specific technical skill areas that a college student MUST master to crack this interview. Be SPECIFIC to what's actually written in the JD — do NOT give generic answers.

For example:
- If the JD mentions "Python, pandas, numpy" → output "Python & Data Libraries (pandas, numpy)"
- If the JD mentions "LLM, RAG, embeddings" → output "LLM & RAG Pipelines"
- If the JD mentions "scikit-learn / PyTorch / TensorFlow" → output "ML Frameworks (scikit-learn / PyTorch)"
- If the JD mentions "FastAPI/Flask" → output "API Development (FastAPI/Flask)"

JD TEXT:
${jdText.slice(0, 4000)}

Rules:
1. Return ONLY a valid JSON array of strings — nothing else, no explanation, no markdown
2. Each item must be specific to THIS JD, not generic
3. Order from most important to least important
4. Maximum 7 items

Example output format:
["Python & Data Libraries (pandas, numpy)", "ML Fundamentals & Evaluation Metrics", "LLM & RAG Pipelines", "API Development (FastAPI/Flask)", "SQL & Structured Data", "MLOps & Experiment Tracking", "Cloud & Docker Basics"]`;

  try {
    const completion = await groq.chat.completions.create({
      model:       "llama3-8b-8192",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens:  300,
    });

    const raw = completion.choices[0].message.content.trim();
    console.log("Focus area raw response:", raw);

    // Extract JSON array from response — handles markdown code blocks too
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Fallback: split by newlines if model returned a list instead of JSON
    const lines = raw.split("\n")
      .map(l => l.replace(/^[\d\.\-\*\s"]+|["]+$/g, "").trim())
      .filter(l => l.length > 3 && l.length < 80);
    if (lines.length >= 3) return lines.slice(0, 7);

    return ["Python & ML Fundamentals", "Data Structures & Algorithms", "LLM & RAG Concepts", "SQL & Databases", "Problem Solving"];
  } catch (err) {
    console.error("Focus area extraction failed:", err.message);
    return ["Python & ML Fundamentals", "Data Structures & Algorithms", "LLM & RAG Concepts", "SQL & Databases", "Problem Solving"];
  }
}

// ── CONTROLLERS ───────────────────────────────────────────

// POST /api/chatbot/upload-jd
const uploadJD = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No PDF file uploaded" });
  }

  // Upload PDF to Cloudinary
  let cloudinaryResult;
  try {
    cloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder:        "placementpro/jds",
          format:        "pdf",
          public_id:     `jd_${req.user._id}_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
  } catch (err) {
    console.error("Cloudinary upload failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to upload PDF to cloud storage" });
  }

  // Extract text from PDF
  let extractedText = "";
  try {
    const pdfData  = await pdfParse(req.file.buffer);
    extractedText  = pdfData.text || "";
    console.log("PDF extracted, length:", extractedText.length);
  } catch (err) {
    console.error("PDF parse failed:", err.message);
    return res.status(400).json({ success: false, message: "Could not read PDF. Please ensure it's a valid, text-based PDF." });
  }

  if (!extractedText || extractedText.trim().length < 50) {
    return res.status(400).json({ success: false, message: "PDF appears to be empty or image-only. Please upload a text-based PDF." });
  }

  const chunks     = chunkText(extractedText);
  const focusAreas = await extractFocusAreas(extractedText);

  // Deactivate previous sessions
  await JdSession.updateMany({ user: req.user._id }, { isActive: false });

  const session = await JdSession.create({
    user:          req.user._id,
    fileName:      `jd_${Date.now()}`,
    originalName:  req.file.originalname,
    cloudinaryUrl: cloudinaryResult.secure_url,
    cloudinaryId:  cloudinaryResult.public_id,
    extractedText,
    chunks,
    focusAreas,
    chatHistory:   [],
    isActive:      true,
  });

  res.status(201).json({
    success: true,
    data: {
      sessionId:  session._id,
      fileName:   req.file.originalname,
      focusAreas,
      pageCount:  chunks.length,
      message:    "JD uploaded and analyzed successfully!",
    },
  });
});

// POST /api/chatbot/chat
const chat = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message is required" });
  }

  const query   = sessionId
    ? { _id: sessionId, user: req.user._id }
    : { user: req.user._id, isActive: true };

  const session = await JdSession.findOne(query);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "No active JD session found. Please upload a JD first.",
    });
  }

  // Retrieve relevant chunks + always include a broad JD summary (first 1500 chars)
  const relevantChunks = retrieveRelevantChunks(session.chunks, message);
  const jdSummary      = session.extractedText.slice(0, 1500);
  const context        = `=== JD OVERVIEW (first section) ===\n${jdSummary}\n\n=== RELEVANT SECTIONS ===\n${relevantChunks.join("\n\n---\n\n")}`;

  const systemPrompt = `You are an expert placement preparation coach for college students in India.

A student has uploaded a Job Description and is asking you questions to help them prepare for the interview.

YOUR RESPONSIBILITIES:
1. Answer SPECIFICALLY based on what's written in this JD — don't give generic advice
2. When asked about skills, list the EXACT technologies/tools mentioned in the JD
3. When asked about preparation, give a STRUCTURED plan with clear steps
4. When asked about projects, suggest projects directly relevant to the JD's tech stack
5. Always be encouraging, practical, and concise

JD CONTENT:
${context}

KEY FOCUS AREAS ALREADY IDENTIFIED: ${session.focusAreas.join(", ")}

RESPONSE FORMAT RULES:
- Use numbered lists for steps/topics
- Use bullet points for skills/tools
- Bold important terms with **term**
- Keep responses under 400 words unless a detailed plan is requested
- Always reference specific tools/skills from the JD (e.g., "Since this role requires PyTorch...")
- Never give generic advice that doesn't relate to this specific JD`;

  const recentHistory = session.chatHistory.slice(-8).map(m => ({
    role:    m.role,
    content: m.content,
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: message },
  ];

  let assistantMessage;
  try {
    const completion = await groq.chat.completions.create({
      model:       "llama3-8b-8192",
      messages,
      temperature: 0.5,
      max_tokens:  1000,
    });
    assistantMessage = completion.choices[0].message.content;
  } catch (err) {
    console.error("Groq API error:", err.message);
    return res.status(500).json({
      success: false,
      message: "AI service temporarily unavailable. Please try again.",
    });
  }

  session.chatHistory.push({ role: "user",      content: message });
  session.chatHistory.push({ role: "assistant", content: assistantMessage });

  if (session.chatHistory.length > 20) {
    session.chatHistory = session.chatHistory.slice(-20);
  }

  await session.save();

  res.json({
    success: true,
    data: {
      message:   assistantMessage,
      sessionId: session._id,
    },
  });
});

// GET /api/chatbot/session
const getSession = asyncHandler(async (req, res) => {
  const session = await JdSession.findOne({
    user:     req.user._id,
    isActive: true,
  }).select("-extractedText -chunks");

  if (!session) {
    return res.json({ success: true, data: { session: null } });
  }

  res.json({
    success: true,
    data: {
      session: {
        _id:          session._id,
        originalName: session.originalName,
        focusAreas:   session.focusAreas,
        chatHistory:  session.chatHistory,
        createdAt:    session.createdAt,
      },
    },
  });
});

// DELETE /api/chatbot/session
const clearSession = asyncHandler(async (req, res) => {
  await JdSession.updateMany({ user: req.user._id }, { isActive: false });
  res.json({ success: true, message: "Session cleared. Ready for new JD." });
});

module.exports = { uploadJD, chat, getSession, clearSession };