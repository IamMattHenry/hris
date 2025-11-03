const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configure Sequelize to store dates as UTC without timezone conversion
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  timezone: '+00:00', // Set to UTC
  dialectOptions: {
    useUTC: true, // Use UTC for dates
    dateStrings: true,
    typeCast: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;