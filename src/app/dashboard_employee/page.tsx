"use client";

import { useState, useEffect } from "react";
import { Cell, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from "recharts";
import { employeeApi, attendanceApi } from "@/lib/api";
import { Employee, Dependent } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

export default function Dashboard() {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [employeeAttendanceSummary, setEmployeeAttendanceSummary] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Manila",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.employee_id) return;
      setLoading(true);
      setError(null);

      try {
        const [employeeResult, summaryResult] = await Promise.all([
          employeeApi.getById(user.employee_id),
          attendanceApi.getSummary(user.employee_id),
        ]);

        if (employeeResult.success && employeeResult.data) {
          const emp = employeeResult.data as Employee;
          setCurrentEmployee(emp);
          setDependents(emp.dependents || []);
        }

        if (summaryResult.success && summaryResult.data) {
          setEmployeeAttendanceSummary(summaryResult.data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b4513] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );

  if (error)
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

  const attendanceSummaryData = [
    { name: "Present", value: employeeAttendanceSummary?.present || 0, color: "#4caf50" },
    { name: "On Leave", value: employeeAttendanceSummary?.leave || 0, color: "#ff9800" },
    { name: "Absent", value: employeeAttendanceSummary?.absent || 0, color: "#f44336" },
    { name: "Late", value: employeeAttendanceSummary?.late || 0, color: "#2196f3" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        {currentEmployee && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-800">
              Welcome, {currentEmployee.first_name} {currentEmployee.last_name}
            </h1>
            <span
              className={`inline-block px-3 py-1 text-sm md:text-base font-medium rounded-full ${
                currentEmployee.status === "active"
                  ? "bg-green-100 text-green-800"
                  : currentEmployee.status === "on_leave"
                  ? "bg-yellow-100 text-yellow-800"
                  : currentEmployee.status === "resigned" || currentEmployee.status === "terminated"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {currentEmployee.status || "Unknown"}
            </span>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-md border border-[#e8dcc8] flex flex-col lg:flex-row gap-6 p-6">
          <div className="flex items-center justify-center w-36 h-36 md:w-44 md:h-44 rounded-lg bg-[#8b4513] text-white text-6xl md:text-7xl font-bold select-none flex-shrink-0">
            {currentEmployee?.first_name?.[0]?.toUpperCase()}
            {currentEmployee?.last_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <p>
              <span className="font-semibold">ID:</span> {currentEmployee?.employee_code}
            </p>
            <p>
              <span className="font-semibold">Role:</span> {currentEmployee?.position_name || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Name:</span> {currentEmployee?.first_name} {currentEmployee?.last_name}
            </p>
            <p>
              <span className="font-semibold">Department:</span> {currentEmployee?.department_name || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Hire Date:</span>{" "}
              {currentEmployee?.hire_date
                ? new Date(currentEmployee.hire_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
            <p>
              <span className="font-semibold">Gender:</span> {currentEmployee?.gender || "N/A"}
            </p>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Shifts */}
          <div className="bg-white rounded-xl shadow-md border border-[#e8dcc8] overflow-hidden flex flex-col">
            <div className="bg-[#281b0d] px-6 py-3">
              <h2 className="text-lg font-semibold text-white">Shifts</h2>
            </div>
            <div className="p-6 flex flex-col justify-between h-full">
              <div>
                <p className="text-md text-gray-800 font-medium">Date Today:</p>
                <p className="text-md text-gray-700 font-light">
                  {new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" })} |{" "}
                  {new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "long" })}
                </p>
              </div>

              <div className="text-left my-4">
                <p className="text-2xl font-bold text-[#8b4513] tracking-widest">{currentTime}</p>
              </div>

              <hr className="border-gray-300 my-2" />

              <div className="flex items-center justify-center gap-4 mt-4">
                {currentEmployee?.shift && (
                  <Image
                    src={currentEmployee.shift === "morning" ? "/assets/morning.png" : "/assets/night.png"}
                    alt={`${currentEmployee.shift} shift`}
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                )}
                <div className="text-center">
                  <p className="text-lg font-semibold text-[#8B1A1A] capitalize">
                    {currentEmployee?.shift + " Shift" || "Not Assigned"}
                  </p>
                  {currentEmployee?.shift && (
                    <p className="text-sm text-gray-500 mt-1">
                      {currentEmployee.shift === "morning" ? "8:00 AM - 5:00 PM" : "5:00 PM - 8:00 AM"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="bg-white rounded-xl shadow-md border border-[#e8dcc8] overflow-hidden flex flex-col">
            <div className="bg-[#281b0d] px-6 py-3">
              <h2 className="text-lg font-semibold text-white">Attendance Summary</h2>
            </div>
            <div className="p-6 flex-1">
              {!employeeAttendanceSummary ? (
                <p className="text-gray-500 text-center mt-10">Loading chart...</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={attendanceSummaryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                      {attendanceSummaryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Dependents */}
          <div className="bg-white rounded-xl shadow-md border border-[#e8dcc8] overflow-hidden flex flex-col">
            <div className="bg-[#281b0d] px-6 py-3">
              <h2 className="text-lg font-semibold text-white">Dependents</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1 max-h-64">
              {dependents.length === 0 ? (
                <p className="text-gray-500 text-center py-10">No dependents found.</p>
              ) : (
                <ul className="space-y-3">
                  {dependents.map((dep) => (
                    <li
                      key={dep.dependant_id}
                      className="p-4 border border-[#e8dcc8] rounded-lg shadow-sm bg-[#fdf9f3]"
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {dep.firstname} {dep.lastname}
                      </p>
                      <p className="text-xs text-gray-500">Relationship: {dep.relationship}</p>
                      <p className="text-xs text-gray-500">Contact No: {dep.contact_no}</p>
                      <p className="text-xs text-gray-500">Email: {dep.email}</p>
                      {dep.home_address && (
                        <p className="text-xs text-gray-500">
                          Address: {dep.home_address}
                          {dep.city_name && `, ${dep.city_name}`}
                          {dep.province_name && `, ${dep.province_name}`}
                          {dep.region_name && `, ${dep.region_name}`}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
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
