const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const {
  Reservation, CampCenter, ParticipantFile, Participant,
  CommitmentDocument, Admin, ParentalConsentDocument
} = require('../models');
const {
  sendCommitmentRejectedSms, sendCommitmentApprovedSms, sendConsentRejectedSms, sendDocumentsUnlockedSms
} = require('../services/smsService');
const { reservationScope } = require('../utils/roles');
const { needsParentalConsent, isDocumentsApproved } = require('../utils/reservationStatus');

const STALE_MESSAGE = 'Bu belge bu sırada başka bir işlem gördü. Sayfayı yenileyin.';

// Onay için istenen tüm belgelerin yüklenmiş olması gerekir; eksik varsa açıklama döner.
const missingDocumentsMessage = (r) => {
  const missing = [];
  if (!['UPLOADED', 'VALIDATED'].includes(r.participant_file_status)) missing.push('katılımcı listesi');
  if (!['UPLOADED', 'APPROVED'].includes(r.commitment_status)) missing.push('taahhütname');
  if (needsParentalConsent(r) && !['UPLOADED', 'APPROVED'].includes(r.consent_status)) missing.push('veli muvafakatnameleri');
  return missing.length
    ? `Onay için tüm belgelerin yüklenmiş olması gerekir. Eksik: ${missing.join(', ')}.`
    : null;
};

// Tüm imzalı belgeler (taahhütname + gerekiyorsa veli muvafakatnamesi) onaylandığında
// başvurana kapanış SMS'i gönderilir.
const sendApprovedSmsIfDone = async (reservation) => {
  if (!isDocumentsApproved(reservation)) return false;
  try {
    await sendCommitmentApprovedSms(reservation);
  } catch (smsError) {
    console.error('Onay SMS gönderilemedi:', smsError);
  }
  return true;
};

// Kamp merkezi yöneticisi yalnızca kendi merkezine ait belgelere erişebilir.
const canAccessReservationId = async (admin, reservationId) =>
  !!(await Reservation.count({ where: { id: reservationId, ...reservationScope(admin) } }));

