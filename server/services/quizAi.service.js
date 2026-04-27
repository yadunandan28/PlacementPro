const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

/**
 * Generate quiz questions from syllabus + materials text.
 * Returns array of question objects ready to save in Quiz.questions.
 */
async function generateQuizQuestions(
  syllabusText,
  materialsText = "",
  numQuestions = 24,
) {
  // ~4000 chars ≈ 1000 tokens for content; leaves room for prompt + response within 6000 TPM
  const combined = [syllabusText, materialsText]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);

  console.log(`[QuizAI] Combined text length: ${combined.length} chars`);
  console.log(`[QuizAI] Requesting ${numQuestions} questions from Groq...`);

  const easyCount = Math.round(numQuestions * 0.35);
  const mediumCount = Math.round(numQuestions * 0.4);
  const hardCount = numQuestions - easyCount - mediumCount;

  const prompt = `You are an expert academic examiner. Your ONLY job is to read the content below and create quiz questions STRICTLY based on what is written in it. Do NOT use general knowledge. Every question must come directly from the provided content.

CONTENT:
${combined}

Generate exactly ${numQuestions} multiple-choice questions from the content above:
- ${easyCount} EASY questions (basic recall, definitions from the content)
- ${mediumCount} MEDIUM questions (understanding, application of concepts in the content)
- ${hardCount} HARD questions (analysis, edge cases from the content)

Rules:
1. Every question MUST be answerable from the provided content — no outside knowledge
2. Each question has exactly 4 options — only one correct
3. Vary which position (0-3) the correct answer appears
4. Make wrong answers plausible but clearly wrong to someone who read the content
5. Tag each question with a short topic taken from the content (e.g., "Recursion", "SQL Joins")
6. Add a brief explanation referencing the content

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "questions": [
    {
      "text": "Question text here?",
      "difficulty": "easy",
      "topic": "Topic Name",
      "explanation": "Brief explanation of the correct answer.",
      "options": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ]
    }
  ]
}`;

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set — cannot generate questions");
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 4000,
  });

  const raw = completion.choices[0].message.content.trim();
  console.log(`[QuizAI] Raw response length: ${raw.length} chars`);
  console.log(`[QuizAI] Response preview: ${raw.slice(0, 200)}`);

  // Strip markdown code fences if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match)
    throw new Error(
      `No JSON object found in LLM response. Raw: ${raw.slice(0, 300)}`,
    );

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch (parseErr) {
    throw new Error(
      `JSON parse failed: ${parseErr.message}. Raw match: ${match[0].slice(0, 300)}`,
    );
  }

  if (!Array.isArray(parsed.questions))
    throw new Error(
      `'questions' key missing or not an array. Keys found: ${Object.keys(parsed).join(", ")}`,
    );

  console.log(`[QuizAI] Raw questions from LLM: ${parsed.questions.length}`);

  // Sanitize: ensure each question has exactly 1 correct option and 4 options
  const cleaned = parsed.questions
    .filter((q) => q.text && Array.isArray(q.options) && q.options.length === 4)
    .filter((q) => q.options.filter((o) => o.isCorrect).length === 1)
    .map((q) => ({
      text: String(q.text).trim(),
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
        ? q.difficulty
        : "medium",
      topic: String(q.topic || "General")
        .trim()
        .slice(0, 60),
      explanation: String(q.explanation || "")
        .trim()
        .slice(0, 500),
      options: q.options.map((o) => ({
        text: String(o.text).trim(),
        isCorrect: Boolean(o.isCorrect),
      })),
    }));

  console.log(`[QuizAI] Valid questions after sanitization: ${cleaned.length}`);

  if (cleaned.length < 5)
    throw new Error(
      `Only ${cleaned.length} valid questions after sanitization (need at least 5). ` +
        `Check that the PDF has readable text and GROQ_API_KEY is valid.`,
    );

  return cleaned;
}

