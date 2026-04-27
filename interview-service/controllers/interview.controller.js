const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const os = require("os");
const InterviewSlot = require("../models/InterviewSlot");
const InterviewSession = require("../models/InterviewSession");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

const PISTON_URL = process.env.PISTON_URL || "http://localhost:2000";
const PISTON_LANG_MAP = {
  python: { language: "python", version: "3.12.0" },
  javascript: { language: "node", version: "20.11.1" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
};

// ── Helpers ───────────────────────────────────────────────

async function generateInterviewQuestions(jdText, resumeSummary) {
  const prompt = `You are a senior technical interviewer at a top tech company.

Based on the Job Description and candidate profile below, generate a structured mock interview plan.

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

CANDIDATE PROFILE:
${resumeSummary}

Generate EXACTLY this structure:
- 5 verbal/behavioral/technical questions (type: "verbal")
- 2 coding questions relevant to the JD (type: "coding")

Rules:
1. Verbal questions should cover: introduction, technical concepts from JD, situational, behavioral, project-related
2. Coding questions must be solvable in 15-20 minutes — medium difficulty DSA or role-specific coding
3. Order verbal questions 1-5, coding questions 6-7
4. Be SPECIFIC to this JD — not generic

Return ONLY valid JSON in this exact format, nothing else:
{
  "questions": [
    { "order": 1, "type": "verbal", "question": "Tell me about yourself and why you are interested in this AI/ML role." },
    { "order": 2, "type": "verbal", "question": "Explain the difference between supervised and unsupervised learning with examples." },
    { "order": 3, "type": "verbal", "question": "What experience do you have with LLMs or RAG pipelines?" },
    { "order": 4, "type": "verbal", "question": "Describe a project where you used Python for data processing." },
    { "order": 5, "type": "verbal", "question": "How would you handle data leakage in an ML pipeline?" },
    { "order": 6, "type": "coding", "question": "Write a Python function that takes a list of numbers and returns the top K elements using a heap. Input: nums=[3,1,4,1,5,9,2,6], k=3 — Expected output: [9, 6, 5]" },
    { "order": 7, "type": "coding", "question": "Given a string, write a function to find the longest substring without repeating characters. Return its length. Input: 'abcabcbb' → Output: 3" }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const raw = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
    }
    throw new Error("Invalid response format");
  } catch (err) {
    console.error("Question generation failed:", err.message);
    // Fallback questions
    return [
      {
        order: 1,
        type: "verbal",
        question: "Tell me about yourself and your background.",
      },
      {
        order: 2,
        type: "verbal",
        question:
          "What are your strongest technical skills relevant to this role?",
      },
      {
        order: 3,
        type: "verbal",
        question:
          "Describe a challenging project you worked on and how you solved it.",
      },
      {
        order: 4,
        type: "verbal",
        question:
          "How do you stay updated with the latest developments in your field?",
      },
      {
        order: 5,
        type: "verbal",
        question: "Where do you see yourself in 3 years?",
      },
      {
        order: 6,
        type: "coding",
        question:
          "Write a function to reverse a linked list. Return the new head. Input: 1->2->3->4->5, Output: 5->4->3->2->1",
      },
      {
        order: 7,
        type: "coding",
        question:
          "Write a function to check if a string is a palindrome, ignoring spaces and case. Input: 'A man a plan a canal Panama' → Output: True",
      },
    ];
  }
}

async function evaluateVerbalAnswer(question, answer, jdContext) {
  const prompt = `You are a strict but fair technical interviewer.

Evaluate this interview answer:

QUESTION: ${question}
CANDIDATE ANSWER: ${answer}
JD CONTEXT: ${jdContext.slice(0, 500)}

Score the answer from 0-10 based on:
- Technical accuracy (0-4 points)
- Clarity and communication (0-3 points)
- Relevance to the role (0-3 points)

Return ONLY valid JSON:
{
  "score": <number 0-10>,
  "feedback": "<2-3 sentences of specific feedback — what was good, what was missing, what to improve>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });
    const raw = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: Math.min(10, Math.max(0, Number(parsed.score) || 5)),
        feedback: parsed.feedback || "Answer recorded.",
      };
    }
    return {
      score: 5,
      feedback: "Answer recorded. Keep practicing for better clarity.",
    };
  } catch {
    return {
      score: 5,
      feedback: "Answer recorded. Keep practicing for better clarity.",
    };
  }
}

