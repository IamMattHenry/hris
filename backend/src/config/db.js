import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'async_hooks';

dotenv.config();

console.log("ENV:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

const formatDateToManilaDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  const { year, month, day, hour, minute, second } = parts;
  if (!year || !month || !day || !hour || !minute || !second) {
    return null;
  }

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const sanitizeDataForWrite = (data = {}) => {
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value instanceof Date) {
      const formatted = formatDateToManilaDateTime(value);
      acc[key] = formatted;
    } else {
      acc[key] = value === undefined ? null : value;
    }
    return acc;
  }, {});
};

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  timezone: '+08:00',
  dateStrings: true,
});

// Test the database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute a query
export const query = async (sql, values = []) => {
  try {
    const [results] = await pool.execute(sql, values);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get a single row
export const getOne = async (sql, values = []) => {
  const results = await query(sql, values);
  return results.length > 0 ? results[0] : null;
};

// Get all rows
export const getAll = async (sql, values = []) => {
  return await query(sql, values);
};

// Insert a record with proper timezone handling
export const insert = async (table, data) => {
  // Filter out undefined values and convert them to null
  const cleanedData = sanitizeDataForWrite(data);

  const columns = Object.keys(cleanedData);
  const values = Object.values(cleanedData);
  const placeholders = columns.map(() => '?').join(', ');

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const result = await query(sql, values);
  return result.insertId;
};

// Update a record with proper timezone handling
export const update = async (table, data, whereClause, whereValues) => {
  // Filter out undefined values and convert them to null
  const cleanedData = sanitizeDataForWrite(data);

  const columns = Object.keys(cleanedData);
  const values = Object.values(cleanedData);
  const setClause = columns.map(col => `${col} = ?`).join(', ');

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const result = await query(sql, [...values, ...whereValues]);
  return result.affectedRows;
};

// Delete a record
export const deleteRecord = async (table, whereClause, whereValues) => {
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await query(sql, whereValues);
  return result.affectedRows;
};

// ========================================
// TRANSACTION SUPPORT
// ========================================

// Use AsyncLocalStorage for request-scoped transaction connections
const transactionStorage = new AsyncLocalStorage();

/**
 * Begin a database transaction
 * Gets a dedicated connection from the pool and starts a transaction
 */
export const beginTransaction = async () => {
  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    console.log('✅ Transaction started');

    // Store connection in AsyncLocalStorage for this request context
    transactionStorage.enterWith(connection);

    return connection;
  } catch (error) {
    console.error('❌ Failed to start transaction:', error);
    throw error;
  }
};

/**
 * Commit the current transaction
 * Commits all changes and releases the connection back to the pool
 */
export const commit = async () => {
  try {
    const connection = transactionStorage.getStore();

    // Check if there's an active transaction
    if (!connection) {
      console.warn('⚠️ No active transaction to commit');
      return;
    }

    // Check if connection has commit method
    if (typeof connection.commit !== 'function') {
      console.error('❌ Connection object does not have commit method:', connection);
      throw new Error('Invalid connection object - missing commit method');
    }

    await connection.commit();
    connection.release();

    // Clear the AsyncLocalStorage context
    transactionStorage.enterWith(null);

    console.log('✅ Transaction committed');
  } catch (error) {
    console.error('❌ Failed to commit transaction:', error);
    throw error;
  }
};

/**
 * Rollback the current transaction
 * Reverts all changes and releases the connection back to the pool
 */
export const rollback = async () => {
  try {
    const connection = transactionStorage.getStore();
    if (!connection) {
      console.warn('⚠️ No active transaction to rollback');
      return;
    }

    await connection.rollback();
    connection.release();

    // Clear the AsyncLocalStorage context
    transactionStorage.enterWith(null);

    console.log('✅ Transaction rolled back');
  } catch (error) {
    console.error('❌ Failed to rollback transaction:', error);
    // Don't throw error on rollback failure - just log it
    // This prevents masking the original error that caused the rollback
  }
};

/**
 * Execute a query within a transaction
 * If a transaction is active, uses the transaction connection
 * Otherwise, uses the pool
 */
export const transactionQuery = async (sql, values = []) => {
  try {
    const connection = transactionStorage.getStore();
    if (connection) {
      // Use transaction connection
      const [results] = await connection.execute(sql, values);
      return results;
    } else {
      // Use pool (no active transaction)
      return await query(sql, values);
    }
  } catch (error) {
    console.error('Transaction query error:', error);
    throw error;
  }
};

/**
 * Insert a record (transaction-aware)
 * Uses transaction connection if available, otherwise uses pool
 * Converts undefined values to null to prevent mysql2 errors
 */
export const transactionInsert = async (table, data) => {
  // Filter out undefined values and convert them to null
  const cleanedData = sanitizeDataForWrite(data);

  const columns = Object.keys(cleanedData);
  const values = Object.values(cleanedData);
  const placeholders = columns.map(() => '?').join(', ');

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const result = await transactionQuery(sql, values);
  return result.insertId;
};

/**
 * Update a record (transaction-aware)
 * Uses transaction connection if available, otherwise uses pool
 * Converts undefined values to null to prevent mysql2 errors
 */
export const transactionUpdate = async (table, data, whereClause, whereValues) => {
  // Filter out undefined values and convert them to null
  const cleanedData = sanitizeDataForWrite(data);

  const columns = Object.keys(cleanedData);
  const values = Object.values(cleanedData);
  const setClause = columns.map(col => `${col} = ?`).join(', ');

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const result = await transactionQuery(sql, [...values, ...whereValues]);
  return result.affectedRows;
};

// Get a single row within a transaction (or outside if no transaction)
export const transactionGetOne = async (sql, values = []) => {
  const results = await transactionQuery(sql, values);
  return results && results.length > 0 ? results[0] : null;
};

export default pool;