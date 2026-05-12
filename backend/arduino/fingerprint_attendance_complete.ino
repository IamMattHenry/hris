/*
 * Complete Fingerprint Attendance System for HRIS
 * Hardware: DY50 Fingerprint Sensor + Arduino Uno
 */

#include <Adafruit_Fingerprint.h>

#if (defined(__AVR__) || defined(ESP8266)) && !defined(__AVR_ATmega2560__)
SoftwareSerial mySerial(2, 3);
#else
#define mySerial Serial1
#endif

Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

enum Mode { ATTENDANCE, ENROLLMENT };
Mode currentMode = ATTENDANCE;
int enrollmentId = 0;

const int LED_SUCCESS = 13; // Green
const int LED_ERROR = 12;   // Red
const int LED_WAITING = 10; // Yellow
const int BUZZER = 11;

void setup() {
  Serial.begin(115200);
  while (!Serial);  
  
  pinMode(LED_SUCCESS, OUTPUT);
  pinMode(LED_ERROR, OUTPUT);
  pinMode(LED_WAITING, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  // Start with everything OFF
  digitalWrite(LED_SUCCESS, LOW);
  digitalWrite(LED_ERROR, LOW);
  digitalWrite(LED_WAITING, LOW);
  digitalWrite(BUZZER, LOW);

  // --- NEW: Hardware Self-Test ---
  testHardware();
  
  Serial.println(F("\n--- SYSTEM INITIALIZING ---")); 
  
  mySerial.begin(57600);
  if (finger.verifyPassword()) {
    printSensorInfo(57600);
  } else {
    Serial.println(F("Sensor not found at 57600. Trying 115200..."));
    mySerial.begin(115200);
    
    if (finger.verifyPassword()) {
      printSensorInfo(115200);
    } else {
      Serial.println(F("SYSTEM:ERROR"));
      Serial.println(F("SENSOR:NOT_FOUND"));
      while (1) { blinkLED(LED_ERROR, 1); delay(1000); }
    }
  }

  Serial.println(F("SYSTEM:READY"));
  Serial.println(F("---------------------------"));
}

// ========== HARDWARE TEST FUNCTION ==========

void testHardware() {
  Serial.println(F("SYSTEM:TESTING_PERIPHERALS..."));
  
  // 1. Success LED (Green)
  digitalWrite(LED_SUCCESS, HIGH);
  delay(750);
  digitalWrite(LED_SUCCESS, LOW);
  
  // 2. Waiting LED (Yellow)
  digitalWrite(LED_WAITING, HIGH);
  delay(750);
  digitalWrite(LED_WAITING, LOW);
  
  // 3. Error LED (Red)
  digitalWrite(LED_ERROR, HIGH);
  delay(750);
  digitalWrite(LED_ERROR, LOW);
  
  // 4. Buzzer (Short beep)
  digitalWrite(BUZZER, HIGH);
  delay(500);
  digitalWrite(BUZZER, LOW);
  
  Serial.println(F("SYSTEM:TEST_COMPLETE"));
}

// ========== SENSOR INFO HELPERS ==========

void printSensorInfo(long baud) {
  Serial.println(F("SENSOR:FOUND"));
  Serial.print(F("Baud Rate: ")); Serial.println(baud);
  finger.getParameters();
  Serial.print(F("Sensor Capacity: ")); Serial.println(finger.capacity);
  Serial.print(F("Security Level: ")); Serial.println(finger.security_level);
}

// ========== MAIN LOOP & LOGIC ==========

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    handleCommand(command);
  }
  
  if (currentMode == ATTENDANCE) {
    checkFingerprint();
  }
  delay(50);
}

void checkFingerprint() {
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_NOFINGER) return;
  if (p != FINGERPRINT_OK) return;

  digitalWrite(LED_WAITING, HIGH);
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) { digitalWrite(LED_WAITING, LOW); return; }

  p = finger.fingerFastSearch();
  digitalWrite(LED_WAITING, LOW);

  if (p == FINGERPRINT_OK) {
    Serial.print("FINGERPRINT:");
    Serial.println(finger.fingerID);
    blinkLED(LED_SUCCESS, 2);
    beep(1, 100);
    delay(2000); 
  } else {
    Serial.println("ERROR:No match found");
    blinkLED(LED_ERROR, 2);
    beep(1, 300);
  }
}

void handleCommand(String command) {
  command.trim();
  if (command.startsWith("ENROLL:")) {
    enrollmentId = command.substring(7).toInt();
    if (enrollmentId > 0 && enrollmentId <= 127) {
      currentMode = ENROLLMENT;
      enrollFingerprint();
    }
  } else if (command.startsWith("DELETE:")) {
    deleteFingerprint(command.substring(7).toInt());
  } else if (command.startsWith("OK:")) {
    digitalWrite(LED_WAITING, LOW);
    blinkLED(LED_SUCCESS, 2);
  } else if (command.startsWith("ERROR:")) {
    digitalWrite(LED_WAITING, LOW);
    blinkLED(LED_ERROR, 3);
  }
}

void enrollFingerprint() {
  Serial.println("Place finger...");
  int p = -1;
  while (p != FINGERPRINT_OK) {
    digitalWrite(LED_WAITING, HIGH); delay(100); digitalWrite(LED_WAITING, LOW); delay(100);
    p = finger.getImage();
  }
  digitalWrite(LED_WAITING, HIGH);
  p = finger.image2Tz(1);
  
  Serial.println("Remove finger...");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) { p = finger.getImage(); }
  
  Serial.println("Place SAME finger...");
  p = -1;
  while (p != FINGERPRINT_OK) {
    digitalWrite(LED_WAITING, HIGH); delay(100); digitalWrite(LED_WAITING, LOW); delay(100);
    p = finger.getImage();
  }
  
  digitalWrite(LED_WAITING, HIGH);
  finger.image2Tz(2);
  if (finger.createModel() == FINGERPRINT_OK) {
    if (finger.storeModel(enrollmentId) == FINGERPRINT_OK) {
      Serial.print("ENROLL:SUCCESS:");
      Serial.println(enrollmentId);
      blinkLED(LED_SUCCESS, 5);
    }
  } else {
    Serial.println("ENROLL:ERROR:MISMATCH");
    blinkLED(LED_ERROR, 3);
  }
  digitalWrite(LED_WAITING, LOW);
  currentMode = ATTENDANCE;
}

void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH); delay(200); digitalWrite(pin, LOW); delay(200);
  }
}

void beep(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER, HIGH); delay(duration); digitalWrite(BUZZER, LOW); delay(100);
  }
}

uint8_t deleteFingerprint(uint8_t id) {
  uint8_t p = finger.deleteModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.print("DELETE:SUCCESS:");
    Serial.println(id);
  } else {
    Serial.println("DELETE:ERROR");
  }
  return p;
}