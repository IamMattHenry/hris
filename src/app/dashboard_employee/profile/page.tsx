"use client";

import { useCallback, useEffect, useState } from "react";
import { employeeApi, notificationApi } from "@/lib/api";
import { Employee } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import EditPersonalModal from "./edit_personal-information/EditPersonalModal";
import EditEmployeeModal from "./edit_employee-information/EditEmployeeModal";
import EditContactsModal from "./edit_contact-information/editContact";
import EditEmailModal from "./edit_email-information/editEmail";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"basic" | "job" | "notifications">("notifications");
  const [notifications, setNotifications] = useState<{
    notification_id: number;
    title: string;
    message: string;
    category?: string;
    status: 'read' | 'unread';
    created_at: string;
  }[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);
  const [deletingReadNotifications, setDeletingReadNotifications] = useState(false);

  // Modal states
  const [isEditPersonalModalOpen, setIsEditPersonalModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [isEditContactsModalOpen, setIsEditContactsModalOpen] = useState(false);
  const [isEditEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isViewAllEmailsOpen, setIsViewAllEmailsOpen] = useState(false);
  const [isViewAllContactsOpen, setIsViewAllContactsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const notificationsResult = await notificationApi.getMy({ limit: 50 });

      if (user?.employee_id) {
        const employeeResult = await employeeApi.getById(user.employee_id);
        if (employeeResult.success && employeeResult.data) {
          setCurrentEmployee(employeeResult.data as Employee);
        }
      }

      if (notificationsResult.success && Array.isArray(notificationsResult.data)) {
        setNotifications(notificationsResult.data as any[]);
      } else {
        setNotifications([]);
        setNotificationsError(notificationsResult.message || "Failed to fetch notifications");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to fetch dashboard data");
      setNotificationsError("An error occurred while fetching notifications");
    } finally {
      setLoading(false);
      setNotificationsLoading(false);
    }
  }, [user?.employee_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProfileSaved = async () => {
    await Promise.all([refreshUser(), fetchData()]);
  };

  const refreshNotifications = async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const result = await notificationApi.getMy({ limit: 50 });
      if (result.success && Array.isArray(result.data)) {
        setNotifications(result.data as any[]);
      } else {
        setNotifications([]);
        setNotificationsError(result.message || "Failed to fetch notifications");
      }
    } catch (err) {
      setNotifications([]);
      setNotificationsError("An error occurred while fetching notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      const result = await notificationApi.markRead(id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((item) => (item.notification_id === id ? { ...item, status: 'read' } : item))
        );
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setMarkingNotificationsRead(true);
    try {
      const result = await notificationApi.markAllRead();
      if (result.success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, status: 'read' })));
      } else {
        setNotificationsError(result.message || "Failed to mark notifications as read");
      }
    } finally {
      setMarkingNotificationsRead(false);
    }
  };

  const handleDeleteAllReadNotifications = async () => {
    setDeletingReadNotifications(true);
    try {
      const result = await notificationApi.deleteAllRead();
      if (result.success) {
        setNotifications((prev) => prev.filter((item) => item.status !== 'read'));
      } else {
        setNotificationsError(result.message || "Failed to delete read notifications");
      }
    } finally {
      setDeletingReadNotifications(false);
    }
  };

  const readNotificationsCount = notifications.filter((item) => item.status === 'read').length;
  const unreadNotificationsCount = notifications.filter((item) => item.status === 'unread').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf9f3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#073532] mx-auto mb-4"></div>
          <p className="text-sm font-medium text-gray-600">Loading your profile...</p>
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
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#281b0d] tracking-tight">My Profile</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your personal and work information.</p>
          </div>
          {currentEmployee && (
            <div className="text-sm font-medium text-gray-600 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center">
              ID: {currentEmployee.employee_code}
            </div>
          )}
        </div>

        {/* Main Grid Layout - Changed to items-stretch for equal height columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column - Profile Card (Now stretches to match right column height) */}
          <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
            {currentEmployee ? (
              <div className="flex flex-col h-full">
                <div className="px-6 pb-6 flex flex-col items-center -mt-14 pt-24">
                  <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-md mb-4 ">
                    <div className="w-full h-full rounded-full bg-[#fdf9f3] text-[#412f23] border border-gray-200 flex items-center justify-center text-4xl font-bold">
                      {`${currentEmployee.first_name?.[0] || ''}${currentEmployee.last_name?.[0] || ''}`.toUpperCase()}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[#281b0d] text-center">
                    {currentEmployee?.first_name} {currentEmployee?.last_name}
                  </h2>
                  <p className="text-xs font-semibold text-[#073532] mt-2 bg-[#073532]/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    {currentEmployee?.position_name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 font-medium">{currentEmployee?.department_name || 'Human Resource'}</p>
                </div>

                {/* Contact Information Sections */}
                <div className="px-8 pb-8 flex-1 flex flex-col gap-6">
                  
                  {/* Email Section */}
                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Addresses</span>
                      <button onClick={() => setIsEmailModalOpen(true)} className="text-xs font-bold text-[#073532] hover:underline">Edit</button>
                    </div>
                    <div className="space-y-1">
                      {user?.emails && user.emails.length > 0 ? (
                        <>
                          {user.emails.slice(0, 2).map((email, i) => (
                            <p key={i} className="text-sm font-medium text-gray-800 break-all">{email}</p>
                          ))}
                          {user.emails.length > 2 && (
                            <button onClick={() => setIsViewAllEmailsOpen(true)} className="text-xs text-gray-500 hover:text-[#073532] mt-1 font-medium">
                              + {user.emails.length - 2} more
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No email provided</p>
                      )}
                    </div>
                  </div>

                  {/* Contacts Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Numbers</span>
                      <button onClick={() => setIsEditContactsModalOpen(true)} className="text-xs font-bold text-[#073532] hover:underline">Edit</button>
                    </div>
                    <div className="space-y-1">
                      {user?.contact_numbers && user.contact_numbers.length > 0 ? (
                        <>
                          {user.contact_numbers.slice(0, 2).map((contact, i) => (
                            <p key={i} className="text-sm font-medium text-gray-800">{contact}</p>
                          ))}
                          {user.contact_numbers.length > 2 && (
                            <button onClick={() => setIsViewAllContactsOpen(true)} className="text-xs text-gray-500 hover:text-[#073532] mt-1 font-medium">
                              + {user.contact_numbers.length - 2} more
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No contacts provided</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading profile data...</div>
            )}
          </div>

          {/* Right Column - Information Tabs */}
          <div className="lg:col-span-8 flex flex-col h-full space-y-4">
            
            {/* Fixed Modern Segmented Control for Tabs */}
            <div className="bg-gray-100/80 p-1.5 rounded-xl flex gap-2 overflow-x-auto custom-scrollbar border border-gray-200/60">
              <button
                onClick={() => setActiveTab("basic")}
                className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm rounded-lg transition-all duration-200 ${
                  activeTab === "basic" 
                    ? "bg-white text-[#281b0d] shadow-sm font-semibold border border-gray-200/50" 
                    : "text-gray-500 hover:text-[#281b0d] hover:bg-white/40 font-medium"
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setActiveTab("job")}
                className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm rounded-lg transition-all duration-200 ${
                  activeTab === "job" 
                    ? "bg-white text-[#281b0d] shadow-sm font-semibold border border-gray-200/50" 
                    : "text-gray-500 hover:text-[#281b0d] hover:bg-white/40 font-medium"
                }`}
              >
                Job History
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === "notifications" 
                    ? "bg-white text-[#281b0d] shadow-sm font-semibold border border-gray-200/50" 
                    : "text-gray-500 hover:text-[#281b0d] hover:bg-white/40 font-medium"
                }`}
              >
                Inbox
                {unreadNotificationsCount > 0 && (
                  <span className="bg-[#bc3131] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Contents - Using flex-1 to fill space */}
            <div className="flex-1 flex flex-col">
              
              {/* BASIC TAB */}
              {activeTab === "basic" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-[#281b0d]">Personal Information</h2>
                    <button onClick={() => setIsEditPersonalModalOpen(true)} className="text-xs font-semibold text-[#073532] hover:underline">
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-8">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gender</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {currentEmployee?.gender ? currentEmployee.gender.charAt(0).toUpperCase() + currentEmployee.gender.slice(1) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Birthdate</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {currentEmployee?.birthdate ? new Date(currentEmployee.birthdate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Civil Status</p>
                      <p className="text-sm text-gray-900 font-medium">{currentEmployee?.civil_status || 'Not specified'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Home Address</p>
                      <p className="text-sm text-gray-900 font-medium leading-relaxed">
                        {[currentEmployee?.home_address, currentEmployee?.city, currentEmployee?.province, currentEmployee?.region].filter(Boolean).join(', ') || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* JOB TAB */}
              {activeTab === "job" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 p-6">
                  <h2 className="text-lg font-bold text-[#281b0d] mb-6">Current Role</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-8">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Job Title</p>
                      <p className="text-sm text-gray-900 font-medium">{currentEmployee?.position_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Department</p>
                      <p className="text-sm text-gray-900 font-medium">{currentEmployee?.department_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Employment Date</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {currentEmployee?.hire_date ? new Date(currentEmployee.hire_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
                  <div className="px-6 py-4 flex flex-wrap gap-4 justify-between items-center border-b border-gray-100">
                    <h2 className="text-lg font-bold text-[#281b0d]">Inbox</h2>
                    <div className="flex gap-2">
                      <button onClick={refreshNotifications} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition shadow-sm">
                        Refresh
                      </button>
                      <button 
                        onClick={handleMarkAllNotificationsRead} 
                        disabled={markingNotificationsRead || notifications.length === 0}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
                      >
                        Mark all read
                      </button>
                      <button 
                        onClick={handleDeleteAllReadNotifications} 
                        disabled={deletingReadNotifications || readNotificationsCount === 0}
                        className="px-3 py-1.5 text-xs font-semibold text-[#bc3131] bg-[#bc3131]/10 rounded-md hover:bg-[#bc3131]/20 transition disabled:opacity-50"
                      >
                        Clear Read
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {notificationsLoading ? (
                      <div className="flex justify-center py-8"><p className="text-sm text-gray-500">Loading your notifications...</p></div>
                    ) : notificationsError ? (
                      <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm text-center border border-red-100 m-2">{notificationsError}</div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 text-sm">You have no notifications right now.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((item) => (
                          <div 
                            key={item.notification_id} 
                            className={`p-4 rounded-xl border transition-colors ${
                              item.status === 'unread' ? 'bg-white border-[#e8dcc8] shadow-sm' : 'bg-transparent border-gray-100 opacity-80'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {item.status === 'unread' && <div className="w-2 h-2 rounded-full bg-[#bc3131] shrink-0"></div>}
                                  <h3 className="text-sm font-bold text-[#281b0d]">{item.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed pl-[16px]">{item.message}</p>
                                <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-[16px]">
                                  <span>{item.category || 'PAYROLL_RUN_STATUS'}</span>
                                  <span>•</span>
                                  <span>{new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                </div>
                              </div>
                              {item.status === 'unread' && (
                                <button
                                  onClick={() => handleMarkNotificationRead(item.notification_id)}
                                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                                >
                                  Mark Read
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingTicketButton />

      {/* Modals */}
      <EditPersonalModal isOpen={isEditPersonalModalOpen} onClose={() => setIsEditPersonalModalOpen(false)} id={user?.employee_id || null} onSaved={handleProfileSaved} />
      <EditEmployeeModal isOpen={isEditEmployeeModalOpen} onClose={() => setIsEditEmployeeModalOpen(false)} id={user?.employee_id || null} onSaved={handleProfileSaved} />
      <EditContactsModal isOpen={isEditContactsModalOpen} onClose={() => setIsEditContactsModalOpen(false)} id={user?.employee_id || null} onSaved={handleProfileSaved} />
      <EditEmailModal isOpen={isEditEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} id={user?.employee_id || null} onSaved={handleProfileSaved} />

      {isViewAllEmailsOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">All Email Addresses</h2>
              <button onClick={() => setIsViewAllEmailsOpen(false)} className="text-gray-400 hover:text-gray-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="flex flex-col gap-2">
                {user?.emails?.map((email, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 break-all shadow-sm">
                    {email}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isViewAllContactsOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">All Contact Numbers</h2>
              <button onClick={() => setIsViewAllContactsOpen(false)} className="text-gray-400 hover:text-gray-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="flex flex-col gap-2">
                {user?.contact_numbers?.map((contact, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">
                    {contact}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}