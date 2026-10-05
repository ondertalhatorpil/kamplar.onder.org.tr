const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ParticipantFile = sequelize.define('ParticipantFile', {
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
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  validation_status: {
    type: DataTypes.ENUM('PENDING', 'VALID', 'INVALID'),
    defaultValue: 'PENDING'
  },
  validation_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'participant_files',
  timestamps: true,
  underscored: true
});

module.exports = ParticipantFile;
