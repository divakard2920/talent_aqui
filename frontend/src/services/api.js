import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Jobs API
export const jobsApi = {
  list: (params = {}) => api.get('/jobs/', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs/', data),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  getMatches: (id, params = {}) => api.get(`/jobs/${id}/matches`, { params }),
  rescreen: (id) => api.post(`/jobs/${id}/rescreen`),
};

// Candidates API
export const candidatesApi = {
  list: (params = {}) => api.get('/candidates/', { params }),
  get: (id) => api.get(`/candidates/${id}`),
  delete: (id) => api.delete(`/candidates/${id}`),
  getMatches: (id) => api.get(`/candidates/${id}/matches`),
  getShortlisted: (jobId) => api.get(`/candidates/shortlisted/${jobId}`),
};

// Resume API
export const resumeApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  matchToJob: (candidateId, jobId) =>
    api.post(`/resumes/match/${candidateId}/${jobId}`),
  screenForJob: (jobId, topN = 10) =>
    api.post(`/resumes/screen/${jobId}?top_n=${topN}`),
  updateShortlistStatus: (matchId, status) =>
    api.patch(`/resumes/shortlist/${matchId}?status=${status}`),
};

// GitHub API
export const githubApi = {
  search: (params) => api.post('/github/search', params),
  sourceForJob: (jobId, maxResults = 20) =>
    api.post(`/github/source-for-job/${jobId}?max_results=${maxResults}`),
  analyze: (username, jobId = null, githubToken = null) =>
    api.post('/github/analyze', { username, job_id: jobId, github_token: githubToken }),
  import: (username, githubToken = null) =>
    api.post('/github/import', { username, github_token: githubToken }),
  checkRateLimit: (githubToken = null) =>
    api.get('/github/rate-limit', { params: { github_token: githubToken } }),
};

// Interview API
export const interviewApi = {
  list: (params = {}) => api.get('/interviews/', { params }),
  get: (id) => api.get(`/interviews/${id}`),
  create: (candidateId, jobId, scheduledAt = null) =>
    api.post('/interviews/', { candidate_id: candidateId, job_id: jobId, scheduled_at: scheduledAt }),
  start: (id) => api.post(`/interviews/${id}/start`),
  respond: (id, audioBase64) =>
    api.post(`/interviews/${id}/respond`, { interview_id: id, audio_base64: audioBase64 }),
  respondText: (id, text) =>
    api.post(`/interviews/${id}/respond-text?text=${encodeURIComponent(text)}`),
  end: (id) => api.post(`/interviews/${id}/end`),
  cancel: (id) => api.delete(`/interviews/${id}`),
};

// Walk-in Drive API
export const walkinApi = {
  // Drive management
  list: (params = {}) => api.get('/walkin-drives/', { params }),
  get: (id) => api.get(`/walkin-drives/${id}`),
  create: (data) => api.post('/walkin-drives/', data),
  update: (id, data) => api.patch(`/walkin-drives/${id}`, data),
  delete: (id) => api.delete(`/walkin-drives/${id}`),

  // Questions
  generateQuestions: (driveId, config = {}) =>
    api.post(`/walkin-drives/${driveId}/generate-questions`, config),
  updateQuestions: (driveId, questions) =>
    api.put(`/walkin-drives/${driveId}/questions`, questions),

  // Registration (public)
  getDriveBySlug: (slug) => api.get(`/walkin-drives/register/${slug}`),
  register: (driveId, data) => api.post(`/walkin-drives/${driveId}/register`, data),

  // Registrations management
  getRegistrations: (driveId, params = {}) =>
    api.get(`/walkin-drives/${driveId}/registrations`, { params }),

  // Check-in
  checkIn: (driveId, data) => api.post(`/walkin-drives/${driveId}/checkin`, data),

  // Walk-in registration (front desk - register + check-in in one step)
  walkinRegister: (driveId, data) => api.post(`/walkin-drives/${driveId}/walkin`, data),

  // Walk-in registration with resume
  walkinRegisterWithResume: (driveId, formData) => api.post(`/walkin-drives/${driveId}/walkin-with-resume`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Candidate test portal
  lookupCandidate: (driveId, params) => api.get(`/walkin-drives/${driveId}/lookup`, { params }),

  // Test
  startTest: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/start-test`),
  resumeTest: (driveId, registrationId) =>
    api.get(`/walkin-drives/${driveId}/registrations/${registrationId}/resume-test`),
  submitTest: (driveId, registrationId, answers) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/submit-test`, { answers }),

  // Results
  getLeaderboard: (driveId) => api.get(`/walkin-drives/${driveId}/leaderboard`),
  getStats: (driveId) => api.get(`/walkin-drives/${driveId}/stats`),
  getInterviews: (driveId) => api.get(`/walkin-drives/${driveId}/interviews`),

  // Actions
  shortlist: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/shortlist`),
  reject: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/reject`),
  startInterview: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/start-interview`),
  approveL2: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/approve-l2`),
  rejectAfterInterview: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/reject-after-interview`),
  holdCandidate: (driveId, registrationId) =>
    api.post(`/walkin-drives/${driveId}/registrations/${registrationId}/hold`),
};

export default api;
