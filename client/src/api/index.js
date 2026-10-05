import apiClient from './client';

// ========================
// PUBLIC APIs
// ========================

export const campCentersAPI = {
  getAll: () => apiClient.get('/camp-centers'),
};

export const reservationsAPI = {
  // Program akışı dosyası eklendiyse form verisi multipart olarak gönderilir
  create: (data, programFile) => {
    if (!programFile) return apiClient.post('/reservations', data);
    const formData = new FormData();
    formData.append('payload', JSON.stringify(data));
    formData.append('programFile', programFile);
    return apiClient.post('/reservations', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const documentsAPI = {
  getByToken: (token) => apiClient.get(`/reservation-documents/${token}`),
  downloadExcelTemplate: (token) => `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api'}/reservation-documents/${token}/excel-template`,
  downloadCommitmentTemplate: (token) => `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api'}/reservation-documents/${token}/commitment-template`,
  uploadParticipants: (token, formData) => apiClient.post(`/reservation-documents/${token}/participants`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadCommitment: (token, formData) => apiClient.post(`/reservation-documents/${token}/commitment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadConsents: (token, formData) => apiClient.post(`/reservation-documents/${token}/consents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ========================
// ADMIN APIs
// ========================

export const adminAuthAPI = {
  login: (data) => apiClient.post('/admin/auth/login', data),
  me: () => apiClient.get('/admin/auth/me'),
  updateMe: (data) => apiClient.patch('/admin/auth/me', data),
  changePassword: (data) => apiClient.patch('/admin/auth/password', data),
  logout: () => apiClient.post('/admin/auth/logout'),
};

export const adminDashboardAPI = {
  get: () => apiClient.get('/admin/dashboard'),
};

export const adminReservationsAPI = {
  createManual: (data) => apiClient.post('/admin/reservations/manual', data),
  getAll: (params) => apiClient.get('/admin/reservations', { params }),
  getById: (id) => apiClient.get(`/admin/reservations/${id}`),
  downloadProgramFile: (id) => `/admin/reservations/${id}/program-file`,
  forward: (items) => apiClient.post('/admin/reservations/forward', { items }),
  approve: (id) => apiClient.patch(`/admin/reservations/${id}/approve`),
  reject: (id, data) => apiClient.patch(`/admin/reservations/${id}/reject`, data),
  cancel: (id, data) => apiClient.patch(`/admin/reservations/${id}/cancel`, data),
  unlockDocuments: (id) => apiClient.patch(`/admin/reservations/${id}/documents/unlock`),
  capacityCheck: (id) => apiClient.get(`/admin/reservations/${id}/capacity-check`),
};

export const adminCalendarAPI = {
  getCalendar: (params) => apiClient.get('/admin/calendar', { params }),
  getCapacity: (params) => apiClient.get('/admin/capacity', { params }),
};

export const adminDocumentsAPI = {
  getAll: (params) => apiClient.get('/admin/documents', { params }),
  getParticipants: (id, params) => apiClient.get(`/admin/reservations/${id}/participants`, { params }),
  downloadParticipantFile: (id) => `/admin/participant-files/${id}/download`,
  getCommitmentDocument: (id) => apiClient.get(`/admin/commitment-documents/${id}`),
  downloadCommitmentDocument: (id) => `/admin/commitment-documents/${id}/download`,
  approveCommitment: (id) => apiClient.patch(`/admin/commitment-documents/${id}/approve`),
  rejectCommitment: (id, data) => apiClient.patch(`/admin/commitment-documents/${id}/reject`, data),
  getConsents: (reservationId) => apiClient.get(`/admin/reservations/${reservationId}/consents`),
  downloadConsent: (id) => `/admin/consent-documents/${id}/download`,
  approveConsents: (reservationId) => apiClient.patch(`/admin/reservations/${reservationId}/consents/approve`),
  rejectConsents: (reservationId, data) => apiClient.patch(`/admin/reservations/${reservationId}/consents/reject`, data),
};

export const adminAnalyticsAPI = {
  getSummary: (params) => apiClient.get('/admin/analytics/summary', { params }),
  getCampCenters: (params) => apiClient.get('/admin/analytics/camp-centers', { params }),
  getGender: (params) => apiClient.get('/admin/analytics/gender', { params }),
  getTrends: (params) => apiClient.get('/admin/analytics/trends', { params }),
  getPurposes: (params) => apiClient.get('/admin/analytics/purposes', { params }),
  getMeals: (params) => apiClient.get('/admin/analytics/meals', { params }),
  getCapacity: (params) => apiClient.get('/admin/analytics/capacity', { params }),
  getDocuments: (params) => apiClient.get('/admin/analytics/documents', { params }),
};
