import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const tableName = process.argv[2] || 'expense_notifications';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
});

try {
  const [dbRows] = await connection.execute('SELECT DATABASE() AS current_db');
  const currentDb = dbRows?.[0]?.current_db || process.env.DB_NAME || 'unknown';

  const [tableRows] = await connection.execute(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [currentDb, tableName]
  );

  if (!Array.isArray(tableRows) || tableRows.length === 0) {
    console.log(`Table '${tableName}' does not exist in database '${currentDb}'.`);
    process.exit(1);
  }

  const [columns] = await connection.execute(
    `SELECT
      COLUMN_NAME,
      COLUMN_TYPE,
      IS_NULLABLE,
      COLUMN_DEFAULT,
      EXTRA,
      COLUMN_KEY
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [currentDb, tableName]
  );

  console.log(`\nTable: ${tableName}`);
  console.log(`Database: ${currentDb}`);
  console.log('Columns:');
  console.table(columns);
} catch (error) {
  console.error('Failed to inspect table schema:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
