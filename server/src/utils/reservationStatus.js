const { Op } = require('sequelize');

// 18 yaş altı gruplarda taahhütnameye ek olarak veli muvafakatnamesi istenir:
// öğrenim durumuna göre talep oluşturulurken (requires_parental_consent) ya da
// katılımcı listesinde 18 yaşından küçük biri çıktığında (minor_participant_count).
const needsParentalConsent = (r) => !!r.requires_parental_consent || r.minor_participant_count > 0;

const UPLOADED_OR_APPROVED = ['UPLOADED', 'APPROVED'];
const PARTICIPANT_UPLOADED = ['UPLOADED', 'VALIDATED'];

// Başvurunun istenen tüm belgeleri yüklendi mi (onay beklenebilir).
const isDocumentsComplete = (r) =>
  PARTICIPANT_UPLOADED.includes(r.participant_file_status) &&
  UPLOADED_OR_APPROVED.includes(r.commitment_status) &&
  (!needsParentalConsent(r) || UPLOADED_OR_APPROVED.includes(r.consent_status));

// Kamp merkezi istenen tüm belgeleri onayladı mı (katılımcı listesi de yüklü olmalı).
const isDocumentsApproved = (r) =>
  PARTICIPANT_UPLOADED.includes(r.participant_file_status) &&
  r.commitment_status === 'APPROVED' &&
  (!needsParentalConsent(r) || r.consent_status === 'APPROVED');

// Admin panelinde gösterilen durum, DB'deki status'tan türetilir. DB'de status
// APPROVED kalır; analitik, dashboard ve belge akışı APPROVED üzerinden çalıştığı
// için kayıt değiştirilmez.
//   APPROVED + çıkış saati geçmiş                   → COMPLETED
//   APPROVED + imzalı belgeler admin onaylı         → APPROVED
//   APPROVED + belge linki yok (admin manuel kayıt) → APPROVED
//   APPROVED + belgeler yüklendi, inceleme bekliyor → DOCUMENTS_IN_REVIEW
//   APPROVED + belgeler eksik/reddedildi            → DOCUMENTS_PENDING
const getDisplayStatus = (r, now = new Date()) => {
  if (r.status !== 'APPROVED') return r.status;
  if (new Date(r.end_datetime) <= now) return 'COMPLETED';
  if (!r.document_upload_token || isDocumentsApproved(r)) return 'APPROVED';
  if (isDocumentsComplete(r)) return 'DOCUMENTS_IN_REVIEW';
  return 'DOCUMENTS_PENDING';
};

const withDisplayStatus = (reservation) => {
  const data = reservation.toJSON();
  data.status = getDisplayStatus(data);
  data.needs_parental_consent = needsParentalConsent(data);
  return data;
};

// isDocumentsApproved / isDocumentsComplete'in SQL karşılıkları.
const consentNotNeededWhere = { requires_parental_consent: false, minor_participant_count: 0 };
const documentsApprovedWhere = {
  [Op.and]: [
    { participant_file_status: { [Op.in]: PARTICIPANT_UPLOADED } },
    { commitment_status: 'APPROVED' },
    { [Op.or]: [consentNotNeededWhere, { consent_status: 'APPROVED' }] }
  ]
};
const documentsCompleteWhere = {
  [Op.and]: [
    { participant_file_status: { [Op.in]: PARTICIPANT_UPLOADED } },
    { commitment_status: { [Op.in]: UPLOADED_OR_APPROVED } },
    { [Op.or]: [consentNotNeededWhere, { consent_status: { [Op.in]: UPLOADED_OR_APPROVED } }] }
  ]
};

// Görüntülenen duruma göre filtrelemek için where koşulu döner.
const displayStatusWhere = (status, now = new Date()) => {
  const active = { status: 'APPROVED', end_datetime: { [Op.gt]: now } };
  const hasToken = { document_upload_token: { [Op.ne]: null } };
  switch (status) {
    case 'COMPLETED':
      return {
        [Op.or]: [
          { status: 'COMPLETED' },
          { status: 'APPROVED', end_datetime: { [Op.lte]: now } }
        ]
      };
    case 'APPROVED':
      return {
        ...active,
        [Op.or]: [{ document_upload_token: null }, documentsApprovedWhere]
      };
    case 'DOCUMENTS_IN_REVIEW':
      return {
        [Op.and]: [active, hasToken, documentsCompleteWhere, { [Op.not]: documentsApprovedWhere }]
      };
    case 'DOCUMENTS_PENDING':
      return {
        [Op.and]: [active, hasToken, { [Op.not]: documentsApprovedWhere }, { [Op.not]: documentsCompleteWhere }]
      };
    default:
      return { status };
  }
};

// Henüz sonuçlanmamış (merkez / genel merkez incelemesindeki) talepler.
const IN_REVIEW_STATUSES = ['PENDING', 'FORWARDED', 'HQ_APPROVED'];

module.exports = {
  getDisplayStatus,
  withDisplayStatus,
  displayStatusWhere,
  IN_REVIEW_STATUSES,
  needsParentalConsent,
  isDocumentsComplete,
  isDocumentsApproved,
  documentsCompleteWhere
};
