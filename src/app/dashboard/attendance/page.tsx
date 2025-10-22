"use client";

import { useState } from "react";
import { Search, Calendar } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import ViewAttendanceModal from "./view_attendance/ViewModal";


interface Attendance {
  id: string;
  name: string;
  position: string;
  remarks: string;
  timeIn: string;
  timeOut: string;
  shift: string;
  dateTime: string; // YYYY-MM-DD
}

const getCurrentPHDate = () => {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Manila",
  }); // YYYY-MM-DD
};

export default function AttendanceTable() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentPHDate());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [employeeToView, setEmployeeToView] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const attendanceList: Attendance[] = [
    {
      id: "001",
      name: "Alice Johnson",
      position: "Software Engineer",
      remarks: "Present",
      timeIn: "09:00 AM",
      timeOut: "06:00 PM",
      shift: "Morning Shift",
      dateTime: "2025-10-21",
    },
    {
      id: "002",
      name: "Bob Smith",
      position: "Designer",
      remarks: "Late",
      timeIn: "09:30 AM",
      timeOut: "06:00 PM",
      shift: "Morning Shift",
      dateTime: "2025-10-21",
    },
    {
      id: "003",
      name: "Carol Williams",
      position: "HR Manager",
      remarks: "Present",
      timeIn: "08:50 AM",
      timeOut: "05:50 PM",
      shift: "Morning Shift",
      dateTime: "2025-10-20",
    },
  ];

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });


  const filteredAttendance = attendanceList.filter(
    (record) =>
      record.dateTime === selectedDate &&
      (record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewAttendance = (id: string) => {
    setEmployeeToView(id);
  };

  const shortDate = new Date(selectedDate).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-gray-800 font-poppins z-30">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold">
          Date Today:{" "}
          <span className="text-[#3b2b1c] font-[500]">{formattedDate}</span>
        </h1>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
            />
            <Search className="absolute left-3 top-3 text-[#FFA237]" size={18} />
          </div>

          {/* Date Selector */}
          <div className="relative">
            <ActionButton label={shortDate} onClick={() => setIsModalOpen(true)} icon={Calendar} iconPosition="left" className="shadow-md"/>
            {isModalOpen && (
              <div
                className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsModalOpen(false);
                }}
              >
                <div className="bg-white p-6 rounded-lg shadow-lg w-80">
                  <h2 className="text-lg font-bold mb-4">Select Date</h2>
                  <input
                    type="date"
                    value={selectedDate}
                    max={getCurrentPHDate()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                  />
                  <div className="flex justify-end mt-4 gap-2">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded bg-[#3b2b1c] text-white hover:opacity-90"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="w-full overflow-x-auto">
        <h2 className="text-lg font-semibold mb-2">Attendance Records</h2>
        <table className="w-full text-sm table-fixed border-separate border-spacing-y-2">
          <thead className="bg-[#3b2b1c] text-white text-left sticky top-0 z-20">
            <tr>
              <th className="py-4 px-4 rounded-l-lg">ID</th>
              <th className="py-4 px-4">Name</th>
              <th className="py-4 px-4">Position</th>
              <th className="py-4 px-4">Shift</th>
              <th className="py-4 px-4">Remarks</th>
              <th className="py-4 px-4">Time In</th>
              <th className="py-4 px-4">Time Out</th>
              <th className="py-4 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((record) => (
                <tr
                  key={record.id}
                  className="bg-[#fff4e6] border border-orange-100 rounded-lg hover:shadow-sm transition"
                >
                  <td className="py-3 px-4">{record.id}</td>
                  <td className="py-3 px-4 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#800000] flex items-center justify-center text-white text-sm font-semibold">
                      {record.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span>{record.name}</span>
                  </td>
                  <td className="py-3 px-4">{record.position}</td>
                  <td className="py-3 px-4">{record.shift}</td>
                  <td className="py-3 px-4">{record.remarks}</td>
                  <td className="py-3 px-4">{record.timeIn}</td>
                  <td className="py-3 px-4">{record.timeOut}</td>
                  <td className="py-3 px-4 text-left">
                    <button
                      onClick={() => handleViewAttendance(record.id)}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      <Search size={18} className="text-gray-600" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No attendance records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <ViewAttendanceModal
        isOpen={employeeToView !== null}
        onClose={() => setEmployeeToView(null)}
        id={employeeToView!}
      />
    </div>
  );
}