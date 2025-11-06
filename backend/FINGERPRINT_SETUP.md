# Fingerprint Attendance System Setup Guide

This guide explains how to integrate the DY50 fingerprint sensor with Arduino Uno to your HRIS attendance system.

## Architecture

```
DY50 Sensor → Arduino Uno → USB → Node.js Bridge Service → Backend API → Database
```

## Prerequisites

1. **Hardware**:
   - DY50 Fingerprint Sensor
   - Arduino Uno
   - USB Cable (data-capable)

2. **Software**:
   - Arduino IDE
   - Node.js (already installed with your backend)
   - `serialport` npm package

## Installation

### 1. Install Required npm Packages

```bash
cd backend
npm install serialport @serialport/parser-readline
```

### 2. Database Setup

The `fingerprint_id` column has already been added to the `employees` table:

```sql
ALTER TABLE employees ADD COLUMN fingerprint_id INT UNIQUE;
```

### 3. Assign Fingerprint IDs to Employees

Update employees with their fingerprint IDs (the ID stored in the DY50 sensor):

```sql
-- Example: Assign fingerprint ID 1 to employee 5
UPDATE employees SET fingerprint_id = 1 WHERE employee_id = 5;
```

Or use the employee update API:
```bash
PUT /api/employees/5
{
  "fingerprint_id": 1
}
```

## Arduino Code

### Wiring Diagram

```
DY50 Sensor → Arduino Uno
--------------------------
VCC (Red)    → 5V
GND (Black)  → GND
TX (Yellow)  → Pin 2 (Arduino RX via SoftwareSerial)
RX (White)   → Pin 3 (Arduino TX via SoftwareSerial)
```

### Arduino Sketch

```cpp
#include <SoftwareSerial.h>

// Initialize software serial for DY50 (RX, TX)
SoftwareSerial mySerial(2, 3);

void setup() {
  Serial.begin(9600);      // USB communication with computer
  mySerial.begin(9600);    // Communication with DY50 sensor
  
  Serial.println("Fingerprint Attendance System Ready");
  Serial.println("Waiting for fingerprint...");
}

void loop() {
  // Check if fingerprint sensor has data
  if (mySerial.available()) {
    // Read fingerprint match result from DY50
    // Format depends on your DY50 library/protocol
    int fingerprintId = readFingerprintId();
    
    if (fingerprintId > 0) {
      // Send to Node.js bridge via Serial
      Serial.print("FINGERPRINT:");
      Serial.println(fingerprintId);
      
      delay(2000); // Prevent duplicate scans
    }
  }
  
  // Check for response from Node.js bridge
  if (Serial.available()) {
    String response = Serial.readStringUntil('\n');
    handleResponse(response);
  }
}

int readFingerprintId() {
  // TODO: Implement based on your DY50 library
  // This is a placeholder - replace with actual DY50 fingerprint reading code
  // Return the matched fingerprint ID or -1 if no match
  return -1;
}

void handleResponse(String response) {
  if (response.startsWith("OK:CLOCK_IN:")) {
    String name = response.substring(12);
    Serial.println("✓ Clock in successful: " + name);
    // Optional: Trigger LED/buzzer for success
  } 
  else if (response.startsWith("OK:CLOCK_OUT:")) {
    String name = response.substring(13);
    Serial.println("✓ Clock out successful: " + name);
    // Optional: Trigger LED/buzzer for success
  }
  else if (response.startsWith("ERROR:")) {
    String error = response.substring(6);
    Serial.println("✗ Error: " + error);
    // Optional: Trigger LED/buzzer for error
  }
}
```

## Running the Fingerprint Bridge

### 1. Configure Serial Port

Edit `backend/src/scripts/startFingerprintBridge.js` or set environment variable:

```bash
# Windows
set FINGERPRINT_PORT=COM3
set FINGERPRINT_BAUD=9600

# Linux/Mac
export FINGERPRINT_PORT=/dev/ttyUSB0
export FINGERPRINT_BAUD=9600
```

### 2. Start the Bridge Service

```bash
cd backend
node src/scripts/startFingerprintBridge.js
```

You should see:
```
🚀 Starting Fingerprint Bridge Service...
📍 Port: COM3
⚡ Baud Rate: 9600

✅ Fingerprint bridge is running
📌 Waiting for fingerprint scans...
```

### 3. Keep Both Services Running

You need to run TWO terminals:

**Terminal 1** - Main Backend Server:
```bash
npm run dev
```

**Terminal 2** - Fingerprint Bridge:
```bash
node src/scripts/startFingerprintBridge.js
```

## API Endpoints

### Fingerprint Attendance
```
POST /api/attendance/fingerprint
Content-Type: application/json

{
  "fingerprint_id": 1,
  "action": "CLOCKIN"  // Optional: "CLOCKIN" or "CLOCKOUT"
}
```

**Response (Clock In):**
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "data": {
    "attendance_id": 123,
    "time_in": "08:30:15 AM",
    "status": "present",
    "employee_name": "John Doe",
    "action": "CLOCK_IN",
    "time": "08:30:15 AM"
  }
}
```

**Response (Clock Out):**
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "data": {
    "time_out": "05:30:45 PM",
    "duration_hours": "9.01",
    "status": "present",
    "overtime_hours": "1.01",
    "employee_name": "John Doe",
    "action": "CLOCK_OUT",
    "time": "05:30:45 PM"
  }
}
```

## Troubleshooting

### Serial Port Issues

**Windows:**
1. Check Device Manager → Ports (COM & LPT)
2. Note the COM port number (e.g., COM3)
3. Install CH340 driver if needed

**Linux:**
1. Check available ports: `ls /dev/tty*`
2. Add user to dialout group: `sudo usermod -a -G dialout $USER`
3. Logout and login again

### Bridge Not Receiving Data

1. Check Arduino is connected and Serial Monitor shows data
2. Close Arduino Serial Monitor before starting bridge
3. Verify correct COM port in environment variable
4. Check baud rate matches (9600)

### Fingerprint Not Found

1. Verify employee has `fingerprint_id` set in database
2. Check fingerprint is enrolled in DY50 sensor
3. Verify fingerprint ID matches between sensor and database

## Testing

### Test Without Arduino

You can test the API directly:

```bash
curl -X POST http://localhost:5000/api/attendance/fingerprint \
  -H "Content-Type: application/json" \
  -d '{"fingerprint_id": 1}'
```

### Test Serial Communication

Use Arduino Serial Monitor to verify data format:
1. Upload Arduino sketch
2. Open Serial Monitor (9600 baud)
3. Scan fingerprint
4. Should see: `FINGERPRINT:1` (or similar)

## Production Deployment

For production, consider:

1. **Run bridge as a service** (Windows Service / systemd)
2. **Add error recovery** (auto-reconnect on serial disconnect)
3. **Add logging** (already included via Winston)
4. **Secure the endpoint** (add API key or IP whitelist for `/fingerprint` route)
5. **Add backup power** for Arduino (UPS or battery)

## Next Steps

1. Enroll fingerprints in DY50 sensor
2. Assign fingerprint IDs to employees in database
3. Upload Arduino code
4. Start fingerprint bridge service
5. Test with actual fingerprint scans
