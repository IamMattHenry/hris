"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import InfoBox from "@/components/forms/FormDisplay";
import ActionButton from "@/components/buttons/ActionButton";

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: string | null;
}

interface AttendanceData {
  employee_id: string;
  first_name: string;
  last_name: string;
  department_name: string;
  position_name: string;
  time_in: string;
  time_out: string;
  shift: string;
  sub_role?: string;
  status: string;
  attendance_summary: {
    present: number;
    absent: number;
    leave: number;
    holiday: number;
  };
}

// Sample Data
const sampleData: AttendanceData[] = [
  {
    employee_id: "001",
    first_name: "Alice",
    last_name: "Johnson",
    department_name: "Engineering",
    position_name: "Software Engineer",
    time_in: "09:00 AM",
    time_out: "06:00 PM",
    shift: "Morning",
    sub_role: "Frontend",
    status: "Present",
    attendance_summary: {
      present: 20,
      absent: 1,
      leave: 2,
      holiday: 1,
    },
  },
  {
    employee_id: "002",
    first_name: "Bob",
    last_name: "Smith",
    department_name: "Design",
    position_name: "UI/UX Designer",
    time_in: "09:30 AM",
    time_out: "06:00 PM",
    shift: "Morning",
    sub_role: "Lead Designer",
    status: "Present",
    attendance_summary: {
      present: 18,
      absent: 2,
      leave: 1,
      holiday: 1,
    },
  },
];

export default function ViewAttendanceModal({ isOpen, onClose, id }: ViewEmployeeModalProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);

  // Fetch employee data when modal opens
  useEffect(() => {
    if (isOpen && id !== null) {
      const tempData = sampleData.find((emp) => emp.employee_id === id);
      setAttendance(tempData || sampleData[0]);
    }
  }, [isOpen, id]);

  if (!isOpen || !attendance) return null;

  // Action Handlers
  const handleOvertime = (employeeId?: string) => {
    alert(`Set overtime for ${employeeId}`);
  };

  const handleAbsent = (employeeId?: string) => {
    alert(`Set absent for ${employeeId}`);
  };

  const handleLeave = (employeeId?: string) => {
    alert(`Set leave for ${employeeId}`);
  };

  return (
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

        {/* Employee Info Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold">
            {attendance.first_name} {attendance.last_name}
          </h2>
          <div className="text-sm text-gray-600 mt-1 space-y-2 py-4">
            <InfoBox label="ID:" value={attendance.employee_id} />
            <InfoBox label="Role:" value={attendance.sub_role || attendance.position_name} />
            <InfoBox label="Department:" value={attendance.department_name} />
            <InfoBox label="Shift:" value={attendance.shift} />
            <InfoBox label="Time in:" value={attendance.time_in || "-"} />
            <InfoBox label="Time out:" value={attendance.time_out || "-"} />
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">Attendance Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-inner p-4 text-center">
              <p className="text-sm text-gray-600">No. Of Present</p>
              <p className="font-bold text-xl">{attendance.attendance_summary.present}</p>
            </div>
            <div className="bg-white rounded-lg shadow-inner p-4 text-center">
              <p className="text-sm text-gray-600">No. Of Absence</p>
              <p className="font-bold text-xl">{attendance.attendance_summary.absent}</p>
            </div>
            <div className="bg-white rounded-lg shadow-inner p-4 text-center">
              <p className="text-sm text-gray-600">No. Of Leave</p>
              <p className="font-bold text-xl">{attendance.attendance_summary.leave}</p>
            </div>
            <div className="bg-white rounded-lg shadow-inner p-4 text-center">
              <p className="text-sm text-gray-600">No. Of Holiday</p>
              <p className="font-bold text-xl">{attendance.attendance_summary.holiday}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-4">
          <ActionButton label="Mark As Overtime" value={attendance.employee_id} onClick={handleOvertime} />
          <ActionButton label="Mark As Absent" value={attendance.employee_id} onClick={handleAbsent} />
          <ActionButton label="Mark As Leave" value={attendance.employee_id} onClick={handleLeave} />
        </div>
      </motion.div>
    </div>
  );
}
