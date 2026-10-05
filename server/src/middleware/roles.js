const { isHQ, isCenterAdmin } = require('../utils/roles');

// authMiddleware'den sonra kullanılır.
const requireHQ = (req, res, next) => {
  if (!isHQ(req.admin)) {
    return res.status(403).json({ success: false, message: 'Bu işlem için genel merkez yetkisi gereklidir.' });
  }
  next();
};

const requireCenterAdmin = (req, res, next) => {
  if (!isCenterAdmin(req.admin) || !req.admin.camp_center_id) {
    return res.status(403).json({ success: false, message: 'Bu işlem yalnızca kamp merkezi yöneticisi tarafından yapılabilir.' });
  }
  next();
};

module.exports = { requireHQ, requireCenterAdmin };
