import axios from 'axios';

async function testConfirmAPI() {
  try {
    console.log('Testing fingerprint confirm API endpoint...\n');

    const employee_id = 22; // Matt Henry from previous test
    const fingerprint_id = 7; // Test with ID 7

    console.log(`📤 Sending POST request to /api/fingerprint/enroll/confirm`);
    console.log(`   Employee ID: ${employee_id}`);
    console.log(`   Fingerprint ID: ${fingerprint_id}\n`);

    const response = await axios.post('http://localhost:5000/api/fingerprint/enroll/confirm', {
      employee_id,
      fingerprint_id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error Response:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else if (error.request) {
      console.error('❌ No response from server');
      console.error('   Make sure the backend server is running on http://localhost:5000');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testConfirmAPI();
