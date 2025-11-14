"use client";

import { useState, useEffect } from "react";
import { Cell, Tooltip, ResponsiveContainer, YAxis, XAxis, LabelList, BarChart, Bar } from "recharts";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { Employee } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

interface AbsenceRecord {
  attendance_id: number;
  attendance_code: string;
  employee_id: number;
  first_name: string;
  last_name: string;
  employee_code: string;
  date: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeAttendanceSummary, setEmployeeAttendanceSummary] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);
  const [overallAttendanceStats, setOverallAttendanceStats] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Realtime clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentTime(formatted);
    };

    updateClock(); // initial call
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Data fetching
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

        if (statsResult.success && statsResult.data) {
          setOverallAttendanceStats(statsResult.data);
        }

        if (user?.employee_id) {
          const employeeResult = await employeeApi.getById(user.employee_id);
          if (employeeResult.success && employeeResult.data) {
            setCurrentEmployee(employeeResult.data as Employee);
          }

          const attendanceSummaryResult = await attendanceApi.getSummary(user.employee_id);
          if (attendanceSummaryResult.success && attendanceSummaryResult.data) {
            setEmployeeAttendanceSummary(attendanceSummaryResult.data);
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

  // Attendance data
  const attendanceSummaryData = [
    { name: "Present", value: employeeAttendanceSummary?.present || 0, color: "#ff5149" },
    { name: "On Leave", value: employeeAttendanceSummary?.leave || 0, color: "#fc94af" },
    { name: "Absent", value: employeeAttendanceSummary?.absent || 0, color: "#edc001" },
    { name: "Late", value: employeeAttendanceSummary?.late || 0, color: "#ff6300" },
  ];


  const hasAttendanceData = employeeAttendanceSummary && Object.values(employeeAttendanceSummary).some((v) => v > 0);

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        {currentEmployee && (
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-normal text-gray-800">
              Welcome, {currentEmployee.first_name} {currentEmployee.last_name}
            </h1>
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${currentEmployee.status === "active"
                ? "bg-green-100 text-green-800"
                : currentEmployee.status === "on_leave"
                  ? "bg-yellow-100 text-yellow-800"
                  : currentEmployee.status === "resigned" ||
                    currentEmployee.status === "terminated"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
            >
              {currentEmployee.status || "Unknown"}
            </span>
          </div>
        )}

        {/* Profile + Shift */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile */}
          <div className="bg-white rounded-xl shadow-sm p-7 border border-[#e8dcc8]">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Profile</h2>
            {currentEmployee ? (
              <div className="flex items-start space-x-6">
                <div className="flex items-center justify-center w-[175px] h-[175px] rounded-lg bg-[#8b4513] text-white text-6xl font-bold select-none">
                  {currentEmployee.first_name?.[0]?.toUpperCase()}
                  {currentEmployee.last_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-600">ID: {currentEmployee.employee_code}</p>
                  <p className="text-sm text-gray-600">
                    Name: {currentEmployee.first_name} {currentEmployee.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Role: {currentEmployee.position_name || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Department: {currentEmployee.department_name || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Hire Date:{" "}
                    {currentEmployee.hire_date
                      ? new Date(currentEmployee.hire_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Gender: {currentEmployee.gender || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-10">Loading profile...</p>
            )}
          </div>

          {/* Shifts with realtime clock */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
            <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
              <h2 className="text-lg font-semibold text-white">Shifts</h2>
            </div>
            <div className="p-8 h-72 flex flex-col justify-between">
              <div>
                <p className="text-2xl font-light text-gray-800">Date Today:</p>
                <p className="text-2xl font-normal text-gray-800">
                  {new Date().toLocaleDateString("en-US", {
                    timeZone: "Asia/Manila",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  |{" "}
                  {new Date().toLocaleDateString("en-US", {
                    timeZone: "Asia/Manila",
                    weekday: "long",
                  })}
                </p>
              </div>
              {/* Realtime clock */}
              <div className="text-left my-4">
                <p className="text-2xl font-bold text-[#8b4513] tracking-widest">
                  {currentTime}
                </p>
              </div>

              <hr className="border-gray-300 my-2" />

              {/* Shift info */}
              <div className="flex items-start justify-center gap-8 mt-4">

                {currentEmployee?.shift && (
                  <Image
                    src={
                      currentEmployee.shift === "morning"
                        ? "/assets/morning.png"
                        : "/assets/night.png"
                    }
                    alt={`${currentEmployee.shift} shift`}
                    width={70}
                    height={70}
                    className="object-contain"
                  />
                )}
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#8B1A1A] capitalize">
                    {currentEmployee?.shift + " Shift" || "Not Assigned"}
                  </p>
                  {currentEmployee?.shift && (
                    <p className="text-sm text-gray-500 mt-1">
                      {currentEmployee.shift === "morning"
                        ? "8:00 AM - 5:00 PM"
                        : "5:00 PM - 8:00 AM"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>




        {/* Attendance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
            <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
              <h2 className="text-lg font-semibold text-white">My Attendance Summary</h2>
            </div>

            <div className="p-6">
              {!employeeAttendanceSummary ? (
                <div className="flex items-center justify-center h-56">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b4513] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading chart...</p>
                  </div>
                </div>
              ) : !hasAttendanceData ? (
                <div className="flex items-center justify-center h-56">
                  <p className="text-gray-500 text-center">No attendance data available yet</p>
                </div>
              ) : (
                <>
<div className="h-56 w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={attendanceSummaryData}
      layout="vertical"
      margin={{ top: 10, right: 30, bottom: 10, left: 50 }}
    >
      <XAxis type="number" hide />
      <YAxis type="category" dataKey="name" width={90} />
      <Tooltip />

      <Bar dataKey="value" barSize={25} radius={[5, 5, 5, 5]}>
        {attendanceSummaryData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}

        {/* VALUE LABELS */}
        <LabelList
          dataKey="value"
          position="right"
          style={{ fill: "#333", fontSize: "12px", fontWeight: "600" }}
        />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

                  {/* Summary Stats Below Chart */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {attendanceSummaryData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 truncate">{item.name}</p>
                          <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Floating Ticket Button */}
        <FloatingTicketButton />
      </div>
    </div>
  );
}
