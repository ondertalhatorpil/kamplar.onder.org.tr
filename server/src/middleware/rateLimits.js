const rateLimit = require('express-rate-limit');

// Herkese açık ve SMS tetikleyen uçlar için genel limitten (15 dk / 200) daha sıkı sınırlar.

// Her rezervasyon talebi başvurana ve merkez yöneticisine SMS gönderir; sahte
// taleplerle SMS kredisi tüketilmesini ve numara taciz edilmesini engeller.
const reservationCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla rezervasyon talebi gönderildi. Lütfen bir saat sonra tekrar deneyin.' }
});

const documentUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla dosya yükleme denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.' }
});

// Kaba kuvvet şifre denemelerine karşı: başarılı girişler sayılmaz.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' }
});

module.exports = { reservationCreateLimiter, documentUploadLimiter, loginLimiter };
