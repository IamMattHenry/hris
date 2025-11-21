
"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import InfoBox from "@/components/forms/FormDisplay";
import { attendanceApi } from "@/lib/api";

type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "on_leave" | "work_from_home" | "others" | "offline";

interface ViewAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: number | null;
}

interface AttendanceData {
  attendance_id: number;
  attendance_code: string;
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  status: AttendanceStatus;
  overtime_hours: number;
  remarks?: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  leave: number;
  late: number;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half-Day",
  on_leave: "On Leave",
  work_from_home: "Work From Home",
  others: "Others",
  offline: "Offline",
};

// Utility function to convert time or datetime to 12-hour format with AM/PM (Philippine Time)
const formatTime12Hour = (timeString: string | null): string => {
  if (!timeString) return "-";

  try {
    // Support both HH:MM:SS and YYYY-MM-DD HH:MM:SS (or ISO) formats
    let timePart = timeString;
    if (timePart.includes(" ")) timePart = timePart.split(" ")[1];
    else if (timePart.includes("T")) timePart = timePart.split("T")[1];
    timePart = timePart.slice(0, 8);

    const [hoursStr, minutesStr] = timePart.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch {
    return timeString;
  }
};

// Utility function to format date with Philippine locale
const formatDatePH = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return dateString;
  }
};

