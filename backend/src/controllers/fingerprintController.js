import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import axios from 'axios';

/**
 * Start fingerprint enrollment mode
 * This endpoint signals the Arduino to enter enrollment mode
 */
export const startEnrollment = async (req, res, next) => {
  try {
    const { employee_id, fingerprint_id } = req.body;

    if (!employee_id || !fingerprint_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Fingerprint ID are required',
      });
    }

    // Check if employee exists
    const employee = await db.getOne(
      'SELECT employee_id, first_name, last_name FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Check if fingerprint_id is already in use
    const existing = await db.getOne(
      'SELECT employee_id, first_name, last_name FROM employees WHERE fingerprint_id = ? AND employee_id != ?',
      [fingerprint_id, employee_id]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Fingerprint ID ${fingerprint_id} is already assigned to ${existing.first_name} ${existing.last_name}`,
      });
    }

    logger.info(`Starting fingerprint enrollment for employee ${employee_id} with fingerprint ID ${fingerprint_id}`);

    // Send enrollment command to bridge service
    try {
      const bridgeUrl = process.env.BRIDGE_URL || 'http://localhost:3001';
      await axios.post(`${bridgeUrl}/enroll/start`, {
        fingerprint_id: fingerprint_id,
      });
      
      logger.info('Enrollment command sent to Arduino bridge');
    } catch (bridgeError) {
      logger.error('Failed to communicate with bridge service:', bridgeError.message);
      return res.status(503).json({
        success: false,
        message: 'Bridge service not available. Make sure fingerprint bridge is running.',
      });
    }

    const actingUserId = req.user?.user_id;
    const auditUserId = actingUserId || 1;

    try {
      await db.insert('activity_logs', {
        user_id: auditUserId,
        action: 'CREATE',
        module: 'fingerprints',
        description: `Initialized fingerprint enrollment for employee ${employee.first_name} ${employee.last_name} (ID: ${employee_id}) using fingerprint ID ${fingerprint_id}`,
        created_by: auditUserId,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Ready for fingerprint enrollment',
      data: {
        employee_id,
        fingerprint_id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        status: 'ready',
      },
    });
  } catch (error) {
    logger.error('Start enrollment error:', error);
    next(error);
  }
};

export const deleteFingerprintById = async (req, res, next) => {
  try {
    const { fingerprint_id } = req.body;

    if (!fingerprint_id || Number.isNaN(Number(fingerprint_id))) {
      return res.status(400).json({
        success: false,
        message: 'Valid fingerprint ID is required',
      });
    }

    const bridgeUrl = process.env.BRIDGE_URL || 'http://localhost:3001';

    try {
      await axios.post(`${bridgeUrl}/fingerprint/delete`, {
        fingerprint_id,
      });
    } catch (bridgeError) {
      logger.error('Failed to communicate with bridge service:', bridgeError.message);
      return res.status(503).json({
        success: false,
        message: 'Bridge service not available. Make sure fingerprint bridge is running.',
      });
    }

    res.json({
      success: true,
      message: `Delete command sent for fingerprint ID ${fingerprint_id}`,
    });
  } catch (error) {
    logger.error('Delete fingerprint error:', error);
    next(error);
  }
};

/**
 * Confirm fingerprint enrollment
 * Called after Arduino successfully enrolls the fingerprint
 */
export const confirmEnrollment = async (req, res, next) => {
  try {
    const { employee_id, fingerprint_id } = req.body;

    if (!employee_id || !fingerprint_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Fingerprint ID are required',
      });
    }

    // Check if employee exists
    const employee = await db.getOne(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Update employee with fingerprint_id
    const updatedBy = req.user?.user_id || employee_id;
    await db.update(
      'employees',
      { fingerprint_id, updated_by: updatedBy },
      'employee_id = ?',
      [employee_id]
    );

    logger.info(`Fingerprint enrollment confirmed for employee ${employee_id} with fingerprint ID ${fingerprint_id}`);

    // Create activity log
    try {
      await db.insert('activity_logs', {
        user_id: updatedBy,
        action: 'UPDATE',
        module: 'employees',
        description: `Fingerprint enrolled for employee ID ${employee_id} (Fingerprint ID: ${fingerprint_id})`,
        created_by: updatedBy,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Fingerprint enrollment confirmed',
      data: {
        employee_id,
        fingerprint_id,
      },
    });
  } catch (error) {
    logger.error('Confirm enrollment error:', error);
    next(error);
  }
};

/**
 * Get next available fingerprint ID
 */
export const getNextFingerprintId = async (req, res, next) => {
  try {
    // Get the last registered fingerprint_id (most recently updated employee with fingerprint)
    const result = await db.getOne(
      'SELECT fingerprint_id FROM employees WHERE fingerprint_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
    );

    const nextId = (result?.fingerprint_id || 0) + 1;

    res.json({
      success: true,
      data: {
        next_fingerprint_id: nextId,
      },
    });
  } catch (error) {
    logger.error('Get next fingerprint ID error:', error);
    next(error);
  }
};

/**
 * Check if fingerprint ID is available
 */
export const checkFingerprintId = async (req, res, next) => {
  try {
    const { fingerprint_id } = req.params;

    if (!fingerprint_id) {
      return res.status(400).json({
        success: false,
        message: 'Fingerprint ID is required',
      });
    }

    const existing = await db.getOne(
      'SELECT employee_id, first_name, last_name FROM employees WHERE fingerprint_id = ?',
      [fingerprint_id]
    );

    if (existing) {
      return res.json({
        success: true,
        available: false,
        message: `Fingerprint ID ${fingerprint_id} is already assigned to ${existing.first_name} ${existing.last_name}`,
        data: {
          employee_id: existing.employee_id,
          employee_name: `${existing.first_name} ${existing.last_name}`,
        },
      });
    }

    res.json({
      success: true,
      available: true,
      message: `Fingerprint ID ${fingerprint_id} is available`,
    });
  } catch (error) {
    logger.error('Check fingerprint ID error:', error);
    next(error);
  }
};

export default {
  startEnrollment,
  confirmEnrollment,
  getNextFingerprintId,
  checkFingerprintId,
  deleteFingerprintById,
};
