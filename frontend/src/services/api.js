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

export default api;
