"use client";

import { Loader2, Fingerprint, LogIn, LogOut, Router } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import QRCodeScanner from "./Scanner/QRCodeScanner";
import { attendanceApi, employeeApi, authApi } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import ConfirmModal from "@/components/modals/ConfirmModal";

interface EmployeeQRData {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  position_name: string;
  schedule_time: string;
}

interface AttendanceRemarks {
  status: "present" | "late" | "absent" | "on_leave" | "offline";
  remarks: string;
  color: string;
}

interface HRStaff {
  id: number;
  username: string;
  full_name: string;
  role?: string;
}

export default function AttendanceSystemPage() {
  const [activeTab, setActiveTab] = useState<"FINGERPRINT" | "QR">("FINGERPRINT");

  // HR Authentication States
  const [isHRAuthenticated, setIsHRAuthenticated] = useState(false);
  const [hrStaff, setHrStaff] = useState<HRStaff | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Original States
  const [qrValue, setQrValue] = useState("");
  const [employeeData, setEmployeeData] = useState<EmployeeQRData | null>(null);
  const [attendanceRemarks, setAttendanceRemarks] = useState<AttendanceRemarks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [pendingClockOutEmployeeId, setPendingClockOutEmployeeId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "FINGERPRINT") {
      setActiveTab("FINGERPRINT");
    } else if (tab === "QR") {
      setActiveTab("QR");
    }
  }, [searchParams]);

  const currentDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  /** Reset data when switching tabs */
  useEffect(() => {
    setQrValue("");
    setEmployeeData(null);
    setAttendanceRemarks(null);
    setError(null);
    setSuccessMessage(null);
  }, [activeTab]);

  useEffect(() => {
    const shouldActivate = activeTab === "QR" && isHRAuthenticated && !showClockOutConfirm;
    setQrScannerActive(shouldActivate);
  }, [activeTab, isHRAuthenticated, showClockOutConfirm]);

  /** * CORE LOGIC: Handle Real Data Fetch & Attendance Execution
   * Extracted so it can be called by BOTH Fingerprint and QR Scanners
   */
  const handleEmployeeScan = useCallback(async (employee_id: number, explicit_schedule_time?: string) => {
    try {
      const res = await employeeApi.getById(employee_id);
      
      if (!res?.success || !res.data) {
        setError("Scanned ID is not associated with any employee");
        setEmployeeData(null);
        return;
      }

      // Populate real data from DB
      const normalized: EmployeeQRData = {
        employee_id: res.data.employee_id,
        employee_code: res.data.employee_code,
        first_name: res.data.first_name,
        last_name: res.data.last_name,
        position_name: res.data.position_name,
        // Use QR schedule time if provided, else fallback to real DB schedule_time, else default
        schedule_time: explicit_schedule_time || res.data.schedule_time || "08:00",
      };

      setEmployeeData(normalized);
      const remarks = calculateAttendanceRemarks(normalized);
      setAttendanceRemarks(remarks);
      
      await saveAttendance(normalized, remarks);
    } catch (err) {
      console.error("Employee fetch error:", err);
      setError("Failed to fetch real employee data.");
    }
  }, []);

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
      
      if (data.message?.includes("ERROR:")) {
        setError(data.message.replace("ERROR:", ""));
        setTimeout(() => setError(null), 5000);
      } 
      // REAL DATA HOOK: If the scanner sends a successful match with an employee ID
      else if (data.status === "success" && data.employee_id) {
        handleEmployeeScan(data.employee_id);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Lost connection to fingerprint sensor");
    };

    return () => eventSource.close();
  }, [activeTab, handleEmployeeScan]);

  /** Process QR scanning */
  useEffect(() => {
    if (activeTab !== "QR" || !qrValue || !isHRAuthenticated) return;

    try {
      const data = JSON.parse(qrValue) as EmployeeQRData;
      if (!data || typeof data.employee_id !== "number") {
        setError("QR code not recognized. Please scan a valid employee QR code.");
        setEmployeeData(null);
        return;
      }

      handleEmployeeScan(data.employee_id, data.schedule_time);
    } catch (err) {
      setError("QR code not recognized. Please scan a valid employee QR code.");
      console.error("QR parsing error:", err);
    }
  }, [qrValue, activeTab, isHRAuthenticated, handleEmployeeScan]);

  /** HR Login Handler */
  const handleHRLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const result = await authApi.login(username.trim(), password);

      if (!result.success) {
        setAuthError(result.message || "Invalid username or password.");
        window.location.href = "/attendance_system?tab=QR";
        setAuthLoading(false);
        return;
      }

      const user = (result as any).data?.user;

      if (!user) {
        setAuthError("Unable to resolve HR user profile.");
        setAuthLoading(false);
        return;
      }

      setIsHRAuthenticated(true);
      setHrStaff({
        id: Number(user.user_id || user.id),
        username: String(user.username || username),
        full_name: user.first_name ? `${user.first_name} ${user.last_name}` : String(user.username || username),
        role: user.role ? String(user.role) : "HR Staff",
      });
      
      setQrScannerActive(true);
      setUsername("");
      setPassword("");

    } catch (error) {
      console.error("HR Kiosk Auth Error:", error);
      setAuthError("Unable to connect to server. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleHRLogout = () => {
    setQrScannerActive(false);
    setIsHRAuthenticated(false);
    setHrStaff(null);
    setQrValue("");
    setEmployeeData(null);
    setAttendanceRemarks(null);
    setError(null);
    setSuccessMessage(null);
    setShowClockOutConfirm(false);
    setPendingClockOutEmployeeId(null);
  };

  /** Save attendance record */
  const saveAttendance = async (data: EmployeeQRData, remarks: AttendanceRemarks) => {
    setIsSaving(true);
    try {
      const todayPH = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());

      const existingRes = await attendanceApi.getAll(data.employee_id, todayPH, todayPH);
      const existing = (existingRes?.success && Array.isArray(existingRes.data) && existingRes.data.length > 0)
        ? existingRes.data[0]
        : null;

      if (!existing) {
        const result = await attendanceApi.clockIn(data.employee_id, remarks.status);
        if (result.success) {
          setSuccessMessage("Clocked in successfully!");
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setError(result.message || "Failed to clock in");
        }
        return;
      }

      if (!existing.time_out) {
        setPendingClockOutEmployeeId(data.employee_id);
        setShowClockOutConfirm(true);
        setIsSaving(false);
        return;
      }

      setError("Already clocked out today");
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

  /** Perform confirmed clock-out */
  const performClockOut = async () => {
    if (!pendingClockOutEmployeeId) return;
    setIsSaving(true);
    try {
      const result = await attendanceApi.clockOut(pendingClockOutEmployeeId);
      if (result.success) {
        setSuccessMessage("Clocked out successfully!");
        setError(null);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.message || "Failed to clock out");
      }
    } catch (err) {
      console.error("Error clocking out:", err);
      setError("Failed to clock out");
    } finally {
      setIsSaving(false);
      setPendingClockOutEmployeeId(null);
    }
  };

  // Reusable Component for Employee Data Card
  const EmployeeDataCard = () => (
    <div className="flex-1 space-y-5">
      {employeeData ? (
        <>
          <div className="border rounded-xl border-[#e2cfa8] bg-white p-6 mb-5 shadow-sm">
            <p className="font-bold text-2xl text-[#3b2b1c]">
              {employeeData.first_name} {employeeData.last_name}
            </p>
            <p className="text-lg font-medium text-[#8b7355] mt-1">{employeeData.position_name}</p>
            <div className="mt-3 inline-block bg-[#f0e1cc] text-[#3b2b1c] px-3 py-1 rounded-md text-sm font-semibold">
              ID: {employeeData.employee_code}
            </div>
          </div>
          <div className="text-base space-y-3 bg-white p-6 rounded-xl border border-[#e2cfa8] shadow-sm">
            <div className="flex justify-between border-b pb-3">
              <strong className="text-gray-600">Schedule:</strong> 
              <span className="font-medium text-[#3b2b1c]">{formatTime(employeeData.schedule_time)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <strong className="text-gray-600">Status:</strong>{" "}
              <span className={`px-3 py-1 rounded-md font-bold text-sm shadow-sm ${attendanceRemarks?.color}`}>
                {attendanceRemarks?.remarks}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="border-2 border-dashed border-[#e2cfa8] bg-[#fdfaf5] rounded-xl p-10 text-center flex flex-col items-center justify-center h-full min-h-[250px]">
          <Fingerprint className="w-12 h-12 text-[#d4b88a] mb-4 opacity-50" />
          <p className="text-[#8b7355] font-medium text-lg">Awaiting Scan Data</p>
          <p className="text-sm text-gray-500 mt-2">Employee information will display here</p>
        </div>
      )}
    </div>
  );

  return (
    <section className="bg-[#fff7ec] rounded-2xl shadow-2xl w-full font-poppins max-w-5xl px-10 py-8 mx-auto">
      {/* Tabs Header */}
      <div className="flex justify-between items-center mb-6 border-b border-[#e2cfa8] pb-4">
        <div>
          <h3 className="text-3xl font-extrabold text-[#3b2b1c]">
            {activeTab === "FINGERPRINT" ? "FINGERPRINT ATTENDANCE" : "QR CODE ATTENDANCE"}
          </h3>
          <p className="text-[#8b7355] font-medium text-sm mt-1">{currentDate}</p>
        </div>

        {/* Tab Buttons + HR Status */}
        <div className="flex items-center gap-4">
          <div className="flex bg-[#f0e1cc] rounded-lg overflow-hidden border border-[#d4b88a]">
            <button
              onClick={() => setActiveTab("FINGERPRINT")}
              className={`px-5 py-2.5 font-bold transition ${activeTab === "FINGERPRINT" ? "bg-[#3b2b1c] text-white" : "text-[#3b2b1c] hover:bg-[#e7d5b9]"}`}
            >
              Fingerprint
            </button>
            <button
              onClick={() => setActiveTab("QR")}
              className={`px-5 py-2.5 font-bold transition ${activeTab === "QR" ? "bg-[#3b2b1c] text-white" : "text-[#3b2b1c] hover:bg-[#e7d5b9]"}`}
            >
              QR Code
            </button>
          </div>

          {activeTab === "QR" && isHRAuthenticated && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
              HR Access: {hrStaff?.full_name}
              <button
                onClick={handleHRLogout}
                className="ml-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== HR AUTHENTICATION FORM (QR Tab Only) ==================== */}
      {activeTab === "QR" && !isHRAuthenticated && (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-10 border border-[#e2cfa8] my-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[#3b2b1c] rounded-full flex items-center justify-center mb-4 shadow-md">
              <LogIn className="w-8 h-8 text-[#f0e1cc]" />
            </div>
            <h2 className="text-2xl font-bold text-[#3b2b1c]">HR Authentication Required</h2>
            <p className="text-[#8b7355] text-sm mt-2 font-medium">Please login as HR to unlock the scanner</p>
          </div>

          <form onSubmit={handleHRLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#3b2b1c] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#faf7f2] border border-[#d4b88a] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b7355]"
                placeholder="hradmin"
                required
                autoFocus
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3b2b1c] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#faf7f2] border border-[#d4b88a] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b7355] pr-12"
                  placeholder="Enter password"
                  required
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#8b7355] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908l3.42 3.42m-3.42-3.42l3.42-3.42" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5 16.477 5 20.268 7.943 21.542 12 20.268 16.057 16.477 19 12 19 7.523 19 3.732 16.057 2.458 12z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-red-700 text-sm font-semibold text-center bg-red-50 border border-red-100 p-3 rounded-xl">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#3b2b1c] hover:bg-[#5C2A15] disabled:bg-[#a38a6e] text-white font-bold py-3.5 mt-2 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Unlock Scanner"
              )}
            </button>
          </form>
        </div>
      )}

      {/* Main Content - Shown only for Fingerprint or when HR is authenticated for QR */}
      {(activeTab === "FINGERPRINT" || isHRAuthenticated) && (
        <>
          {/* Status Line */}
          <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-lg border border-[#e2cfa8] shadow-sm">
            {error ? (
              <span className="text-red-700 font-bold flex items-center gap-2">❌ {error}</span>
            ) : successMessage ? (
              <span className="text-green-700 font-bold flex items-center gap-2">✅ {successMessage}</span>
            ) : activeTab === "FINGERPRINT" && !isConnected ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#b97a5b]" />
                <span className="text-[#8b7355] font-semibold">Connecting to Biometric Hardware...</span>
              </>
            ) : (
              <>
                <div className="w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span className="text-[#3b2b1c] font-bold">
                  {activeTab === "FINGERPRINT" ? "Scanner Online — Ready for Fingerprint" : "Camera Active — Show QR Code"}
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* LEFT COLUMN: Input Device (Sensor Log OR Camera) */}
            {activeTab === "FINGERPRINT" ? (
              <div className="flex flex-col gap-4 h-full">
                {/* Fingerprint Visual UI */}
                <div className={`flex flex-col items-center justify-center rounded-2xl shadow-inner p-8 text-white text-center transition-all duration-300 border-2 ${employeeData && !error ? "bg-green-600 border-green-500" : isConnected ? "bg-[#3b2b1c] border-[#2a1107]" : "bg-gray-500 border-gray-600"}`}>
                  <Fingerprint className={`w-24 h-24 mb-4 ${isConnected ? "animate-pulse text-[#D4A056]" : "opacity-50"}`} />
                  <h4 className="text-xl font-bold tracking-wide">
                    {employeeData && !error ? "Match Successful" : isConnected ? "Sensor Active" : "Initializing"}
                  </h4>
                </div>
                
                {/* Hardware Log */}
                <div className="flex-1 bg-gray-900 text-green-400 rounded-2xl p-5 overflow-y-auto font-mono text-sm border-2 border-gray-800 shadow-md min-h-[200px]">
                  <h4 className="text-white border-b border-gray-700 pb-2 mb-3 flex items-center gap-2 font-sans font-bold">
                    <Fingerprint className="w-4 h-4" /> Hardware Output
                  </h4>
                  {statusLog.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-6">
                      Waiting for sensor data...
                    </p>
                  ) : (
                    statusLog.map((log, i) => (
                      <div key={i} className="mb-1 flex gap-2">
                        <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={log.message.includes("ERROR") ? "text-red-400" : "text-green-400"}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-[#e2cfa8] p-4 min-h-[400px]">
                <QRCodeScanner 
                  key="qr-scanner" 
                  onScan={(value) => setQrValue(value)} 
                  isActive={qrScannerActive} 
                />
              </div>
            )}

            {/* RIGHT COLUMN: Real DB Employee Data Profile */}
            <EmployeeDataCard />
          </div>
        </>
      )}

      {/* Clock-out confirmation modal */}
      <ConfirmModal
        isOpen={showClockOutConfirm}
        onClose={() => setShowClockOutConfirm(false)}
        onConfirm={performClockOut}
        title="Confirm Clock Out"
        message={`Detected a prior clock-in today for ${employeeData ? employeeData.first_name + ' ' + employeeData.last_name : 'this employee'}${employeeData?.employee_code ? ` (Code: ${employeeData.employee_code})` : ''}. Proceed to clock out?`}
        confirmText={isSaving ? "Saving..." : "Clock Out"}
        cancelText="Cancel"
      />
    </section>
  );
}