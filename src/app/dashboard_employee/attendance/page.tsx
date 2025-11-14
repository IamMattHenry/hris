"use client";

import { useState, useEffect } from "react";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { RefreshCcw } from "lucide-react"
import { Employee, Attendance } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import ActionButton from "@/components/buttons/ActionButton";


export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [employeeAttendanceSummary, setEmployeeAttendanceSummary] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);


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
      }

    } catch (err) {
      console.error("Error fetching attendance data:", err);
    }
  };

 const formatTo12Hour = (timeString: string | null) => {
    if (!timeString) return "-";

    try {
      // Handle both "HH:MM:SS" and "HH:MM" formats
      const timeParts = timeString.split(":");
      if (timeParts.length >= 2) {
        let hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);

        // Subtract 21 hours (handle negative wrap-around)
        hours = (hours - 20 + 24) % 24;

        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0");

        return `${displayHours}:${formattedMinutes} ${period}`;
      }

      return timeString;
    } catch (error) {
      return timeString;
    }
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

        // Fetch current employee's detailed data
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

  // Attendance summary data 
  const attendanceSummaryData = [
    { name: 'Present', value: employeeAttendanceSummary?.present || 0 },
    { name: 'On Leave', value: employeeAttendanceSummary?.leave || 0 },
    { name: 'Absent', value: employeeAttendanceSummary?.absent || 0 },
    { name: 'Late', value: employeeAttendanceSummary?.late || 0 },
  ];

  const handleRefresh = () => {
    fetchAttendanceData(selectedMonth);
  }

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Attendance Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
          {/* Attendance Box */}
          <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
            <hr className="w-full border-none mb-4" />
            <h2 className="text-3xl font-semibold text-white">
              Attendance
            </h2>
            <p className="text-lg font-light text-white text-right">
              Month: {new Date().toLocaleDateString("en-US", {
                timeZone: "Asia/Manila",
                month: "long"
              })}
            </p>
            {/* Employee Information */}
            <div className="bg-white rounded-xl shadow-sm p-7 border border-[#e8dcc8] mt-4">
              <div className="flex items-start space-x-6">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <Image
                    src="/assets/user-img.png"
                    alt="Employee Profile Picture"
                    width={100}
                    height={100}
                    className="rounded-lg"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="text-left">

                    <p className="text-3xl text-bold text-gray-700">{currentEmployee?.first_name} {currentEmployee?.last_name}</p>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="flex-1 space-y-2">
                  <div className="text-left">
                    <p className="text-sm text-gray-600">ID: {currentEmployee?.employee_code}</p>
                  </div>

                  <div className="text-left">
                    <p className="text-sm text-gray-600">Department: {currentEmployee?.department_name}</p>
                  </div>

                  <div className="text-left">
                    <p className="text-sm text-gray-600">Role: {currentEmployee?.position_name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Horizontal Divider */}
            <hr className="w-full border-none mb-6" />

            {/* Attendance Information */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8dcc8]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{employeeAttendanceSummary?.present || 0}</p>
                  <p className="text-sm text-gray-600">Present</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8dcc8]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{employeeAttendanceSummary?.absent || 0}</p>
                  <p className="text-sm text-gray-600">Absent</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8dcc8]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{employeeAttendanceSummary?.leave || 0}</p>
                  <p className="text-sm text-gray-600">On Leave</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-[#e8dcc8]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{employeeAttendanceSummary?.late || 0}</p>
                  <p className="text-sm text-gray-600">Late</p>
                </div>
              </div>
            </div>
          </div>


          {/* Month Selector */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              
              <h3 className="text-2xl font-normal text-gray-800">Logs</h3>
              <div className="flex items-center space-x-4">
                <ActionButton label="Refresh" icon={RefreshCcw} onClick={handleRefresh} />
                <div>
                  <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">Select Month:</label>
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

          {/* Attendance Records Table */}
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-gray-600">
                <thead className="bg-[#073532] text-white text-center sticky top-0 z-20">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-center">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Time In</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Time Out</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Overtime Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.map((record) => (
                      <tr key={record.attendance_code} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                          }
                        </td>
                        <td className="border border-gray-300 px-4 py-2">      
                          {
                            record.time_in &&  formatTo12Hour(record.time_in) || '--'
                          }
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {
                            record.time_out && formatTo12Hour(record.time_out) || '--'
                          }
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'present' ? 'bg-green-100 text-green-800' :
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

          </div>

        </div>
      </div>

      {/* Floating Ticket Button */}
      <FloatingTicketButton />
    </div>
  );
}