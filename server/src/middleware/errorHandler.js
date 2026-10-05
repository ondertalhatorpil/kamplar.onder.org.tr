const errorHandler = (err, req, res, next) => {
  console.error('Hata:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      errors: err.errors
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Veritabanı doğrulama hatası',
      errors: err.errors.map(e => e.message)
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Bu kayıt zaten mevcut.'
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Dosya boyutu çok büyük.'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Tek seferde en fazla 100 dosya yükleyebilirsiniz.'
    });
  }

  if (err.message?.startsWith('Geçersiz dosya türü')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Beklenmeyen hatalarda iç hata metni kullanıcıya gösterilmez (yalnızca loglanır)
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status < 500 && err.expose !== false && err.message ? err.message : 'Sunucu hatası oluştu.'
  });
};

module.exports = errorHandler;