const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'APPROVED', ...reservationScope(req.admin) };
    if (search) {
      where[Op.or] = [
        { reservation_number: { [Op.like]: `%${search}%` } },
        { authorized_first_name: { [Op.like]: `%${search}%` } },
        { authorized_last_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: CampCenter, as: 'campCenter', attributes: ['id', 'name'] },
        { model: ParticipantFile, as: 'participantFiles', limit: 1, order: [['uploaded_at', 'DESC']] },
        { model: CommitmentDocument, as: 'commitmentDocuments', limit: 1, order: [['uploaded_at', 'DESC']] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return res.json({
      success: true,
      data: rows.map(r => ({ ...r.toJSON(), needs_parental_consent: needsParentalConsent(r) })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('getAllDocuments error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getParticipants = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!(await canAccessReservationId(req.admin, req.params.id))) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }

    const where = { reservation_id: req.params.id };
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { tc_no: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Participant.findAndCountAll({
      where,
      order: [['row_number', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const downloadParticipantFile = async (req, res) => {
  try {
    const file = await ParticipantFile.findByPk(req.params.id);
    if (!file || !(await canAccessReservationId(req.admin, file.reservation_id))) {
      return res.status(404).json({ success: false, message: 'Dosya bulunamadı.' });
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ success: false, message: 'Dosya sunucuda bulunamadı.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.original_file_name}"`);
    return res.sendFile(path.resolve(file.file_path));
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getCommitmentDocument = async (req, res) => {
  try {
    const doc = await CommitmentDocument.findByPk(req.params.id, {
      include: [{ model: Admin, as: 'reviewedByAdmin', attributes: ['id', 'first_name', 'last_name'] }]
    });

    if (!doc || !(await canAccessReservationId(req.admin, doc.reservation_id))) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı.' });
    }

    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const downloadCommitmentDocument = async (req, res) => {
  try {
    const doc = await CommitmentDocument.findByPk(req.params.id);
    if (!doc || !(await canAccessReservationId(req.admin, doc.reservation_id))) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı.' });
    }

    if (!fs.existsSync(doc.file_path)) {
      return res.status(404).json({ success: false, message: 'Dosya sunucuda bulunamadı.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_file_name}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    return res.sendFile(path.resolve(doc.file_path));
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const approveCommitment = async (req, res) => {
  try {
    const doc = await CommitmentDocument.findByPk(req.params.id);
    if (!doc || !(await canAccessReservationId(req.admin, doc.reservation_id))) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı.' });
    }
    if (doc.status !== 'UPLOADED') {
      return res.status(400).json({ success: false, message: 'Bu taahhütname zaten değerlendirilmiş.' });
    }

    const reservation = await Reservation.findByPk(doc.reservation_id);
    const missing = missingDocumentsMessage(reservation);
    if (missing) {
      return res.status(400).json({ success: false, message: missing });
    }

    const [count] = await CommitmentDocument.update(
      { status: 'APPROVED', reviewed_by_admin_id: req.admin.id, reviewed_at: new Date() },
      { where: { id: doc.id, status: 'UPLOADED' } }
    );
    if (count === 0) {
      return res.status(409).json({ success: false, message: STALE_MESSAGE });
    }
    await reservation.update({ commitment_status: 'APPROVED' });

    const done = await sendApprovedSmsIfDone(reservation);

    return res.json({
      success: true,
      message: done
        ? 'Taahhütname onaylandı ve kullanıcıya SMS gönderildi.'
        : 'Taahhütname onaylandı. Veli muvafakatnameleri onaylandığında kullanıcıya SMS gönderilecek.'
    });
  } catch (error) {
    console.error('approveCommitment error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const rejectCommitment = async (req, res) => {
  try {
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Red nedeni gereklidir.' });
    }

    const doc = await CommitmentDocument.findByPk(req.params.id);
    if (!doc || !(await canAccessReservationId(req.admin, doc.reservation_id))) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı.' });
    }

    const [count] = await CommitmentDocument.update(
      { status: 'REJECTED', rejection_reason, reviewed_by_admin_id: req.admin.id, reviewed_at: new Date() },
      { where: { id: doc.id, status: 'UPLOADED' } }
    );
    if (count === 0) {
      return res.status(409).json({ success: false, message: STALE_MESSAGE });
    }

    await Reservation.update(
      { commitment_status: 'REJECTED' },
      { where: { id: doc.reservation_id } }
    );

    const reservation = await Reservation.findByPk(doc.reservation_id);
    if (reservation) {
      try {
        await sendCommitmentRejectedSms(reservation, rejection_reason);
      } catch (smsError) {
        console.error('SMS gönderilemedi:', smsError);
      }
    }

    return res.json({ success: true, message: 'Taahhütname reddedildi ve kullanıcıya SMS gönderildi.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getConsents = async (req, res) => {
  try {
    if (!(await canAccessReservationId(req.admin, req.params.id))) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }
    const docs = await ParentalConsentDocument.findAll({
      where: { reservation_id: req.params.id },
      attributes: ['id', 'original_file_name', 'mime_type', 'file_size', 'uploaded_at'],
      order: [['uploaded_at', 'ASC'], ['id', 'ASC']]
    });
    return res.json({ success: true, data: docs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const downloadConsent = async (req, res) => {
  try {
    const doc = await ParentalConsentDocument.findByPk(req.params.id);
    if (!doc || !(await canAccessReservationId(req.admin, doc.reservation_id))) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı.' });
    }
    if (!fs.existsSync(doc.file_path)) {
      return res.status(404).json({ success: false, message: 'Dosya sunucuda bulunamadı.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_file_name)}"`);
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    return res.sendFile(path.resolve(doc.file_path));
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Muvafakatnameler toplu değerlendirilir (reservation.consent_status).
const findConsentReservation = async (req, res) => {
  const reservation = await Reservation.findOne({ where: { id: req.params.id, ...reservationScope(req.admin) } });
  if (!reservation || !needsParentalConsent(reservation)) {
    res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    return null;
  }
  if (reservation.consent_status !== 'UPLOADED') {
    res.status(400).json({ success: false, message: 'İncelenecek yeni muvafakatname bulunmuyor.' });
    return null;
  }
  return reservation;
};

// consent_status yalnızca hâlâ UPLOADED ise değişir (eşzamanlı işlem koruması)
const updateConsentStatus = async (reservation, changes) => {
  const [count] = await Reservation.update(changes, {
    where: { id: reservation.id, consent_status: 'UPLOADED' }
  });
  if (count > 0) Object.assign(reservation.dataValues, changes);
  return count > 0;
};

const approveConsents = async (req, res) => {
  try {
    const reservation = await findConsentReservation(req, res);
    if (!reservation) return;

    const missing = missingDocumentsMessage(reservation);
    if (missing) {
      return res.status(400).json({ success: false, message: missing });
    }

    if (!(await updateConsentStatus(reservation, { consent_status: 'APPROVED', consent_rejection_reason: null }))) {
      return res.status(409).json({ success: false, message: STALE_MESSAGE });
    }
    const done = await sendApprovedSmsIfDone(reservation);

    return res.json({
      success: true,
      message: done
        ? 'Muvafakatnameler onaylandı ve kullanıcıya SMS gönderildi.'
        : 'Muvafakatnameler onaylandı. Taahhütname onaylandığında kullanıcıya SMS gönderilecek.'
    });
  } catch (error) {
    console.error('approveConsents error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const rejectConsents = async (req, res) => {
  try {
    const rejection_reason = String(req.body.rejection_reason || '').trim();
    if (rejection_reason.length < 5) {
      return res.status(400).json({ success: false, message: 'Red nedeni gereklidir.' });
    }

    const reservation = await findConsentReservation(req, res);
    if (!reservation) return;

    if (!(await updateConsentStatus(reservation, { consent_status: 'REJECTED', consent_rejection_reason: rejection_reason }))) {
      return res.status(409).json({ success: false, message: STALE_MESSAGE });
    }

    try {
      await sendConsentRejectedSms(reservation, rejection_reason);
    } catch (smsError) {
      console.error('SMS gönderilemedi:', smsError);
    }

    return res.json({ success: true, message: 'Muvafakatnameler reddedildi ve kullanıcıya SMS gönderildi.' });
  } catch (error) {
    console.error('rejectConsents error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Onaylanmış belgeleri başvuranın yeniden yükleyebilmesi için açar: onaylı
// taahhütname / muvafakatnameler tekrar "inceleme bekliyor" durumuna döner ve
// katılımcı listesi kilidi kalkar. Başvurana belge linkiyle SMS gider.
const unlockDocuments = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ where: { id: req.params.id, ...reservationScope(req.admin) } });
    if (!reservation || reservation.status !== 'APPROVED' || !reservation.document_upload_token) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }
    if (reservation.commitment_status !== 'APPROVED' && reservation.consent_status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Kilitli (onaylanmış) belge bulunmuyor.' });
    }

    const changes = {};
    if (reservation.commitment_status === 'APPROVED') {
      changes.commitment_status = 'UPLOADED';
      const latest = await CommitmentDocument.findOne({
        where: { reservation_id: reservation.id },
        order: [['uploaded_at', 'DESC'], ['id', 'DESC']]
      });
      if (latest) await latest.update({ status: 'UPLOADED', reviewed_by_admin_id: null, reviewed_at: null });
    }
    if (reservation.consent_status === 'APPROVED') changes.consent_status = 'UPLOADED';
    await reservation.update(changes);

    try {
      await sendDocumentsUnlockedSms(reservation);
    } catch (smsError) {
      console.error('SMS gönderilemedi:', smsError);
    }

    return res.json({
      success: true,
      message: 'Belgeler düzenlemeye açıldı ve başvuru sahibine SMS gönderildi. Yeni belgeler geldiğinde tekrar onaylamanız gerekecek.'
    });
  } catch (error) {
    console.error('unlockDocuments error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  unlockDocuments,
  getConsents, downloadConsent, approveConsents, rejectConsents,
  getAllDocuments, getParticipants, downloadParticipantFile,
  getCommitmentDocument, downloadCommitmentDocument,
  approveCommitment, rejectCommitment
};
