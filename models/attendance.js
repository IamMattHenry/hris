const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./employee');

const Attendance = sequelize.define('attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Employee,
      key: 'employee_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time_in: {
    type: DataTypes.DATE,
    allowNull: true
  },
  time_out: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'attendance',
  timestamps: true,
  underscored: true
});

Attendance.belongsTo(Employee, { 
  foreignKey: 'employee_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

module.exports = Attendance;