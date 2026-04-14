"use client";

import { useState, useEffect } from "react";
import { employeeApi, notificationApi } from "@/lib/api";
import { Employee } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import EditPersonalModal from "./edit_personal-information/EditPersonalModal";
import EditEmployeeModal from "./edit_employee-information/EditEmployeeModal";
import EditContactsModal from "./edit_contact-information/editContact";
import EditEmailModal from "./edit_email-information/editEmail";

export default function Dashboard() {
  const { user } = useAuth();

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 

  const [activeTab, setActiveTab] = useState<"basic" | "job" | "notifications">("basic");
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

  // Modal states
  const [isEditPersonalModalOpen, setIsEditPersonalModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [isEditContactsModalOpen, setIsEditContactsModalOpen] = useState(false);
  const [isEditEmailModalOpen, setIsEmailModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setNotificationsLoading(true);
      setNotificationsError(null);

      try {
        const notificationsResult = await notificationApi.getMy({ limit: 50 });

        // Fetch current employee's detailed data
        if (user?.employee_id) {
          const employeeResult = await employeeApi.getById(user.employee_id);
          if (employeeResult.success && employeeResult.data) {
            setCurrentEmployee(employeeResult.data as Employee);
          }
        }

        if (notificationsResult.success && Array.isArray(notificationsResult.data)) {
          setNotifications(notificationsResult.data as {
            notification_id: number;
            title: string;
            message: string;
            category?: string;
            status: 'read' | 'unread';
            created_at: string;
          }[]);
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

  const handleContactmodal = () => {
    setIsEditContactsModalOpen(true);
  };

  const handleEmailModal = () => {
    setIsEmailModalOpen(true);
  };

  const refreshNotifications = async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const result = await notificationApi.getMy({ limit: 50 });
      if (result.success && Array.isArray(result.data)) {
        setNotifications(result.data as {
          notification_id: number;
          title: string;
          message: string;
          category?: string;
          status: 'read' | 'unread';
          created_at: string;
        }[]);
      } else {
        setNotifications([]);
        setNotificationsError(result.message || "Failed to fetch notifications");
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
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
          prev.map((item) =>
            item.notification_id === id ? { ...item, status: 'read' as const } : item
          )
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
        setNotifications((prev) => prev.map((item) => ({ ...item, status: 'read' as const })));
      } else {
        setNotificationsError(result.message || "Failed to mark notifications as read");
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setNotificationsError("An error occurred while updating notifications");
    } finally {
      setMarkingNotificationsRead(false);
    }
  };

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Title */}
        {currentEmployee ? (
          <div className="text-right">
            <p className="text-md font-normal text-gray-500 font-poppins">Employee ID: {currentEmployee.employee_code}</p>
          </div>
        ) : null}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Employee Profile Card */}
          <div className="bg-[#eed4b3] rounded-xl shadow-sm p-7 border border-[#e8dcc8] flex flex-col">
            {currentEmployee ? (
              <div className="space-y-6 flex flex-col items-center justify-center flex-1">
                {/* Profile Image / Initials */}
                <div className="flex justify-center">
                  {currentEmployee?.first_name && currentEmployee?.last_name ? (
                    <div className="w-36 h-36 rounded-full bg-[#412f23] text-white flex items-center justify-center text-4xl font-bold shadow-md">
                      {`${currentEmployee.first_name[0]}${currentEmployee.last_name[0]}`.toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-36 h-36 rounded-full bg-gray-400 text-white flex items-center justify-center text-4xl font-bold shadow-md">
                      ?
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div className="space-y-2 text-center mt-4">
                  <h1 className="text-2xl font-semibold text-[#281b0d] font-poppins">
                    {currentEmployee?.first_name} {currentEmployee?.last_name}
                  </h1>

                  <p className="text-lg text-[#412f23d4]">
                    {currentEmployee?.position_name || 'N/A'}
                  </p>

                  {/* Divider */}
                  <hr className="w-full border-none mb-4" />

                  <div className="text-left">
                    <p className="text-sm font-bold text-[#412f23de]">Department</p>
                  </div>
                  <hr className="w-80 border-[#e3b983]" />
                  <div className="text-left">
                    <p className="text-sm text-[#412f23d4]">
                      {currentEmployee?.department_name || 'N/A'}
                    </p>
                  </div>

                  <hr className="w-full border-none mb-4" />

                  <div className="text-left flex flex-row justify-between">
                    <p className="text-sm font-bold text-[#412f23de]">Email</p>
                    <p onClick={handleEmailModal} className="text-sm font-semibold underline cursor-pointer text-[#412f23de]">edit</p>
                  </div>
                  <hr className="w-80 border-[#e3b983]" />
                  <div className="text-left">
                    <div className="text-sm text-[#412f23d4] flex flex-col">
                      {user?.emails && user.emails.length > 0 ? (
                        user.emails.map((email, index) => (
                          <span key={index}>{email}</span>
                        ))
                      ) : (
                        <span>N/A</span>
                      )}
                    </div>
                  </div>

                  <hr className="w-full border-none mb-4" />

                  <div className="text-left flex flex-row justify-between">
                    <p className="text-sm font-bold text-[#412f23de]">Contacts</p>
                    <p onClick={handleContactmodal} className="text-sm font-semibold underline cursor-pointer text-[#412f23de]">edit</p>
                  </div>
                  <hr className="w-80 border-[#e3b983]" />
                  <div className="text-left">
                    <p className="text-sm text-[#412f23d4] flex flex-col">
                      {user?.contact_numbers && user.contact_numbers.length > 0 ? (
                        user.contact_numbers.map((contact, index) => (
                          <span key={index}>{contact}</span>
                        ))
                      ) : (
                        <span>N/A</span>  
                      )}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-gray-500">Loading profile...</p>
              </div>
            )}
          </div>

          {/* Right Column - Shifts and Attendance Summary */}
          <div className="space-y-6">
            {/* Tab Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setActiveTab("basic")}
                className={`px-20 py-5 rounded-lg font-medium transition-all ${activeTab === "basic"
                    ? "bg-[#073532] text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Basic Information
              </button>
              <button
                onClick={() => setActiveTab("job")}
                className={`px-20 py-5 rounded-lg font-medium transition-all ${activeTab === "job"
                    ? "bg-[#073532] text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Job Information
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`px-12 py-5 rounded-lg font-medium transition-all ${activeTab === "notifications"
                    ? "bg-[#073532] text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Notifications
              </button>
            </div>

            {/* Basic Information Tab Content */}
            {activeTab === "basic" && (
              <>
                {/* Employee Information Card */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Employee Information</h2>
                    {/* <button
                      onClick={() => setIsEditEmployeeModalOpen(true)}
                      className="bg-white text-[#281b0d] px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Edit
                    </button> */}
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top">Gender:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.gender
                                ? currentEmployee.gender.charAt(0).toUpperCase() + currentEmployee.gender.slice(1)
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top">Birthdate:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.birthdate
                                ? new Date(currentEmployee.birthdate).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric"
                                })
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>


                {/* Personal Information Card */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                    <button
                      onClick={() => setIsEditPersonalModalOpen(true)}
                      className="bg-white text-[#281b0d] px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Edit
                    </button>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Home Address:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.home_address || 'N/A'} {currentEmployee?.city || 'N/A'},  {currentEmployee?.province || 'N/A'}, {currentEmployee?.region || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Civil Status:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.civil_status || 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Job Information Tab Content */}
            {activeTab === "job" && (
              <>
                {/* Job Description */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
                    <h2 className="text-lg font-semibold text-white">Job Description</h2>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Job Title:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.position_name || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Department:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.department_name || 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/*Job History Information */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
                    <h2 className="text-lg font-semibold text-white">History</h2>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top">Employment Date:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.hire_date
                                ? new Date(currentEmployee.hire_date).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric"
                                })
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "notifications" && (
              <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">Notifications</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={refreshNotifications}
                      className="bg-white text-[#281b0d] px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      disabled={markingNotificationsRead || notifications.length === 0}
                      className="bg-white text-[#281b0d] px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {notificationsLoading ? (
                    <p className="text-sm text-gray-500">Loading notifications...</p>
                  ) : notificationsError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                      {notificationsError}
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No notifications yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((item) => (
                        <div
                          key={item.notification_id}
                          className={`rounded-md border px-4 py-3 ${item.status === 'unread'
                            ? 'bg-[#fff7ec] border-[#e2c8a9]'
                            : 'bg-white border-[#ece7df]'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{item.message}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="capitalize">{item.category || 'general'}</span>
                                <span>{new Date(item.created_at).toLocaleString()}</span>
                                <span className={`px-2 py-0.5 rounded-full ${item.status === 'unread' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                                  {item.status === 'unread' ? 'Unread' : 'Read'}
                                </span>
                              </div>
                            </div>
                            {item.status === 'unread' && (
                              <button
                                onClick={() => handleMarkNotificationRead(item.notification_id)}
                                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Mark as read
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

      {/* Modals */}
      <EditPersonalModal
        isOpen={isEditPersonalModalOpen}
        onClose={() => setIsEditPersonalModalOpen(false)}
        id={user?.employee_id || null}
      />
      <EditEmployeeModal
        isOpen={isEditEmployeeModalOpen}
        onClose={() => setIsEditEmployeeModalOpen(false)}
        id={user?.employee_id || null}
      />

      <EditContactsModal
        isOpen={isEditContactsModalOpen}
        onClose={() => setIsEditContactsModalOpen(false)}
        id={user?.employee_id || null}
      />

      <EditEmailModal
        isOpen={isEditEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        id={user?.employee_id || null}
      />
<div>
      {/* Floating Ticket Button */}
      <FloatingTicketButton />
      </div>
    </div>
  );
}