const { v4: uuidv4 } = require('uuid');
const { Reservation } = require('../models');

async function generateReservationNumber() {
  const year = new Date().getFullYear();
  const prefix = `OK-${year}-`;

  // Find the latest reservation number for this year
  const latest = await Reservation.findOne({
    where: {},
    order: [['id', 'DESC']],
    attributes: ['reservation_number']
  });

  let sequence = 1;
  if (latest && latest.reservation_number) {
    const parts = latest.reservation_number.split('-');
    if (parts.length === 3 && parts[1] === String(year)) {
      sequence = parseInt(parts[2]) + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, '0')}`;
}

// İlkokul, ortaokul ve lise grupları her zaman 18 yaş altıdır; "diğer" grupta
// başvuran 18 yaş altı katılımcı olduğunu belirtirse muvafakatname istenir.
const MINOR_EDUCATION_LEVELS = ['ilkokul', 'ortaokul', 'lise', 'under_18'];

function requiresParentalConsent(educationLevel, hasMinors) {
  return MINOR_EDUCATION_LEVELS.includes(educationLevel) || (educationLevel === 'diger' && !!hasMinors);
}

function generateDocumentToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

// Belge linki en az DOCUMENT_TOKEN_EXPIRES_IN_DAYS gün, kamp daha ileri bir
// tarihteyse kampın bitişinden bir gün sonrasına kadar geçerlidir.
function getTokenExpiryDate(endDatetime) {
  const days = parseInt(process.env.DOCUMENT_TOKEN_EXPIRES_IN_DAYS) || 30;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  if (endDatetime) {
    const afterCamp = new Date(endDatetime);
    afterCamp.setDate(afterCamp.getDate() + 1);
    if (afterCamp > expiry) return afterCamp;
  }
  return expiry;
}

function calculateDaysAndNights(startDatetime, endDatetime) {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);
  const nights = Math.max(0, Math.floor(diffHours / 24));

  return {
    total_days: Math.max(1, diffDays),
    total_nights: nights
  };
}

function formatTurkishPhone(phone) {
  // Clean phone number
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('90')) return '+' + cleaned;
  if (cleaned.startsWith('0')) return '+9' + cleaned;
  return '+90' + cleaned;
}

// SMS gönderilebilecek Türkiye cep telefonu: 05XXXXXXXXX (başında +90 / 90 / 0 olabilir)
function isValidMobilePhone(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '');
  return /^(90|0)?5\d{9}$/.test(cleaned);
}

function isValidTurkishPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  // Turkish phone: starts with 0 followed by 10 digits, or 90 followed by 10 digits
  return /^(0[5-9]\d{9}|90[5-9]\d{9}|[5-9]\d{9})$/.test(cleaned);
}

module.exports = {
  requiresParentalConsent,
  generateReservationNumber,
  generateDocumentToken,
  getTokenExpiryDate,
  calculateDaysAndNights,
  formatTurkishPhone,
  isValidTurkishPhone,
  isValidMobilePhone
};
