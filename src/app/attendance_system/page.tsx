"use client";

import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
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

  const currentDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Parse QR code data and calculate attendance remarks
  useEffect(() => {
    if (!qrValue) {
      setEmployeeData(null);
      setAttendanceRemarks(null);
      setError(null);
      return;
    }

    try {
      // Try to parse as JSON (new format)
      const data = JSON.parse(qrValue) as EmployeeQRData;
      setEmployeeData(data);
      setError(null);

      // Calculate attendance remarks based on current time vs schedule
      const remarks = calculateAttendanceRemarks(data);
      setAttendanceRemarks(remarks);

      // Save to attendance table
      saveAttendance(data, remarks);
    } catch (err) {
      // If JSON parsing fails, show error
      setEmployeeData(null);
      setAttendanceRemarks(null);
      setError("Invalid QR code format. Please scan a valid employee QR code.");
      console.error("QR parsing error:", err);
    }
  }, [qrValue]);

  // Save attendance to database
  const saveAttendance = async (data: EmployeeQRData, remarks: AttendanceRemarks) => {
    setIsSaving(true);
    try {
      console.log("Saving attendance for employee:", data.employee_id, "Status:", remarks.status);
      const result = await attendanceApi.clockIn(data.employee_id, remarks.status);

      console.log("Clock in response:", result);

      if (result.success) {
        setSuccessMessage("Attendance recorded successfully!");

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
    } else if (timeDiffMinutes <= 30) {
      const hours = Math.floor(timeDiffMinutes / 60);
      const minutes = Math.round(timeDiffMinutes % 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return {
        status: "late",
        remarks: `Late by ${timeStr}`,
        color: "bg-yellow-100 text-yellow-800",
      };
    } else {
      const hours = Math.floor(timeDiffMinutes / 60);
      const minutes = Math.round(timeDiffMinutes % 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return {
        status: "absent",
        remarks: `Absent - Scanned ${timeStr} after schedule`,
        color: "bg-red-100 text-red-800",
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
        setSuccessMessage(`Clock out successful! Duration: ${result.data.duration_hours} hours`);
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
        <h3 className="text-3xl font-extrabold text-[#3b2b1c]">QR SCAN</h3>
        <div className="text-right">
          <p className="text-[#3b2b1c]/80 text-base">{currentDate}</p>
        </div>
      </div>

      {/* Status Line */}
      <div className="flex items-center gap-2 mb-5 text-[#8b7355] text-lg">
        {!isScanning ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-[#b97a5b]" />
            <span>Scanner paused... Reloading in 7 seconds</span>
          </>
        ) : !qrValue ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-[#b97a5b]" />
            <span>Waiting For QR...</span>
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
          <span className="text-green-700 font-semibold text-lg">
            ✅ Scanned Successfully
          </span>
        )}
      </div>

      {/* QR and Info */}
      <div className="flex gap-8 items-start">
        {/* QR Scanner Section */}
        <div className="flex flex-col items-center justify-center bg-[#f4eadb] rounded-xl shadow-inner p-4">
          <QRCodeScanner onScan={(value) => setQrValue(value)} isActive={isScanning} />
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
