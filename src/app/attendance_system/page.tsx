"use client";

import { Loader2, AlertCircle, CheckCircle, Fingerprint } from "lucide-react";
import { useState, useEffect } from "react";
import QRCodeScanner from "./Scanner/QRCodeScanner";
import { attendanceApi } from "@/lib/api";

interface EmployeeQRData {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  position_name: string;
  shift: string;
  schedule_time: string;
}

interface AttendanceRemarks {
  status: "present" | "late" | "absent" | "on_leave";
  remarks: string;
  color: string;
}

export default function AttendanceSystemPage() {
  const [qrValue, setQrValue] = useState("");
  const [employeeData, setEmployeeData] = useState<EmployeeQRData | null>(null);
  const [attendanceRemarks, setAttendanceRemarks] = useState<AttendanceRemarks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClockOutPrompt, setShowClockOutPrompt] = useState(false);
  const [clockOutData, setClockOutData] = useState<any>(null);
  const [statusLog, setStatusLog] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorMode, setSensorMode] = useState<'ATTENDANCE' | 'ENROLLMENT'>('ATTENDANCE');

  const currentDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Connect to fingerprint bridge SSE for real-time updates
  useEffect(() => {
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${bridgeUrl}/status/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setStatusLog([{ message: 'Connected to fingerprint sensor', type: 'connected', timestamp: new Date().toISOString() }]);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatusLog((prev) => [...prev.slice(-9), data]); // Keep last 10 messages

      // Update sensor mode if provided
      if (data.mode) {
        setSensorMode(data.mode);
      }

      // Handle mode change messages
      if (data.message.includes('Mode changed to') || data.message.includes('Switched to')) {
        if (data.message.includes('ENROLLMENT')) {
          setSensorMode('ENROLLMENT');
          // Reset QR scanner state when entering enrollment mode
          setQrValue('');
          setEmployeeData(null);
          setAttendanceRemarks(null);
          setIsScanning(true);
        } else if (data.message.includes('ATTENDANCE')) {
          setSensorMode('ATTENDANCE');
          // Reset QR scanner state when leaving enrollment mode
          setQrValue('');
          setEmployeeData(null);
          setAttendanceRemarks(null);
        }
      }

      // Handle attendance success messages
      if (data.message.includes('CLOCK_IN:') || data.message.includes('CLOCK_OUT:')) {
        const parts = data.message.split(' - ');
        if (parts.length >= 2) {
          const employeeName = parts[0].replace('✅ CLOCK_IN: ', '').replace('✅ CLOCK_OUT: ', '');
          const action = data.message.includes('CLOCK_IN') ? 'Clock In' : 'Clock Out';
          setSuccessMessage(`${action} successful for ${employeeName}`);
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }
      }

      // Handle errors
      if (data.message.includes('ERROR:')) {
        setError(data.message.replace('ERROR:', ''));
        setTimeout(() => setError(null), 5000);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Lost connection to fingerprint sensor');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // QR code parsing - Only active when in ENROLLMENT mode
  useEffect(() => {
    // Only process QR codes when sensor is in ENROLLMENT mode
    if (sensorMode !== 'ENROLLMENT') {
      return;
    }

    if (!qrValue) {
      setEmployeeData(null);
      setAttendanceRemarks(null);
      setError(null);
      return;
    }

    try {
      const data = JSON.parse(qrValue) as EmployeeQRData;
      setEmployeeData(data);
      setError(null);
      const remarks = calculateAttendanceRemarks(data);
      setAttendanceRemarks(remarks);
      saveAttendance(data, remarks);
    } catch (err) {
      setEmployeeData(null);
      setAttendanceRemarks(null);
      setError("Invalid QR code format. Please scan a valid employee QR code.");
      console.error("QR parsing error:", err);
    }
  }, [qrValue, sensorMode]);

  // Save attendance to database
  const saveAttendance = async (data: EmployeeQRData, remarks: AttendanceRemarks) => {
    setIsSaving(true);
    try {
      console.log("Saving attendance for employee:", data.employee_id, "Status:", remarks.status);
      const result = await attendanceApi.clockIn(data.employee_id, remarks.status);

      console.log("Clock in response:", result);

      if (result.success) {
        const action = result?.data?.action as string | undefined;
        const timeStr = (result?.data?.time as string | undefined) || '';
        if (action === 'clock_in') {
          setSuccessMessage(timeStr ? `Clock in successful at ${timeStr}` : 'Clock in successful!');
        } else {
          // Fallback
          setSuccessMessage('Attendance recorded successfully!');
        }

        // Stop scanning for 7 seconds
        setIsScanning(false);
        setTimeout(() => {
          setIsScanning(true);
          setQrValue("");
          setEmployeeData(null);
          setAttendanceRemarks(null);
          setSuccessMessage(null);
        }, 7000);
      } else if (result.message && result.message.includes("Already clocked in")) {
        // Employee already clocked in - show clock out prompt
        setClockOutData(data);
        setShowClockOutPrompt(true);
        setError(null);
      } else {
        console.error("Clock in failed:", result.message);
        setError(result.message || "Failed to save attendance");
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      setError("Failed to save attendance record");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate attendance remarks based on time
  const calculateAttendanceRemarks = (data: EmployeeQRData): AttendanceRemarks => {
    const now = new Date();
    const [scheduleHour, scheduleMinute] = data.schedule_time.split(":").map(Number);
    const scheduleDate = new Date(now);
    scheduleDate.setHours(scheduleHour, scheduleMinute, 0, 0);

    const timeDiffMinutes = (now.getTime() - scheduleDate.getTime()) / (1000 * 60);

    if (timeDiffMinutes <= 15) {
      return {
        status: "present",
        remarks: "On time",
        color: "bg-green-100 text-green-800",
      };
    } else {
      const hours = Math.floor(timeDiffMinutes / 60);
      const minutes = Math.round(timeDiffMinutes % 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return {
        status: "late",
        remarks: `Late by ${timeStr}`,
        color: "bg-yellow-100 text-yellow-800",
      };
    }
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!clockOutData) return;

    setIsSaving(true);
    try {
      const result = await attendanceApi.clockOut(clockOutData.employee_id);

      if (result.success) {
        const timeStr = (result?.data?.time as string | undefined) || '';
        const duration = result?.data?.duration_hours;
        setSuccessMessage(timeStr
          ? `Clock out successful at ${timeStr}! Duration: ${duration} hours`
          : `Clock out successful! Duration: ${duration} hours`);
        setShowClockOutPrompt(false);
        setClockOutData(null);

        // Stop scanning for 7 seconds
        setIsScanning(false);
        setTimeout(() => {
          setIsScanning(true);
          setQrValue("");
          setEmployeeData(null);
          setAttendanceRemarks(null);
          setSuccessMessage(null);
        }, 7000);
      } else {
        setError(result.message || "Failed to clock out");
      }
    } catch (err) {
      console.error("Error clocking out:", err);
      setError("Failed to clock out");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel clock out
  const handleCancelClockOut = () => {
    setShowClockOutPrompt(false);
    setClockOutData(null);
    setQrValue("");
    setEmployeeData(null);
    setAttendanceRemarks(null);
    setError(null);
  };

  return (
    <section className="bg-[#fff7ec] rounded-2xl shadow-2xl w-full font-poppins max-w-4xl px-10 py-8 mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          {sensorMode === 'ATTENDANCE' ? (
            <>
              <Fingerprint className="w-8 h-8 text-[#8b7355]" />
              <h3 className="text-3xl font-extrabold text-[#3b2b1c]">FINGERPRINT ATTENDANCE</h3>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-[#8b7355]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                <path d="M7 7h4v4H7z M13 7h4v4h-4z M7 13h4v4H7z M13 13h4v4h-4z" strokeWidth="2"/>
              </svg>
              <h3 className="text-3xl font-extrabold text-[#3b2b1c]">QR CODE ATTENDANCE</h3>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-[#3b2b1c]/80 text-base">{currentDate}</p>
          <p className="text-xs text-[#8b7355] mt-1">
            Mode: <span className="font-semibold">{sensorMode}</span>
          </p>
        </div>
      </div>

      {/* Status Line */}
      <div className="flex items-center gap-2 mb-5 text-[#8b7355] text-lg">
        {sensorMode === 'ENROLLMENT' ? (
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg px-4 py-2 w-full">
            <span className="text-yellow-800 font-semibold flex items-center gap-2">
              ⚠️ Enrollment Mode Active - Fingerprint sensor is being used for employee enrollment. QR code scanning is enabled.
            </span>
          </div>
        ) : !isConnected ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-[#b97a5b]" />
            <span>Connecting to fingerprint sensor...</span>
          </>
        ) : error ? (
          <span className="text-red-700 font-semibold text-lg flex items-center gap-2">
            ❌ {error}
          </span>
        ) : successMessage ? (
          <span className="text-green-700 font-semibold text-lg flex items-center gap-2">
            ✅ {successMessage}
          </span>
        ) : (
          <>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>Ready - Waiting for fingerprint scan...</span>
          </>
        )}
      </div>

      {/* Main Content - Switch between Fingerprint and QR based on mode */}
      {sensorMode === 'ATTENDANCE' ? (
        /* Fingerprint Status Display */
        <div className="flex gap-8 items-start">
          {/* Live Status Log */}
          <div className="flex-1">
            <div className="bg-gray-900 text-green-400 rounded-xl shadow-lg p-6 font-mono text-sm h-96 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 text-white border-b border-gray-700 pb-3">
              <Fingerprint className="w-5 h-5" />
              <span className="font-semibold text-lg">Live Sensor Status</span>
              {isConnected && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              )}
            </div>
            {statusLog.length === 0 ? (
              <div className="text-gray-500 italic text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Initializing fingerprint sensor...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {statusLog.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 py-1">
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={
                      log.message.includes('success') || log.message.includes('CLOCK_IN') || log.message.includes('CLOCK_OUT') || log.message.includes('Matched')
                        ? 'text-green-400 font-semibold' 
                        : log.message.includes('ERROR') || log.message.includes('No match')
                        ? 'text-red-400'
                        : log.message.includes('Waiting') || log.message.includes('Ready')
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>📌 Instructions:</strong> Place your enrolled finger on the sensor to clock in/out. 
              The system will automatically detect and process your attendance.
            </p>
          </div>
        </div>

        {/* Fingerprint Sensor Visual */}
        <div className="w-80">
          <div className="bg-gradient-to-br from-[#8b7355] to-[#b97a5b] rounded-xl shadow-2xl p-8 text-white">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className={`absolute inset-0 bg-white rounded-full blur-xl opacity-20 ${isConnected ? 'animate-pulse' : ''}`}></div>
                <Fingerprint className={`w-32 h-32 relative z-10 ${isConnected ? 'animate-pulse' : 'opacity-50'}`} />
              </div>
              
              <div className="text-center space-y-2">
                <h4 className="text-xl font-bold">
                  {isConnected ? 'Sensor Ready' : 'Connecting...'}
                </h4>
                <p className="text-sm opacity-90">
                  {isConnected ? 'Place finger on sensor' : 'Please wait...'}
                </p>
              </div>

              <div className="w-full pt-4 border-t border-white/20">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-75">Status:</span>
                    <span className="font-semibold">{isConnected ? '🟢 Online' : '🔴 Offline'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-75">Mode:</span>
                    <span className="font-semibold">Attendance</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-75">Events:</span>
                    <span className="font-semibold">{statusLog.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 bg-white rounded-lg shadow p-4 space-y-2">
            <h5 className="font-semibold text-[#3b2b1c] mb-3">Today's Activity</h5>
            <div className="text-sm text-gray-600">
              <p>Last scan: {statusLog.length > 0 ? new Date(statusLog[statusLog.length - 1].timestamp).toLocaleTimeString() : 'N/A'}</p>
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* QR Scanner Section - Active in ENROLLMENT mode */
        <div className="flex gap-8 items-start">
          {/* QR Scanner */}
          <div className="flex flex-col items-center justify-center bg-[#f4eadb] rounded-xl shadow-inner p-4 min-h-[300px]">
            <QRCodeScanner 
              key="enrollment-scanner" 
              onScan={(value) => setQrValue(value)} 
              isActive={true} 
            />
          </div>

          {/* Employee Info Section */}
          <div className="flex-1 space-y-5">
            {employeeData ? (
              <>
                <div className="border rounded-xl border-[#e2cfa8] p-4 mb-5">
                  <p className="font-semibold text-xl text-[#3b2b1c]">
                    {employeeData.first_name} {employeeData.last_name}
                  </p>
                  <p className="text-lg text-[#8b7355]">{employeeData.position_name}</p>
                  <p className="text-sm text-gray-600 mt-1">Code: {employeeData.employee_code}</p>
                </div>

                <div className="text-base space-y-4">
                  <div className="flex justify-between items-center">
                    <p>
                      <span className="font-semibold text-[#3b2b1c]">Schedule:</span>{" "}
                      {formatTime(employeeData.schedule_time)} ({employeeData.shift === 'night' ? 'Night Shift' : 'Morning Shift'})
                    </p>
                    <p>
                      <span className="font-semibold text-[#3b2b1c]">Remarks:</span>{" "}
                      {attendanceRemarks && (
                        <span className={`px-3 py-1 rounded-md font-semibold ${attendanceRemarks.color}`}>
                          {attendanceRemarks.remarks}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <p>
                      <span className="font-semibold text-[#3b2b1c]">Status:</span>{" "}
                      {attendanceRemarks && (
                        <span className={`px-3 py-1 rounded-md font-semibold ${attendanceRemarks.color}`}>
                          {attendanceRemarks.status.toUpperCase()}
                        </span>
                      )}
                    </p>
                    <p>
                      <span className="font-semibold text-[#3b2b1c]">Current Time:</span>{" "}
                      {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="border rounded-xl border-[#e2cfa8] p-8 text-center">
                <p className="text-gray-500">Scan an employee QR code to display information</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clock Out Confirmation Modal */}
      {showClockOutPrompt && clockOutData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-[#3b2b1c] mb-4">Clock Out Confirmation</h2>

            <div className="mb-6 space-y-3">
              <p className="text-lg">
                <span className="font-semibold text-[#3b2b1c]">Employee:</span>{" "}
                {clockOutData.first_name} {clockOutData.last_name}
              </p>
              <p className="text-lg">
                <span className="font-semibold text-[#3b2b1c]">Position:</span>{" "}
                {clockOutData.position_name}
              </p>
              <p className="text-lg text-gray-600">
                Are you sure you want to clock out this employee?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleClockOut}
                disabled={isSaving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Yes, Clock Out"
                )}
              </button>
              <button
                onClick={handleCancelClockOut}
                disabled={isSaving}
                className="flex-1 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
