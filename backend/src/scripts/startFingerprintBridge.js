#!/usr/bin/env node
// Script to start the fingerprint bridge service
import express from 'express';
import FingerprintBridge from '../services/fingerprintBridge.js';
import logger from '../utils/logger.js';
import sensorModeManager from '../services/sensorModeManager.js';

// Configuration
const SERIAL_PORT = process.env.FINGERPRINT_PORT || "COM13"; // Change to your Arduino port
const BAUD_RATE = parseInt(process.env.FINGERPRINT_BAUD || '9600');
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '3001');

console.log('🚀 Starting Fingerprint Bridge Service...');
console.log(`📍 Serial Port: ${SERIAL_PORT}`);
console.log(`⚡ Baud Rate: ${BAUD_RATE}`);
console.log(`🌐 Bridge API Port: ${BRIDGE_PORT}`);
console.log('');

const bridge = new FingerprintBridge(SERIAL_PORT, BAUD_RATE);

// Create Express server for bridge control
const app = express();
app.use(express.json());

// Store SSE clients
const sseClients = [];

// Broadcast status to all connected clients
function broadcastStatus(message, type = 'info', data = {}) {
  const payload = JSON.stringify({
    message,
    type,
    timestamp: new Date().toISOString(),
    ...data
  });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Override bridge's handleSerialData to broadcast fingerprint scans
const originalHandleSerialData = bridge.handleSerialData.bind(bridge);
bridge.handleSerialData = function(data) {
  // Check if it's a fingerprint scan
  if (data.startsWith('FINGERPRINT:')) {
    const parts = data.split(':');
    const fingerprintId = parseInt(parts[1]);

    if (!isNaN(fingerprintId)) {
      // Broadcast to SSE clients for 2FA
      broadcastStatus(`Fingerprint detected: ID ${fingerprintId}`, 'fingerprint_scanned', {
        fingerprint_id: fingerprintId
      });
    }
  }

  // Call original handler
  return originalHandleSerialData(data);
};

// Override bridge console output to broadcast to SSE clients
const originalLog = console.log;
console.log = function(...args) {
  originalLog.apply(console, args);
  const message = args.join(' ');
  if (message.includes('📡 Received:') || message.includes('📝') || message.includes('✅') || message.includes('⚠️')) {
    broadcastStatus(message.replace('📡 Received: ', ''), 'info');
  }
};

// SSE endpoint for real-time status
app.get('/status/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Add client to list
  sseClients.push(res);
  
  // Send initial connection message with current mode
  res.write(`data: ${JSON.stringify({ 
    message: 'Connected to bridge', 
    type: 'connected',
    mode: sensorModeManager.getMode()
  })}\n\n`);
  
  // Remove client on disconnect
  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    service: 'fingerprint-bridge',
    timestamp: new Date().toISOString()
  });
});

// Endpoint to get current mode
app.get('/mode', (req, res) => {
  res.json({
    success: true,
    mode: sensorModeManager.getMode(),
    isEnrollmentMode: sensorModeManager.isEnrollmentMode(),
    isAttendanceMode: sensorModeManager.isAttendanceMode()
  });
});

// Endpoint to set mode
app.post('/mode', (req, res) => {
  const { mode } = req.body;
  
  if (!mode || (mode !== 'ATTENDANCE' && mode !== 'ENROLLMENT')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid mode. Must be ATTENDANCE or ENROLLMENT' 
    });
  }
  
  sensorModeManager.setMode(mode);
  broadcastStatus(`Mode changed to ${mode}`, 'mode_change');
  
  res.json({ 
    success: true, 
    message: `Mode set to ${mode}`,
    mode: mode
  });
});

// Endpoint to start enrollment
app.post('/enroll/start', (req, res) => {
  const { fingerprint_id } = req.body;
  
  if (!fingerprint_id) {
    return res.status(400).json({ success: false, message: 'Fingerprint ID required' });
  }
  
  // Switch to enrollment mode
  sensorModeManager.enableEnrollmentMode();
  broadcastStatus('Switched to ENROLLMENT mode', 'mode_change');
  
  bridge.startEnrollment(fingerprint_id);
  broadcastStatus(`Starting enrollment for ID ${fingerprint_id}...`, 'enrollment');
  res.json({ success: true, message: 'Enrollment command sent to Arduino' });
});

// Endpoint to cancel enrollment
app.post('/enroll/cancel', (req, res) => {
  bridge.cancelEnrollment();
  broadcastStatus('Enrollment cancelled', 'cancelled');

  // Switch back to attendance mode
  sensorModeManager.enableAttendanceMode();
  broadcastStatus('Switched to ATTENDANCE mode', 'mode_change');

  res.json({ success: true, message: 'Enrollment cancelled' });
});

// Endpoint to start fingerprint scan for authentication (2FA)
app.post('/scan/start', (req, res) => {
  // Ensure we're in attendance mode for scanning
  sensorModeManager.enableAttendanceMode();
  broadcastStatus('Ready to scan fingerprint for authentication', 'scan');

  // The Arduino is already in attendance mode and will automatically
  // detect and send fingerprint IDs. No special command needed.
  res.json({
    success: true,
    message: 'Ready to scan fingerprint',
    mode: 'ATTENDANCE'
  });
});

// Endpoint to delete fingerprint template
app.post('/fingerprint/delete', (req, res) => {
  const { fingerprint_id } = req.body;

  if (!fingerprint_id) {
    return res.status(400).json({ success: false, message: 'Fingerprint ID required' });
  }

  sensorModeManager.enableAttendanceMode();
  broadcastStatus(`Deleting fingerprint ID ${fingerprint_id}...`, 'delete');
  bridge.deleteFingerprint(fingerprint_id);

  res.json({ success: true, message: `Delete command sent for fingerprint ID ${fingerprint_id}` });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'running', 
    clients: sseClients.length,
    mode: sensorModeManager.getMode()
  });
});

// Start Express server
app.listen(BRIDGE_PORT, () => {
  console.log(`🌐 Bridge API listening on port ${BRIDGE_PORT}`);
});

// Connect to serial port
bridge.connect().then((success) => {
  if (success) {
    console.log('✅ Fingerprint bridge is running');
    console.log('📌 Waiting for fingerprint scans...');
    console.log('');
  } else {
    console.error('❌ Failed to start fingerprint bridge');
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down fingerprint bridge...');
  bridge.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down fingerprint bridge...');
  bridge.disconnect();
  process.exit(0);
});
