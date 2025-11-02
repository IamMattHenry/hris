"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { employeeApi, leaveApi } from "@/lib/api";
import { Employee } from "@/types/api";
import { X, ChevronRight } from "lucide-react";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";

interface PendingLeave {
  leave_id: number;
  leave_code: string;
  employee_id: number;
  first_name: string;
  last_name: string;
  employee_code: string;
  leave_type: string;
  start_date: string;
  end_date: string;
}

interface AbsenceRecord {
  attendance_id: number;
  attendance_code: string;
  employee_id: number;
  first_name: string;
  last_name: string;
  employee_code: string;
  date: string;
}

interface DashboardStats {
  total_employees: number;
  on_duty: number;
  on_leave: number;
  absent: number;
  late: number;
  pending_requests: number;
  total_positions: number;
  total_departments: number;
}

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPendingLeaves, setShowPendingLeaves] = useState(false);
  const [showAbsenceRecords, setShowAbsenceRecords] = useState(false);

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
          setStats(statsResult.data as DashboardStats);
        } else {
          setError(statsResult.message || "Failed to fetch dashboard statistics");
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Gender statistics
  const maleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'male').length;
  const femaleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'female').length;
  const otherCount = employees.filter(emp => emp.gender && !['male', 'female'].includes(emp.gender.toLowerCase())).length;

  const genderData = [
    { name: 'Male', value: maleCount, percentage: ((maleCount / employees.length) * 100).toFixed(1), color: '#4a90e2' },
    { name: 'Female', value: femaleCount, percentage: ((femaleCount / employees.length) * 100).toFixed(1), color: '#f06292' },
    ...(otherCount > 0 ? [{ name: 'Others', value: otherCount, percentage: ((otherCount / employees.length) * 100).toFixed(1), color: '#ffd54f' }] : []),
  ];

  // Department statistics with gradient colors
  const departmentCounts = employees.reduce((acc: { [key: string]: number }, emp) => {
    const dept = emp.department_name || 'Vacant';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const totalEmployees = employees.length;
  
  // Color palette - maroon to light pink gradient
  const colorPalette = [
    '#8b1a1a', '#a52a2a', '#b8423f', '#c94d4d', 
    '#d35c5c', '#dd6b6b', '#e67373', '#ef8b8b',
    '#f49999', '#f9a7a7', '#ffb3b3', '#ffc2c2', '#e0d5d5'
  ];
  
  const departmentData = Object.entries(departmentCounts)
    .sort((a, b) => b[1] - a[1]) // Sort by value first
    .map(([name, value], index) => ({
      name,
      value,
      percentage: ((value / totalEmployees) * 100).toFixed(0),
      color: colorPalette[index % colorPalette.length]
    }));

  // Weekly attendance data (mock data for visualization)
  const weeklyData = [
    { day: 'Sun', present: 32, pastWeek: 30 },
    { day: 'Mon', present: 28, pastWeek: 32 },
    { day: 'Tue', present: 30, pastWeek: 31 },
    { day: 'Wed', present: 25, pastWeek: 29 },
    { day: 'Thu', present: 33, pastWeek: 28 },
    { day: 'Fri', present: 26, pastWeek: 30 },
    { day: 'Sat', present: 29, pastWeek: 27 },
  ];

  const handleViewPendingLeaves = async () => {
    const result = await leaveApi.getPendingLeaves();
    if (result.success && result.data) {
      setPendingLeaves(result.data as PendingLeave[]);
      setShowPendingLeaves(true);
    }
  };

  const handleViewAbsenceRecords = async () => {
    const result = await leaveApi.getAbsenceRecords();
    if (result.success && result.data) {
      setAbsenceRecords(result.data as AbsenceRecord[]);
      setShowAbsenceRecords(true);
    }
  };

  const getCurrentPHDate = () => {
    return new Date().toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Summary Bar */}
        <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 flex justify-around items-center border border-[#e8dcc8]">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{stats?.on_duty || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Present</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{stats?.absent || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Absents</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{stats?.on_leave || 0}</p>
            <p className="text-sm text-gray-600 mt-1">On Leave</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{stats?.late || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Late</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{stats?.pending_requests || 0}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Requests</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Gender Distribution</h2>
            <div className="flex items-center justify-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {genderData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-4 h-4 mr-2 rounded" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-700">
                      {item.name}: {item.value} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Department Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Employees">
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Attendance */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Weekly Attendance</h2>
              <span className="text-sm text-gray-500">{getCurrentPHDate()}</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" name="This Week" fill="#8b4513" />
                  <Bar dataKey="pastWeek" name="Last Week" fill="#d3b89c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={handleViewPendingLeaves}
                className="w-full flex items-center justify-between p-4 bg-[#f0e6d2] hover:bg-[#e8dcc8] rounded-lg transition"
              >
                <span className="font-medium text-gray-800">View Pending Leave Requests</span>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={handleViewAbsenceRecords}
                className="w-full flex items-center justify-between p-4 bg-[#f0e6d2] hover:bg-[#e8dcc8] rounded-lg transition"
              >
                <span className="font-medium text-gray-800">View Absence Records</span>
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Leave Requests Modal */}
      {showPendingLeaves && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Pending Leave Requests</h3>
                <button
                  onClick={() => setShowPendingLeaves(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {pendingLeaves.length > 0 ? (
                <div className="space-y-4">
                  {pendingLeaves.map((leave) => (
                    <div key={leave.leave_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600">Employee</p>
                          <p className="font-semibold text-gray-800">
                            {leave.first_name} {leave.last_name} ({leave.employee_code})
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Leave Type</p>
                          <p className="font-semibold text-gray-800 capitalize">
                            {leave.leave_type.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Leave Dates</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Record Code</p>
                          <p className="font-semibold text-gray-800">{leave.leave_code}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No pending leave requests</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Absence Records Modal */}
      {showAbsenceRecords && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Absence Records</h3>
                <button
                  onClick={() => setShowAbsenceRecords(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {absenceRecords.length > 0 ? (
                <div className="space-y-4">
                  {absenceRecords.map((record) => (
                    <div key={record.attendance_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-600">Employee</p>
                          <p className="font-semibold text-gray-800">
                            {record.first_name} {record.last_name} ({record.employee_code})
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Date</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Record Code</p>
                          <p className="font-semibold text-gray-800">{record.attendance_code}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No absence records</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Ticket Button */}
      <FloatingTicketButton />
    </div>
  );
}