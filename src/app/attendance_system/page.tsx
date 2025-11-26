"use client";

import { Loader2, Fingerprint } from "lucide-react";
import { useState, useEffect } from "react";
import QRCodeScanner from "./Scanner/QRCodeScanner";
import { attendanceApi, employeeApi } from "@/lib/api";

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
  status: "present" | "late" | "absent" | "on_leave" | "offline";
  remarks: string;
  color: string;
}

export default function AttendanceSystemPage() {
  const [activeTab, setActiveTab] = useState<"FINGERPRINT" | "QR">("FINGERPRINT");
  const [qrValue, setQrValue] = useState("");
  const [employeeData, setEmployeeData] = useState<EmployeeQRData | null>(null);
  const [attendanceRemarks, setAttendanceRemarks] = useState<AttendanceRemarks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);

  const currentDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  /** Reset QR data when switching tabs */
  useEffect(() => {
    setQrValue("");
    setEmployeeData(null);
    setAttendanceRemarks(null);
    setError(null);
    setSuccessMessage(null);
  }, [activeTab]);

  /** Fingerprint SSE connection */
  useEffect(() => {
    if (activeTab !== "FINGERPRINT") return;

    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:3001";
    const eventSource = new EventSource(`${bridgeUrl}/status/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setStatusLog([{ message: "Connected to fingerprint sensor", type: "connected", timestamp: new Date().toISOString() }]);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatusLog((prev) => [...prev.slice(-9), data]);
      if (data.message.includes("ERROR:")) {
        setError(data.message.replace("ERROR:", ""));
        setTimeout(() => setError(null), 5000);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Lost connection to fingerprint sensor");
    };

    return () => eventSource.close();
  }, [activeTab]);

  /** Process QR scanning only when QR tab is active */
  useEffect(() => {
    if (activeTab !== "QR" || !qrValue) return;

    try {
      const data = JSON.parse(qrValue) as EmployeeQRData;
      // Basic validation
      if (!data || typeof data.employee_id !== "number") {
        setError("QR code not recognized. Please scan a valid employee QR code.");
        setEmployeeData(null);
        return;
      }

      // Verify employee exists before saving to prevent FK errors
      (async () => {
        const res = await employeeApi.getById(data.employee_id);
        if (!res?.success || !res.data) {
          setError("QR code is not associated with any employee");
          setEmployeeData(null);
          return;
        }

        // Prefer server-sourced employee fields; fallback to QR data when needed
        const normalized: EmployeeQRData = {
          employee_id: res.data.employee_id,
          employee_code: res.data.employee_code,
          first_name: res.data.first_name,
          last_name: res.data.last_name,
          position_name: res.data.position_name,
          shift: res.data.shift || data.shift,
          schedule_time: data.schedule_time,
        };
        setEmployeeData(normalized);
        const remarks = calculateAttendanceRemarks(normalized);
        setAttendanceRemarks(remarks);
        await saveAttendance(normalized, remarks);
      })();
    } catch (err) {
      setError("QR code not recognized. Please scan a valid employee QR code.");
      console.error("QR parsing error:", err);
    }
  }, [qrValue, activeTab]);

  /** Save attendance record */
  const saveAttendance = async (data: EmployeeQRData, remarks: AttendanceRemarks) => {
    setIsSaving(true);
    try {
      const result = await attendanceApi.clockIn(data.employee_id, remarks.status);
      if (result.success) {
        setSuccessMessage("Attendance recorded successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.message || "Failed to save attendance");
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      setError("Failed to save attendance record");
    } finally {
      setIsSaving(false);
    }
  };

  /** Calculate attendance remarks */
  const calculateAttendanceRemarks = (data: EmployeeQRData): AttendanceRemarks => {
    const now = new Date();
    const [scheduleHour, scheduleMinute] = data.schedule_time.split(":").map(Number);
    const scheduleDate = new Date(now);
    scheduleDate.setHours(scheduleHour, scheduleMinute, 0, 0);
    const timeDiffMinutes = (now.getTime() - scheduleDate.getTime()) / (1000 * 60);

    if (timeDiffMinutes <= 15) {
      return { status: "present", remarks: "On time", color: "bg-green-100 text-green-800" };
    } else {
      const hours = Math.floor(timeDiffMinutes / 60);
      const minutes = Math.round(timeDiffMinutes % 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return { status: "late", remarks: `Late by ${timeStr}`, color: "bg-yellow-100 text-yellow-800" };
    }
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <section className="bg-[#fff7ec] rounded-2xl shadow-2xl w-full font-poppins max-w-4xl px-10 py-8 mx-auto">
      {/* Tabs Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="text-3xl font-extrabold text-[#3b2b1c]">
            {activeTab === "FINGERPRINT" ? "FINGERPRINT ATTENDANCE" : "QR CODE ATTENDANCE"}
          </h3>
          <p className="text-[#3b2b1c]/80 text-sm">{currentDate}</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#f0e1cc] rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab("FINGERPRINT")}
            className={`px-5 py-2 font-semibold transition ${activeTab === "FINGERPRINT" ? "bg-[#8b7355] text-white" : "text-[#3b2b1c] hover:bg-[#e7d5b9]"}`}
          >
            Fingerprint
          </button>
          <button
            onClick={() => setActiveTab("QR")}
            className={`px-5 py-2 font-semibold transition ${activeTab === "QR" ? "bg-[#8b7355] text-white" : "text-[#3b2b1c] hover:bg-[#e7d5b9]"}`}
          >
            QR Code
          </button>
        </div>
      </div>

      {/* Status Line */}
      <div className="flex items-center gap-2 mb-5 text-[#8b7355] text-lg">
        {error ? (
          <span className="text-red-700 font-semibold">❌ {error}</span>
        ) : successMessage ? (
          <span className="text-green-700 font-semibold">✅ {successMessage}</span>
        ) : activeTab === "FINGERPRINT" && !isConnected ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-[#b97a5b]" />
            <span>Connecting to fingerprint sensor...</span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>{activeTab === "FINGERPRINT" ? "Ready for fingerprint scan..." : "Ready for QR scan..."}</span>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "FINGERPRINT" ? (
        // Fingerprint Tab
        <div className="flex gap-8 items-start">
          <div className="flex-1 bg-gray-900 text-green-400 rounded-xl p-6 h-96 overflow-y-auto font-mono text-sm">
            <h4 className="text-white border-b border-gray-700 pb-2 mb-4 flex items-center gap-2">
              <Fingerprint className="w-5 h-5" /> Live Sensor Log
            </h4>
            {statusLog.length === 0 ? (
              <p className="text-gray-400 italic text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Waiting for sensor data...
              </p>
            ) : (
              statusLog.map((log, i) => (
                <div key={i} className="mb-1">
                  <span className="text-gray-500 text-xs mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>

          <div className="w-80 bg-gradient-to-br from-[#8b7355] to-[#b97a5b] rounded-xl shadow-2xl p-8 text-white text-center">
            <Fingerprint className={`w-32 h-32 mx-auto mb-4 ${isConnected ? "animate-pulse" : "opacity-50"}`} />
            <h4 className="text-xl font-bold">{isConnected ? "Sensor Ready" : "Connecting..."}</h4>
            <p className="text-sm opacity-90">{isConnected ? "Place finger on sensor" : "Please wait..."}</p>
          </div>
        </div>
      ) : (
        // QR Tab
        <div className="flex gap-8 items-start">
          <div className="flex flex-col items-center justify-center bg-[#f4eadb] rounded-xl shadow-inner p-4 min-h-[300px]">
            <QRCodeScanner key="qr-scanner" onScan={(value) => setQrValue(value)} isActive={activeTab === "QR"} />
          </div>

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
                  <p>
                    <strong>Schedule:</strong> {formatTime(employeeData.schedule_time)} (
                    {employeeData.shift === "night" ? "Night Shift" : "Morning Shift"})
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={`px-3 py-1 rounded-md font-semibold ${attendanceRemarks?.color}`}>
                      {attendanceRemarks?.remarks}
                    </span>
                  </p>
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
    </section>
  );
}
