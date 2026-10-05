const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Participant = sequelize.define('Participant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  participant_file_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  row_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  tc_no: {
    type: DataTypes.STRING(11),
    allowNull: true
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  guardian_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  tableName: 'participants',
  timestamps: true,
  underscored: true
});

module.exports = Participant;
