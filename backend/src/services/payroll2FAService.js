import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

const TWOFA_EXPIRY_MINUTES = 5; // 2FA codes expire after 5 minutes
const MAX_ATTEMPTS = 3;

/**
 * Create a 2FA session for payroll actions
 * @param {number} userId - The user ID
 * @param {string} actionType - 'payroll_create' or 'payroll_finalize'
 * @param {number} actionReferenceId - ID of the payroll run or related resource
 * @param {string} preferredMethod - 'fingerprint', 'qr', 'password'
 * @param {string} ipAddress - User's IP address
 * @returns {Promise<Object>} Session with temporary verification code
 */
export const initiate2FASession = async (
  userId,
  actionType,
  actionReferenceId = null,
  preferredMethod = 'fingerprint',
  ipAddress = null
) => {
  const verificationCode = crypto.randomBytes(32).toString('hex');
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TWOFA_EXPIRY_MINUTES);

  try {
    const insertResult = await db.insert('payroll_2fa_sessions', {
      user_id: userId,
      action_type: actionType,
      action_reference_id: actionReferenceId,
      verification_code: verificationCode,
      verification_method: preferredMethod,
      is_verified: 0,
      expires_at: expiresAt,
      ip_address: ipAddress,
    });

    return {
      sessionId: insertResult,
      userMessage: `2FA verification required for payroll ${actionType === 'payroll_create' ? 'creation' : 'finalization'}. Please complete verification using ${preferredMethod}.`,
      expiresIn: TWOFA_EXPIRY_MINUTES * 60, // seconds
      method: preferredMethod,
    };
  } catch (error) {
    logger.error('Failed to initiate 2FA session:', error);
    throw new Error('Failed to create 2FA verification session');
  }
};

/**
 * Verify the 2FA code for a session
 * @param {number} sessionId - The session ID
 * @param {string} verificationCode - The code to verify
 * @param {string} method - The verification method used
 * @returns {Promise<Object>} Verification result
 */
export const verify2FASession = async (sessionId, verificationCode, method = 'fingerprint') => {
  try {
    const session = await db.getOne(
      `SELECT * FROM payroll_2fa_sessions 
       WHERE id = ? 
       AND is_verified = 0 
       AND expires_at > NOW()`,
      [sessionId]
    );

    if (!session) {
      return {
        success: false,
        message: '2FA session not found, expired, or already verified',
      };
    }

    // Verify the code
    let isValid = false;

    if (method === 'password') {
      const user = await db.getOne('SELECT password FROM users WHERE user_id = ?', [session.user_id]);
      if (user && user.password) {
        isValid = await bcryptjs.compare(verificationCode, user.password);
      }
    } else if (method === 'fingerprint') {
      const employee = await db.getOne('SELECT fingerprint_id FROM employees WHERE user_id = ?', [session.user_id]);
      if (employee && employee.fingerprint_id !== null) {
        isValid = String(employee.fingerprint_id) === String(verificationCode);
      }
    } else if (method === 'qr') {
      try {
        const qrData = JSON.parse(verificationCode);
        const employee = await db.getOne('SELECT employee_id FROM employees WHERE user_id = ?', [session.user_id]);
        if (employee && employee.employee_id !== null) {
          isValid = String(employee.employee_id) === String(qrData.employee_id);
        }
      } catch (e) {
        isValid = false;
      }
    } else {
      isValid = verificationCode === session.verification_code;
    }

    if (!isValid) {
      // Log failed attempt
      const attemptCount = await db.getOne(
        `SELECT COUNT(*) AS count FROM payroll_2fa_sessions 
         WHERE id = ? AND attempted_at IS NOT NULL`,
        [sessionId]
      );

      if ((attemptCount?.count || 0) >= MAX_ATTEMPTS) {
        await db.update('payroll_2fa_sessions', {
          is_verified: 0,
        }, 'id = ?', [sessionId]);
        
        return {
          success: false,
          message: `Too many failed attempts. Session expired.`,
          locked: true,
        };
      }

      return {
        success: false,
        message: 'Invalid verification code',
        attemptsRemaining: MAX_ATTEMPTS - (attemptCount?.count || 0) - 1,
      };
    }

    // Mark as verified
    await db.update('payroll_2fa_sessions', {
      is_verified: 1,
      verification_method: method,
      verified_at: new Date(),
      attempted_at: new Date(),
    }, 'id = ?', [sessionId]);

    return {
      success: true,
      message: '2FA verified successfully',
      sessionId,
      userId: session.user_id,
      actionType: session.action_type,
      actionReferenceId: session.action_reference_id,
    };
  } catch (error) {
    logger.error('2FA verification error:', error);
    throw new Error('2FA verification failed');
  }
};

/**
 * Validate that a 2FA session is verified for an action
 * @param {number} sessionId - The session ID
 * @param {number} userId - The user ID (for verification)
 * @param {string} actionType - The expected action type
 * @returns {Promise<boolean>} Whether the session is valid and verified
 */
export const validate2FASession = async (sessionId, userId, actionType) => {
  try {
    const session = await db.getOne(
      `SELECT * FROM payroll_2fa_sessions 
       WHERE id = ? 
       AND user_id = ? 
       AND action_type = ? 
       AND is_verified = 1 
       AND expires_at > NOW()`,
      [sessionId, userId, actionType]
    );

    return !!session;
  } catch (error) {
    logger.error('2FA session validation error:', error);
    return false;
  }
};

/**
 * Log a payroll operator action with 2FA info
 * @param {number} runId - Payroll run ID
 * @param {number} userId - User ID of operator
 * @param {string} action - 'create' or 'finalize'
 * @param {string} twoFAMethod - The 2FA method used
 * @param {string} ipAddress - IP address
 */
export const logPayrollOperatorAction = async (
  runId,
  userId,
  action,
  twoFAMethod = null,
  ipAddress = null,
  userAgent = null
) => {
  try {
    await db.insert('payroll_operator_logs', {
      run_id: runId,
      operator_user_id: userId,
      action,
      twofa_method: twoFAMethod,
      twofa_verified_at: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    logger.error('Failed to log payroll operator action:', error);
    // Don't throw - logging failure shouldn't block the operation
  }
};

/**
 * Get operator audit trail for a payroll run
 * @param {number} runId - Payroll run ID
 * @returns {Promise<Array>} Array of operator actions
 */
export const getPayrollOperatorAuditTrail = async (runId) => {
  try {
    return await db.getAll(
      `SELECT 
         pol.operator_user_id,
         u.username,
         u.first_name,
         u.last_name,
         pol.action,
         pol.twofa_method,
         pol.twofa_verified_at,
         pol.ip_address,
         pol.logged_at
       FROM payroll_operator_logs pol
       LEFT JOIN users u ON u.user_id = pol.operator_user_id
       WHERE pol.run_id = ?
       ORDER BY pol.logged_at DESC`,
      [runId]
    );
  } catch (error) {
    logger.error('Failed to retrieve operator audit trail:', error);
    return [];
  }
};

/**
 * Clean up expired 2FA sessions
 * @returns {Promise<number>} Number of sessions deleted
 */
export const cleanupExpired2FASessions = async () => {
  try {
    const result = await db.delete(
      'payroll_2fa_sessions',
      'expires_at < NOW() OR (is_verified = 0 AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))'
    );
    return result?.affectedRows || 0;
  } catch (error) {
    logger.error('Failed to cleanup 2FA sessions:', error);
    return 0;
  }
};

export default {
  initiate2FASession,
  verify2FASession,
  validate2FASession,
  logPayrollOperatorAction,
  getPayrollOperatorAuditTrail,
  cleanupExpired2FASessions,
};
