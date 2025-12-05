/*
 * Complete Fingerprint Attendance System for HRIS
 * Hardware: DY50 Fingerprint Sensor + Arduino Uno
 * Library: Adafruit Fingerprint Sensor Library
 * 
 * Wiring:
 * DY50 VCC → Arduino 5V
 * DY50 GND → Arduino GND
 * DY50 TX  → Arduino Pin 2 (RX via SoftwareSerial)
 * DY50 RX  → Arduino Pin 3 (TX via SoftwareSerial)
 */

#include <Adafruit_Fingerprint.h>

#if (defined(__AVR__) || defined(ESP8266)) && !defined(__AVR_ATmega2560__)
SoftwareSerial mySerial(2, 3);
#else
#define mySerial Serial1
#endif

Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// Mode control
enum Mode { ATTENDANCE, ENROLLMENT };
Mode currentMode = ATTENDANCE;
int enrollmentId = 0;

// LED and Buzzer pins (optional)
const int LED_SUCCESS = 13;
const int LED_ERROR = 12;
const int BUZZER = 11;

void setup() {
  // USB Serial for Node.js bridge communication
  Serial.begin(9600);
  
  // Setup optional feedback pins
  pinMode(LED_SUCCESS, OUTPUT);
  pinMode(LED_ERROR, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  digitalWrite(LED_SUCCESS, LOW);
  digitalWrite(LED_ERROR, LOW);
  digitalWrite(BUZZER, LOW);
  
  delay(1000);
  Serial.println("SYSTEM:INITIALIZING");
  
  // Try to find sensor at different baud rates
  mySerial.begin(57600);
  delay(100);
  
  if (finger.verifyPassword()) {
    Serial.println("SYSTEM:READY");
    Serial.println("✓ Sensor found at 57600 baud");
  } else {
    Serial.println("Trying 9600 baud...");
    mySerial.begin(9600);
    delay(100);
    
    if (finger.verifyPassword()) {
      Serial.println("SYSTEM:READY");
      Serial.println("✓ Sensor found at 9600 baud");
    } else {
      Serial.println("SYSTEM:ERROR");
      Serial.println("✗ Sensor not found!");
      while (1) {
        blinkLED(LED_ERROR, 1);
        delay(1000);
      }
    }
  }
  
  Serial.println("Fingerprint Attendance System Ready");
  Serial.println("Waiting for commands or fingerprint scan...");
}

void loop() {
  // Check for commands from Node.js bridge
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    handleCommand(command);
  }
  
  // Process based on current mode
  if (currentMode == ATTENDANCE) {
    checkFingerprint();
  } else if (currentMode == ENROLLMENT) {
    // Enrollment is handled by command
  }
  
  delay(50);
}

// ========== ATTENDANCE MODE ==========

void checkFingerprint() {
  uint8_t p = finger.getImage();
  
  if (p == FINGERPRINT_NOFINGER) {
    return; // No finger detected
  }
  
  if (p != FINGERPRINT_OK) {
    return; // Error getting image
  }
  
  // Convert image to template
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    return;
  }
  
  // Search for match
  p = finger.fingerFastSearch();
  
  if (p == FINGERPRINT_OK) {
    // Match found!
    int fingerprintId = finger.fingerID;
    int confidence = finger.confidence;
    
    Serial.print("FINGERPRINT:");
    Serial.println(fingerprintId);
    
    Serial.print("Matched ID #");
    Serial.print(fingerprintId);
    Serial.print(" with confidence ");
    Serial.println(confidence);
    
    blinkLED(LED_SUCCESS, 2);
    beep(1, 100);
    
    delay(2000); // Prevent duplicate scans
    
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("ERROR:No match found");
    blinkLED(LED_ERROR, 2);
    beep(1, 300);
    delay(1000);
  }
}

// ========== ENROLLMENT MODE ==========

