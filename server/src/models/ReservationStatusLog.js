const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReservationStatusLog = sequelize.define('ReservationStatusLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  old_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  new_status: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  changed_by_admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'reservation_status_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = ReservationStatusLog;
