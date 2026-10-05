const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReservationMeal = sequelize.define('ReservationMeal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  meal_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  breakfast_selected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dinner_selected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'reservation_meals',
  timestamps: true,
  underscored: true
});

module.exports = ReservationMeal;
