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
  getStudents: (params) => api.get('/users/students', { params }),
}

export const cohortAPI = {
  getAll:             ()         => api.get('/cohorts'),
  getBySlug:          (slug)     => api.get(`/cohorts/${slug}`),
  getModules:         (cohortId) => api.get(`/cohorts/${cohortId}/modules`),
  getModuleQuestions: (moduleId) => api.get(`/cohorts/modules/${moduleId}/questions`),
  submitAssessment:   (moduleId, answers) => api.post(`/cohorts/modules/${moduleId}/submit`, { answers }),
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
  getMyAnalytics:    ()          => api.get('/analytics/me'),
  getOverview:       ()          => api.get('/analytics/overview'),
  getCohortAnalytics:(cohortId)  => api.get(`/analytics/cohort/${cohortId}`),
  getAllStudents:     (params)    => api.get('/analytics/students', { params }),
  getStudentDetail:  (studentId) => api.get(`/analytics/students/${studentId}`),
  exportReport:      (params)    => api.get('/analytics/export', { params, responseType: 'blob' }),
}