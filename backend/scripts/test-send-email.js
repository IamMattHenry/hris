#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import emailService from '../src/utils/emailService.js';

(async () => {
  try {
    const to = process.env.SMTP_TEST_TO || 'no-reply@example.com';
    await emailService.sendAccountCreatedEmail({
      to,
      name: 'Matt Henry Buenaventura',
      username: 'itadmin',
      password: process.env.SMTP_TEST_PASSWORD || 'TempPass123!',
      loginUrl: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/login_hr',
    });
    console.log('Email test completed (check logs for delivery status)');
    process.exit(0);
  } catch (err) {
    console.error('Email test failed:', err);
    process.exit(1);
  }
})();