async function evaluateCodeAnswer(
  question,
  code,
  language,
  codeOutput,
  expectedBehavior,
) {
  const prompt = `You are a technical interviewer evaluating a coding solution.

PROBLEM: ${question}
LANGUAGE: ${language}
CODE SUBMITTED:
\`\`\`${language}
${code}
\`\`\`
CODE OUTPUT: ${codeOutput || "No output"}

Evaluate the solution 0-10:
- Correctness (0-5): Does the output match expected behavior?
- Code quality (0-3): Clean code, good variable names, edge cases?
- Efficiency (0-2): Is the approach optimal?

Return ONLY valid JSON:
{
  "score": <number 0-10>,
  "feedback": "<2-3 sentences — correctness, approach quality, what could be improved>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    });
    const raw = completion.choices[0].message.content.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: Math.min(10, Math.max(0, Number(parsed.score) || 4)),
        feedback: parsed.feedback || "Code submitted.",
      };
    }
    return { score: 4, feedback: "Code submitted and reviewed." };
  } catch {
    return { score: 4, feedback: "Code submitted and reviewed." };
  }
}

async function generateFinalReport(questions, jdText) {
  const answeredQuestions = questions
    .map(
      (q, i) =>
        `Q${i + 1} (${q.type}): ${q.question}\nAnswer: ${q.transcript || q.code || "Not answered"}\nScore: ${q.score}/10\nFeedback: ${q.feedback}`,
    )
    .join("\n\n");

  const prompt = `You are a senior hiring manager writing a candidate evaluation report.

JD CONTEXT: ${jdText.slice(0, 800)}

INTERVIEW PERFORMANCE:
${answeredQuestions}

Write a concise 3-paragraph evaluation report covering:
1. Overall performance and strengths
2. Areas needing improvement  
3. Recommendation (hire/consider/needs more preparation)

Keep it professional and specific.`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 600,
    });
    return completion.choices[0].message.content.trim();
  } catch {
    return "Interview completed. Please review individual question scores for detailed performance analysis.";
  }
}

async function runCodeOnPiston(language, code) {
  const lang = PISTON_LANG_MAP[language];
  if (!lang) return { stdout: "", stderr: "Unsupported language", code: 1 };

  try {
    const response = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: lang.language,
        version: lang.version,
        files: [{ name: "solution", content: code }],
      }),
    });
    const result = await response.json();
    return result.run || { stdout: "", stderr: "Execution failed", code: 1 };
  } catch (err) {
    return {
      stdout: "",
      stderr: `Cannot connect to code runner: ${err.message}`,
      code: 1,
    };
  }
}

// ── CONTROLLERS ───────────────────────────────────────────

// POST /api/interview/slots  (staff only)
const createSlot = asyncHandler(async (req, res) => {
  const { studentId, scheduledAt, duration, jdText, jdFileName, notes } =
    req.body;

  if (!studentId || !scheduledAt) {
    return res.status(400).json({
      success: false,
      message: "studentId and scheduledAt are required",
    });
  }

  const slot = await InterviewSlot.create({
    student: studentId,
    scheduledBy: req.user._id,
    scheduledAt: new Date(scheduledAt),
    duration: duration || 45,
    jdText: jdText || "",
    jdFileName: jdFileName || "",
    notes: notes || "",
  });

  const populated = await InterviewSlot.findById(slot._id)
    .populate("student", "name email rollNumber department")
    .populate("scheduledBy", "name");

  res.status(201).json({ success: true, data: { slot: populated } });
});

// GET /api/interview/slots  (staff — all slots)
const getAllSlots = asyncHandler(async (req, res) => {
  const slots = await InterviewSlot.find()
    .populate("student", "name email rollNumber department cohort")
    .populate("scheduledBy", "name")
    .populate("interviewSession", "percentageScore status totalScore")
    .sort({ scheduledAt: -1 })
    .lean();
  res.json({ success: true, data: { slots } });
});

// GET /api/interview/my-slots  (student — own slots)
const getMySlots = asyncHandler(async (req, res) => {
  const slots = await InterviewSlot.find({ student: req.user._id })
    .populate("scheduledBy", "name")
    .populate("interviewSession", "percentageScore status aiReport questions")
    .sort({ scheduledAt: -1 })
    .lean();
  res.json({ success: true, data: { slots } });
});

// POST /api/interview/slots/:slotId/start  (student starts the interview)
const startInterview = asyncHandler(async (req, res) => {
  const slot = await InterviewSlot.findById(req.params.slotId).populate(
    "student",
    "name email department rollNumber cgpa skills cohort",
  );

  if (!slot)
    return res
      .status(404)
      .json({ success: false, message: "Interview slot not found" });
  if (!slot.student)
    return res.status(404).json({
      success: false,
      message: "Student account associated with this slot no longer exists",
    });
  if (slot.student._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "This interview is not assigned to you",
    });
  }
  if (slot.status === "completed") {
    return res
      .status(400)
      .json({ success: false, message: "This interview is already completed" });
  }

  // If session already exists (rejoining), return existing
  if (slot.interviewSession) {
    const existingSession = await InterviewSession.findById(
      slot.interviewSession,
    );
    if (existingSession && existingSession.status === "in_progress") {
      return res.json({
        success: true,
        data: {
          sessionId: existingSession._id,
          currentQuestionIndex: existingSession.currentQuestionIndex,
          questions: existingSession.questions,
          resuming: true,
        },
      });
    }
  }

  // Build resume summary from student profile
  const student = slot.student;
  const resumeSummary =
    req.body.resumeText ||
    `Name: ${student.name}
Department: ${student.department}
Roll Number: ${student.rollNumber || "N/A"}
CGPA: ${student.cgpa || "N/A"}
Skills: ${(student.skills || []).join(", ") || "Not specified"}
Cohort/Domain: ${student.cohort ? (typeof student.cohort === "object" ? student.cohort.name : student.cohort) : "Not specified"}`;

  // Use JD from slot or from request body
  const jdText =
    slot.jdText || req.body.jdText || "General software engineering role";

  // Generate interview questions
  console.log("Generating interview questions for:", student.name);
  const questions = await generateInterviewQuestions(jdText, resumeSummary);

  // Create interview session
  const session = await InterviewSession.create({
    slot: slot._id,
    student: req.user._id,
    jdText,
    jdFileName: slot.jdFileName || "",
    resumeSummary,
    questions,
    currentQuestionIndex: 0,
    status: "in_progress",
    startedAt: new Date(),
  });

  // Link session to slot
  slot.status = "in_progress";
  slot.interviewSession = session._id;
  if (!slot.resumeText) slot.resumeText = resumeSummary;
  await slot.save();

  res.json({
    success: true,
    data: {
      sessionId: session._id,
      currentQuestionIndex: 0,
      questions: session.questions,
      resuming: false,
    },
  });
});

// POST /api/interview/transcribe  (Groq Whisper)
const transcribeAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No audio file uploaded" });
  }

  // Write buffer to temp file
  const tmpFile = path.join(os.tmpdir(), `interview_audio_${Date.now()}.webm`);
  fs.writeFileSync(tmpFile, req.file.buffer);

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tmpFile),
      model: "whisper-large-v3",
      response_format: "json",
      language: "en",
    });

    res.json({ success: true, data: { transcript: transcription.text || "" } });
  } catch (err) {
    console.error("Whisper transcription error:", err.message);
    res.status(500).json({
      success: false,
      message: "Transcription failed. Please try again.",
    });
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {}
  }
});

// POST /api/interview/sessions/:sessionId/verbal  (submit verbal answer)
const submitVerbalAnswer = asyncHandler(async (req, res) => {
  const { transcript, timeSpent } = req.body;
  const session = await InterviewSession.findById(req.params.sessionId);

  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  if (session.student.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }
  if (session.status === "completed") {
    return res
      .status(400)
      .json({ success: false, message: "Interview already completed" });
  }

  const idx = session.currentQuestionIndex;
  const question = session.questions[idx];

  if (!question || question.type !== "verbal") {
    return res.status(400).json({
      success: false,
      message: "Current question is not a verbal question",
    });
  }

  // Evaluate the answer
  const evaluation = await evaluateVerbalAnswer(
    question.question,
    transcript || "",
    session.jdText,
  );

  // Save to session
  session.questions[idx].transcript = transcript || "";
  session.questions[idx].score = evaluation.score;
  session.questions[idx].feedback = evaluation.feedback;
  session.questions[idx].timeSpent = timeSpent || 0;
  session.questions[idx].answered = true;

  // Advance to next question
  session.currentQuestionIndex = idx + 1;
  session.markModified("questions");
  await session.save();

  const isLastQuestion =
    session.currentQuestionIndex >= session.questions.length;
  const nextQuestion = isLastQuestion
    ? null
    : session.questions[session.currentQuestionIndex];

  res.json({
    success: true,
    data: {
      score: evaluation.score,
      feedback: evaluation.feedback,
      nextQuestion,
      nextIndex: session.currentQuestionIndex,
      isLastQuestion,
    },
  });
});

// POST /api/interview/sessions/:sessionId/code  (submit coding answer)
const submitCodeAnswer = asyncHandler(async (req, res) => {
  const { code, language, timeSpent } = req.body;
  const session = await InterviewSession.findById(req.params.sessionId);

  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  if (session.student.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  const idx = session.currentQuestionIndex;
  const question = session.questions[idx];

  if (!question || question.type !== "coding") {
    return res.status(400).json({
      success: false,
      message: "Current question is not a coding question",
    });
  }

  // Run code on Piston
  const runResult = await runCodeOnPiston(language || "python", code || "");
  const codeOutput = runResult.stdout || runResult.stderr || "No output";
  const codeStatus = runResult.code === 0 ? "ran" : "error";

  // AI evaluation
  const evaluation = await evaluateCodeAnswer(
    question.question,
    code || "",
    language || "python",
    codeOutput,
    "",
  );

  // Save
  session.questions[idx].code = code || "";
  session.questions[idx].language = language || "python";
  session.questions[idx].codeOutput = codeOutput;
  session.questions[idx].codeStatus = codeStatus;
  session.questions[idx].score = evaluation.score;
  session.questions[idx].feedback = evaluation.feedback;
  session.questions[idx].timeSpent = timeSpent || 0;
  session.questions[idx].answered = true;

  session.currentQuestionIndex = idx + 1;
  session.markModified("questions");
  await session.save();

  const isLastQuestion =
    session.currentQuestionIndex >= session.questions.length;
  const nextQuestion = isLastQuestion
    ? null
    : session.questions[session.currentQuestionIndex];

  res.json({
    success: true,
    data: {
      score: evaluation.score,
      feedback: evaluation.feedback,
      codeOutput,
      codeStatus,
      nextQuestion,
      nextIndex: session.currentQuestionIndex,
      isLastQuestion,
    },
  });
});

// POST /api/interview/sessions/:sessionId/run-code  (run without submitting)
const runCode = asyncHandler(async (req, res) => {
  const { code, language } = req.body;
  const result = await runCodeOnPiston(language || "python", code || "");
  res.json({
    success: true,
    data: {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.code,
    },
  });
});

// POST /api/interview/sessions/:sessionId/finish
const finishInterview = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId);

  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  if (session.student.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }
  if (session.status === "completed") {
    return res.json({ success: true, data: { session } });
  }

  // Calculate final score
  const totalScore = session.questions.reduce(
    (sum, q) => sum + (q.score || 0),
    0,
  );
  const maxScore = session.questions.length * 10;
  const percentage = Math.round((totalScore / maxScore) * 100);

  // Generate AI report
  const aiReport = await generateFinalReport(session.questions, session.jdText);

  session.totalScore = totalScore;
  session.maxScore = maxScore;
  session.percentageScore = percentage;
  session.aiReport = aiReport;
  session.status = "completed";
  session.completedAt = new Date();
  await session.save();

  // Update slot status
  await InterviewSlot.findByIdAndUpdate(session.slot, { status: "completed" });

  // Update Analytics in main DB (best effort — call main server API)
  try {
    const fetch = require("node-fetch");
    await fetch(
      `${process.env.MAIN_API_URL || "http://localhost:5000"}/api/analytics/mock-interview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": process.env.SERVICE_KEY || "interview-service",
        },
        body: JSON.stringify({
          userId: session.student.toString(),
          score: percentage,
        }),
      },
    );
  } catch (err) {
    console.warn("Analytics update warn:", err.message);
  }

  res.json({
    success: true,
    data: {
      totalScore,
      maxScore,
      percentageScore: percentage,
      aiReport,
      questions: session.questions,
      completedAt: session.completedAt,
    },
  });
});

