import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'async_hooks';

dotenv.config();

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

// Insert a record
export const insert = async (table, data) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const result = await query(sql, values);
  return result.insertId;
};

// Update a record
export const update = async (table, data, whereClause, whereValues) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
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
    if (!connection) {
      throw new Error('No active transaction to commit');
    }

    await connection.commit();
    connection.release();

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

    console.log('✅ Transaction rolled back');
  } catch (error) {
    console.error('❌ Failed to rollback transaction:', error);
    throw error;
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
 */
export const transactionInsert = async (table, data) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map(() => '?').join(', ');

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  const result = await transactionQuery(sql, values);
  return result.insertId;
};

/**
 * Update a record (transaction-aware)
 * Uses transaction connection if available, otherwise uses pool
 */
export const transactionUpdate = async (table, data, whereClause, whereValues) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map(col => `${col} = ?`).join(', ');

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const result = await transactionQuery(sql, [...values, ...whereValues]);
  return result.affectedRows;
};

export default pool;

