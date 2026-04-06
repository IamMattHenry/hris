import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

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
import rbacRoutes from './routes/rbac.js';
import payrollRoutes from './routes/payroll.js';
import penaltyRoutes from './routes/penalties.js';

dotenv.config();

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(compression());

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

app.get('/', (req, res) => {
	res.json({
		success: true,
		message: 'HRIS backend is running',
		timestamp: new Date().toISOString(),
	});
});


app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

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
app.use('/api/rbac', rbacRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/penalties', penaltyRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;

