const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Admin, CampCenter } = require('../models');
const { isValidMobilePhone } = require('../utils/helpers');

const serializeAdmin = (admin, campCenter) => ({
  id: admin.id,
  username: admin.username,
  first_name: admin.first_name,
  last_name: admin.last_name,
  email: admin.email,
  phone: admin.phone,
  role: admin.role,
  camp_center_id: admin.camp_center_id,
  camp_center_name: campCenter?.name || null
});

const loadCampCenter = (admin) =>
  admin.camp_center_id ? CampCenter.findByPk(admin.camp_center_id, { attributes: ['id', 'name'] }) : null;

const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = String(username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve parola gereklidir.' });
    }

    const admin = await Admin.findOne({
      where: {
        is_active: true,
        [Op.or]: [{ username: identifier }, { email: identifier }]
      }
    });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya parola.' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya parola.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return res.json({
      success: true,
      message: 'Giriş başarılı.',
      data: {
        token,
        admin: serializeAdmin(admin, await loadCampCenter(admin))
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const me = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: serializeAdmin(req.admin, await loadCampCenter(req.admin))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Admin, SMS bildirimlerinin gideceği kendi telefon numarasını günceller.
const updateMe = async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (phone && !isValidMobilePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).' });
    }

    await req.admin.update({ phone: phone || null });

    return res.json({
      success: true,
      message: 'Telefon numarası güncellendi.',
      data: serializeAdmin(req.admin, await loadCampCenter(req.admin))
    });
  } catch (error) {
    console.error('Update me error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Mevcut ve yeni parola gereklidir.' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ success: false, message: 'Yeni parola en az 8 karakter olmalıdır.' });
    }
    if (!(await bcrypt.compare(current_password, req.admin.password_hash))) {
      return res.status(400).json({ success: false, message: 'Mevcut parola hatalı.' });
    }
    if (current_password === new_password) {
      return res.status(400).json({ success: false, message: 'Yeni parola mevcut paroladan farklı olmalıdır.' });
    }

    await req.admin.update({ password_hash: await bcrypt.hash(String(new_password), 12) });
    return res.json({ success: true, message: 'Parolanız değiştirildi.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const logout = async (req, res) => {
  return res.json({ success: true, message: 'Çıkış başarılı.' });
};

module.exports = { login, me, updateMe, changePassword, logout };
