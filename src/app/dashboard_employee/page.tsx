"use client";

import { useState, useEffect } from "react";
import { employeeApi, ticketApi, notificationApi } from "@/lib/api";
import { Employee, Dependent } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import FingerprintRegistrationModal from "@/components/dashboard/FingerprintRegistrationModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

interface UserNotification {
  notification_id: number;
  title: string;
  message: string;
  status: 'read' | 'unread';
}

// 1. ISOLATED CLOCK COMPONENT
const LiveClock = () => {
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

  return <p className="text-2xl font-bold text-[#8b4513] tracking-widest">{currentTime}</p>;
};

export default function Dashboard() {
  const { user } = useAuth();
  
  // State
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  
  // UI/Loading State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);

  // 2. DATA FETCHING
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.employee_id) return;
      setLoading(true);
      setNotificationsLoading(true);
      setError(null);

      try {
        const [employeeResult, notificationsResult] = await Promise.all([
          employeeApi.getById(user.employee_id),
          notificationApi.getMy({ limit: 8 }),
        ]);

        if (employeeResult.success && employeeResult.data) {
          const emp = employeeResult.data as Employee;
          setCurrentEmployee(emp);
          setDependents(emp.dependents || []);

          // Fingerprint Modal Logic
          const modalKey = `fingerprint_modal_shown_${user?.user_id ?? 'unknown'}`;
          try { sessionStorage.removeItem('fingerprint_modal_shown'); } catch {}
          
          const hasShownModal = sessionStorage.getItem(modalKey);
          const missingFingerprint = emp.fingerprint_id == null || (typeof emp.fingerprint_id === 'number' && emp.fingerprint_id <= 0);
          
          if (missingFingerprint && !hasShownModal) {
            setShowFingerprintModal(true);
            sessionStorage.setItem(modalKey, 'true');
          }
        }

        if (notificationsResult.success && Array.isArray(notificationsResult.data)) {
          setNotifications(notificationsResult.data as UserNotification[]);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch dashboard data. Please check your connection.");
      } finally {
        setNotificationsLoading(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // 3. EVENT HANDLERS
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

  const handleMarkAllNotificationsRead = async () => {
    setMarkingNotificationsRead(true);
    try {
      const result = await notificationApi.markAllRead();
      if (result.success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, status: 'read' })));
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      toast.error("Failed to update notifications");
    } finally {
      setMarkingNotificationsRead(false);
    }
  };

  // 4. LOADING & ERROR STATES
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b4513] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center bg-white p-8 rounded-xl shadow-md border border-[#e8dcc8]">
          <p className="text-lg text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#8b4513] text-white px-6 py-2 rounded-lg hover:bg-[#a0522d] transition font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );

  // 5. MAIN RENDER
  return (
    <div className="min-h-screen p-4 md:p-6 font-poppins bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        {currentEmployee && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
                Welcome back, {currentEmployee.first_name}
              </h1>
              <p className="text-gray-500 mt-1 text-sm md:text-base">
                Here's what's happening today.
              </p>
            </div>
            <span
              className={`inline-flex items-center px-4 py-1.5 text-sm md:text-base font-semibold rounded-full shadow-sm ${
                currentEmployee.status === "active"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : currentEmployee.status === "on-leave"
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  : currentEmployee.status === "resigned" || currentEmployee.status === "terminated"
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-gray-100 text-gray-800 border border-gray-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full mr-2 bg-current opacity-75"></span>
              {currentEmployee.status ? currentEmployee.status.charAt(0).toUpperCase() + currentEmployee.status.slice(1) : "Unknown"}
            </span>
          </div>
        )}

        {/* Two-Column Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area (Left 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile Section */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] flex flex-col md:flex-row gap-6 p-6">
              <div className="flex items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-xl bg-[#8b4513] text-white text-5xl font-bold select-none flex-shrink-0 shadow-inner">
                {currentEmployee?.first_name?.[0]?.toUpperCase()}
                {currentEmployee?.last_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-2 text-sm text-gray-700">
                <div><span className="font-semibold block text-gray-900 mb-1">Employee ID</span> {currentEmployee?.employee_code}</div>
                <div><span className="font-semibold block text-gray-900 mb-1">Role</span> {currentEmployee?.position_name || "N/A"}</div>
                <div><span className="font-semibold block text-gray-900 mb-1">Full Name</span> {currentEmployee?.first_name} {currentEmployee?.last_name}</div>
                <div><span className="font-semibold block text-gray-900 mb-1">Department</span> {currentEmployee?.department_name || "N/A"}</div>
                <div>
                  <span className="font-semibold block text-gray-900 mb-1">Hire Date</span> 
                  {currentEmployee?.hire_date
                    ? new Date(currentEmployee.hire_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "N/A"}
                </div>
                <div><span className="font-semibold block text-gray-900 mb-1">Gender</span> {currentEmployee?.gender || "N/A"}</div>
              </div>
            </div>

            {/* Dashboard Cards Grid (Now holds Shifts and Dependents) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Shifts */}
              <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden flex flex-col">
                <div className="bg-[#281b0d] px-5 py-3">
                  <h2 className="text-base font-semibold text-white">Current Shift</h2>
                </div>
                <div className="p-5 flex flex-col justify-between h-full">
                  <div>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Today</p>
                    <p className="text-base text-gray-800 font-medium">
                      {new Date().toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-left my-6">
                    <LiveClock />
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">
                    <p className="text-sm font-semibold text-[#8B1A1A]">No Active Shift</p>
                    <p className="text-xs text-red-600/80 mt-1">Shift data is currently unavailable.</p>
                  </div>
                </div>
              </div>

              {/* Dependents */}
              <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden flex flex-col">
                <div className="bg-[#281b0d] px-5 py-3">
                  <h2 className="text-base font-semibold text-white">Dependents</h2>
                </div>
                <div className="p-5 overflow-y-auto max-h-[300px] custom-scrollbar flex-1">
                  {dependents.length === 0 ? (
                    <div className="text-center py-8 h-full flex items-center justify-center">
                      <p className="text-gray-400 text-sm">No dependents currently registered.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {dependents.map((dep) => (
                        <div key={dep.dependant_id} className="p-4 border border-[#e8dcc8] rounded-lg bg-[#fdf9f3] hover:shadow-md transition duration-200">
                          <p className="font-semibold text-gray-800">{dep.firstname} {dep.lastname}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600"><span className="font-medium">Relation:</span> {dep.relationship}</p>
                            <p className="text-xs text-gray-600"><span className="font-medium">Contact:</span> {dep.contact_no || "N/A"}</p>
                            <p className="text-xs text-gray-600"><span className="font-medium">Email:</span> {dep.email || "N/A"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
            </div>

          </div>

          {/* Sidebar Area (Right 1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] sticky top-6">
              <div className="bg-[#281b0d] px-5 py-3 flex items-center justify-between rounded-t-xl">
                <h2 className="text-base font-semibold text-white">Notifications</h2>
                <button
                  onClick={handleMarkAllNotificationsRead}
                  disabled={markingNotificationsRead || notifications.length === 0}
                  className="text-xs px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark all read
                </button>
              </div>

              <div className="p-5 flex flex-col max-h-[600px] overflow-y-auto custom-scrollbar">
                {notificationsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-pulse flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((item) => (
                      <div
                        key={item.notification_id}
                        className={`rounded-lg border p-3 transition-colors ${
                          item.status === 'unread' 
                            ? 'bg-[#fff7ec] border-[#e2c8a9]' 
                            : 'bg-white border-[#ece7df] opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                          {item.status === 'unread' && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1"></span>}
                        </div>
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Global Components */}
        <FloatingTicketButton />

        {showFingerprintModal && currentEmployee && (
          <FingerprintRegistrationModal
            employeeCode={currentEmployee.employee_code}
            onContactSupport={handleContactSupport}
            onDismiss={() => setShowFingerprintModal(false)}
          />
        )}
        
      </div>
    </div>
  );
}