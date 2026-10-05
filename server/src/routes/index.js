const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const { requireHQ, requireCenterAdmin } = require('../middleware/roles');
const { reservationCreateLimiter, documentUploadLimiter, loginLimiter } = require('../middleware/rateLimits');
const { uploadParticipantFile, uploadCommitmentFile, uploadProgramFile, uploadConsentFiles } = require('../middleware/upload');

// Controllers
const authController = require('../controllers/authController');
const campCenterController = require('../controllers/campCenterController');
const reservationController = require('../controllers/reservationController');
const reservationActionController = require('../controllers/reservationActionController');
const documentController = require('../controllers/documentController');
const adminDocumentController = require('../controllers/adminDocumentController');
const calendarController = require('../controllers/calendarController');
const analyticsController = require('../controllers/analyticsController');
const dashboardController = require('../controllers/dashboardController');

// ========================
// PUBLIC ROUTES
// ========================

// Camp centers (no capacity/availability data)
router.get('/camp-centers', campCenterController.getAll);

// Create reservation — JSON veya (program akışı dosyası eklendiğinde) multipart
router.post('/reservations',
  reservationCreateLimiter,
  (req, res, next) => {
    uploadProgramFile(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  reservationController.create
);

// Document upload (token-based, user-facing)
router.get('/reservation-documents/:token', documentController.getByToken);
router.get('/reservation-documents/:token/excel-template', documentController.downloadExcelTemplate);
router.get('/reservation-documents/:token/commitment-template', documentController.downloadCommitmentTemplate);

router.post('/reservation-documents/:token/participants',
  documentUploadLimiter,
  (req, res, next) => {
    uploadParticipantFile(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  documentController.uploadParticipants
);

router.post('/reservation-documents/:token/commitment',
  documentUploadLimiter,
  (req, res, next) => {
    uploadCommitmentFile(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  documentController.uploadCommitment
);

router.post('/reservation-documents/:token/consents',
  documentUploadLimiter,
  (req, res, next) => {
    uploadConsentFiles(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  documentController.uploadConsents
);

// ========================
// ADMIN AUTH ROUTES
// ========================
router.post('/admin/auth/login', loginLimiter, authController.login);
router.patch('/admin/auth/password', authMiddleware, authController.changePassword);
router.get('/admin/auth/me', authMiddleware, authController.me);
router.patch('/admin/auth/me', authMiddleware, authController.updateMe);
router.post('/admin/auth/logout', authMiddleware, authController.logout);

// ========================
// ADMIN PROTECTED ROUTES
// ========================
// Genel merkez (hq) tüm verilere erişir; kamp merkezi yöneticisi (center) yalnızca
// kendi merkezinin rezervasyon ve belgelerine erişir (controller'larda kapsamlanır).

// Dashboard
router.get('/admin/dashboard', authMiddleware, requireHQ, dashboardController.getDashboard);

// Reservations
router.post('/admin/reservations/manual', authMiddleware, requireHQ, reservationController.adminCreate);
// Kamp merkezi kendi taleplerini, genel merkez merkez adına yönlendirebilir
router.post('/admin/reservations/forward', authMiddleware, reservationActionController.forward);
router.get('/admin/reservations', authMiddleware, reservationController.adminGetAll);
router.get('/admin/reservations/:id', authMiddleware, reservationController.adminGetById);
router.patch('/admin/reservations/:id/approve', authMiddleware, reservationActionController.approve);
router.patch('/admin/reservations/:id/reject', authMiddleware, reservationActionController.reject);
router.patch('/admin/reservations/:id/cancel', authMiddleware, requireHQ, reservationActionController.cancel);
router.get('/admin/reservations/:id/program-file', authMiddleware, reservationController.downloadProgramFile);
router.get('/admin/reservations/:id/capacity-check', authMiddleware, reservationActionController.capacityCheck);

// Calendar & Capacity
router.get('/admin/calendar', authMiddleware, requireHQ, calendarController.getCalendar);
router.get('/admin/capacity', authMiddleware, requireHQ, calendarController.getCapacity);

// Documents
router.get('/admin/documents', authMiddleware, adminDocumentController.getAllDocuments);
router.get('/admin/reservations/:id/participants', authMiddleware, adminDocumentController.getParticipants);
router.get('/admin/participant-files/:id/download', authMiddleware, adminDocumentController.downloadParticipantFile);
router.get('/admin/commitment-documents/:id', authMiddleware, adminDocumentController.getCommitmentDocument);
router.get('/admin/commitment-documents/:id/download', authMiddleware, adminDocumentController.downloadCommitmentDocument);
router.get('/admin/reservations/:id/consents', authMiddleware, adminDocumentController.getConsents);
router.get('/admin/consent-documents/:id/download', authMiddleware, adminDocumentController.downloadConsent);
// Belge onayı yalnızca kamp merkezi yöneticisindedir
router.patch('/admin/reservations/:id/consents/approve', authMiddleware, requireCenterAdmin, adminDocumentController.approveConsents);
router.patch('/admin/reservations/:id/consents/reject', authMiddleware, requireCenterAdmin, adminDocumentController.rejectConsents);
router.patch('/admin/reservations/:id/documents/unlock', authMiddleware, requireCenterAdmin, adminDocumentController.unlockDocuments);
router.patch('/admin/commitment-documents/:id/approve', authMiddleware, requireCenterAdmin, adminDocumentController.approveCommitment);
router.patch('/admin/commitment-documents/:id/reject', authMiddleware, requireCenterAdmin, adminDocumentController.rejectCommitment);

// Camp centers (admin can update)
router.get('/admin/camp-centers', authMiddleware, campCenterController.getAll);
router.put('/admin/camp-centers/:id', authMiddleware, requireHQ, campCenterController.update);

// Analytics
router.get('/admin/analytics/summary', authMiddleware, requireHQ, analyticsController.getSummary);
router.get('/admin/analytics/camp-centers', authMiddleware, analyticsController.getCampCenterStats);
router.get('/admin/analytics/gender', authMiddleware, requireHQ, analyticsController.getGenderStats);
router.get('/admin/analytics/trends', authMiddleware, requireHQ, analyticsController.getTrends);
router.get('/admin/analytics/purposes', authMiddleware, requireHQ, analyticsController.getPurposeStats);
router.get('/admin/analytics/meals', authMiddleware, requireHQ, analyticsController.getMealStats);
router.get('/admin/analytics/capacity', authMiddleware, requireHQ, analyticsController.getCapacityStats);
router.get('/admin/analytics/documents', authMiddleware, requireHQ, analyticsController.getDocumentStats);

module.exports = router;
