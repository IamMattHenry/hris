import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import * as db from '../config/db.js';

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
      logger.warn('Role verification failed: User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied: User ${req.user.username} (ID: ${req.user.user_id}) with role '${req.user.role}' attempted to access endpoint requiring roles: [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. This action requires admin privileges.',
      });
    }

    logger.debug(`Access granted: User ${req.user.username} with role '${req.user.role}'`);
    next();
  };
};

export const verifyAccess = ({ roles = [], subRoles = [], departments = [] }) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = req.user; // user from JWT

    // Check role
    if (roles.length > 0 && !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Role not permitted.",
      });
    }

    // Load sub-role from user_roles table
    const userSubrole = await db.getOne(
      `SELECT sub_role FROM user_roles WHERE user_id = ?`,
      [user.user_id]
    );

    const it = userSubrole?.sub_role || null;

    if (subRoles.length > 0 && !subRoles.includes(it)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Sub-role not permitted.",
        sub_role: it,
        user: user,
      });
    }

    // Load department through employees table
    const userDept = await db.getOne(
      `SELECT department_id FROM employees WHERE user_id = ?`,
      [user.user_id]
    );

    const userDepartment = userDept?.department_id || null;

    if (departments.length > 0 && !departments.includes(userDepartment)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Not allowed for this department.",
        department: userDepartment,
        user: user,
      });
    }

    next();
  };
};


export default { verifyToken, verifyRole, verifyAccess };

