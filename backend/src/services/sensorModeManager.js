// Sensor Mode Manager
// Manages the state of the fingerprint sensor (ATTENDANCE vs ENROLLMENT mode)

class SensorModeManager {
  constructor() {
    this.currentMode = 'ATTENDANCE'; // ATTENDANCE or ENROLLMENT
    this.listeners = [];
  }

  /**
   * Get current sensor mode
   */
  getMode() {
    return this.currentMode;
  }

  /**
   * Set sensor mode
   */
  setMode(mode) {
    if (mode !== 'ATTENDANCE' && mode !== 'ENROLLMENT') {
      throw new Error('Invalid mode. Must be ATTENDANCE or ENROLLMENT');
    }
    
    const oldMode = this.currentMode;
    this.currentMode = mode;
    
    console.log(`🔄 Sensor mode changed: ${oldMode} → ${mode}`);
    
    // Notify all listeners
    this.notifyListeners(mode, oldMode);
    
    return true;
  }

  /**
   * Switch to enrollment mode
   */
  enableEnrollmentMode() {
    return this.setMode('ENROLLMENT');
  }

  /**
   * Switch to attendance mode
   */
  enableAttendanceMode() {
    return this.setMode('ATTENDANCE');
  }

  /**
   * Check if in enrollment mode
   */
  isEnrollmentMode() {
    return this.currentMode === 'ENROLLMENT';
  }

  /**
   * Check if in attendance mode
   */
  isAttendanceMode() {
    return this.currentMode === 'ATTENDANCE';
  }

  /**
   * Add a listener for mode changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners of mode change
   */
  notifyListeners(newMode, oldMode) {
    this.listeners.forEach(listener => {
      try {
        listener(newMode, oldMode);
      } catch (error) {
        console.error('Error in mode change listener:', error);
      }
    });
  }
}

// Singleton instance
const sensorModeManager = new SensorModeManager();

export default sensorModeManager;
