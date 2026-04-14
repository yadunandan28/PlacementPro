const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function loginStudent({ email, password }) {
  return fetch(`${API_BASE}/api/auth/login-student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to login student");
    }
    return data.user;
  });
}

export function loginTeacher({ email, password }) {
  return fetch(`${API_BASE}/api/auth/login-teacher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to login teacher");
    }
    return data.user;
  });
}

export function fetchTeacherStudents(teacherId) {
  return fetch(`${API_BASE}/api/teachers/${teacherId}/students`).then(
    async (res) => {
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch students");
      }
      return data;
    },
  );
}

export async function generateQuizFromTopic(topic, count = 5) {
  try {
    const response = await fetch(`${API_BASE}/api/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to generate quiz");
    }

    return data.quiz;
  } catch (error) {
    console.error("Error generating quiz", error);
    throw error;
  }
}