// GET /api/interview/sessions/:sessionId/result
const getResult = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId)
    .populate("student", "name email rollNumber")
    .lean();
  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  res.json({ success: true, data: { session } });
});

// GET /api/interview/analytics  (staff)
const getAnalytics = asyncHandler(async (req, res) => {
  const sessions = await InterviewSession.find({ status: "completed" })
    .populate("student", "name email rollNumber department cohort")
    .select(
      "student percentageScore totalScore questions completedAt jdFileName",
    )
    .sort({ completedAt: -1 })
    .lean();

  // Per-student best score
  const studentMap = {};
  for (const s of sessions) {
    const uid = s.student?._id?.toString();
    if (!uid) continue;
    if (
      !studentMap[uid] ||
      s.percentageScore > studentMap[uid].percentageScore
    ) {
      studentMap[uid] = s;
    }
  }
  const topStudents = Object.values(studentMap).sort(
    (a, b) => b.percentageScore - a.percentageScore,
  );

  // Average per question type
  const allVerbal = sessions.flatMap((s) =>
    s.questions.filter((q) => q.type === "verbal"),
  );
  const allCoding = sessions.flatMap((s) =>
    s.questions.filter((q) => q.type === "coding"),
  );
  const avgVerbal = allVerbal.length
    ? Math.round(
        (allVerbal.reduce((s, q) => s + q.score, 0) / allVerbal.length) * 10,
      )
    : 0;
  const avgCoding = allCoding.length
    ? Math.round(
        (allCoding.reduce((s, q) => s + q.score, 0) / allCoding.length) * 10,
      )
    : 0;

  res.json({
    success: true,
    data: {
      totalInterviews: sessions.length,
      topStudents: topStudents.slice(0, 10),
      allSessions: sessions,
      avgVerbalScore: avgVerbal,
      avgCodingScore: avgCoding,
    },
  });
});

