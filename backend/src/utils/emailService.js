import nodemailer from 'nodemailer';
import logger from './logger.js';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  SMTP_FROM,
} = process.env;

let transporter;

const ensureTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    logger.warn('SMTP configuration missing. Falling back to console logs for email delivery.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  return transporter;
};

export const sendOtpEmail = async ({ to, code, name, expiresInMinutes }) => {
  const subject = 'Your One-Time Password (OTP)';
  const text = `Hi ${name || 'there'},\n\n` +
    `Use the following one-time password to proceed: ${code}.\n` +
    `It will expire in ${expiresInMinutes} minutes.\n\n` +
    'If you did not request this code, you can ignore this email.\n\n' +
    'Regards,\nHRIS Support Team';

  const html = `
    <p>Hi ${name || 'there'},</p>
    <p>Use the following one-time password to proceed:</p>
    <p style="font-size:20px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p>If you did not request this code, you can ignore this email.</p>
    <p>Regards,<br/>HRIS Support Team</p>
  `;

  const mailOptions = {
    from: SMTP_FROM || SMTP_USER || 'no-reply@example.com',
    to,
    subject,
    text,
    html,
  };

  const activeTransporter = ensureTransporter();

  if (!activeTransporter) {
    logger.info('Email not sent (no SMTP config). Payload:', { to, subject, code });
    return;
  }

  try {
    await activeTransporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${to}`);
  } catch (error) {
    logger.error('Failed to send OTP email', error);
    throw error;
  }
};

export default {
  sendOtpEmail,
};
