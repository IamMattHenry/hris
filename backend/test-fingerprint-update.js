import * as db from './src/config/db.js';

async function testFingerprintUpdate() {
  try {
    console.log('Testing fingerprint database update...\n');

    // Get the most recent employee
    const employee = await db.getOne(
      'SELECT employee_id, first_name, last_name, fingerprint_id FROM employees ORDER BY employee_id DESC LIMIT 1'
    );

    if (!employee) {
      console.log('❌ No employees found in database');
      process.exit(1);
    }

    console.log('📋 Most recent employee:');
    console.log(`   ID: ${employee.employee_id}`);
    console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Current Fingerprint ID: ${employee.fingerprint_id || 'NULL'}\n`);

    // Test update with fingerprint ID 6
    const testFingerprintId = 6;
    console.log(`🔄 Testing update with fingerprint ID ${testFingerprintId}...`);

    await db.update(
      'employees',
      { fingerprint_id: testFingerprintId, updated_by: employee.employee_id },
      'employee_id = ?',
      [employee.employee_id]
    );

    // Verify update
    const updated = await db.getOne(
      'SELECT employee_id, first_name, last_name, fingerprint_id FROM employees WHERE employee_id = ?',
      [employee.employee_id]
    );

    console.log('\n✅ Update successful!');
    console.log(`   Employee ID: ${updated.employee_id}`);
    console.log(`   Name: ${updated.first_name} ${updated.last_name}`);
    console.log(`   Fingerprint ID: ${updated.fingerprint_id}`);

    // Check all employees with fingerprint IDs
    const allWithFingerprints = await db.query(
      'SELECT employee_id, first_name, last_name, fingerprint_id FROM employees WHERE fingerprint_id IS NOT NULL ORDER BY fingerprint_id'
    );

    console.log(`\n📊 All employees with fingerprint IDs (${allWithFingerprints.length}):`);
    allWithFingerprints.forEach(emp => {
      console.log(`   FP ID ${emp.fingerprint_id}: ${emp.first_name} ${emp.last_name} (Employee ID: ${emp.employee_id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testFingerprintUpdate();
