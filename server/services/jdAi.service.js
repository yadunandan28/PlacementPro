const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      model:       "llama-3.1-8b-instant",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens:  300,
    });

    const raw = completion.choices[0].message.content.trim();

    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

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

function normalizePlanPayload(raw) {
  const phases = Array.isArray(raw.phases) ? raw.phases : [];
  return {
    timelineWeeks: typeof raw.timelineWeeks === "number" ? raw.timelineWeeks : Number(raw.timelineWeeks) || 4,
    phases: phases.map((p) => ({
      title:   String(p.title || "Phase").slice(0, 200),
      summary: String(p.summary || "").slice(0, 2000),
      goals:   Array.isArray(p.goals) ? p.goals.map((g) => String(g).slice(0, 500)).filter(Boolean) : [],
      tasks:   Array.isArray(p.tasks)
        ? p.tasks.map((t) => ({
          title:          String(t.title || "Task").slice(0, 300),
          detail:         String(t.detail || "").slice(0, 2000),
          estimatedHours: Math.min(40, Math.max(0.5, Number(t.estimatedHours) || 2)),
          done:           false,
        }))
        : [],
      resources: Array.isArray(p.resources)
        ? p.resources.map((r) => ({
          title: String(r.title || "").slice(0, 200),
          type:  String(r.type || "link").slice(0, 50),
          url:   String(r.url || "").slice(0, 500),
        })).filter((r) => r.title)
        : [],
    })),
    interviewTips: Array.isArray(raw.interviewTips)
      ? raw.interviewTips.map((t) => String(t).slice(0, 500)).filter(Boolean)
      : [],
    topicsToDrill: Array.isArray(raw.topicsToDrill)
      ? raw.topicsToDrill.map((t) => String(t).slice(0, 300)).filter(Boolean)
      : [],
  };
}

async function generatePreparationPlan(jdText, focusAreas) {
  const jdSnippet = jdText.slice(0, 6000);
  const focus = (focusAreas || []).join("; ");

  const prompt = `You are an expert placement coach for engineering students in India.

Create a structured, actionable INTERVIEW PREPARATION PLAN from this Job Description.

JD TEXT:
${jdSnippet}

KEY FOCUS AREAS (must align tasks with these): ${focus}

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "roleSummary": "One concise sentence describing the role for the candidate",
  "timelineWeeks": <number 2-8, realistic weeks of part-time prep>,
  "phases": [
    {
      "title": "Phase title e.g. Week 1: Foundations",
      "summary": "2-3 sentences what this phase achieves",
      "goals": ["goal1", "goal2"],
      "tasks": [
        { "title": "Short task title", "detail": "What to do, how to verify", "estimatedHours": 2 }
      ],
      "resources": [
        { "title": "Resource name", "type": "article|video|practice|book", "url": "" }
      ]
    }
  ],
  "interviewTips": ["5-8 bullet tips as strings, specific to this JD"],
  "topicsToDrill": ["DSA topics or subjects to revise, from the JD"]
}

Rules:
- 4-6 phases covering full timeline
- Each phase: 4-8 concrete tasks with realistic estimatedHours (0.5-8)
- Tasks must reference technologies/skills actually mentioned in the JD
- resources.url can be empty string if generic
- Return ONLY the JSON object`;

  const completion = await groq.chat.completions.create({
    model:       "llama-3.1-8b-instant",
    messages:    [{ role: "user", content: prompt }],
    temperature: 0.35,
    max_tokens:  4096,
  });

  const raw = completion.choices[0].message.content.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Model did not return JSON plan");

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error("Invalid plan JSON from model");
  }

  const normalized = normalizePlanPayload(parsed);
  return {
    ...normalized,
    roleSummary:
      String(parsed.roleSummary || "").trim().slice(0, 500) ||
      "Interview preparation tailored to this job description.",
  };
}

module.exports = { extractFocusAreas, generatePreparationPlan };