void handleCommand(String command) {
  command.trim();
  
  if (command.startsWith("ENROLL:")) {
    // Format: ENROLL:5
    enrollmentId = command.substring(7).toInt();
    
    if (enrollmentId > 0 && enrollmentId <= 127) {
      // Check if this ID already exists in the sensor
      uint8_t p = finger.loadModel(enrollmentId);
      if (p == FINGERPRINT_OK) {
        // Fingerprint already exists in sensor
        Serial.print("ENROLL:ERROR:ID ");
        Serial.print(enrollmentId);
        Serial.println(" already exists in sensor");
        Serial.println("ERROR:Fingerprint ID already registered in sensor");
        blinkLED(LED_ERROR, 3);
        beep(3, 200);
        return;
      }
      
      currentMode = ENROLLMENT;
      Serial.print("ENROLL:STARTED:");
      Serial.println(enrollmentId);
      Serial.print("Ready to enroll ID #");
      Serial.println(enrollmentId);
      
      enrollFingerprint();
    } else {
      Serial.println("ENROLL:ERROR:Invalid ID");
    }
    
  } else if (command == "ENROLL:CANCEL") {
    currentMode = ATTENDANCE;
    Serial.println("ENROLL:CANCELLED");
    
  } else if (command.startsWith("OK:CLOCK_IN:")) {
    String name = command.substring(12);
    Serial.print("✓ Clock in: ");
    Serial.println(name);
    blinkLED(LED_SUCCESS, 2);
    beep(1, 100);
    
  } else if (command.startsWith("OK:CLOCK_OUT:")) {
    String name = command.substring(13);
    Serial.print("✓ Clock out: ");
    Serial.println(name);
    blinkLED(LED_SUCCESS, 3);
    beep(2, 100);
    
  } else if (command.startsWith("DELETE:")) {
    int deleteId = command.substring(7).toInt();

    if (deleteId > 0 && deleteId <= 127) {
      uint8_t result = deleteFingerprint(deleteId);

      if (result == FINGERPRINT_OK) {
        Serial.print("DELETE:SUCCESS:");
        Serial.println(deleteId);
        blinkLED(LED_SUCCESS, 2);
        beep(1, 150);
      } else {
        Serial.print("DELETE:ERROR:");
        Serial.print(deleteId);
        Serial.print(":");
        Serial.println(result, HEX);
        blinkLED(LED_ERROR, 2);
        beep(2, 150);
      }
    } else {
      Serial.println("DELETE:ERROR:INVALID_ID");
      blinkLED(LED_ERROR, 3);
    }

  } else if (command.startsWith("ERROR:")) {
    String error = command.substring(6);
    Serial.print("✗ Error: ");
    Serial.println(error);
    blinkLED(LED_ERROR, 3);
    beep(1, 500);
  }
}

void enrollFingerprint() {
  Serial.println("Place finger on sensor...");
  
  // Step 1: Get first image
  int p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      // Still waiting
    } else if (p == FINGERPRINT_OK) {
      Serial.println("Image captured!");
    } else {
      Serial.println("ENROLL:ERROR:Image capture failed");
      currentMode = ATTENDANCE;
      return;
    }
  }
  
  // Convert image 1
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("ENROLL:ERROR:Image conversion failed");
    currentMode = ATTENDANCE;
    return;
  }
  
  Serial.println("Remove finger...");
  blinkLED(LED_SUCCESS, 1);
  delay(2000);
  
  // Wait for finger removal
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
  }
  
  Serial.println("Place SAME finger again...");
  
  // Step 2: Get second image
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      // Still waiting
    } else if (p == FINGERPRINT_OK) {
      Serial.println("Image captured!");
    } else {
      Serial.println("ENROLL:ERROR:Second image failed");
      currentMode = ATTENDANCE;
      return;
    }
  }
  
  // Convert image 2
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("ENROLL:ERROR:Second conversion failed");
    currentMode = ATTENDANCE;
    return;
  }
  
  // Create model
  Serial.println("Creating model...");
  p = finger.createModel();
  
  if (p == FINGERPRINT_OK) {
    Serial.println("Prints matched!");
  } else if (p == FINGERPRINT_ENROLLMISMATCH) {
    Serial.println("ENROLL:ERROR:Fingerprints did not match");
    currentMode = ATTENDANCE;
    return;
  } else {
    Serial.println("ENROLL:ERROR:Model creation failed");
    currentMode = ATTENDANCE;
    return;
  }
  
  // Store model
  Serial.print("Storing model at ID #");
  Serial.println(enrollmentId);
  
  p = finger.storeModel(enrollmentId);
  
  if (p == FINGERPRINT_OK) {
    Serial.print("ENROLL:SUCCESS:");
    Serial.println(enrollmentId);
    Serial.println("✓ Enrollment successful!");
    
    blinkLED(LED_SUCCESS, 5);
    beep(3, 100);
    
  } else {
    Serial.println("ENROLL:ERROR:Storage failed");
  }
  
  // Return to attendance mode
  currentMode = ATTENDANCE;
  Serial.println("Returned to attendance mode");
}

// ========== HELPER FUNCTIONS ==========

void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(200);
    digitalWrite(pin, LOW);
    delay(200);
  }
}

void beep(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER, HIGH);
    delay(duration);
    digitalWrite(BUZZER, LOW);
    delay(100);
  }
}

// ========== DELETE FUNCTION ==========

uint8_t deleteFingerprint(uint8_t id) {
  uint8_t p = finger.deleteModel(id);

  if (p == FINGERPRINT_OK) {
    Serial.println("✓ Fingerprint deleted");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("DELETE:ERROR:COMMUNICATION");
  } else if (p == FINGERPRINT_BADLOCATION) {
    Serial.println("DELETE:ERROR:BAD_LOCATION");
  } else if (p == FINGERPRINT_FLASHERR) {
    Serial.println("DELETE:ERROR:FLASH");
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("DELETE:ERROR:NOT_FOUND");
  } else {
    Serial.print("DELETE:ERROR:UNKNOWN:0x");
    Serial.println(p, HEX);
  }

  // Ensure we stay in attendance mode after deletion attempts
  currentMode = ATTENDANCE;

  return p;
}