// POST /api/interview/sessions/:sessionId/upload-recording
// Student uploads a video blob after interview — stored on Cloudinary, auto-deleted after 2 days
const uploadRecording = asyncHandler(async (req, res) => {
  const { questionIndex, questionType, duration } = req.body;
  const session = await InterviewSession.findById(req.params.sessionId);

  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  if (session.student.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No video file provided" });
  }

  // Cloudinary not configured — skip upload gracefully
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.json({
      success: true,
      data: { uploaded: false, reason: "Cloudinary not configured" },
    });
  }

  // Upload to Cloudinary as video, folder: interview-recordings
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "placementpro/interview-recordings",
        public_id: `session_${session._id}_q${questionIndex}_${Date.now()}`,
        overwrite: true,
        format: "webm",
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
    stream.end(req.file.buffer);
  });

  // deleteAt = now + 2 days
  const deleteAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  // Add to session recordings array
  session.recordings.push({
    questionIndex: Number(questionIndex),
    questionType: questionType || "verbal",
    cloudinaryUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    duration: Number(duration) || 0,
    uploadedAt: new Date(),
    deleteAt,
    expired: false,
  });
  session.markModified("recordings");
  await session.save();

  res.json({
    success: true,
    data: {
      uploaded: true,
      cloudinaryUrl: uploadResult.secure_url,
      deleteAt: deleteAt.toISOString(),
    },
  });
});

// GET /api/interview/sessions/:sessionId/recordings  (staff)
const getRecordings = asyncHandler(async (req, res) => {
  const session = await InterviewSession.findById(req.params.sessionId)
    .populate("student", "name email rollNumber")
    .lean();
  if (!session)
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  res.json({
    success: true,
    data: { recordings: session.recordings || [], session },
  });
});

module.exports = {
  createSlot,
  getAllSlots,
  getMySlots,
  startInterview,
  transcribeAudio,
  submitVerbalAnswer,
  submitCodeAnswer,
  runCode,
  finishInterview,
  getResult,
  getAnalytics,
  uploadRecording,
  getRecordings,
};
