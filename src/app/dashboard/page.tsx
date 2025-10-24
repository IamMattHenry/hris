"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { employeeApi, leaveApi } from "@/lib/api";
import { Employee } from "@/types/api";
import { X } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4B0B14] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#4B0B14] text-white px-6 py-2 rounded-lg hover:bg-[#60101C] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate statistics from real employee data
  const employeeCount = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;

  // Gender statistics
  const maleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'male').length;
  const femaleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'female').length;
  const otherCount = employees.filter(emp => emp.gender && !['male', 'female'].includes(emp.gender.toLowerCase())).length;

  const genderData = [
    { name: 'Male', value: maleCount, color: '#3b82f6' },
    { name: 'Female', value: femaleCount, color: '#ec4899' },
    ...(otherCount > 0 ? [{ name: 'Other', value: otherCount, color: '#8b5cf6' }] : []),
  ];

  // Position statistics
  const positionCounts = employees.reduce((acc: { [key: string]: number }, emp) => {
    const position = emp.position_name || 'Unassigned';
    acc[position] = (acc[position] || 0) + 1;
    return acc;
  }, {});

  const positionData = Object.entries(positionCounts).map(([name, value]) => ({
    name,
    value,
  }));

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
  return (
    <div className="min-h-screen p-8 space-y-8 font-poppins text-[#3C1E1E]">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats && [
          { title: "Total Employees", value: stats.total_employees, clickable: false },
          {
            title: "On Duty",
            value: stats.on_duty,
            subtitle: `Out of ${stats.total_employees} scheduled`,
            clickable: false
          },
          {
            title: "Available Positions",
            value: stats.total_positions,
            subtitle: `in ${stats.total_departments} departments`,
            clickable: false
          },
          { title: "On Leave", value: stats.on_leave, clickable: false },
          { title: "Absents", value: stats.absent, clickable: true, onClick: handleViewAbsenceRecords },
          { title: "Late", value: stats.late, clickable: false },
          { title: "Pending Requests", value: stats.pending_requests, clickable: true, onClick: handleViewPendingLeaves },
        ].map((item, i) => (
          <div
            key={i}
            onClick={item.clickable ? item.onClick : undefined}
            className={`bg-[#fff4e6] border-t-2 border-l-2 border-b-2 border-r-2 border-t-[#f8e9d2] border-l-[#f8e9d2] border-b-[#6d2b24] border-r-[#6d2b24] rounded-lg shadow-lg p-5 py-6 text-center hover:shadow-xl transition ${item.clickable ? 'cursor-pointer hover:bg-[#fef0e0]' : ''}`}
          >
            <h2 className="text-3xl font-bold text-orange-800">{item.value}</h2>
            <p className="text-sm text-gray-700 mt-2">{item.title}</p>
            {item.subtitle && <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>}
            {item.clickable && <p className="text-xs text-gray-500 mt-1">Click to view details</p>}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Chart */}
        <div className="bg-[#fff4e6] border border-orange-200 rounded-xl shadow-md p-5">
          <h3 className="font-semibold mb-4">Gender Distribution</h3>
          {genderData.length > 0 ? (
            <>
              <div className="flex justify-center">
                <ResponsiveContainer width="80%" height={250}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      innerRadius={50}
                      label
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {genderData.map((g, i) => {
                  const total = genderData.reduce((sum, item) => sum + item.value, 0);
                  const percentage = total > 0 ? ((g.value / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={i} className="flex items-center space-x-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: g.color }}
                      ></span>
                      <span>
                        {g.name}: {g.value} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">No gender data available</p>
          )}
        </div>

        {/* Position Chart */}
        <div className="bg-[#fff4e6] border border-orange-200 rounded-xl shadow-md p-5">
          <h3 className="font-semibold mb-4">Positions</h3>
          {positionData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={positionData}>
                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" barSize={60} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No position data available</p>
          )}
        </div>
      </div>

      {/* Pending Leaves Modal */}
      {showPendingLeaves && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPendingLeaves(false)}>
          <div
            className="bg-[#fdf3e2] w-full max-w-2xl p-8 rounded-2xl shadow-lg relative text-[#3b2b1c] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPendingLeaves(false)}
              className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-semibold mb-6">Pending Leave Requests ({pendingLeaves.length})</h2>

            {pendingLeaves.length > 0 ? (
              <div className="space-y-4">
                {pendingLeaves.map((leave) => (
                  <div key={leave.leave_id} className="border border-[#d8c3a5] rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-lg">{leave.first_name} {leave.last_name}</p>
                        <p className="text-sm text-gray-600">{leave.employee_code}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Start Date</p>
                        <p className="font-semibold">{new Date(leave.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">End Date</p>
                        <p className="font-semibold">{new Date(leave.end_date).toLocaleDateString()}</p>
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
      )}

      {/* Absence Records Modal */}
      {showAbsenceRecords && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAbsenceRecords(false)}>
          <div
            className="bg-[#fdf3e2] w-full max-w-2xl p-8 rounded-2xl shadow-lg relative text-[#3b2b1c] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAbsenceRecords(false)}
              className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-semibold mb-6">Absence Records ({absenceRecords.length})</h2>

            {absenceRecords.length > 0 ? (
              <div className="space-y-4">
                {absenceRecords.map((record) => (
                  <div key={record.attendance_id} className="border border-[#d8c3a5] rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-lg">{record.first_name} {record.last_name}</p>
                        <p className="text-sm text-gray-600">{record.employee_code}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        Absent
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Date</p>
                        <p className="font-semibold">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Record Code</p>
                        <p className="font-semibold">{record.attendance_code}</p>
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
      )}
    </div>
  );
}
