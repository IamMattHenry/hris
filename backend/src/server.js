import dotenv from 'dotenv';
import app from './app.js';
import { testConnection } from './config/db.js';
import logger from './utils/logger.js';
import { revertExpiredLeaves } from './controllers/leaveController.js';

// Load environment variables
dotenv.config();

// Set timezone to Philippine time (UTC+8)
process.env.TZ = 'Asia/Manila';

const PORT = process.env.PORT || 5000;

// Handle ECONN error
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET') {
    logger.warn('A client closed the connection unexpectedly.');
  } else {
    logger.error('Uncaught Exception:', err);
  }
});

process.on('unhandledRejection', (err) => {
  if (err.code === 'ECONNRESET') {
    logger.warn('Client disconnected before the server responded.');
  } else {
    logger.error('Unhandled Promise Rejection:', err);
  }
});

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

    // Run revert job once at startup and schedule daily
    try {
      await revertExpiredLeaves();
    } catch (err) {
      logger.error('Error running initial revertExpiredLeaves job:', err);
    }

    const intervalMs = Number(process.env.REVERT_LEAVES_INTERVAL_MS) || 24 * 60 * 60 * 1000; // default 24h
    setInterval(() => {
      revertExpiredLeaves().catch((err) => logger.error('Scheduled revertExpiredLeaves error:', err));
    }, intervalMs);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();