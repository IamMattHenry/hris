import bcryptjs from 'bcryptjs';
import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import {
  findUserByIdentifier,
  createAndSendOtp,
  verifyOtpCode,
  resolveResetToken,
  consumeResetToken,
} from '../services/passwordRecoveryService.js';

const genericSuccessMessage = 'An OTP will be sent if the account exists.';

export const requestPasswordOtp = async (req, res, next) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identifier (username or email) is required.',
      });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      logger.info(`Password OTP requested for non-existent identifier: ${identifier}`);
      return res.json({ success: true, message: genericSuccessMessage });
    }

    await createAndSendOtp(user);

    res.json({
      success: true,
      message: genericSuccessMessage,
    });
  } catch (error) {
    logger.error('requestPasswordOtp error:', error);
    next(error);
  }
};

export const verifyPasswordOtp = async (req, res, next) => {
  try {
    const { identifier, code } = req.body;

    if (!identifier || !identifier.trim() || !code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and code are required.',
      });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      logger.info(`OTP verification attempted for non-existent identifier: ${identifier}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid code. Please try again.',
      });
    }

    const result = await verifyOtpCode(user, code.trim());

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: {
        reset_token: result.token,
      },
    });
  } catch (error) {
    logger.error('verifyPasswordOtp error:', error);
    next(error);
  }
};

export const resetPasswordWithToken = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !token.trim() || !password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const resolution = await resolveResetToken(token.trim());

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used token.',
      });
    }

    if (resolution.expired) {
      return res.status(400).json({
        success: false,
        message: 'Token has expired. Please request a new OTP.',
      });
    }

    const tokenRecord = resolution.token;

    const hashedPassword = await bcryptjs.hash(password.trim(), 10);

    await db.update(
      'users',
      { password: hashedPassword },
      'user_id = ?',
      [tokenRecord.user_id]
    );

    await consumeResetToken(tokenRecord.token_id);

    try {
      await db.insert('activity_logs', {
        user_id: tokenRecord.user_id,
        action: 'UPDATE',
        module: 'auth',
        description: 'Password reset via OTP',
        created_by: tokenRecord.user_id,
      });
    } catch (logError) {
      logger.error('Failed to log password reset activity:', logError);
    }

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    logger.error('resetPasswordWithToken error:', error);
    next(error);
  }
};

export default {
  requestPasswordOtp,
  verifyPasswordOtp,
  resetPasswordWithToken,
};
