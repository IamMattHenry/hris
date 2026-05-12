#!/usr/bin/env node

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

const connectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
  timezone: '+08:00',
  dateStrings: true,
};

let connection;

try {
  connection = await mysql.createConnection(connectionOptions);

  console.log('\n🔧 FIX EMPLOYEE SALARY FROM POSITION DEFAULTS\n');
  console.log('='.repeat(80));

  // Fetch employees with NULL current_salary who have position_id
  const [employeesToFix] = await connection.execute(`
    SELECT 
      employees.employee_id,
      employees.employee_code,
      employees.first_name,
      employees.last_name,
      employees.current_salary,
      employees.salary_unit,
      employees.position_id,
      job_positions.position_name,
      job_positions.default_salary,
      job_positions.salary_unit as position_salary_unit
    FROM employees
    JOIN job_positions ON employees.position_id = job_positions.position_id
    WHERE employees.current_salary IS NULL 
       OR employees.current_salary = 0
    ORDER BY employees.employee_id
  `);

  if (employeesToFix.length === 0) {
    console.log('✅ No employees need salary updates!\n');
    process.exit(0);
  }

  console.log(`📋 Found ${employeesToFix.length} employees to update:\n`);
  
  let totalCurrentSalary = 0;
  let totalNewSalary = 0;

  employeesToFix.forEach((emp, idx) => {
    const oldSalary = Number(emp.current_salary) || 0;
    const newSalary = Number(emp.default_salary) || 0;
    const salaryUnit = emp.position_salary_unit || 'monthly';
    
    console.log(`${idx + 1}. [${emp.employee_code}] ${emp.first_name} ${emp.last_name}`);
    console.log(`   Position: [${emp.position_id}] ${emp.position_name}`);
    console.log(`   Current Salary: ${oldSalary} → ${newSalary} ${salaryUnit}`);
    console.log('');
    
    totalCurrentSalary += oldSalary;
    totalNewSalary += newSalary;
  });

  console.log('−'.repeat(80));
  console.log(`Total Monthly Salary Impact:`);
  console.log(`  Current: ₱${totalCurrentSalary.toFixed(2)}`);
  console.log(`  After Fix: ₱${totalNewSalary.toFixed(2)}`);
  console.log(`  Change: +₱${(totalNewSalary - totalCurrentSalary).toFixed(2)}`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made.');
    console.log('   To apply changes, run with: --apply\n');
    process.exit(0);
  } else {
    console.log('⚠️  THIS WILL UPDATE THE DATABASE\n');
  }

  // Begin transaction
  await connection.beginTransaction();

  let updated = 0;

  for (const emp of employeesToFix) {
    const newSalary = emp.default_salary;
    const newUnit = emp.position_salary_unit || 'monthly';

    await connection.execute(
      `UPDATE employees
       SET current_salary = ?, salary_unit = ?, updated_by = 1
       WHERE employee_id = ?`,
      [newSalary, newUnit, emp.employee_id]
    );

    // Ensure data consistency in employee_positions table
    await connection.execute(
      `UPDATE employee_positions
       SET salary = ?, salary_unit = ?
       WHERE employee_id = ? AND is_primary = 1`,
      [newSalary, newUnit, emp.employee_id]
    );

    updated++;
  }

  await connection.commit();

  console.log(`\n✅ Successfully updated ${updated} employees!\n`);

} catch (error) {
  if (connection) {
    try {
      await connection.rollback();
    } catch (_) {}
  }
  
  if (error?.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Database access denied. Check backend/.env credentials.');
  } else {
    console.error('Error:', error?.message || error);
  }
  process.exitCode = 1;
} finally {
  if (connection) {
    await connection.end();
  }
}
