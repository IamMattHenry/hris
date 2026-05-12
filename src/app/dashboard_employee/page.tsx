"use client";

import { useState, useEffect } from "react";
import { employeeApi, ticketApi, notificationApi } from "@/lib/api";
import { Employee } from "@/types/api";
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

  return <p className="text-3xl font-bold text-[#8b4513] tracking-wider">{currentTime}</p>;
};

export default function Dashboard() {
  const { user } = useAuth();
  
  // State
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
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
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b4513] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Preparing your workspace...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100">
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
    <div className="min-h-screen p-4 md:p-8 font-poppins bg-[#fcfaf8]">
      {/* Expanded max-width further to 1600px to maximize available screen real estate */}
      <div className="max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-8 items-stretch">
        
        {/* --- LEFT COMPONENT (Profile & Workspace) --- */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 lg:gap-8 items-stretch">
          
          {/* Vertical Profile Card - Maximized vertically with h-full */}
          <div className="w-full md:w-1/3 lg:w-1/4 xl:w-[320px] flex-shrink-0">
            <div className="bg-white h-full rounded-2xl shadow-sm border border-[#e8dcc8] p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#8b4513] text-white text-3xl font-bold flex items-center justify-center mb-4 shadow-inner ring-4 ring-[#f5e6d3]">
                {currentEmployee?.first_name?.[0]?.toUpperCase()}
                {currentEmployee?.last_name?.[0]?.toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                {currentEmployee?.first_name} {currentEmployee?.last_name}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-1 mb-5">
                {currentEmployee?.position_name || "Employee"}
              </p>
              
              <div className="w-full border-t border-[#f5e6d3] pt-5 space-y-3 text-left text-sm flex-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Employee ID</span>
                  <span className="font-semibold text-gray-800">{currentEmployee?.employee_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Department</span>
                  <span className="font-semibold text-gray-800">{currentEmployee?.department_name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-semibold ${
                    currentEmployee?.status === "active" ? "text-green-600" : "text-gray-800"
                  }`}>
                    {currentEmployee?.status ? currentEmployee.status.charAt(0).toUpperCase() + currentEmployee.status.slice(1) : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Workspace */}
          <div className="flex-1 space-y-6">
            
            {/* Welcome Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#e8dcc8] p-8 bg-[url('/pattern.svg')] bg-no-repeat bg-right-bottom">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {currentEmployee?.first_name}!
              </h1>
              <p className="text-gray-500 mt-2 text-base">
                Here is your workspace overview for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shifts Card (Prominent) */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#e8dcc8] overflow-hidden flex flex-col md:col-span-2">
                <div className="border-b border-[#e8dcc8] px-6 py-4 bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-800">Time & Attendance</h2>
                </div>
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">Philippine Standard Time</p>
                    <LiveClock />
                  </div>
                  <div className="w-full md:w-auto flex-1 md:max-w-md bg-red-50 rounded-xl p-5 border border-red-100 text-center md:text-left flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-1">
                      !
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#8B1A1A]">No Active Shift Detected</p>
                      <p className="text-sm text-red-600/80 mt-1">You do not currently have a scheduled shift running. Check your schedule for upcoming shifts.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal Guide (Expands in grid) */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#e8dcc8] overflow-hidden flex flex-col md:col-span-2">
                <div className="border-b border-[#e8dcc8] px-6 py-4 bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-800">Quick Portal Guide</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 border border-[#e8dcc8] rounded-xl bg-white hover:bg-[#fdf9f3] hover:border-[#d4bb9b] transition-all duration-200 group cursor-default">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      💬
                    </div>
                    <p className="font-bold text-gray-800 mb-2">Support Tickets</p>
                    <p className="text-sm text-gray-600">Click the floating button in the bottom corner to quickly report IT or HR issues.</p>
                  </div>

                  <div className="p-5 border border-[#e8dcc8] rounded-xl bg-white hover:bg-[#fdf9f3] hover:border-[#d4bb9b] transition-all duration-200 group cursor-default">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      🔐
                    </div>
                    <p className="font-bold text-gray-800 mb-2">Fingerprint Access</p>
                    <p className="text-sm text-gray-600">Required for 2FA. If you haven't set yours up, open a ticket for device registration.</p>
                  </div>

                  <div className="p-5 border border-[#e8dcc8] rounded-xl bg-white hover:bg-[#fdf9f3] hover:border-[#d4bb9b] transition-all duration-200 group cursor-default">
                    <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      🔔
                    </div>
                    <p className="font-bold text-gray-800 mb-2">Real-time Alerts</p>
                    <p className="text-sm text-gray-600">Keep an eye on the right panel for important announcements and shift changes.</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR (Notifications) --- */}
        {/* Changed from flexible percentage width to a fixed max width (w-full lg:w-[300px] xl:w-[350px]) to allow the Left Component to maximize available space */}
        <div className="w-full lg:w-[300px] xl:w-[350px] flex-shrink-0 relative min-h-[400px] lg:min-h-0">
          <div className="lg:absolute lg:inset-0 flex flex-col bg-white rounded-2xl shadow-sm border border-[#e8dcc8]">
            <div className="bg-[#281b0d] px-5 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Notifications</h2>
              <button
                onClick={handleMarkAllNotificationsRead}
                disabled={markingNotificationsRead || notifications.length === 0}
                className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark all read
              </button>
            </div>

            <div className="p-4 flex flex-col overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {notificationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div
                      key={item.notification_id}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        item.status === 'unread' 
                          ? 'bg-[#fff7ec] border-[#e2c8a9]' 
                          : 'bg-gray-50 border-gray-100 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</p>
                        {item.status === 'unread' && <span className="w-2 h-2 rounded-full bg-[#8b4513] flex-shrink-0 mt-1"></span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{item.message}</p>
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
  );
}