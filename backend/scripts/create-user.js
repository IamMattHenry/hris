#!/usr/bin/env node

/**
 * User Creation Script
 * 
 * Usage:
 *   node scripts/create-user.js --username admin --password admin123 --role admin
 *   node scripts/create-user.js --username john --password john123 --role employee --first-name John --last-name Doe --position-id 3
 */

import bcryptjs from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  params[key] = value;
}

// Validate required parameters
if (!params.username || !params.password || !params.role) {
  console.error('❌ Missing required parameters');
  console.error('Usage: node scripts/create-user.js --username <username> --password <password> --role <admin|employee>');
  console.error('');
  console.error('Optional parameters for employees:');
  console.error('  --first-name <name>');
  console.error('  --last-name <name>');
  console.error('  --position-id <id>');
  console.error('  --hire-date <YYYY-MM-DD>');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/create-user.js --username admin --password admin123 --role admin');
  console.error('  node scripts/create-user.js --username john --password john123 --role employee --first-name John --last-name Doe --position-id 3');
  process.exit(1);
}

// Validate role
if (!['admin', 'employee'].includes(params.role)) {
  console.error('❌ Invalid role. Must be "admin" or "employee"');
  process.exit(1);
}

async function createUser() {
  let connection;
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database');

    // Check if user already exists
    const [existingUser] = await connection.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [params.username]
    );

    if (existingUser.length > 0) {
      console.error(`❌ User "${params.username}" already exists`);
      await connection.end();
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcryptjs.hash(params.password, 10);

    // Insert user
    console.log(`👤 Creating ${params.role} user "${params.username}"...`);
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [params.username, hashedPassword, params.role]
    );

    const userId = result.insertId;
    console.log(`✅ User created with ID: ${userId}`);

    // If employee, create employee record
    if (params.role === 'employee') {
      const firstName = params['first-name'] || 'First';
      const lastName = params['last-name'] || 'Last';
      const positionId = params['position-id'] || null;
      const hireDate = params['hire-date'] || new Date().toISOString().split('T')[0];

      console.log(`👨‍💼 Creating employee record...`);
      const [empResult] = await connection.execute(
        'INSERT INTO employees (user_id, first_name, last_name, position_id, hire_date, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, firstName, lastName, positionId, hireDate, 'active']
      );

      console.log(`✅ Employee record created with ID: ${empResult.insertId}`);
    }

    console.log('');
    console.log('✨ User created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Username: ${params.username}`);
    console.log(`  Password: ${params.password}`);
    console.log(`  Role: ${params.role}`);
    console.log('');
    console.log('Test login:');
    console.log(`  curl -X POST http://localhost:5000/api/auth/login \\`);
    console.log(`    -H "Content-Type: application/json" \\`);
    console.log(`    -d '{"username":"${params.username}","password":"${params.password}"}'`);
    console.log('');

    await connection.end();
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

createUser();

