const axios = require('axios');
const { SmsLog, Admin } = require('../models');
const { needsParentalConsent } = require('../utils/reservationStatus');
require('dotenv').config();

// ─── Ekomesaj Konfigürasyonu ───────────────────────────────────────────────
const SMS_CONFIG = {
  baseURL: process.env.SMS_BASE_URL || 'http://panel4.ekomesaj.com:9587',
  username: process.env.SMS_USERNAME || '',
  password: process.env.SMS_PASSWORD || '',
  sender: process.env.SMS_SENDER || '',
  timeout: 10000,
};

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'mock'; // 'mock' | 'ekomesaj'

// Rezervasyon süreci belge onayıyla tamamlandıktan sonra başvuru sahibine
// bildirilen iletişim numarası; kamp merkezi yöneticisinin telefonu kayıtlı
// değilse bu genel hat kullanılır.
const CONTACT_PHONE = process.env.CONTACT_PHONE || '0212 521 19 58';

// SMS'lerdeki linklerin temel adresi.
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

// Cooldown: aynı numaraya aynı mesajın 5 sn içinde tekrar gönderimini engelle
const lastSentSMS = new Map();
const SMS_COOLDOWN = 5000;

// ─── Axios Instance ────────────────────────────────────────────────────────
const smsClient = axios.create({
  baseURL: SMS_CONFIG.baseURL,
  timeout: SMS_CONFIG.timeout,
  auth: {
    username: SMS_CONFIG.username,
    password: SMS_CONFIG.password,
  },
  headers: { 'Content-Type': 'application/json' },
});

// ─── Yardımcı: Telefon Formatlama ─────────────────────────────────────────
/**
 * Herhangi bir Türkiye numarasını 905XXXXXXXXX formatına çevirir.
 */
const formatPhone = (phone) => {
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '90' + cleaned.substring(1);
  if (!cleaned.startsWith('90')) cleaned = '90' + cleaned;
  return cleaned;
};

// ─── Yardımcı: Geçici Ağ Hatalarında Yeniden Deneme ───────────────────────
// Yalnızca bağlantı hiç kurulamadığında (DNS çözülemedi, bağlantı reddedildi)
// tekrar dener. Zaman aşımı gibi isteğin sağlayıcıya ulaşmış olabileceği
// durumlarda tekrar denenmez; aksi halde aynı SMS iki kez gidebilir.
const RETRYABLE_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']);
const RETRY_DELAYS_MS = [1000, 3000];

