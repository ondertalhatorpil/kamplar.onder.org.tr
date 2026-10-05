const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: { isEmail: true }
  },
  // SMS bildirimlerinin gönderileceği numara (admin panelinden güncellenebilir)
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // superadmin/admin: eski tam yetkili hesaplar, hq_admin: genel merkez,
  // center_admin: yalnızca camp_center_id'deki merkezin talepleri
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'hq_admin', 'center_admin'),
    defaultValue: 'admin'
  },
  camp_center_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'admins',
  timestamps: true,
  underscored: true
});

module.exports = Admin;
