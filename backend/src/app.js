import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import positionRoutes from './routes/positions.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import activityRoutes from './routes/activity.js';
import ticketRoutes from './routes/tickets.js';
import fingerprintRoutes from './routes/fingerprint.js';
import passwordRecoveryRoutes from './routes/passwordRecovery.js';

dotenv.config();

const app = express();

// ============ MIDDLEWARE ============

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// ============ ROUTES ============

// Simple root route so Render root URL shows a friendly message
app.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'HRIS backend is running',
		timestamp: new Date().toISOString(),
	});
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/fingerprint', fingerprintRoutes);
app.use('/api/password', passwordRecoveryRoutes);

// ============ ERROR HANDLING ============

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;

