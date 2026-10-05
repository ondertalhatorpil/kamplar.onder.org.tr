const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme token\'ı bulunamadı.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findOne({
      where: { id: decoded.id, is_active: true }
    });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş token.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.' });
    }
    return res.status(401).json({ success: false, message: 'Geçersiz token.' });
  }
};

module.exports = authMiddleware;
