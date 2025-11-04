import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/db.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

// Set timezone to Philippine time (UTC+8)
process.env.TZ = 'Asia/Manila';

const PORT = process.env.PORT || 5000;

// Test database connection and start server
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Server not started.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();