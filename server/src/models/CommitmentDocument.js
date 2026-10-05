const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommitmentDocument = sequelize.define('CommitmentDocument', {
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
  status: {
    type: DataTypes.ENUM('NOT_UPLOADED', 'UPLOADED', 'APPROVED', 'REJECTED'),
    defaultValue: 'UPLOADED'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  reviewed_by_admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'commitment_documents',
  timestamps: true,
  underscored: true
});

module.exports = CommitmentDocument;