export default function ViewAttendanceModal({ isOpen, onClose, attendanceId }: ViewAttendanceModalProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeInput, setOvertimeInput] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch attendance data when modal opens
  useEffect(() => {
    if (isOpen && attendanceId !== null) {
      fetchAttendance();
    }
  }, [isOpen, attendanceId]);

  const fetchAttendance = async () => {
    if (!attendanceId) return;
    setLoading(true);
    const result = await attendanceApi.getById(attendanceId);
    if (result.success && result.data) {
      const data = result.data as AttendanceData;
      setAttendance(data);
      fetchSummary(data.employee_id);
    }
    setLoading(false);
  };

  const fetchSummary = async (employee_id: number) => {
    const result = await attendanceApi.getSummary(employee_id);
    if (result.success && result.data) {
      setSummary(result.data as AttendanceSummary);
    }
  };

  if (!isOpen || !attendance) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b2b1c] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading attendance details...</p>
        </div>
      </div>
    );
  }

  // Check if buttons should be disabled
  const isOvertimeDisabled = attendance.status === "absent" || attendance.status === "on_leave" || actionLoading;
  const isAbsentDisabled = attendance.status === "absent" || actionLoading;
  const isLeaveDisabled = attendance.status === "on_leave" || actionLoading;

  // Action Handlers
  const handleOvertime = () => {
    if (isOvertimeDisabled) return;
    setShowOvertimeModal(true);
    setOvertimeInput("");
  };

  const submitOvertime = async () => {
    const overtimeValue = parseFloat(overtimeInput);

    if (!overtimeInput || isNaN(overtimeValue) || overtimeValue < 0) {
      setMessage({ type: "error", text: "Please enter a valid positive number" });
      return;
    }

    if (overtimeValue > 8) {
      setMessage({ type: "error", text: "Overtime hours cannot exceed 8 hours" });
      return;
    }

    setActionLoading(true);
    const result = await attendanceApi.updateOvertime(attendance.attendance_id, overtimeValue);
    setActionLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Overtime hours updated successfully" });
      setShowOvertimeModal(false);
      setAttendance({ ...attendance, overtime_hours: overtimeValue });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: result.message || "Failed to update overtime hours" });
    }
  };

  const handleAbsent = async () => {
    if (isAbsentDisabled) return;
    if (!confirm("Are you sure you want to mark this as absent?")) return;

    setActionLoading(true);
    const result = await attendanceApi.updateStatus(attendance.attendance_id, "absent");
    setActionLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Status updated to Absent" });
      setAttendance({ ...attendance, status: "absent" });
      await fetchSummary(attendance.employee_id);
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: result.message || "Failed to update status" });
    }
  };

  const handleLeave = async () => {
    if (isLeaveDisabled) return;
    if (!confirm("Are you sure you want to mark this as on leave?")) return;

    setActionLoading(true);
    const result = await attendanceApi.updateStatus(attendance.attendance_id, "on_leave");
    setActionLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Status updated to On Leave" });
      setAttendance({ ...attendance, status: "on_leave" });
      await fetchSummary(attendance.employee_id);
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: result.message || "Failed to update status" });
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-[#fdf3e2] w-full max-w-3xl p-8 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
          >
            <X size={26} />
          </button>

          {/* Success/Error Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {message.text}
            </div>
          )}

          {/* Employee Info Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold">
              {attendance.first_name} {attendance.last_name}
            </h2>
            <div className="text-sm text-gray-600 mt-1 space-y-2 py-4">
              <InfoBox label="Attendance Code:" value={attendance.attendance_code} />
              <InfoBox label="Employee Code:" value={attendance.employee_code} />
              <InfoBox label="Date:" value={formatDatePH(attendance.date)} />
              <InfoBox label="Time In:" value={formatTime12Hour(attendance.time_in)} />
              <InfoBox label="Time Out:" value={formatTime12Hour(attendance.time_out)} />
              <InfoBox label="Status:" value={STATUS_LABELS[attendance.status]} />
              <InfoBox label="Overtime Hours:" value={attendance.overtime_hours.toString()} />
              {attendance.remarks && (
                <InfoBox label="Remarks:" value={attendance.remarks} />
              )}
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-2">Attendance Summary</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-inner p-4 text-center">
                <p className="text-sm text-gray-600">No. Of Present</p>
                <p className="font-bold text-xl">{summary?.present || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-inner p-4 text-center">
                <p className="text-sm text-gray-600">No. Of Absence</p>
                <p className="font-bold text-xl">{summary?.absent || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-inner p-4 text-center">
                <p className="text-sm text-gray-600">No. Of Leave</p>
                <p className="font-bold text-xl">{summary?.leave || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow-inner p-4 text-center">
                <p className="text-sm text-gray-600">No. Of Late</p>
                <p className="font-bold text-xl">{summary?.late || 0}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {/* Mark As Overtime Button */}
            <button
              onClick={handleOvertime}
              disabled={isOvertimeDisabled}
              title={isOvertimeDisabled ? "Overtime cannot be set for absent or on leave status" : ""}
              className={`flex items-center justify-center px-6 py-3 rounded-full shadow-md transition ${
                isOvertimeDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                  : "bg-[#3b2b1c] text-white cursor-pointer hover:opacity-90"
              }`}
            >
              Mark As Overtime
            </button>

            {/* Mark As Absent Button */}
            <button
              onClick={handleAbsent}
              disabled={isAbsentDisabled}
              title={isAbsentDisabled ? "Already marked as absent" : ""}
              className={`flex items-center justify-center px-6 py-3 rounded-full shadow-md transition ${
                isAbsentDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                  : "bg-[#3b2b1c] text-white cursor-pointer hover:opacity-90"
              }`}
            >
              Mark As Absent
            </button>

            {/* Mark As Leave Button */}
            <button
              onClick={handleLeave}
              disabled={isLeaveDisabled}
              title={isLeaveDisabled ? "Already marked as on leave" : ""}
              className={`flex items-center justify-center px-6 py-3 rounded-full shadow-md transition ${
                isLeaveDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                  : "bg-[#3b2b1c] text-white cursor-pointer hover:opacity-90"
              }`}
            >
              Mark As Leave
            </button>
          </div>
        </motion.div>
      </div>

      {/* Overtime Input Modal */}
      {showOvertimeModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
          onClick={() => setShowOvertimeModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[#fdf3e2] p-6 rounded-2xl shadow-lg text-[#3b2b1c] w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Enter Overtime Hours</h3>
            <input
              type="number"
              min="0"
              step="0.5"
              value={overtimeInput}
              onChange={(e) => setOvertimeInput(e.target.value)}
              placeholder="Enter hours"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowOvertimeModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={submitOvertime}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Submit"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
