import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const connectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
};

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection(connectionOptions);
    console.log('🔄 Resetting attendance times to exact scheduled shift times...');
    
    // Update existing attendance records
    // 1. Set overtime_hours to 0
    // 2. Change status to 'present' if it was overtime, late, or early_leave
    // 3. Overwrite time_in and time_out with the exact employee scheduled times
    const [result] = await connection.execute(`
      UPDATE attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      SET 
        a.overtime_hours = 0,
        a.status = IF(a.status IN ('overtime', 'late', 'early_leave'), 'present', a.status),
        a.time_in = CONCAT(a.date, ' ', e.scheduled_start_time),
        a.time_out = CONCAT(a.date, ' ', e.scheduled_end_time)
      WHERE e.scheduled_start_time IS NOT NULL 
        AND e.scheduled_end_time IS NOT NULL
        AND a.time_in IS NOT NULL
        AND a.time_out IS NOT NULL
    `);
    
    console.log(`✅ Successfully cleaned up and updated ${result.affectedRows} attendance records.`);
  } catch (error) {
    console.error('❌ Error updating records:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();
