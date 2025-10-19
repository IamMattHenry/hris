import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

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

export default pool;

