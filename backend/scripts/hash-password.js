#!/usr/bin/env node

/**
 * Password Hashing Script
 * 
 * Usage:
 *   node scripts/hash-password.js myPassword123
 */

import bcryptjs from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('❌ Please provide a password to hash');
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

async function hashPassword() {
  try {
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    console.log('');
    console.log('✅ Hashed password:');
    console.log(hashedPassword);
    console.log('');
    console.log('Use this in your SQL INSERT statement:');
    console.log(`INSERT INTO users (username, password, role) VALUES ('username', '${hashedPassword}', 'admin');`);
    console.log('');
  } catch (error) {
    console.error('❌ Error hashing password:', error.message);
    process.exit(1);
  }
}

hashPassword();

