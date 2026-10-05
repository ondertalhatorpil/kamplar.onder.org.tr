const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SmsLog = sequelize.define('SmsLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sms_type: {
    type: DataTypes.ENUM(
      'RESERVATION_RECEIVED',
      'RESERVATION_APPROVED',
      'RESERVATION_REJECTED',
      'PARTICIPANT_FILE_UPLOADED',
      'COMMITMENT_UPLOADED',
      'DOCUMENTS_COMPLETED',
      'COMMITMENT_REJECTED',
      'COMMITMENT_APPROVED',
      'CONSENT_REJECTED',
      'RESERVATION_DECLINED',
      'RESERVATION_CANCELLED',
      'DOCUMENTS_UNLOCKED',
      'ADMIN_NEW_RESERVATION',
      'ADMIN_DOCUMENTS_COMPLETED',
      'ADMIN_FORWARDED',
      'ADMIN_CENTER_REJECTED',
      'ADMIN_HQ_APPROVED',
      'ADMIN_HQ_REJECTED',
      'MANUAL'
    ),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('SENT', 'FAILED', 'MOCK', 'COOLDOWN'),
    defaultValue: 'MOCK'
  },
  provider_response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'sms_logs',
  timestamps: true,
  underscored: true
});

module.exports = SmsLog;
