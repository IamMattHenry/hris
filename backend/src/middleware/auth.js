import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const verifyToken = (req, res, next) => {
  try {
    // Log the authorization header for debugging
    logger.debug('Authorization header:', req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('No authorization header provided');
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided',
      });
    }

    // Check if it starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Invalid authorization header format. Expected: Bearer <token>');
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      logger.warn('No token found after Bearer prefix');
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    logger.debug('Token received, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug('Token verified successfully for user:', decoded.username);

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.user_id} with role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    // Checks if the user's role is admin or an employee
    if (req.user.role !== 'admin') {
      logger.warn(`User: ${req.user.username} is not an admin`);

      return res.status(401).json({
        success: false,
        message: 'Unauthorized access',
      })
    }

    next();
  };
};

export default { verifyToken, verifyRole };

