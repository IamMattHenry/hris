"use client";

import { useState, useEffect } from "react";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { RefreshCcw } from "lucide-react";
import { Employee, Attendance } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";

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
        const [empResult] = await Promise.all([
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
      <div className="min-h-screen flex items-center justify-center bg-[#fdf9f3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#073532] mx-auto mb-4"></div>
          <p className="text-sm font-medium text-gray-600">Loading your attendance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf9f3]">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100">
          <p className="text-base text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#073532] text-white px-6 py-2 rounded-lg hover:bg-[#0a4d49] transition font-medium text-sm"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-poppins bg-[#fdf9f3]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#281b0d] tracking-tight">Attendance & Logs</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor your monthly timesheets and attendance summary.</p>
          </div>
        </div>

        {/* Top Section: Employee Info & Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Employee Mini-Profile */}
          <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#fdf9f3] text-[#412f23] border border-gray-200 flex items-center justify-center text-2xl font-bold shrink-0">
              {currentEmployee?.first_name?.charAt(0)}
              {currentEmployee?.last_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {currentEmployee?.first_name} {currentEmployee?.last_name}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5">{currentEmployee?.position_name || 'Employee'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  ID: {currentEmployee?.employee_code}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#073532]/10 text-[#073532] px-2 py-0.5 rounded-full">
                  {currentEmployee?.department_name || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Present', value: employeeAttendanceSummary?.present || 0, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Absent', value: employeeAttendanceSummary?.absent || 0, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'On Leave', value: employeeAttendanceSummary?.leave || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Late', value: employeeAttendanceSummary?.late || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col justify-center items-center text-center">
                <div className={`w-10 h-10 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
                  <span className="text-xl font-bold">{stat.value}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Logs Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Toolbar */}
          <div className="px-6 py-5 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-gray-900">Timesheet Logs</h3>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#073532] focus:border-[#073532] block w-full pl-4 pr-10 py-2 font-medium cursor-pointer transition-colors hover:bg-gray-100"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <button 
                onClick={handleRefresh}
                className="flex items-center justify-center p-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-[#073532] transition-colors"
                title="Refresh Logs"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200 font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Date</th>
                  <th scope="col" className="px-6 py-4">Time In</th>
                  <th scope="col" className="px-6 py-4">Time Out</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4 text-center">Overtime (Hrs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <tr key={record.date} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {record.time_in ? (
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium text-xs">
                            {formatDateTimeTo12Hour(record.time_in)}
                          </span>
                        ) : <span className="text-gray-400">--:--</span>}
                      </td>
                      <td className="px-6 py-4">
                        {record.time_out ? (
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium text-xs">
                            {formatDateTimeTo12Hour(record.time_out)}
                          </span>
                        ) : <span className="text-gray-400">--:--</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          record.status === 'present' ? 'bg-green-100 text-green-800 border border-green-200' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800 border border-red-200' :
                          record.status === 'late' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          record.status === 'on_leave' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {record.overtime_hours > 0 ? (
                          <span className="text-gray-900">{record.overtime_hours}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">No records found</p>
                        <p className="text-xs text-gray-500 mt-1">There are no attendance logs for this month.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-medium text-gray-500">
                Showing <span className="font-bold text-gray-900">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * rowsPerPage, attendanceRecords.length)}</span> of <span className="font-bold text-gray-900">{attendanceRecords.length}</span> entries
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Simple pagination logic to avoid rendering too many buttons
                    if (totalPages > 5 && (page < currentPage - 1 || page > currentPage + 1) && page !== 1 && page !== totalPages) {
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 py-1.5 text-gray-400 text-xs">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-8 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-[#073532] text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <FloatingTicketButton />
    </div>
  );
}