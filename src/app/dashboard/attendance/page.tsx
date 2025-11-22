"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Calendar, RotateCw, UserX } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import ViewAttendanceModal from "./view_attendance/ViewModal";
import { attendanceApi } from "@/lib/api";
import { toast } from "react-hot-toast";

type AttendanceStatus = "present" | "absent" | "late" | "half_day" | "on_leave" | "work_from_home" | "others" | "offline";

interface Attendance {
  attendance_id: number | null;
  attendance_code: string | null;
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name?: string | null;
  date: string;
  time_in: string | null;
  time_out: string | null;
  status: AttendanceStatus;
  overtime_hours: number;
  remarks?: string;
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

const getCurrentPHDate = () => {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Manila",
  }); // YYYY-MM-DD
};

export default function AttendanceTable() {
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentPHDate());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [attendanceToView, setAttendanceToView] = useState<number | null>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // change page size here

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const result = await attendanceApi.getAll(undefined, selectedDate, selectedDate, true);
    console.log(result);
    if (result.success && result.data) {
      setAttendanceList(result.data as Attendance[]);
    };
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAttendance();
    setIsRefreshing(false);
  };

  const handleMarkAbsences = async () => {
    const todayPH = getCurrentPHDate();
    if (!selectedDate || selectedDate >= todayPH) {
      toast.error("You can only mark absences for past dates.");
      return;
    }
    const confirmed = window.confirm(`Mark absences (no-shows) for ${selectedDate}?`);
    if (!confirmed) return;

    setIsMarking(true);
    try {
      const result = await attendanceApi.markAbsences(selectedDate);
      if (result.success) {
        toast.success(result.message || `Marked absences for ${selectedDate}`);
        await fetchAttendance();
      } else {
        toast.error(result.message || "Failed to mark absences");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while marking absences.");
    } finally {
      setIsMarking(false);
    }
  };

  const filteredAttendance = attendanceList.filter(
    (record) =>
      `${record.first_name} ${record.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.attendance_code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (record.department_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAttendance = filteredAttendance.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewAttendance = (id: number) => {
    setAttendanceToView(id);
  };

  const shortDate = new Date(selectedDate).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b2b1c] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  const formatDateTimeTo12Hour = (dateTimeString: string = "") => {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return "-";

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";

    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period}`;
  };

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
          <SearchBar placeholder="Search employee..." value={searchTerm} onChange={setSearchTerm} />

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#3b2b1c] hover:bg-[#3b2b1c]-600 disabled:bg-gray-400 text-white transition flex items-center gap-2"
            title="Refresh attendance records"
          >
            <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Mark Absences (No-Shows) */}
          <button
            onClick={handleMarkAbsences}
            disabled={isMarking || selectedDate >= getCurrentPHDate()}
            className="p-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white transition flex items-center gap-2"
            title="Mark no-shows as Absent for the selected past date"
          >
            <UserX className="w-5 h-5" />
            <span className="hidden sm:inline">Mark Absences</span>
          </button>

          {/* Date Selector */}
          <div className="relative">
            <ActionButton label={shortDate} onClick={() => setIsDateModalOpen(true)} icon={Calendar} iconPosition="left" className="shadow-md" />
            {isDateModalOpen && (
              <div
                className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsDateModalOpen(false);
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
                      onClick={() => setIsDateModalOpen(false)}
                      className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setIsDateModalOpen(false)}
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
      <div className="w-full">
        <h2 className="text-lg font-semibold mb-2">Attendance Records</h2>
        <table className="w-full text-sm">
          <thead className="bg-[#3b2b1c] text-white text-left sticky top-0 z-20">
            <tr>
              <th className="py-4 px-4">Employee Code</th>
              <th className="py-4 px-4">Employee Name</th>
              <th className="py-4 px-4">Department</th>
              <th className="py-4 px-4">Date</th>
              <th className="py-4 px-4">Time In</th>
              <th className="py-4 px-4">Time Out</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-center">View</th>
            </tr>
          </thead>
          <tbody>
            {currentAttendance.length > 0 ? (
              currentAttendance.map((record) => (
                <tr
                  key={record.attendance_id ?? `offline-${record.employee_id}-${record.date}`}
                  className="border-b border-[#eadfcd] hover:bg-[#fdf4e7] transition"
                >
                  <td className="py-3 px-4">{record.employee_code}</td>
                  <td className="py-3 px-4 flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#800000] flex items-center justify-center text-white text-sm font-semibold">
                      {`${record.first_name} ${record.last_name}`
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span>{record.first_name} {record.last_name}</span>
                  </td>
                  <td className="py-3 px-4">{record.department_name || "-"}</td>
                  <td className="py-3 px-4">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{record.time_in ? formatDateTimeTo12Hour(record.time_in) : "-"}</td>
                  <td className="py-3 px-4">{record.time_out ? formatDateTimeTo12Hour(record.time_out) : "-"}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      record.status === "present" ? "bg-green-100 text-green-800" :
                      record.status === "absent" ? "bg-red-100 text-red-800" :
                      record.status === "late" ? "bg-yellow-100 text-yellow-800" :
                      record.status === "half_day" ? "bg-orange-100 text-orange-800" :
                      record.status === "on_leave" ? "bg-blue-100 text-blue-800" :
                      record.status === "work_from_home" ? "bg-purple-100 text-purple-800" :
                      record.status === "offline" ? "bg-gray-200 text-gray-600" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {STATUS_LABELS[record.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {record.status !== "offline" && record.attendance_id ? (
                      <button
                        onClick={() => handleViewAttendance(record.attendance_id!)}
                        className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                      >
                        <Search size={18} className="text-gray-600" />
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
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
      {/* pagination */}
      <div className="flex justify-center items-center gap-4 mt-4 select-none">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <div className="flex items-center gap-1 overflow-hidden truncate">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(
              Math.max(currentPage - 2, 0),
              Math.min(currentPage + 1, totalPages)
            )
            .map((num) => (
              <button
                key={num}
                onClick={() => goToPage(num)}
                className={`px-3 py-2 rounded text-sm transition cursor-pointer truncate ${currentPage === num
                    ? "bg-[#3b2b1c] text-white"
                    : "text-[#3b2b1c] hover:underline"
                  }`}
              >
                {num}
              </button>
            ))}

          {/* Ellipsis if many pages */}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="px-1 text-[#3b2b1c] truncate">...</span>
          )}
        </div>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
      {/* Modal */}
      <ViewAttendanceModal
        isOpen={attendanceToView !== null}
        onClose={() => setAttendanceToView(null)}
        attendanceId={attendanceToView}
      />
    </div>
  );
}