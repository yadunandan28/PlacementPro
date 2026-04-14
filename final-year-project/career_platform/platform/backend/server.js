import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27018/career_platform";

const openai =
  process.env.DEEPSEEK_API_KEY &&
  new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    branch: { type: String, default: "Computer Science" },
    year: { type: String, default: "3rd Year" },
  },
  { timestamps: true },
);

const Student = mongoose.model("Student", studentSchema);

const TEACHERS = [
  {
    id: 1,
    name: "Dr. Ananya Sharma",
    email: "ananya.sharma@college.edu",
    password: "teacher123",
    department: "Computer Science",
  },
  {
    id: 2,
    name: "Prof. Rahul Iyer",
    email: "rahul.iyer@college.edu",
    password: "teacher123",
    department: "Electronics",
  },
  {
    id: 3,
    name: "Dr. Meera Nair",
    email: "meera.nair@college.edu",
    password: "teacher123",
    department: "Information Technology",
  },
  {
    id: 4,
    name: "Prof. Sandeep Kulkarni",
    email: "sandeep.kulkarni@college.edu",
    password: "teacher123",
    department: "Mechanical",
  },
];

function buildMockQuiz(topic, count = 5) {
  const baseTopic = topic || "career planning";

  const templates = [
    {
      question: `Which of the following statements about ${baseTopic} is most accurate?`,
      options: [
        `It refers to core concepts and principles used in ${baseTopic}`,
        "It is only about soft skills and communication",
        "It is unrelated to real-world applications",
        "It only focuses on exam preparation strategies",
      ],
      answerIndex: 0,
    },
    {
      question: `Which example best illustrates the use of ${baseTopic}?`,
      options: [
        `A situation where ${baseTopic} is applied to solve a specific problem`,
        "A generic discussion about time management",
        "An unrelated story about college events",
        "Only revising previous year question papers",
      ],
      answerIndex: 1,
    },
    {
      question: `Which option correctly describes a typical concept in ${baseTopic}?`,
      options: [
        `A well-defined idea or technique that belongs to ${baseTopic}`,
        "Any topic from general aptitude tests",
        "Only interview preparation tips from seniors",
        "Motivational quotes shared on social media",
      ],
      answerIndex: 1,
    },
    {
      question: `When studying ${baseTopic}, which type of question best checks a student's understanding?`,
      options: [
        "A question that asks the student to apply a specific concept from the topic",
        "A question only asking about exam dates",
        "A question about the student's study timetable",
        "A question unrelated to the subject area",
      ],
      answerIndex: 1,
    },
    {
      question: `Which of these questions would most directly test detailed knowledge of ${baseTopic}?`,
      options: [
        `A question that asks about definitions, rules, or key examples within ${baseTopic}`,
        "A question asking how many hours the student studies",
        "A question about extracurricular activities",
        "A question only about exam format and marks distribution",
      ],
      answerIndex: 1,
    },
  ];

  const sliced = templates.slice(0, count);
  return {
    questions: sliced.map((q, index) => ({
      id: index + 1,
      ...q,
    })),
    fromGemini: false,
  };
}

async function generateQuizFromTopic(topic, count = 5) {
  if (!openai) {
    return buildMockQuiz(topic, count);
  }

  const prompt = `
Generate a multiple-choice quiz that directly tests conceptual understanding of the topic: "${topic}".

Return STRICT JSON ONLY in this exact format (no markdown, no explanation, no backticks):
{
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0
    }
  ]
}

Constraints:
- Create exactly ${count} questions
- options MUST be exactly 4 strings
- answerIndex MUST be the index (0-3) of the correct answer in options
- Every question MUST be about the subject matter of "${topic}" itself (definitions, key concepts, formulas, code, examples, edge cases), NOT about how to study or learn the topic
- Questions should feel like real viva / test questions for 2nd or 3rd year engineering students
- Avoid generic study-skill or motivation questions; focus on the actual technical/content knowledge for the topic.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical interviewer for Indian engineering students. You must respond with STRICT JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      return buildMockQuiz(topic, count);
    }

    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (
      !parsed.questions ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      return buildMockQuiz(topic, count);
    }

    const normalised = parsed.questions.slice(0, count).map((q, index) => ({
      id: q.id || index + 1,
      question: q.question || `Question ${index + 1}`,
      options:
        Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : ["Option A", "Option B", "Option C", "Option D"],
      answerIndex:
        typeof q.answerIndex === "number" &&
        q.answerIndex >= 0 &&
        q.answerIndex <= 3
          ? q.answerIndex
          : 0,
    }));

    return {
      questions: normalised,
      fromGemini: true,
    };
  } catch (error) {
    console.error("Error talking to Gemini", error);
    return buildMockQuiz(topic, count);
  }
}

app.post("/api/auth/login-student", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid college email",
      });
    }

    let student = await Student.findOne({ email });
    if (!student) {
      if (email.toLowerCase().endsWith("@kct.ac.in")) {
        student = await Student.create({
          email,
          password,
          name: email.split("@")[0],
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Student account not found for this email",
        });
      }
    }

    if (student.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password for this email",
      });
    }

    return res.json({
      success: true,
      user: {
        role: "student",
        email: student.email,
        name: student.name,
        year: student.year,
        branch: student.branch,
      },
    });
  } catch (err) {
    console.error("Error in student login", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging in student",
    });
  }
});

app.post("/api/auth/login-teacher", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const teacher = TEACHERS.find(
    (t) => t.email === email && t.password === password,
  );

  if (!teacher) {
    return res.status(401).json({
      success: false,
      message: "Invalid teacher credentials",
    });
  }

  return res.json({
    success: true,
    user: {
      role: "teacher",
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
    },
  });
});

app.get("/api/teachers/:id/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).limit(50);

    const shaped = students.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      email: s.email,
      branch: s.branch,
      lastTopic: null,
      attempts: 0,
      averageScore: 0,
    }));

    return res.json({
      success: true,
      teacherId: req.params.id,
      students: shaped,
    });
  } catch (err) {
    console.error("Error fetching teacher students", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
});

app.post("/api/quiz/generate", async (req, res) => {
  try {
    const { topic, count } = req.body || {};
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({
        success: false,
        message: "Topic is required",
      });
    }

    const quiz = await generateQuizFromTopic(topic, count || 5);

    return res.json({
      success: true,
      quiz,
    });
  } catch (err) {
    console.error("Error generating quiz", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate quiz",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Backend API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
