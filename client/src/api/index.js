import api from './axios'

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  getMe:    ()     => api.get('/auth/me'),
}

export const userAPI = {
  getProfile:    ()     => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  selectCohort:  (id)   => api.post('/users/select-cohort', { cohortId: id }),
  uploadResume:  (file) => {
    const form = new FormData()
    form.append('resume', file)
    return api.post('/users/upload-resume', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const cohortAPI = {
  getAll:             ()           => api.get('/cohorts'),
  getModules:         (cohortId)   => api.get(`/cohorts/${cohortId}/modules`),
  // Assessment (separate from modules)
  getAssessment:      (subject)    => api.get(`/cohorts/assessment/${subject}?t=${Date.now()}`),
  submitAssessment:   (subject, answers) => api.post(`/cohorts/assessment/${subject}/submit`, { answers }),
}

export const questionAPI = {
  getAll:  (params) => api.get('/questions', { params }),
  getById: (id)     => api.get(`/questions/${id}`),
}

export const submissionAPI = {
  submitMCQ:  (data)   => api.post('/submissions/mcq', data),
  submitCode: (data)   => api.post('/submissions/code', data),
  getMine:    (params) => api.get('/submissions/my', { params }),
}

export const analyticsAPI = {
  getMyAnalytics:   ()          => api.get('/analytics/me'),
  getOverview:      ()          => api.get('/analytics/overview'),
  getAllStudents:    (params)    => api.get('/analytics/students', { params }),
  getStudentDetail: (studentId) => api.get(`/analytics/students/${studentId}`),
  exportReport:     (params)    => api.get('/analytics/export', { params, responseType: 'blob' }),
}