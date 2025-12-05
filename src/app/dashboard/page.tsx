"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { employeeApi, leaveApi, attendanceApi, ticketApi } from "@/lib/api";
import { Employee } from "@/types/api";
import { X, ChevronRight } from "lucide-react";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import FingerprintRegistrationModal from "@/components/dashboard/FingerprintRegistrationModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type WeeklyAttendanceDatum = {
  day: typeof DAYS_OF_WEEK[number];
  count: number;
};

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

interface AttendanceRecord {
  attendance_id: number;
  employee_id: number;
  date: string;
  status: string;
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

const COUNTED_STATUSES = new Set(["present", "late", "half_day", "work_from_home"]);

const getWeekStart = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
};

const parseISODate = (value?: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return null;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const computeWeeklyAttendanceData = (
  records: AttendanceRecord[] = [],
  referenceDate: Date = new Date()
): WeeklyAttendanceDatum[] => {
  const base = DAYS_OF_WEEK.map((day) => ({ day, count: 0 }));

  if (!records.length) {
    return base;
  }

  const startOfCurrentWeek = getWeekStart(referenceDate);

  records.forEach((record) => {
    const recordDate = parseISODate(record.date);
    if (!recordDate) return;

    const status = record.status?.toLowerCase?.();
    if (!status || !COUNTED_STATUSES.has(status)) return;

    const recordWeekStart = getWeekStart(recordDate);
    if (recordWeekStart.getTime() !== startOfCurrentWeek.getTime()) return;

    const dayIndex = recordDate.getDay();
    base[dayIndex].count += 1;
  });

  return base;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState<WeeklyAttendanceDatum[]>(() =>
    DAYS_OF_WEEK.map((day) => ({ day, count: 0 }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPendingLeaves, setShowPendingLeaves] = useState(false);
  const [showAbsenceRecords, setShowAbsenceRecords] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [empResult, statsResult, attendanceResult] = await Promise.all([
          employeeApi.getAll(),
          leaveApi.getDashboardStats(),
          attendanceApi.getAll(),
        ]);

        if (empResult.success && empResult.data) {
          setEmployees(empResult.data as Employee[]);
        } else {
          const msg = empResult.message || "Failed to load employees.";
          setError(msg);
          toast.error(msg);
        }

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data as DashboardStats);
        } else {
          const msg = statsResult.message || "Failed to load dashboard statistics.";
          setError((prev) => prev ?? msg);
          toast.error(msg);
        }

        let attendanceRecords: AttendanceRecord[] = [];
        if (attendanceResult.success && Array.isArray(attendanceResult.data)) {
          attendanceRecords = attendanceResult.data as AttendanceRecord[];
        } else if (!attendanceResult.success) {
          const msg = attendanceResult.message || "Failed to load attendance data.";
          setError((prev) => prev ?? msg);
          toast.error(msg);
        }

        setWeeklyAttendanceData(computeWeeklyAttendanceData(attendanceRecords));

        // Check if current user needs fingerprint registration
        if (user?.employee_id) {
          const employeeResult = await employeeApi.getById(user.employee_id);
          if (employeeResult.success && employeeResult.data) {
            const emp = employeeResult.data as Employee;
            setCurrentEmployee(emp);

            // Check if modal should be shown (only once per session)
            const modalKey = `fingerprint_modal_shown_${user?.user_id ?? 'unknown'}`;
            // Clean legacy global key so it won't affect other accounts in this session
            try { sessionStorage.removeItem('fingerprint_modal_shown'); } catch {}
            const hasShownModal = sessionStorage.getItem(modalKey);
            const missingFingerprint = emp.fingerprint_id == null || (typeof emp.fingerprint_id === 'number' && emp.fingerprint_id <= 0);
            if (missingFingerprint && !hasShownModal) {
              setShowFingerprintModal(true);
              sessionStorage.setItem(modalKey, 'true');
            }
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        const msg = "Unable to load dashboard. Please try again.";
        setError(msg);
        toast.error(msg);
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
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      percentage: ((value / totalEmployees) * 100).toFixed(0),
      color: colorPalette[index % colorPalette.length]
    }));

  const handleViewPendingLeaves = async () => {
    try {
      const result = await leaveApi.getPendingLeaves();
      if (result.success && result.data) {
        setPendingLeaves(result.data as PendingLeave[]);
        setShowPendingLeaves(true);
      } else {
        toast.error(result.message || 'Failed to load pending leave requests.');
      }
    } catch (err) {
      console.error("Error fetching pending leaves:", err);
      toast.error('Failed to load pending leave requests.');
    }
  };

  const handleViewAbsenceRecords = async () => {
    try {
      const result = await leaveApi.getAbsenceRecords();
      if (result.success && result.data) {
        setAbsenceRecords(result.data as AbsenceRecord[]);
        setShowAbsenceRecords(true);
      } else {
        toast.error(result.message || 'Failed to load absence records.');
      }
    } catch (err) {
      console.error("Error fetching absence records:", err);
      toast.error('Failed to load absence records.');
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

  const handleContactSupport = async () => {
    setShowFingerprintModal(false);

    try {
      if (!user?.user_id) {
        toast.error("Unable to submit ticket: missing user id");
        return;
      }
      const result = await ticketApi.create({
        user_id: user.user_id,
        title: "Fingerprint Registration Request",
        description: `Employee ${currentEmployee?.employee_code} (${currentEmployee?.first_name} ${currentEmployee?.last_name}) needs to register fingerprint for 2FA login.`,
      });

      if (result.success) {
        toast.success("Support ticket created successfully!");
      } else {
        toast.error(result.message || "Failed to create support ticket");
      }
    } catch (error) {
      console.error("Error creating support ticket:", error);
      toast.error("Failed to create support ticket");
    }
  };

  const handleDismissModal = () => {
    setShowFingerprintModal(false);
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Total Employees & On Duty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Employees Card */}
              <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 border border-[#e8dcc8] relative">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Employees</h3>
                <p className="text-4xl font-bold text-gray-800">{stats?.total_employees || 0}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {stats?.total_positions || 0} Available Positions In {stats?.total_departments || 0} Departments
                </p>
                <div className="absolute top-6 right-6">
                  <svg className="w-16 h-16" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e8dcc8" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#f4a460"
                      strokeWidth="8"
                      strokeDasharray={`${(stats?.total_employees || 0) * 2.51} 251.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                </div>
              </div>

              {/* On Duty Card */}
              <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 border border-[#e8dcc8] relative">
                <h3 className="text-sm font-medium text-gray-600 mb-2">On Duty</h3>
                <p className="text-4xl font-bold text-gray-800">{stats?.on_duty || 0}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Out Of {stats?.on_duty || 0} Scheduled Staff
                </p>
                <div className="absolute top-6 right-6">
                  <svg className="w-16 h-16" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e8dcc8" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ffa500"
                      strokeWidth="8"
                      strokeDasharray={`${((stats?.on_duty || 0) / (stats?.total_employees || 1)) * 251.2} 251.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Requests Card */}
            <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 border border-[#e8dcc8] relative">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Requests</h3>
              <p className="text-4xl font-bold text-gray-800">{stats?.pending_requests || 0}</p>
              <button
                onClick={handleViewPendingLeaves}
                className="text-sm text-gray-600 mt-2 cursor-pointer flex items-center hover:text-gray-800 transition"
              >
                View Pending Requests <ChevronRight size={16} className="ml-1" />
              </button>
              <div className="absolute top-6 right-6">
                <svg className="w-16 h-16" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e8dcc8" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f4a460"
                    strokeWidth="8"
                    strokeDasharray={`${(stats?.pending_requests || 0) * 10} 251.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
            </div>

            {/* Gender Card */}
            <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
              <h3 className="text-sm font-medium text-gray-600 mb-4">Gender</h3>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {genderData.map((item, index) => (
                    <div key={index} className="flex items-center mb-3">
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{item.name}: {item.value}</span>
                      <span className="text-sm font-semibold text-gray-800">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
                <div className="ml-8">
                  <div className="relative w-32 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                    {genderData.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Attendance */}
            <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-md font-medium text-gray-600">Weekly Attendance</h3>
                  <p className="text-xs text-gray-500">{getCurrentPHDate()}</p>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[#8b4513] mr-2" />
                    <span>This Week</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyAttendanceData} barGap={4}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="count" name="This Week" fill="#8b4513" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column - Departments */}
          <div className="bg-[#faf5ed] rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Departments</h3>
                <p className="text-xs text-gray-500">Total: {stats?.total_departments || 0}</p>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    {/*  Custom Tooltip */}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md p-2 text-xs text-gray-800">
                              <p className="font-semibold truncate max-w-[180px]" title={data.name}>
                                {data.name.length > 22
                                  ? data.name.slice(0, 22) + "..."
                                  : data.name}
                              </p>
                              <p>Value: <span className="font-medium">{data.value}</span></p>
                              <p>Share: <span className="font-medium">{data.percentage}%</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">
                    {departmentData.length > 0 ? departmentData[0].percentage : 0}%
                  </span>
                </div>
              </div>
            </div>


        
            {/* Department List */}
            <div className="space-y-3">
              {departmentData.map((dept, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full mr-3 shrink-0"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-gray-700 truncate block max-w-[160px]">
                      {dept.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-800 font-medium w-10 text-right truncate">
                      {dept.value}
                    </span>
                    <span className="text-gray-600 w-10 text-right">
                      {dept.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-[#e8dcc8]">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleViewPendingLeaves}
              className="flex items-center justify-between p-4 bg-[#f0e6d2] hover:bg-[#e8dcc8] rounded-lg transition"
            >
              <span className="font-medium text-gray-800">View Pending Leave Requests</span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
            <button
              onClick={handleViewAbsenceRecords}
              className="flex items-center justify-between p-4 bg-[#f0e6d2] hover:bg-[#e8dcc8] rounded-lg transition"
            >
              <span className="font-medium text-gray-800">View Absence Records</span>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
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

      {/* Fingerprint Registration Modal */}
      {showFingerprintModal && currentEmployee && (
        <FingerprintRegistrationModal
          employeeCode={currentEmployee.employee_code}
          onContactSupport={handleContactSupport}
          onDismiss={handleDismissModal}
        />
      )}
    </div>
  );
}