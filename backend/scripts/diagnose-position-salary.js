#!/usr/bin/env node

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

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

  console.log('\n📊 POSITION SALARY DIAGNOSTIC REPORT\n');
  console.log('='.repeat(80));

  // 1. Positions without default_salary
  console.log('\n1️⃣  POSITIONS WITH NULL OR ZERO DEFAULT_SALARY:');
  console.log('-'.repeat(80));
  
  const [positionsWithoutSalary] = await connection.execute(`
    SELECT 
      job_positions.position_id,
      job_positions.position_name,
      job_positions.default_salary,
      job_positions.salary_unit,
      job_positions.employment_type,
      departments.department_name,
      COUNT(DISTINCT employees.employee_id) as employee_count
    FROM job_positions
    LEFT JOIN departments ON job_positions.department_id = departments.department_id
    LEFT JOIN employees ON employees.position_id = job_positions.position_id
    WHERE job_positions.default_salary IS NULL 
       OR job_positions.default_salary = 0
    GROUP BY job_positions.position_id, job_positions.position_name, job_positions.default_salary
    ORDER BY employee_count DESC
  `);

  if (positionsWithoutSalary.length === 0) {
    console.log('✅ All positions have default_salary set!');
  } else {
    console.log(`⚠️  Found ${positionsWithoutSalary.length} positions without salary:\n`);
    positionsWithoutSalary.forEach((pos, idx) => {
      console.log(`${idx + 1}. [${pos.position_id}] ${pos.position_name}`);
      console.log(`   Department: ${pos.department_name || 'N/A'}`);
      console.log(`   Default Salary: ${pos.default_salary === null ? 'NULL' : pos.default_salary}`);
      console.log(`   Employment Type: ${pos.employment_type}`);
      console.log(`   Employees Assigned: ${pos.employee_count}`);
      console.log('');
    });
  }

  // 2. Employees with NULL or ZERO current_salary
  console.log('\n2️⃣  EMPLOYEES WITH NULL OR ZERO CURRENT_SALARY:');
  console.log('-'.repeat(80));
  
  const [employeesWithoutSalary] = await connection.execute(`
    SELECT 
      employees.employee_id,
      employees.employee_code,
      employees.first_name,
      employees.last_name,
      employees.current_salary,
      employees.salary_unit,
      employees.status,
      job_positions.position_id,
      job_positions.position_name,
      job_positions.default_salary,
      departments.department_name
    FROM employees
    LEFT JOIN job_positions ON employees.position_id = job_positions.position_id
    LEFT JOIN departments ON employees.department_id = departments.department_id
    WHERE employees.current_salary IS NULL 
       OR employees.current_salary = 0
    ORDER BY employees.employee_id
  `);

  if (employeesWithoutSalary.length === 0) {
    console.log('✅ All employees have current_salary set!');
  } else {
    console.log(`⚠️  Found ${employeesWithoutSalary.length} employees without salary:\n`);
    employeesWithoutSalary.forEach((emp, idx) => {
      console.log(`${idx + 1}. [${emp.employee_code}] ${emp.first_name} ${emp.last_name}`);
      console.log(`   Current Salary: ${emp.current_salary === null ? 'NULL' : emp.current_salary}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Position: [${emp.position_id || 'NONE'}] ${emp.position_name || 'N/A'}`);
      console.log(`   Position Default Salary: ${emp.default_salary === null ? 'NULL' : emp.default_salary}`);
      console.log(`   Department: ${emp.department_name || 'N/A'}`);
      console.log('');
    });
  }

  // 3. Mismatches: Position exists but employee has NULL position_id
  console.log('\n3️⃣  EMPLOYEES WITH NULL POSITION_ID (MISSING POSITION ASSIGNMENT):');
  console.log('-'.repeat(80));
  
  const [employeesWithoutPosition] = await connection.execute(`
    SELECT 
      employees.employee_id,
      employees.employee_code,
      employees.first_name,
      employees.last_name,
      employees.current_salary,
      employees.status,
      employees.department_id,
      departments.department_name
    FROM employees
    LEFT JOIN departments ON employees.department_id = departments.department_id
    WHERE employees.position_id IS NULL
    ORDER BY employees.employee_id
  `);

  if (employeesWithoutPosition.length === 0) {
    console.log('✅ All employees have position_id assigned!');
  } else {
    console.log(`⚠️  Found ${employeesWithoutPosition.length} employees without position_id:\n`);
    employeesWithoutPosition.forEach((emp, idx) => {
      console.log(`${idx + 1}. [${emp.employee_code}] ${emp.first_name} ${emp.last_name}`);
      console.log(`   Current Salary: ${emp.current_salary || 'NULL'}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   Department: ${emp.department_name || 'N/A'}`);
      console.log('');
    });
  }

  // 4. Summary stats
  console.log('\n4️⃣  SUMMARY STATISTICS:');
  console.log('-'.repeat(80));
  
  const [totalStats] = await connection.execute(`
    SELECT 
      (SELECT COUNT(*) FROM job_positions) as total_positions,
      (SELECT COUNT(*) FROM job_positions WHERE default_salary IS NULL OR default_salary = 0) as positions_without_salary,
      (SELECT COUNT(*) FROM employees WHERE status IN ('active', 'on-leave')) as active_employees,
      (SELECT COUNT(*) FROM employees WHERE (current_salary IS NULL OR current_salary = 0) AND status IN ('active', 'on-leave')) as active_without_salary,
      (SELECT COUNT(*) FROM employees WHERE position_id IS NULL AND status IN ('active', 'on-leave')) as active_without_position
  `);

  const stats = totalStats[0];
  console.log(`Total Positions: ${stats.total_positions}`);
  console.log(`Positions without salary: ${stats.positions_without_salary} (${((stats.positions_without_salary / stats.total_positions) * 100).toFixed(1)}%)`);
  console.log(`\nActive/On-leave Employees: ${stats.active_employees}`);
  console.log(`Active employees without salary: ${stats.active_without_salary} (${((stats.active_without_salary / stats.active_employees) * 100).toFixed(1)}%)`);
  console.log(`Active employees without position: ${stats.active_without_position}`);

  // 5. Position name mismatch analysis (case sensitivity)
  console.log('\n5️⃣  POTENTIAL NAME MISMATCHES (CASE SENSITIVITY):');
  console.log('-'.repeat(80));
  
  const [positionDuplicates] = await connection.execute(`
    SELECT 
      LOWER(TRIM(position_name)) as normalized_name,
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT position_id SEPARATOR ',') as position_ids,
      GROUP_CONCAT(DISTINCT position_name SEPARATOR ' | ') as name_variations
    FROM job_positions
    GROUP BY LOWER(TRIM(position_name))
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  if (positionDuplicates.length === 0) {
    console.log('✅ No case sensitivity duplicates found!');
  } else {
    console.log(`⚠️  Found ${positionDuplicates.length} potential duplicates:\n`);
    positionDuplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. Normalized: "${dup.normalized_name}"`);
      console.log(`   Count: ${dup.count}`);
      console.log(`   Position IDs: ${dup.position_ids}`);
      console.log(`   Name Variations: ${dup.name_variations}`);
      console.log('');
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ Diagnostic report complete!\n');

} catch (error) {
  if (error?.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Database access denied. Check backend/.env credentials.');
  } else {
    console.error('Error during diagnosis:', error);
  }
  process.exitCode = 1;
} finally {
  if (connection) {
    await connection.end();
  }
}