async function postWithRetry(url, payload) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await smsClient.post(url, payload);
    } catch (error) {
      const retryable = !error.response && RETRYABLE_CODES.has(error.code);
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      console.warn(`🔁 SMS bağlantı hatası (${error.code}) — ${RETRY_DELAYS_MS[attempt] / 1000}sn sonra tekrar denenecek.`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

// ─── Gerçek SMS Gönderimi (Ekomesaj) ──────────────────────────────────────
/**
 * Ekomesaj API'sine POST /sms/create isteği atar.
 * @param {string} phoneNumber
 * @param {string} message
 * @returns {Promise<object>} API yanıtı
 */
async function sendRealSms(phoneNumber, message) {
  const formattedPhone = formatPhone(phoneNumber);

  // Cooldown kontrolü
  const cooldownKey = `${formattedPhone}:${message}`;
  const lastSent = lastSentSMS.get(cooldownKey);
  if (lastSent && Date.now() - lastSent < SMS_COOLDOWN) {
    const wait = Math.ceil((SMS_COOLDOWN - (Date.now() - lastSent)) / 1000);
    console.log(`⏱️  Cooldown aktif — ${wait}sn bekleyin: ${formattedPhone}`);
    return { cooldown: true, phone: formattedPhone, waitSeconds: wait };
  }

  const payload = {
    type: 1,                                          // Normal SMS
    sendingType: 0,                                   // Tekil gönderim
    title: `SMS - ${new Date().toISOString()}`,
    content: message,
    number: parseInt(formattedPhone, 10),
    encoding: 1,                                      // Türkçe karakter desteği
    sender: SMS_CONFIG.sender,
    periodicSettings: null,
    sendingDate: null,
    pushSettings: null,
  };

  const response = await postWithRetry('/sms/create', payload);

  // Başarılıysa zamanı kaydet
  lastSentSMS.set(cooldownKey, Date.now());

  return response.data;
}

// ─── Ana SMS Fonksiyonu ────────────────────────────────────────────────────
/**
 * SMS gönderir ve SmsLog tablosuna kaydeder.
 * @param {string} phoneNumber
 * @param {string} message
 * @param {string} smsType   - MANUAL | RESERVATION_RECEIVED | RESERVATION_APPROVED | ...
 * @param {number|null} reservationId
 * @returns {Promise<{status, providerResponse, errorMessage}>}
 */
async function sendSms(phoneNumber, message, smsType = 'MANUAL', reservationId = null) {
  console.log(`\n📱 SMS GÖNDERİLİYOR [${smsType}]`);
  console.log(`   Alıcı: ${phoneNumber}`);
  console.log(`   Mesaj: ${message}`);
  console.log('─'.repeat(60));

  let status = 'MOCK';
  let providerResponse = null;
  let errorMessage = null;

  if (SMS_PROVIDER === 'mock') {
    // ── Mock mod: gerçek istek atılmaz ──────────────────────────────────
    status = 'MOCK';
    providerResponse = JSON.stringify({ mock: true, timestamp: new Date().toISOString() });
    console.log('🧪 Mock mod aktif — gerçek SMS gönderilmedi.');
  } else if (SMS_PROVIDER === 'ekomesaj') {
    // ── Ekomesaj entegrasyonu ────────────────────────────────────────────
    try {
      const response = await sendRealSms(phoneNumber, message);
      status = response.cooldown ? 'COOLDOWN' : 'SENT';
      providerResponse = JSON.stringify(response);
      console.log(`✅ SMS gönderildi [${status}]:`, response);
    } catch (error) {
      status = 'FAILED';
      errorMessage = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      console.error('❌ SMS gönderme hatası:', errorMessage);
    }
  } else {
    // ── Bilinmeyen provider ──────────────────────────────────────────────
    status = 'FAILED';
    errorMessage = `Bilinmeyen SMS_PROVIDER: ${SMS_PROVIDER}`;
    console.error('❌', errorMessage);
  }

  // ── Veritabanına logla ───────────────────────────────────────────────────
  try {
    await SmsLog.create({
      reservation_id: reservationId,
      phone: phoneNumber,
      message,
      sms_type: smsType,
      status,
      provider_response: providerResponse,
      error_message: errorMessage,
      sent_at: new Date(),
    });
  } catch (dbError) {
    console.error('⚠️  SMS log kaydedilemedi:', dbError.message);
  }

  return { status, providerResponse, errorMessage };
}

// ─── SMS Kredi Kontrolü ────────────────────────────────────────────────────
/**
 * Ekomesaj hesabındaki kalan krediyi döner.
 * @returns {Promise<object>}
 */
async function checkCredit() {
  try {
    const response = await smsClient.get('/user/credit');
    console.log('💳 SMS Kredisi:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Kredi kontrol hatası:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// ─── Rezervasyon SMS Fonksiyonları ─────────────────────────────────────────

async function sendReservationReceivedSms(reservation) {
  const { authorized_first_name, authorized_last_name, reservation_number, phone } = reservation;
  const fullName = `${authorized_first_name} ${authorized_last_name}`;
  const message =
    `Sayın ${fullName}, ${reservation_number} numaralı ÖnderKamp rezervasyon talebiniz alınmıştır. ` +
    `Tarih ve kapasite uygunluğu incelendikten sonra SMS ile bilgilendirileceksiniz.`;
  return sendSms(phone, message, 'RESERVATION_RECEIVED', reservation.id);
}

async function sendReservationApprovedSms(reservation, documentToken) {
  const { authorized_first_name, authorized_last_name, reservation_number, phone } = reservation;
  const fullName = `${authorized_first_name} ${authorized_last_name}`;
  const documentUrl = `${clientUrl()}/rezervasyon-belgeleri/${documentToken}`;
  const message =
    `Sayın ${fullName}, ${reservation_number} numaralı ÖnderKamp rezervasyon talebiniz ONAYLANMIŞTIR. ` +
    `Katılımcı listenizi ve imzalı taahhütnamenizi yüklemek için: ${documentUrl}`;
  return sendSms(phone, message, 'RESERVATION_APPROVED', reservation.id);
}

async function sendReservationRejectedSms(reservation, reason) {
  const { authorized_first_name, authorized_last_name, reservation_number, phone } = reservation;
  const fullName = `${authorized_first_name} ${authorized_last_name}`;
  const message =
    `Sayın ${fullName}, ${reservation_number} numaralı ÖnderKamp rezervasyon talebiniz reddedilmiştir. ` +
    `Red nedeni: ${reason}`;
  return sendSms(phone, message, 'RESERVATION_REJECTED', reservation.id);
}

// ─── Admin Bildirimleri ────────────────────────────────────────────────────


const formatSmsDate = (date) =>
  new Date(date).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });

const adminName = (admin) => (admin ? `${admin.first_name} ${admin.last_name}`.trim() : '');

const reservationSummary = (reservation) =>
  `${reservation.reservation_number} - ${reservation.institution_name || `${reservation.authorized_first_name} ${reservation.authorized_last_name}`}, ` +
  `${formatSmsDate(reservation.start_datetime)}-${formatSmsDate(reservation.end_datetime)}, ${reservation.participant_count} kişi`;

async function getHqAdmins() {
  return Admin.findAll({ where: { role: 'hq_admin', is_active: true } });
}

async function getCenterAdmins(campCenterId) {
  return Admin.findAll({ where: { role: 'center_admin', camp_center_id: campCenterId, is_active: true } });
}

// Verilen adminlerden telefonu kayıtlı olanlara aynı mesajı gönderir.
async function notifyAdmins(admins, message, smsType, reservationId = null) {
  const recipients = admins.filter(a => a.phone);
  if (recipients.length === 0) {
    console.warn(`⚠️  [${smsType}] Telefonu kayıtlı admin yok — bildirim gönderilmedi.`);
    return [];
  }
  return Promise.all(recipients.map(a => sendSms(a.phone, message, smsType, reservationId)));
}

// Yalnızca ilgili kamp merkezinin yöneticilerine bildirim gönderir; telefonu
// kayıtlı yönetici yoksa SMS gönderilmez (genel merkeze düşmez).
async function notifyCenterAdmins(campCenterId, message, smsType, reservationId) {
  return notifyAdmins(await getCenterAdmins(campCenterId), message, smsType, reservationId);
}

// Yeni rezervasyon talebi geldiğinde ilgili kamp merkezi yöneticisine bildirim gönderir.
async function sendNewReservationAdminSms(reservation) {
  const message =
    `Yeni rezervasyon talebi: ${reservationSummary(reservation)}. ` +
    `İncelemek için: ${clientUrl()}/admin/rezervasyonlar/${reservation.id}`;
  return notifyCenterAdmins(reservation.camp_center_id, message, 'ADMIN_NEW_RESERVATION', reservation.id);
}

// Katılımcı listesi ve taahhütname yüklemeleri tamamlandığında belgeleri
// inceleyecek kamp merkezi yöneticisine bildirim gönderir.
async function sendDocumentsCompletedAdminSms(reservation) {
  const { authorized_first_name, authorized_last_name, reservation_number } = reservation;
  const fullName = `${authorized_first_name} ${authorized_last_name}`;
  const documents = needsParentalConsent(reservation)
    ? 'katılımcı listesi, taahhütname ve veli muvafakatnameleri'
    : 'katılımcı listesi ve taahhütname';
  const message =
    `${reservation_number} - ${fullName} rezervasyonuna ait ${documents} ` +
    `yüklendi. İncelemek için: ${clientUrl()}/admin/belgeler/${reservation.id}`;
  return notifyCenterAdmins(reservation.camp_center_id, message, 'ADMIN_DOCUMENTS_COMPLETED', reservation.id);
}

// Kamp merkezi talepleri genel merkeze yönlendirdiğinde genel merkez
// adminlerine tek SMS gider: her talep, merkezin notu ve inceleme linki.
async function sendForwardedToHqSms(reservations, campCenterName) {
  const lines = reservations.map(r =>
    r.center_note ? `${r.reservation_number}: ${r.center_note}` : r.reservation_number
  );
  const ids = reservations.map(r => r.id).join(',');
  const message =
    `${campCenterName} ${reservations.length} yeni rezervasyon talebini genel merkeze iletti. ` +
    `${lines.join(' | ')}. İncelemek için: ${clientUrl()}/admin/onay-bekleyenler?ids=${ids}`;
  const reservationId = reservations.length === 1 ? reservations[0].id : null;
  return notifyAdmins(await getHqAdmins(), message, 'ADMIN_FORWARDED', reservationId);
}

async function sendCenterRejectedToHqSms(reservation, campCenterName, reason, rejectedBy) {
  const message =
    `${campCenterName} (${adminName(rejectedBy)}) ${reservationSummary(reservation)} talebini reddetti. ` +
    `Red nedeni: ${reason}`;
  return notifyAdmins(await getHqAdmins(), message, 'ADMIN_CENTER_REJECTED', reservation.id);
}

async function sendHqApprovedToCenterSms(reservation, approvedBy) {
  const message =
    `Genel merkez (${adminName(approvedBy)}) talebi onayladı: ${reservationSummary(reservation)}. ` +
    `Son onay için: ${clientUrl()}/admin/rezervasyonlar/${reservation.id}`;
  return notifyCenterAdmins(reservation.camp_center_id, message, 'ADMIN_HQ_APPROVED', reservation.id);
}

async function sendHqRejectedToCenterSms(reservation, reason, rejectedBy) {
  const message =
    `Genel merkez (${adminName(rejectedBy)}) talebi reddetti: ${reservationSummary(reservation)}. ` +
    `Red nedeni: ${reason}`;
  return notifyCenterAdmins(reservation.camp_center_id, message, 'ADMIN_HQ_REJECTED', reservation.id);
}

async function sendCommitmentRejectedSms(reservation, reason) {
  const { reservation_number, phone } = reservation;
  const documentUrl = `${clientUrl()}/rezervasyon-belgeleri/${reservation.document_upload_token}`;
  const message =
    `${reservation_number} numaralı rezervasyonunuza ait taahhütname uygun bulunmamıştır. ` +
    `Açıklama: ${reason} Lütfen belgeyi yeniden yükleyiniz: ${documentUrl}`;
  return sendSms(phone, message, 'COMMITMENT_REJECTED', reservation.id);
}

async function sendConsentRejectedSms(reservation, reason) {
  const { reservation_number, phone } = reservation;
  const documentUrl = `${clientUrl()}/rezervasyon-belgeleri/${reservation.document_upload_token}`;
  const message =
    `${reservation_number} numaralı rezervasyonunuza ait veli muvafakatnameleri uygun bulunmamıştır. ` +
    `Açıklama: ${reason} Lütfen eksik/hatalı muvafakatnameleri yeniden yükleyiniz: ${documentUrl}`;
  return sendSms(phone, message, 'CONSENT_REJECTED', reservation.id);
}

// Admin, taahhütnameyi inceleyip onayladığında gönderilen kapanış SMS'i —
// rezervasyon sürecinin bu noktadan sonra telefonla devam edeceğini bildirir.
// Başvurana verilecek iletişim numarası: kamp merkezi yöneticisinin telefonu,
// kayıtlı değilse genel hat.
async function getContactPhone(campCenterId) {
  const centerPhones = [...new Set(
    (await getCenterAdmins(campCenterId)).map(a => a.phone).filter(Boolean)
  )];
  return centerPhones.length > 0 ? centerPhones.join(' / ') : CONTACT_PHONE;
}

// Talep merkez veya genel merkez tarafından reddedildiğinde başvurana giden
// bilgilendirme; red nedeni yalnızca adminler arasında kalır.
async function sendReservationDeclinedSms(reservation) {
  const { authorized_first_name, authorized_last_name, reservation_number, phone } = reservation;
  const message =
    `Sayın ${authorized_first_name} ${authorized_last_name}, ${reservation_number} numaralı ÖnderKamp ` +
    `rezervasyon talebiniz değerlendirilmiş olup uygun bulunmamıştır. ` +
    `Bilgi için: ${await getContactPhone(reservation.camp_center_id)}`;
  return sendSms(phone, message, 'RESERVATION_DECLINED', reservation.id);
}

async function sendReservationCancelledSms(reservation) {
  const { authorized_first_name, authorized_last_name, reservation_number, phone } = reservation;
  const message =
    `Sayın ${authorized_first_name} ${authorized_last_name}, ${reservation_number} numaralı ÖnderKamp ` +
    `rezervasyonunuz iptal edilmiştir. Bilgi için: ${await getContactPhone(reservation.camp_center_id)}`;
  return sendSms(phone, message, 'RESERVATION_CANCELLED', reservation.id);
}

// Kamp merkezi onaylanmış belgeleri yeniden düzenlemeye açtığında başvurana gider.
async function sendDocumentsUnlockedSms(reservation) {
  const { reservation_number, phone } = reservation;
  const documentUrl = `${clientUrl()}/rezervasyon-belgeleri/${reservation.document_upload_token}`;
  const message =
    `${reservation_number} numaralı rezervasyonunuzun belgeleri güncelleme için yeniden açılmıştır. ` +
    `Belgelerinizi güncelleyip tekrar yükleyebilirsiniz: ${documentUrl}`;
  return sendSms(phone, message, 'DOCUMENTS_UNLOCKED', reservation.id);
}

async function sendCommitmentApprovedSms(reservation) {
  const { authorized_first_name, authorized_last_name, reservation_number, phone } = reservation;
  const fullName = `${authorized_first_name} ${authorized_last_name}`;
  const contactPhone = await getContactPhone(reservation.camp_center_id);
  const message =
    `Sayın ${fullName}, ${reservation_number} numaralı ÖnderKamp rezervasyonunuz onaylanmıştır. ` +
    `Bundan sonraki süreç ${contactPhone} numaralı iletişim hattımız üzerinden devam edecektir.`;
  return sendSms(phone, message, 'COMMITMENT_APPROVED', reservation.id);
}

// ─── Export ────────────────────────────────────────────────────────────────
module.exports = {
  sendSms,
  checkCredit,
  formatPhone,
  sendReservationReceivedSms,
  sendReservationApprovedSms,
  sendReservationRejectedSms,
  sendNewReservationAdminSms,
  sendDocumentsCompletedAdminSms,
  sendForwardedToHqSms,
  sendCenterRejectedToHqSms,
  sendHqApprovedToCenterSms,
  sendHqRejectedToCenterSms,
  sendCommitmentRejectedSms,
  sendCommitmentApprovedSms,
  sendConsentRejectedSms,
  sendReservationDeclinedSms,
  sendReservationCancelledSms,
  sendDocumentsUnlockedSms,
};
