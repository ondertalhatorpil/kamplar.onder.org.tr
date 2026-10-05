const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 18 yaş altı gruplarda velilerin imzaladığı muvafakatnameler. Bir rezervasyon
// için birden fazla dosya yüklenebilir (her öğrenci için ayrı form veya toplu tarama).
const ParentalConsentDocument = sequelize.define('ParentalConsentDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  original_file_name: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  stored_file_name: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'parental_consent_documents',
  timestamps: true,
  underscored: true
});

module.exports = ParentalConsentDocument;
