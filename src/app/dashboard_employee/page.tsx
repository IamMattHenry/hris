"use client";

import { useState, useEffect } from "react";
import { Cell, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from "recharts";
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

          // Fetch current employee's attendance summary
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

  // Attendance summary data for pie chart (current employee's personal data)
  const attendanceSummaryData = [
    { name: 'Present', value: employeeAttendanceSummary?.present || 0, color: '#ff5149' },
    { name: 'On Leave', value: employeeAttendanceSummary?.leave || 0, color: '#fc94af' },
    { name: 'Absent', value: employeeAttendanceSummary?.absent || 0, color: '#edc001' },
    { name: 'Late', value: employeeAttendanceSummary?.late || 0, color: '#ff6300' },
  ];

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Title */}
          {currentEmployee ? (
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-normal text-gray-800 font-poppins">
                <p>Welcome, {currentEmployee.first_name} {currentEmployee.last_name}</p>
              </h1>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                  currentEmployee.status === 'active' ? 'bg-green-100 text-green-800' :
                  currentEmployee.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                  currentEmployee.status === 'resigned' || currentEmployee.status === 'terminated' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentEmployee.status === 'active' ? 'Active' :
                   currentEmployee.status === 'on_leave' ? 'On Leave' :
                   currentEmployee.status === 'resigned' ? 'Resigned' :
                   currentEmployee.status === 'terminated' ? 'Terminated' :
                   'Unknown'}
                </span>
              </div>
            </div>
          ) : null}
            
                
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Profile Card */}
          <div className="bg-white rounded-xl shadow-sm p-7 border border-[#e8dcc8]">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Profile</h2>
            
            {currentEmployee ? (
              <div className="space-y-6">
                {/* Profile Image and Details Section */}
                <div className="flex items-start space-x-6">
                  {/* Profile Image */}
                  <div className="flex-shrink-0">
                    <Image
                      src="/assets/user-img.png"
                      alt="Employee Profile Picture"
                      width={175}
                      height={175}
                      className="rounded-lg"
                    />
                  </div>

                  {/* Profile Details */}
                  <div className="flex-1 space-y-2">
                    <div className="text-left">
                      <p className="text-sm text-gray-600">ID: {currentEmployee.employee_code}</p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm text-gray-600">Name: {currentEmployee.first_name} {currentEmployee.last_name}</p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm text-gray-600">Role: {currentEmployee.position_name || 'N/A'}</p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm text-gray-600">Department: {currentEmployee.department_name || 'N/A'}</p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm text-gray-600">Hire Date: {currentEmployee.hire_date ? new Date(currentEmployee.hire_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                    </div>

                    <div className="text-left">
                      <p className="text-sm text-gray-600">Gender: {currentEmployee.gender || 'N/A'}</p>
                    </div>
                  </div>
                </div>

        
              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-gray-500">Loading profile...</p>
              </div>
            )}
          </div>

          {/* Shifts*/}
          <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
            {/* Title Box */}
            <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
              <h2 className="text-lg font-semibold text-white">Shifts</h2>
            </div>
            {/* Shifts Content */}
            <div className="p-6">
              <div className="flex flex-col items-center justify-center h-64">
              {/* Date and Day */}
              <div className="text-center mb-6">
                <p className="text-2xl font-light text-gray-800 font-poppins">Date Today: </p>
                <p className="text-2xl font-normal text-gray-800 font-poppins">
                  {new Date().toLocaleDateString("en-US", {
                    timeZone: "Asia/Manila",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {" | "}
                  {new Date().toLocaleDateString("en-US", {
                    timeZone: "Asia/Manila",
                    weekday: "long",
                  })}
                </p>
              </div>

              {/* Horizontal Divider */}
              <hr className="w-full border-gray-300 mb-6" />

              {/* Current Shift */}
              <div className="text-center">
                <p className="text-lg text-gray-600 mb-2">Current Shift</p>
                <div className="flex items-center justify-center gap-4">
                  {currentEmployee?.shift && (
                    <Image
                      src={`/assets/${currentEmployee.shift}.png`}
                      alt={`${currentEmployee.shift} shift`}
                      width={60}
                      height={60}
                      className="object-contain"
                    />
                  )}
                  <div>
                    <p className="text-3xl font-bold text-[#8B1A1A] capitalize">
                      {currentEmployee?.shift || "Not Assigned"}
                    </p>
                    {currentEmployee?.shift && (
                      <p className="text-sm text-gray-500 mt-1">
                        {currentEmployee.shift === 'morning' ? '8:00 AM - 5:00 PM' : '8:00 PM - 5:00 AM'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
            {/* Title Box */}
            <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
              <h2 className="text-lg font-semibold text-white">Attendance Summary</h2>
            </div>
            {/* Card Content */}
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceSummaryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {attendanceSummaryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Ticket Button */}
      <FloatingTicketButton />
    </div>
  );
}