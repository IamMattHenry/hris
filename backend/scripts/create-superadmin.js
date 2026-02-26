#!/usr/bin/env node

/**
 * Create Superadmin Script
 *
 * Usage:
 *   node scripts/create-superadmin.js --username superadmin --password S3cureP@ss
 */

import bcryptjs from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env explicitly so running the script from the repo root works
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Parse args (supports --key value and presence flag --diagnose)
const rawArgs = process.argv.slice(2);
const params = {};
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (!a.startsWith('--')) continue;
  const key = a.replace(/^--/, '');
  const next = rawArgs[i + 1];
  if (next && !next.startsWith('--')) {
    params[key] = next;
    i++;
  } else {
    params[key] = true; // boolean flag
  }
}

// Allow DB overrides via CLI
const dbHost = params['db-host'] || process.env.DB_HOST;
const dbPort = params['db-port'] || process.env.DB_PORT;
const dbUser = params['db-user'] || process.env.DB_USER;
const dbPassword = params['db-password'] || process.env.DB_PASSWORD;
const dbName = params['db-name'] || process.env.DB_NAME;

// Diagnose flag detection
const doDiagnose = !!params.diagnose || params['diagnose'] === 'true';

if (!params.username || !params.password) {
  console.error('❌ Missing required parameters');
  console.error('Usage: node scripts/create-superadmin.js --username <username> --password <password>');
  process.exit(1);
}

async function run() {
  let connection;
  try {
    // Validate DB connection params
    const missing = [];
    if (!dbHost) missing.push('DB_HOST');
    if (!dbUser) missing.push('DB_USER');
    if (!dbPassword) missing.push('DB_PASSWORD');
    if (!dbName) missing.push('DB_NAME');
    if (missing.length > 0) {
      throw new Error(`Missing DB connection parameters: ${missing.join(', ')}`);
    }

    // If user asked for diagnose, perform TCP check and exit
    if (doDiagnose) {
      const dns = await import('dns');
      const net = await import('net');
      console.log(`🔎 Diagnosing connectivity to ${dbHost}:${dbPort || 3306} ...`);
      try {
        const lookup = await new Promise((resolve, reject) => {
          dns.lookup(dbHost, (err, address) => {
            if (err) return reject(err);
            resolve(address);
          });
        });
        console.log(`Resolved ${dbHost} -> ${lookup}`);
      } catch (e) {
        console.error('DNS lookup failed:', e.message);
      }

      // TCP connect test
      await new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 5000;
        let handled = false;
        socket.setTimeout(timeout);
        socket.on('connect', () => {
          handled = true;
          console.log('✅ TCP connection successful');
          socket.destroy();
          resolve();
        });
        socket.on('timeout', () => {
          if (handled) return;
          handled = true;
          console.error(`⏱️ TCP connect timeout after ${timeout}ms`);
          socket.destroy();
          resolve();
        });
        socket.on('error', (err) => {
          if (handled) return;
          handled = true;
          console.error('❌ TCP connection error:', err.message);
          resolve();
        });
        socket.connect(Number(dbPort || 3306), dbHost);
      });

      console.log('Done diagnosing. If TCP failed, check firewall, DB bind-address, or run script from the DB network.');
      process.exit(0);
    }

    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort ? Number(dbPort) : undefined,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      connectTimeout: 10000,
    });

    console.log('✅ Connected to database');

    // Check existing
    const [existing] = await connection.execute('SELECT user_id FROM users WHERE username = ?', [params.username]);
    if (existing.length > 0) {
      console.error(`❌ User "${params.username}" already exists`);
      await connection.end();
      process.exit(1);
    }

    console.log('🔐 Hashing password...');
    const hashed = await bcryptjs.hash(params.password, 10);

    console.log(`👤 Creating superadmin user "${params.username}"...`);
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [params.username, hashed, 'superadmin']
    );

    console.log(`✅ Superadmin created with ID: ${result.insertId}`);
    console.log('Login credentials:');
    console.log(`  Username: ${params.username}`);
    console.log(`  Password: ${params.password}`);
    console.log('Use the application login endpoint to authenticate.');

    await connection.end();
  } catch (err) {
    console.error('❌ Error creating superadmin:', err.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

run();
