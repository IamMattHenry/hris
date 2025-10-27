import mysql from 'mysql2/promise';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const DB_CONFIG = {
  host: 'localhost',
  user: 'admin',
  password: 'admin123',
  database: 'hris_db',
};

let adminToken = null;

async function login() {
  try {
    console.log('\n📝 Logging in as admin...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    adminToken = response.data.data.token;
    console.log('✓ Login successful');
    return adminToken;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testDepartmentBasedSubRole() {
  console.log('\n========================================');
  console.log('TEST 1: Department-Based Sub-Role Validation');
  console.log('========================================\n');

  try {
    // Test 1a: Create IT employee with 'it' sub_role (should succeed)
    console.log('1a. Creating IT employee with "it" sub_role...');
    const itEmployeeResponse = await axios.post(
      `${API_BASE_URL}/employees`,
      {
        username: 'it_admin_test',
        password: 'password123',
        role: 'admin',
        sub_role: 'it',
        first_name: 'IT',
        last_name: 'Admin',
        birthdate: '1990-01-01',
        gender: 'male',
        civil_status: 'single',
        position_id: 5, // Software Developer (IT Dept)
        department_id: 2, // IT Department
        shift: 'morning',
        hire_date: '2024-01-01',
        email: 'it_admin@test.com',
        contact_number: '09171234567',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ IT employee created successfully');
    console.log(`  Employee ID: ${itEmployeeResponse.data.data.employee_id}`);
    console.log(`  Sub-role: ${itEmployeeResponse.data.data.sub_role}`);
  } catch (error) {
    console.error('✗ Failed:', error.response?.data?.message || error.message);
  }

  try {
    // Test 1b: Create HR employee with 'hr' sub_role (should succeed)
    console.log('\n1b. Creating HR employee with "hr" sub_role...');
    const hrEmployeeResponse = await axios.post(
      `${API_BASE_URL}/employees`,
      {
        username: 'hr_admin_test',
        password: 'password123',
        role: 'admin',
        sub_role: 'hr',
        first_name: 'HR',
        last_name: 'Admin',
        birthdate: '1990-01-01',
        gender: 'female',
        civil_status: 'single',
        position_id: 1, // HR Manager (HR Dept)
        department_id: 1, // HR Department
        shift: 'morning',
        hire_date: '2024-01-01',
        email: 'hr_admin@test.com',
        contact_number: '09171234568',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ HR employee created successfully');
    console.log(`  Employee ID: ${hrEmployeeResponse.data.data.employee_id}`);
    console.log(`  Sub-role: ${hrEmployeeResponse.data.data.sub_role}`);
  } catch (error) {
    console.error('✗ Failed:', error.response?.data?.message || error.message);
  }

  try {
    // Test 1c: Try to create IT employee with 'hr' sub_role (should fail)
    console.log('\n1c. Attempting to create IT employee with "hr" sub_role (should fail)...');
    await axios.post(
      `${API_BASE_URL}/employees`,
      {
        username: 'it_wrong_role_test',
        password: 'password123',
        role: 'admin',
        sub_role: 'hr',
        first_name: 'IT',
        last_name: 'WrongRole',
        birthdate: '1990-01-01',
        gender: 'male',
        civil_status: 'single',
        position_id: 5, // Software Developer (IT Dept)
        department_id: 2, // IT Department
        shift: 'morning',
        hire_date: '2024-01-01',
        email: 'it_wrong@test.com',
        contact_number: '09171234569',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.error('✗ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected:', error.response.data.message);
    } else {
      console.error('✗ Unexpected error:', error.response?.data?.message || error.message);
    }
  }
}

async function testOneSupervisorPerDepartment() {
  console.log('\n========================================');
  console.log('TEST 2: One Supervisor Per Department Limit');
  console.log('========================================\n');

  try {
    // Test 2a: Create first supervisor for IT department (should succeed)
    console.log('2a. Creating first supervisor for IT department...');
    const supervisor1Response = await axios.post(
      `${API_BASE_URL}/employees`,
      {
        username: 'it_supervisor_1',
        password: 'password123',
        role: 'supervisor',
        sub_role: 'it',
        first_name: 'IT',
        last_name: 'Supervisor1',
        birthdate: '1990-01-01',
        gender: 'male',
        civil_status: 'single',
        position_id: 4, // IT Manager (IT Dept)
        department_id: 2, // IT Department
        shift: 'morning',
        hire_date: '2024-01-01',
        email: 'it_sup1@test.com',
        contact_number: '09171234570',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ First supervisor created successfully');
    console.log(`  Employee ID: ${supervisor1Response.data.data.employee_id}`);
  } catch (error) {
    console.error('✗ Failed:', error.response?.data?.message || error.message);
  }

  try {
    // Test 2b: Try to create second supervisor for IT department (should fail)
    console.log('\n2b. Attempting to create second supervisor for IT department (should fail)...');
    await axios.post(
      `${API_BASE_URL}/employees`,
      {
        username: 'it_supervisor_2',
        password: 'password123',
        role: 'supervisor',
        sub_role: 'it',
        first_name: 'IT',
        last_name: 'Supervisor2',
        birthdate: '1990-01-01',
        gender: 'female',
        civil_status: 'single',
        position_id: 5, // Software Developer (IT Dept)
        department_id: 2, // IT Department
        shift: 'morning',
        hire_date: '2024-01-01',
        email: 'it_sup2@test.com',
        contact_number: '09171234571',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.error('✗ Should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Correctly rejected:', error.response.data.message);
    } else {
      console.error('✗ Unexpected error:', error.response?.data?.message || error.message);
    }
  }

  try {
    // Test 2c: Create supervisor for HR department (should succeed - different dept)
    console.log('\n2c. Creating supervisor for HR department (different department)...');
    const hrSupervisorResponse = await axios.post(
      `${API_BASE_URL}/employees`,
      {
        username: 'hr_supervisor_1',
        password: 'password123',
        role: 'supervisor',
        sub_role: 'hr',
        first_name: 'HR',
        last_name: 'Supervisor',
        birthdate: '1990-01-01',
        gender: 'female',
        civil_status: 'single',
        position_id: 1, // HR Manager (HR Dept)
        department_id: 1, // HR Department
        shift: 'morning',
        hire_date: '2024-01-01',
        email: 'hr_sup@test.com',
        contact_number: '09171234572',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ HR supervisor created successfully');
    console.log(`  Employee ID: ${hrSupervisorResponse.data.data.employee_id}`);
  } catch (error) {
    console.error('✗ Failed:', error.response?.data?.message || error.message);
  }
}

async function runTests() {
  try {
    console.log('\n🚀 Starting Department-Based Role Restrictions Tests\n');
    
    await login();
    await testDepartmentBasedSubRole();
    await testOneSupervisorPerDepartment();

    console.log('\n========================================');
    console.log('✓ All tests completed');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
  }
}

runTests();

