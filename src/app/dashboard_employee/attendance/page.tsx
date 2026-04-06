"use client";

import { useState, useEffect } from "react";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { RefreshCcw } from "lucide-react";
import { Employee, Attendance } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import ActionButton from "@/components/buttons/ActionButton";

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [employeeAttendanceSummary, setEmployeeAttendanceSummary] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const fetchAttendanceData = async (month: number) => {
    if (!user?.employee_id) return;

    try {
      const attendanceSummaryResult = await attendanceApi.getSummary(user.employee_id);
      if (attendanceSummaryResult.success && attendanceSummaryResult.data) {
        setEmployeeAttendanceSummary(attendanceSummaryResult.data);
      }

      const year = new Date().getFullYear();

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);

      const attendanceRecordsResult = await attendanceApi.getAll(
        user.employee_id,
        startOfMonth.toISOString().split("T")[0],
        endOfMonth.toISOString().split("T")[0]
      );

      if (attendanceRecordsResult.success && attendanceRecordsResult.data) {
        setAttendanceRecords(attendanceRecordsResult.data as Attendance[]);
        setCurrentPage(1); // Reset to first page when month changes
      }

    } catch (err) {
      console.error("Error fetching attendance data:", err);
    }
  };

  const formatDateTimeTo12Hour = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return "-";

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";

    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes} ${period}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [empResult, statsResult] = await Promise.all([
          employeeApi.getAll(),
          leaveApi.getDashboardStats(),
        ]);

        if (empResult.success && empResult.data) {
          setEmployees(empResult.data as Employee[]);
        } else {
          setError(empResult.message || "Failed to fetch employees");
        }

        if (user?.employee_id) {
          const employeeResult = await employeeApi.getById(user.employee_id);
          if (employeeResult.success && employeeResult.data) {
            setCurrentEmployee(employeeResult.data as Employee);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (user?.employee_id) {
      fetchAttendanceData(selectedMonth);
    }
  }, [selectedMonth, user?.employee_id]);

  // Pagination calculations
  const totalPages = Math.ceil(attendanceRecords.length / rowsPerPage);
  const paginatedRecords = attendanceRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleRefresh = () => {
    fetchAttendanceData(selectedMonth);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b4513] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#8b4513] text-white px-6 py-2 rounded-lg hover:bg-[#a0522d] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Attendance Summary Section (unchanged) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
          {/* ... [Your existing Attendance Summary + Employee Info + Summary Cards] ... */}
          {/* (Keeping your original summary section as-is for brevity) */}

          <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
            <hr className="w-full border-none mb-4" />
            <h2 className="text-3xl font-semibold text-white">Attendance</h2>
            <p className="text-lg font-light text-white text-right">
              Month: {new Date().toLocaleDateString("en-US", {
                timeZone: "Asia/Manila",
                month: "long"
              })}
            </p>

            {/* Employee Information Card */}
            <div className="bg-white rounded-xl shadow-sm p-7 border border-[#e8dcc8] mt-4">
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-[100px] h-[100px] rounded-lg bg-gray-300 flex items-center justify-center">
                    <span className="text-3xl font-semibold text-gray-700">
                      {currentEmployee?.first_name?.charAt(0)}
                      {currentEmployee?.last_name?.charAt(0)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-3xl font-bold text-gray-700">
                    {currentEmployee?.first_name} {currentEmployee?.last_name}
                  </p>
                </div>

                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-600">ID: {currentEmployee?.employee_code}</p>
                  <p className="text-sm text-gray-600">Department: {currentEmployee?.department_name}</p>
                  <p className="text-sm text-gray-600">Role: {currentEmployee?.position_name || 'N/A'}</p>
                </div>
              </div>
            </div>

            <hr className="w-full border-none mb-6" />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Present', value: employeeAttendanceSummary?.present || 0 },
                { label: 'Absent', value: employeeAttendanceSummary?.absent || 0 },
                { label: 'On Leave', value: employeeAttendanceSummary?.leave || 0 },
                { label: 'Late', value: employeeAttendanceSummary?.late || 0 },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-4 border border-[#e8dcc8]">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                    <p className="text-sm text-gray-600">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Month Selector & Logs Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-normal text-gray-800">Logs</h3>
              <div className="flex items-center space-x-4">
                <ActionButton label="Refresh" icon={RefreshCcw} onClick={handleRefresh} />

                <div>
                  <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Month:
                  </label>
                  <select
                    id="month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Records Table with Pagination */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-gray-600">
                <thead className="bg-[#073532] text-white text-center sticky top-0 z-20">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2">Date</th>
                    <th className="border border-gray-300 px-4 py-2">Time In</th>
                    <th className="border border-gray-300 px-4 py-2">Time Out</th>
                    <th className="border border-gray-300 px-4 py-2">Status</th>
                    <th className="border border-gray-300 px-4 py-2">Overtime Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record) => (
                      <tr key={record.date} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {record.time_in ? formatDateTimeTo12Hour(record.time_in) : '--'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {record.time_out ? formatDateTimeTo12Hour(record.time_out) : '--'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                            record.status === 'on_leave' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {record.overtime_hours || 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        No attendance records found for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-2">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                  {Math.min(currentPage * rowsPerPage, attendanceRecords.length)} of{' '}
                  {attendanceRecords.length} records
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 border rounded-md text-gray-600 ${
                          currentPage === page
                            ? 'bg-[#073532] text-white border-[#073532]'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingTicketButton />
    </div>
  );
}