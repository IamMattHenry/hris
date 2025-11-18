import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { sendOtpEmail } from '../utils/emailService.js';

const OTP_PURPOSE_PASSWORD_RESET = 'password_reset';
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const RESET_TOKEN_TTL_MINUTES = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '30', 10);

let tablesInitialized = false;

const parseDbDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(' ', 'T');
    // Append Asia/Manila offset if none provided
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
      return new Date(`${normalized}+08:00`);
    }
    return new Date(normalized);
  }

  return new Date(value);
};

const ensureTables = async () => {
  if (tablesInitialized) {
    return;
  }

  const createOtpTableSql = `
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      otp_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      identifier VARCHAR(255) NOT NULL,
      purpose VARCHAR(50) NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      delivery_channel VARCHAR(50) DEFAULT 'email',
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      attempts INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_purpose (user_id, purpose),
      CONSTRAINT fk_password_reset_otps_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  const createResetTokenTableSql = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_token_user (user_id),
      CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  try {
    await db.query(createOtpTableSql);
    await db.query(createResetTokenTableSql);
    tablesInitialized = true;
  } catch (error) {
    logger.error('Failed to ensure password recovery tables exist', error);
    throw error;
  }
};

export const findUserByIdentifier = async (identifier) => {
  const value = identifier?.trim().toLowerCase();
  if (!value) {
    return null;
  }

  await ensureTables();

  const userByUsername = await db.getOne(
    `SELECT u.user_id, u.username, u.role,
            e.first_name, e.last_name,
            (SELECT email FROM employee_emails WHERE employee_id = e.employee_id ORDER BY email_id LIMIT 1) AS email
       FROM users u
       LEFT JOIN employees e ON u.user_id = e.user_id
      WHERE LOWER(u.username) = ?
      LIMIT 1`,
    [value]
  );

  if (userByUsername) {
    return {
      ...userByUsername,
      deliveryEmail: userByUsername.email,
    };
  }

  const userByEmail = await db.getOne(
    `SELECT u.user_id, u.username, u.role,
            e.first_name, e.last_name,
            ee.email AS email
       FROM employee_emails ee
       JOIN employees e ON ee.employee_id = e.employee_id
       JOIN users u ON e.user_id = u.user_id
      WHERE LOWER(ee.email) = ?
      ORDER BY ee.email_id
      LIMIT 1`,
    [value]
  );

  if (userByEmail) {
    return {
      ...userByEmail,
      deliveryEmail: userByEmail.email,
    };
  }

  return null;
};

const buildOtpRecord = (userId, identifier, purpose, codeHash) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  return {
    user_id: userId,
    identifier,
    purpose,
    code_hash: codeHash,
    expires_at: expiresAt,
    attempts: 0,
    delivery_channel: 'email',
  };
};

const generateNumericCode = () => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return String(random);
};

const getRecentActiveOtp = async (userId, purpose) => {
  return db.getOne(
    `SELECT * FROM password_reset_otps
      WHERE user_id = ?
        AND purpose = ?
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, purpose]
  );
};

export const createAndSendOtp = async (user, purpose = OTP_PURPOSE_PASSWORD_RESET) => {
  await ensureTables();

  if (!user?.user_id) {
    return;
  }

  const identifier = user.deliveryEmail || user.username;

  const recentOtp = await getRecentActiveOtp(user.user_id, purpose);
  if (recentOtp) {
    const createdAt = parseDbDate(recentOtp.created_at);
    const ageSeconds = (Date.now() - createdAt.getTime()) / 1000;
    if (ageSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      logger.info(`OTP resend cooldown active for user ${user.user_id}`);
      return;
    }
  }

  const code = generateNumericCode();
  const codeHash = await bcryptjs.hash(code, 10);

  await db.insert('password_reset_otps', buildOtpRecord(user.user_id, identifier, purpose, codeHash));

  if (user.deliveryEmail) {
    await sendOtpEmail({
      to: user.deliveryEmail,
      code,
      name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username,
      expiresInMinutes: OTP_TTL_MINUTES,
    });
  } else {
    logger.warn(`User ${user.user_id} has no email on file; OTP code generated but not delivered.`);
  }
};

export const verifyOtpCode = async (user, code, purpose = OTP_PURPOSE_PASSWORD_RESET) => {
  await ensureTables();

  const otpRecord = await getRecentActiveOtp(user.user_id, purpose);

  if (!otpRecord) {
    return { success: false, message: 'No active OTP found. Please request a new code.' };
  }

  const expiresAt = parseDbDate(otpRecord.expires_at);
  if (expiresAt && expiresAt < new Date()) {
    return { success: false, message: 'The code has expired. Please request a new one.' };
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    return { success: false, message: 'Maximum attempts exceeded. Please request a new code.' };
  }

  const isValid = await bcryptjs.compare(code, otpRecord.code_hash);

  if (!isValid) {
    await db.update(
      'password_reset_otps',
      { attempts: otpRecord.attempts + 1 },
      'otp_id = ?',
      [otpRecord.otp_id]
    );
    return { success: false, message: 'Invalid code. Please try again.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcryptjs.hash(resetToken, 10);
  const tokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await db.update(
    'password_reset_otps',
    { consumed_at: new Date(), attempts: otpRecord.attempts + 1 },
    'otp_id = ?',
    [otpRecord.otp_id]
  );

  await db.insert('password_reset_tokens', {
    user_id: user.user_id,
    token_hash: tokenHash,
    expires_at: tokenExpiresAt,
  });

  return { success: true, token: resetToken };
};

export const resolveResetToken = async (token) => {
  await ensureTables();

  if (!token) {
    return null;
  }

  const tokens = await db.getAll(
    `SELECT * FROM password_reset_tokens
      WHERE consumed_at IS NULL
      ORDER BY created_at DESC`
  );

  for (const record of tokens) {
    const isMatch = await bcryptjs.compare(token, record.token_hash);
    if (!isMatch) {
      continue;
    }

    const expiresAt = parseDbDate(record.expires_at);
    if (expiresAt && expiresAt < new Date()) {
      return { expired: true, token: record };
    }

    return { expired: false, token: record };
  }

  return null;
};

export const consumeResetToken = async (tokenId) => {
  await ensureTables();
  await db.update(
    'password_reset_tokens',
    { consumed_at: new Date() },
    'token_id = ?',
    [tokenId]
  );
};

export const PASSWORD_RESET_PURPOSE = OTP_PURPOSE_PASSWORD_RESET;
