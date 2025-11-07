// Serial bridge service to connect Arduino fingerprint sensor to backend
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import axios from 'axios';
import logger from '../utils/logger.js';

class FingerprintBridge {
  constructor(portPath, baudRate = 9600) {
    this.portPath = portPath;
    this.baudRate = baudRate;
    this.port = null;
    this.parser = null;
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';
  }

  /**
   * Initialize serial port connection
   */
  async connect() {
    try {
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      this.port.on('open', () => {
        logger.info(`Serial port ${this.portPath} opened successfully`);
        console.log(`✅ Fingerprint sensor connected on ${this.portPath}`);
      });

      this.port.on('error', (err) => {
        logger.error('Serial port error:', err);
        console.error('❌ Serial port error:', err.message);
      });

      // Listen for data from Arduino
      this.parser.on('data', (data) => {
        this.handleSerialData(data.trim());
      });

      return true;
    } catch (error) {
      logger.error('Failed to connect to serial port:', error);
      console.error('❌ Failed to connect:', error.message);
      return false;
    }
  }

  /**
   * Handle incoming data from Arduino
   * Expected format: "FINGERPRINT:123" or "FINGERPRINT:123:CLOCKOUT"
   */
  async handleSerialData(data) {
    try {
      logger.info(`Received from Arduino: ${data}`);
      console.log(`📡 Received: ${data}`);

      // Parse fingerprint data
      if (data.startsWith('FINGERPRINT:')) {
        const parts = data.split(':');
        const fingerprintId = parseInt(parts[1]);
        const action = parts[2] || 'CLOCKIN'; // Default to clock in

        if (isNaN(fingerprintId)) {
          logger.warn('Invalid fingerprint ID received');
          return;
        }

        // Process attendance
        await this.processAttendance(fingerprintId, action);
      } 
      // Handle enrollment responses
      else if (data.startsWith('ENROLL:')) {
        const parts = data.split(':');
        const status = parts[1]; // STARTED, SUCCESS, ERROR, CANCELLED
        const enrollmentId = parts[2];
        
        logger.info(`Enrollment ${status}: ID ${enrollmentId || 'N/A'}`);
        console.log(`📝 Enrollment ${status}${enrollmentId ? ': ID ' + enrollmentId : ''}`);
      }
      // Handle system messages
      else if (data.startsWith('SYSTEM:')) {
        const status = data.substring(7);
        logger.info(`System status: ${status}`);
      }
      // Handle errors
      else if (data.startsWith('ERROR:')) {
        const errorMsg = data.substring(6);
        logger.warn(`Arduino error: ${errorMsg}`);
        console.log(`⚠️ ${errorMsg}`);
      }
    } catch (error) {
      logger.error('Error handling serial data:', error);
      console.error('❌ Error processing data:', error.message);
    }
  }

  /**
   * Process attendance based on fingerprint ID
   */
  async processAttendance(fingerprintId, action) {
    try {
      // Call backend API to process fingerprint attendance
      const endpoint = `${this.apiBaseUrl}/attendance/fingerprint`;
      const response = await axios.post(endpoint, {
        fingerprint_id: fingerprintId,
        action: action.toUpperCase(),
      });

      if (response.data.success) {
        const { employee_name, time, action: resultAction } = response.data.data;
        logger.info(`Attendance recorded: ${employee_name} - ${resultAction} at ${time}`);
        console.log(`✅ ${resultAction}: ${employee_name} at ${time}`);
        
        // Send confirmation back to Arduino (optional)
        this.sendToArduino(`OK:${resultAction}:${employee_name}`);
      } else {
        logger.warn(`Attendance failed: ${response.data.message}`);
        console.log(`⚠️ ${response.data.message}`);
        this.sendToArduino(`ERROR:${response.data.message}`);
      }
    } catch (error) {
      logger.error('Error processing attendance:', error);
      console.error('❌ API Error:', error.response?.data?.message || error.message);
      this.sendToArduino('ERROR:Server error');
    }
  }

  /**
   * Send data to Arduino
   */
  sendToArduino(message) {
    if (this.port && this.port.isOpen) {
      this.port.write(`${message}\n`, (err) => {
        if (err) {
          logger.error('Error writing to serial port:', err);
        }
      });
    }
  }

  /**
   * Start fingerprint enrollment
   */
  startEnrollment(fingerprintId) {
    logger.info(`Starting enrollment for fingerprint ID: ${fingerprintId}`);
    console.log(`📝 Starting enrollment for ID ${fingerprintId}...`);
    this.sendToArduino(`ENROLL:${fingerprintId}`);
  }

  /**
   * Cancel fingerprint enrollment
   */
  cancelEnrollment() {
    logger.info('Cancelling enrollment');
    console.log('❌ Cancelling enrollment...');
    this.sendToArduino('ENROLL:CANCEL');
  }

  /**
   * Close serial port connection
   */
  disconnect() {
    if (this.port && this.port.isOpen) {
      this.port.close((err) => {
        if (err) {
          logger.error('Error closing serial port:', err);
        } else {
          logger.info('Serial port closed');
          console.log('🔌 Serial port disconnected');
        }
      });
    }
  }
}

export default FingerprintBridge;
