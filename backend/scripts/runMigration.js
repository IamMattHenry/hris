#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Safely executes SQL migrations from the migrations/ directory.
 * - Reads migration file
 * - Validates SQL syntax (basic check)
 * - Establishes database connection
 * - Executes migration in a transaction
 * - Rolls back on error
 * - Reports success/failure
 * 
 * Usage:
 *   node scripts/runMigration.js <migration-name>
 *   Example: node scripts/runMigration.js 002_rbac_tables.sql
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg.toString()}`),
};

/**
 * Validate SQL content (basic checks)
 */
function validateSQL(sql) {
  const errors = [];

  if (!sql || sql.trim().length === 0) {
    errors.push('SQL file is empty');
    return errors;
  }

  // Check for common SQL keywords (basic sanity check)
  const hasValidKeywords = /\b(CREATE|INSERT|UPDATE|DELETE|ALTER|DROP|SELECT)\b/i.test(sql);
  if (!hasValidKeywords) {
    errors.push('SQL does not contain any valid SQL keywords');
  }

  // Check for matching parentheses and quotes
  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Mismatched parentheses: ${openParens} open, ${closeParens} close`);
  }

  // Warn about DROP statements (but don't block)
  if (/\bDROP\s+(TABLE|DATABASE)\b/i.test(sql)) {
    log.warn('Migration contains DROP statement — proceeding with caution');
  }

  return errors;
}

/**
 * Read migration file
 */
async function readMigrationFile(filename) {
  try {
    const migrationPath = path.join(__dirname, '../migrations', filename);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    return sql;
  } catch (error) {
    throw new Error(`Failed to read migration file: ${error.message}`);
  }
}

/**
 * Create database connection pool
 */
async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true, // Allow multiple SQL statements
      waitForConnections: true,
      connectionTimeout: 30000,
      keepAliveInitialDelayMs: 0,
    });

    return connection;
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

/**
 * Execute migration with transaction support
 */
async function executeMigration(connection, sql) {
  try {
    log.info('Starting transaction...');
    await connection.beginTransaction();

    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    let executedCount = 0;

    for (const statement of statements) {
      try {
        log.info(`Executing: ${statement.substring(0, 60)}...`);
        await connection.query(statement);
        executedCount++;
      } catch (error) {
        log.error(`Statement failed: ${error.message}`);
        throw error;
      }
    }

    log.info(`Committing transaction (${executedCount} statements)...`);
    await connection.commit();
    return executedCount;
  } catch (error) {
    try {
      log.warn('Rolling back transaction due to error...');
      await connection.rollback();
    } catch (rollbackError) {
      log.error(`Rollback failed: ${rollbackError.message}`);
    }
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    log.error('Usage: node scripts/runMigration.js <migration-file>');
    log.info('Example: node scripts/runMigration.js 002_rbac_tables.sql');
    process.exit(1);
  }

  console.log('═'.repeat(60));
  log.info(`Database Migration Runner v1.0`);
  console.log('═'.repeat(60));

  let connection;

  try {
    // Step 1: Read migration file
    log.info(`Reading migration file: ${migrationFile}`);
    const sql = await readMigrationFile(migrationFile);
    log.success(`Migration file loaded (${sql.length} bytes)`);

    // Step 2: Validate SQL
    log.info('Validating SQL syntax...');
    const validationErrors = validateSQL(sql);
    if (validationErrors.length > 0) {
      log.error('Validation failed:');
      validationErrors.forEach(err => log.error(`  - ${err}`));
      process.exit(1);
    }
    log.success('SQL validation passed');

    // Step 3: Connect to database
    log.info(`Connecting to database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection = await createConnection();
    log.success('Database connection established');

    // Step 4: Execute migration
    log.info('Executing migration...');
    const stmtCount = await executeMigration(connection, sql);
    log.success(`Migration completed successfully (${stmtCount} statements executed)`);

    console.log('═'.repeat(60));
    log.success('All done! Migration applied successfully.');
    console.log('═'.repeat(60));
    process.exit(0);
  } catch (error) {
    console.log('═'.repeat(60));
    log.error(`Migration failed: ${error.message}`);
    console.log('═'.repeat(60));
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        log.warn(`Error closing connection: ${err.message}`);
      }
    }
  }
}

// Run the migration
main();
