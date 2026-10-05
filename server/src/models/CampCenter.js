const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CampCenter = sequelize.define('CampCenter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  has_breakfast: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  has_dinner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  breakfast_start_time: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  breakfast_end_time: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  dinner_start_time: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  dinner_end_time: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'camp_centers',
  timestamps: true,
  underscored: true
});

module.exports = CampCenter;
