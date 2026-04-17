import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// ─── Helper: read from Zustand persisted store ────────────────────────────────
// Zustand persist saves data under key "placementpro-auth" as:
// { "state": { "accessToken": "...", "refreshToken": "...", "user": {...} }, "version": 0 }
const getStoredTokens = () => {
  try {
    const raw = localStorage.getItem("placementpro-auth");
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    return {
      accessToken: parsed?.state?.accessToken || null,
      refreshToken: parsed?.state?.refreshToken || null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
};

const updateStoredAccessToken = (newToken) => {
  try {
    const raw = localStorage.getItem("placementpro-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.state) {
      parsed.state.accessToken = newToken;
      localStorage.setItem("placementpro-auth", JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
};

const clearStoredAuth = () => {
  try {
    const raw = localStorage.getItem("placementpro-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.state) {
      parsed.state.accessToken = null;
      parsed.state.refreshToken = null;
      parsed.state.user = null;
      parsed.state.isLoggedIn = false;
      localStorage.setItem("placementpro-auth", JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
};

// ─── Request interceptor: attach access token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const { accessToken } = getStoredTokens();
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── State for refresh coordination ──────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ─── Response interceptor: handle 401 once, no loops ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Not a 401 → pass through
    if (error.response?.status !== 401) return Promise.reject(error);

    // Auth endpoints (login, refresh, register) → never retry, go to login
    if (original.url?.includes("/auth/")) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // Already retried once → give up
    if (original._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        })
        .catch((err) => Promise.reject(err));
    }

    // First 401 — attempt refresh
    original._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = getStoredTokens();
      if (!refreshToken) throw new Error("No refresh token");

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/refresh`,
        { refreshToken },
      );

      const newToken = data.data?.accessToken || data.accessToken;
      if (!newToken) throw new Error("No access token in refresh response");

      // Persist new token back into Zustand's localStorage key
      updateStoredAccessToken(newToken);

      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      original.headers.Authorization = `Bearer ${newToken}`;

      processQueue(null, newToken);
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function clearAuthAndRedirect() {
  clearStoredAuth();
  if (
    !window.location.pathname.includes("/login") &&
    !window.location.pathname.includes("/register")
  ) {
    window.location.href = "/login";
  }
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (data) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  refresh: (data) => api.post("/auth/refresh", data),
  getMe: () => api.get("/auth/me"),
};

export const analyticsAPI = {
  getMyAnalytics: () => api.get("/analytics/me"),
  getOverview: () => api.get("/analytics/overview"),
  getAllStudents: (params) => api.get("/analytics/students", { params }),
  exportReport: (params) =>
    api.get("/analytics/export", { params, responseType: "blob" }),
};

export const cohortAPI = {
  getAll: () => api.get("/cohorts"),
  getById: (id) => api.get(`/cohorts/${id}`),
  getModules: (cohortId) => api.get(`/cohorts/${cohortId}/modules`),
  getAssessment: (subject) => api.get(`/cohorts/assessment/${subject}`),
  submitAssessment: (subject, answers) =>
    api.post(`/cohorts/assessment/${subject}/submit`, { answers }),
};

export const userAPI = {
  getMe: () => api.get("/users/me"),
  updateProfile: (data) => api.put("/users/profile", data),
  uploadResume: (file) => {
    const form = new FormData();
    form.append("resume", file);
    return api.post("/users/upload-resume", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  selectCohort: (cohortId) => api.post("/users/select-cohort", { cohortId }),
};

export const questionAPI = {
  getAll: (params) => api.get("/questions", { params }),
  getById: (id) => api.get(`/questions/${id}`),
};

export const submissionAPI = {
  submitCode: (data) => api.post("/submissions/code", data),
  submitMCQ: (data) => api.post("/submissions/mcq", data),
  getAll: (params) => api.get("/submissions/my", { params }),
};

export const interviewPrepAPI = {
  list: () => api.get("/interview-prep"),
  get: (id) => api.get(`/interview-prep/${id}`),
  upload: (file) => {
    const form = new FormData();
    form.append("jd", file);
    return api.post("/interview-prep/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  generatePlan: (id) => api.post(`/interview-prep/${id}/generate-plan`),
  toggleTask: (prepId, phaseId, taskId, done) =>
    api.patch(`/interview-prep/${prepId}/phases/${phaseId}/tasks/${taskId}`, {
      done,
    }),
  remove: (id) => api.delete(`/interview-prep/${id}`),
};

export const trainingAPI = {
  getMy: () => api.get("/training/my"),
  toggleTask: (enrollmentId, phaseId, taskId, done) =>
    api.patch(
      `/training/my/${enrollmentId}/phases/${phaseId}/tasks/${taskId}`,
      { done },
    ),
  markRead: (enrollmentId) => api.patch(`/training/my/${enrollmentId}/read`),

  getStaffCampaigns: () => api.get("/training/staff/campaigns"),
  uploadStaffJD: (file) => {
    const form = new FormData();
    form.append("jd", file);
    return api.post("/training/staff/upload-jd", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  assignCampaign: (campaignId, studentIds) =>
    api.post(`/training/staff/campaigns/${campaignId}/assign`, { studentIds }),
};

export default api;