function buildFallbackQuestions(n) {
  const templates = [
    {
      text: "What does CPU stand for?",
      difficulty: "easy",
      topic: "Computer Basics",
      explanation:
        "CPU stands for Central Processing Unit, the main processor of a computer.",
      options: [
        { text: "Central Processing Unit", isCorrect: true },
        { text: "Computer Personal Unit", isCorrect: false },
        { text: "Core Processing Utility", isCorrect: false },
        { text: "Central Program Unit", isCorrect: false },
      ],
    },
    {
      text: "Which data structure uses LIFO order?",
      difficulty: "medium",
      topic: "Data Structures",
      explanation: "A Stack uses Last In, First Out (LIFO) ordering.",
      options: [
        { text: "Queue", isCorrect: false },
        { text: "Stack", isCorrect: true },
        { text: "Linked List", isCorrect: false },
        { text: "Tree", isCorrect: false },
      ],
    },
    {
      text: "What is the time complexity of binary search?",
      difficulty: "hard",
      topic: "Algorithms",
      explanation:
        "Binary search divides the search space in half each step: O(log n).",
      options: [
        { text: "O(n)", isCorrect: false },
        { text: "O(n²)", isCorrect: false },
        { text: "O(log n)", isCorrect: true },
        { text: "O(1)", isCorrect: false },
      ],
    },
  ];
  const out = [];
  for (let i = 0; i < n; i++) out.push({ ...templates[i % templates.length] });
  return out;
}

/**
 * Regenerate a single question based on staff feedback comment.
 * Returns a cleaned question object ready to splice into Quiz.questions.
 */
async function regenerateSingleQuestion(
  existingQuestion,
  staffComment,
  contextText = "",
) {
  const optionLines = existingQuestion.options
    .map(
      (o, i) =>
        `${i + 1}. ${o.text}${o.isCorrect ? " ✓ (currently correct)" : ""}`,
    )
    .join("\n");

  const prompt = `You are an academic quiz question editor.

EXISTING QUESTION (needs improvement):
Text: ${existingQuestion.text}
Difficulty: ${existingQuestion.difficulty}
Topic: ${existingQuestion.topic}
Options:
${optionLines}
Explanation: ${existingQuestion.explanation}

STAFF FEEDBACK: ${staffComment}

${contextText ? `COURSE CONTENT (use for accuracy):\n${contextText.slice(0, 2000)}` : ""}

Generate a revised version of this question addressing the staff feedback. Keep the same difficulty and topic unless the feedback says otherwise.

Return ONLY valid JSON — no markdown fences:
{
  "text": "Revised question text?",
  "difficulty": "easy|medium|hard",
  "topic": "Topic Name",
  "explanation": "Why the correct answer is right.",
  "options": [
    { "text": "Option A", "isCorrect": false },
    { "text": "Option B", "isCorrect": true },
    { "text": "Option C", "isCorrect": false },
    { "text": "Option D", "isCorrect": false }
  ]
}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 700,
  });

  const raw = completion.choices[0].message.content.trim();
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in regeneration response");

  const q = JSON.parse(match[0]);
  if (!q.text || !Array.isArray(q.options) || q.options.length !== 4)
    throw new Error("Invalid structure in regenerated question");
  if (q.options.filter((o) => o.isCorrect).length !== 1)
    throw new Error(
      "Regenerated question must have exactly one correct answer",
    );

  return {
    text: String(q.text).trim(),
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
      ? q.difficulty
      : existingQuestion.difficulty,
    topic: String(q.topic || existingQuestion.topic)
      .trim()
      .slice(0, 60),
    explanation: String(q.explanation || "")
      .trim()
      .slice(0, 500),
    staffComment: "", // clear after regeneration
    options: q.options.map((o) => ({
      text: String(o.text).trim(),
      isCorrect: Boolean(o.isCorrect),
    })),
  };
}

module.exports = { generateQuizQuestions, regenerateSingleQuestion };
