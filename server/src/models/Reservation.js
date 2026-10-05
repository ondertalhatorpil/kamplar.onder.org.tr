const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  authorized_first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  authorized_last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  authorized_role: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  institution_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  group_gender: {
    type: DataTypes.ENUM('kiz', 'erkek'),
    allowNull: true
  },
  group_composition: {
    type: DataTypes.ENUM('mixed', 'female_only', 'male_only'),
    allowNull: true
  },
  group_nature: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  education_level: {
    type: DataTypes.ENUM('ilkokul', 'ortaokul', 'lise', 'universite', 'diger', 'under_18'),
    allowNull: true
  },
  participant_count: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  purpose: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  purpose_detail: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  camp_center_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  start_datetime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_datetime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  total_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total_nights: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Başvuru sahibinin isteğe bağlı eklediği program akışı dosyası
  program_file_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  program_file_path: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  program_file_mime: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  program_file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    // PENDING: kamp merkezi incelemesinde, FORWARDED: genel merkeze yönlendirildi,
    // HQ_APPROVED: genel merkez onayladı, kamp merkezinin son onayı bekleniyor
    type: DataTypes.ENUM('PENDING', 'FORWARDED', 'HQ_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'),
    defaultValue: 'PENDING'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejection_stage: {
    type: DataTypes.ENUM('CENTER', 'HQ'),
    allowNull: true
  },
  center_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  forwarded_by_admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  forwarded_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  hq_reviewed_by_admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  hq_reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  document_upload_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewed_by_admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  participant_file_status: {
    type: DataTypes.ENUM('NOT_UPLOADED', 'UPLOADED', 'VALIDATED', 'ERROR'),
    defaultValue: 'NOT_UPLOADED'
  },
  commitment_status: {
    type: DataTypes.ENUM('NOT_UPLOADED', 'UPLOADED', 'APPROVED', 'REJECTED'),
    defaultValue: 'NOT_UPLOADED'
  },
  // Veli muvafakatnamesi istenir mi — talep oluşturulurken belirlenir
  // (ilkokul / ortaokul / lise veya "diğer" + 18 yaş altı katılımcı var)
  requires_parental_consent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  // Katılımcı listesindeki 18 yaş altı kişi sayısı (doğum tarihinden, liste
  // her yüklendiğinde güncellenir). >0 ise muvafakatname de istenir.
  minor_participant_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  consent_status: {
    type: DataTypes.ENUM('NOT_UPLOADED', 'UPLOADED', 'APPROVED', 'REJECTED'),
    defaultValue: 'NOT_UPLOADED'
  },
  consent_rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'reservations',
  timestamps: true,
  underscored: true
});

module.exports = Reservation;
