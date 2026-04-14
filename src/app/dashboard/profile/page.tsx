"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { User, Briefcase, Shield, Bell } from "lucide-react";
import { authApi, notificationApi } from "@/lib/api";

type ContactItem = { id: number; number: string };
type EmailItem = { id: number; email: string; isPrimary: boolean };
type FormattedData = {
    personal: {
        photo: null | string;
        firstName: string;
        middleName: string;
        lastName: string;
        extensionName: string;
        employeeCode: string;
        gender: string;
        birthdate: string;
        civilStatus: string;
        status: string;
        hireDate: string;
        leaveCredit: number;
        address: { region: string; province: string; city: string; homeAddress: string };
        contacts: ContactItem[];
        emails: EmailItem[];
    };
    job: {
        department: string;
        position: string;
        positionCode: string;
        supervisor: string;
        salary: number;
        employmentStatus: string;
        availability: string;
    };
    account: {
        username: string;
        role: string;

        isActive: boolean;
        isSuperAdmin: boolean;
        lastUpdated: string;
    };
    dependents: any[];
    emergencyContacts: { id: number; name: string; relation: string; number: string }[];
    attendance: any[];
};

type UserNotification = {
    notification_id: number;
    title: string;
    message: string;
    category?: string;
    status: "read" | "unread";
    created_at: string;
};

const Profile = () => {
    const searchParams = useSearchParams();
    const [activeSection, setActiveSection] = useState("personal");
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsError, setNotificationsError] = useState<string | null>(null);
    const [markingAllRead, setMarkingAllRead] = useState(false);

    useEffect(() => {
        const section = searchParams.get("section");
        if (section === "notifications") {
            setActiveSection("notifications");
        }
    }, [searchParams]);

    const loadNotifications = async () => {
        setNotificationsLoading(true);
        setNotificationsError(null);

        try {
            const result = await notificationApi.getMy({ limit: 50 });
            if (result.success && Array.isArray(result.data)) {
                setNotifications(result.data as UserNotification[]);
            } else {
                setNotifications([]);
                setNotificationsError(result.message || "Failed to fetch notifications");
            }
        } catch (err) {
            console.error(err);
            setNotifications([]);
            setNotificationsError("An error occurred while fetching notifications");
        } finally {
            setNotificationsLoading(false);
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const [userResult, notificationsResult] = await Promise.all([
                    authApi.getCurrentUser(),
                    notificationApi.getMy({ limit: 50 }),
                ]);

                if (userResult.success && userResult.data) {
                    setUserData(userResult.data);
                } else {
                    setError(userResult.message || "Failed to fetch user data");
                }

                if (notificationsResult.success && Array.isArray(notificationsResult.data)) {
                    setNotifications(notificationsResult.data as UserNotification[]);
                    setNotificationsError(null);
                } else {
                    setNotifications([]);
                    setNotificationsError(notificationsResult.message || "Failed to fetch notifications");
                }
            } catch (err) {
                console.error(err);
                setError("An error occurred while fetching user data");
                setNotificationsError("An error occurred while fetching notifications");
            } finally {
                setLoading(false);
                setNotificationsLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleMarkNotificationRead = async (id: number) => {
        try {
            const result = await notificationApi.markRead(id);
            if (result.success) {
                setNotifications((prev) =>
                    prev.map((item) =>
                        item.notification_id === id
                            ? { ...item, status: "read" as const }
                            : item
                    )
                );
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAllRead(true);
        try {
            const result = await notificationApi.markAllRead();
            if (result.success) {
                setNotifications((prev) => prev.map((item) => ({ ...item, status: "read" as const })));
            } else {
                setNotificationsError(result.message || "Failed to mark notifications as read");
            }
        } catch (err) {
            console.error(err);
            setNotificationsError("An error occurred while updating notifications");
        } finally {
            setMarkingAllRead(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-[#480C1B] font-semibold">
                Loading profile...
            </div>
        );
    }

    if (error || !userData) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-600 font-medium">
                {error || "Failed to load profile data"}
            </div>
        );
    }

    // Check if user has employee record
    const hasEmployeeRecord = userData.employee_id != null;

    const formattedData: FormattedData = {
        personal: {
            photo: null,
            firstName: userData.first_name || "",
            middleName: userData.middle_name || "",
            lastName: userData.last_name || "",
            extensionName: userData.extension_name || "",
            employeeCode: userData.employee_code || "",
            gender: userData.gender ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1) : "",
            birthdate: userData.birthdate || "",
            civilStatus: userData.civil_status ? userData.civil_status.charAt(0).toUpperCase() + userData.civil_status.slice(1) : "",
            status: userData.status ? userData.status.charAt(0).toUpperCase() + userData.status.slice(1) : "",
            hireDate: userData.hire_date || "",
            // shift removed (DB column no longer present)
            leaveCredit: userData.leave_credit || 0,
            address: {
                region: userData.region || "",
                province: userData.province || "",
                city: userData.city || "",
                homeAddress: userData.home_address || "",
            },
            contacts: (userData.contact_numbers || []).map((n: string, i: number): ContactItem => ({ id: i + 1, number: n })),
            emails: (userData.emails || []).map((e: string, i: number): EmailItem => ({ id: i + 1, email: e, isPrimary: i === 0 })),
        },
        job: {
            department: userData.department_name || "",
            position: userData.position_name || "",
            positionCode: "",
            supervisor: "",
            salary: userData.salary || 0,
            employmentStatus: userData.status ? userData.status.charAt(0).toUpperCase() + userData.status.slice(1) : "",
            availability: "Available",
        },
        account: {
            username: userData.username || "",
            role: userData.role || "",

            isActive: userData.status === "active",
            isSuperAdmin: userData.role === "superadmin",
            lastUpdated: userData.created_at || "",
        },
        dependents: userData.dependents || [],
        emergencyContacts: userData.dependents && userData.dependents.length > 0 ? [{
            id: 1,
            name: `${userData.dependents[0].firstname} ${userData.dependents[0].lastname}`,
            relation: userData.dependents[0].relationship,
            number: userData.dependents[0].contact_no || "",
        }] : [],
        attendance: [],
    } as const;

    const menuItems = [
        { id: "personal", label: "Personal Information", icon: User },
        { id: "job", label: "Job Information", icon: Briefcase },
        { id: "account", label: "Account Information", icon: Shield },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    return (
        <div className="min-h-screen w-full mx-auto font-poppins">
            {/* HEADER NAVBAR */}
            <header className="bg-[#480C1B] shadow-sm sticky max-w-full mx-auto top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-center px-6 py-4">
                    <nav className="flex gap-2 text-[#FFFFFF]">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${activeSection === item.id
                                        ? "bg-amber-100 text-amber-800 font-medium"
                                        : "text-white hover:text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="w-full mx-auto p-4 md:p-8">
                <div className="bg-white rounded-lg shadow-sm p-8 relative">
                    {/* Warning Banner for users without employee record */}
                    {!hasEmployeeRecord && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-6">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        <strong>Incomplete Profile:</strong> Your account does not have an associated employee record.
                                        Some profile information may be missing. Please contact your system administrator.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PERSONAL SECTION */}
                    {activeSection === "personal" && (
                        <>
                            {/* Header Info */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-4 pb-4 sm:mb-8 sm:pb-8 border-b">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-amber-900 to-amber-800 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                                    {formattedData.personal.firstName?.[0] || 'U'}
                                    {formattedData.personal.lastName?.[0] || ''}
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center sm:text-left">
                                        {formattedData.personal.firstName}
                                        {formattedData.personal.lastName}
                                    </h1>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-gray-700">
                                        <div>
                                            <span className="text-gray-500">Job Title:</span>{" "}
                                            <span className="font-medium">
                                                {formattedData.job.position}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Department:</span>{" "}
                                            <span className="font-medium">
                                                {formattedData.job.department}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                {formattedData.personal.employeeCode}
                                            </span>
                                        </div>
                                        {/* Shift removed per schema change */}
                                        <div>
                                            <span className="text-gray-500">Status:</span>{" "}
                                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                                {formattedData.personal.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Emergency Contact
                                </h2>

                                {(() => {
                                    const emergency = formattedData.emergencyContacts[0] || {};
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Emergency Contact</label>
                                                <input
                                                    type="text"
                                                    value={emergency.name || ""}
                                                    readOnly
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Relation</label>
                                                <input
                                                    type="text"
                                                    value={emergency.relation || ""}
                                                    readOnly
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-2">Number</label>
                                                <input
                                                    type="text"
                                                    value={emergency.number || ""}
                                                    readOnly
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>


                            {/* Personal Info */}
                            <section className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Personal Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {[
                                        ["First Name", formattedData.personal.firstName],
                                        ["Last Name", formattedData.personal.lastName],
                                        ["Middle Name", formattedData.personal.middleName],
                                        [
                                            "Extension Name",
                                            formattedData.personal.extensionName || "N/A",
                                        ],
                                        ["Gender", formattedData.personal.gender],
                                        [
                                            "Birthdate",
                                            formattedData.personal.birthdate
                                                ? new Date(
                                                    formattedData.personal.birthdate
                                                ).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })
                                                : "N/A",
                                        ],
                                        ["Civil Status", formattedData.personal.civilStatus],
                                        [
                                            "Hire Date",
                                            formattedData.personal.hireDate
                                                ? new Date(
                                                    formattedData.personal.hireDate
                                                ).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })
                                                : "N/A",
                                        ],
                                    ].map(([label, value], idx) => (
                                        <div key={idx}>
                                            <label className="block text-sm text-gray-600 mb-1">
                                                {label}
                                            </label>
                                            <p className="text-gray-900">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Address */}
                            <section className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Address
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {Object.entries(formattedData.personal.address).map(
                                        ([label, value]) => (
                                            <div key={label}>
                                                <label className="block text-sm text-gray-600 mb-1 capitalize">
                                                    {label.replace(/([A-Z])/g, ' $1').trim()}
                                                </label>
                                                <p className="text-gray-900">{value || "N/A"}</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </section>

                            {/* Contact Info */}
                            <section>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                    Contact Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Phone Numbers
                                        </label>
                                        {formattedData.personal.contacts.length > 0 ? (
                                            formattedData.personal.contacts.map((contact) => (
                                                <p key={contact.id} className="text-gray-900">
                                                    {contact.number}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-gray-900">No contact numbers</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Email Addresses
                                        </label>
                                        {formattedData.personal.emails.length > 0 ? (
                                            formattedData.personal.emails.map((email) => (
                                                <div key={email.id} className="flex items-center gap-2">
                                                    <p className="text-gray-900">{email.email}</p>
                                                    {email.isPrimary && (
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-900">No email addresses</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {/* JOB SECTION */}
                    {activeSection === "job" && (
                        <section>
                            <h1 className="text-2xl font-bold text-gray-900 mb-8">
                                Job Information
                            </h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {Object.entries({
                                    Department: formattedData.job.department,
                                    "Position / Job Title": formattedData.job.position,
                                    "Position Code": formattedData.job.positionCode || "N/A",
                                    Supervisor: formattedData.job.supervisor || "N/A",
                                    Salary: formattedData.job.salary ? `₱${formattedData.job.salary.toLocaleString()}` : "N/A",
                                    "Employment Status": formattedData.job.employmentStatus,
                                    Availability: formattedData.job.availability,
                                    "Leave Credits": `${formattedData.personal.leaveCredit} days`,
                                }).map(([label, value]) => (
                                    <div key={label}>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            {label}
                                        </label>
                                        <p className="text-gray-900 font-medium">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ACCOUNT SECTION */}
                    {activeSection === "account" && (
                        <section>
                            <h1 className="text-2xl font-bold text-gray-900 mb-8">
                                Account Information
                            </h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Username
                                    </label>
                                    <p className="text-gray-900">
                                        {formattedData.account.username}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Role</label>
                                    <p className="text-gray-900 capitalize">
                                        {formattedData.account.role}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Account Status
                                    </label>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-sm ${formattedData.account.isActive
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {formattedData.account.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Super Admin
                                    </label>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-sm ${formattedData.account.isSuperAdmin
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {formattedData.account.isSuperAdmin ? "Yes" : "No"}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Last Updated
                                    </label>
                                    <p className="text-gray-900">
                                        {formattedData.account.lastUpdated
                                            ? new Date(
                                                formattedData.account.lastUpdated
                                            ).toLocaleString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeSection === "notifications" && (
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={loadNotifications}
                                        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        onClick={handleMarkAllRead}
                                        disabled={markingAllRead || notifications.length === 0}
                                        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            </div>

                            {notificationsLoading ? (
                                <p className="text-gray-600">Loading notifications...</p>
                            ) : notificationsError ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                                    {notificationsError}
                                </div>
                            ) : notifications.length === 0 ? (
                                <p className="text-gray-600">No notifications yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.notification_id}
                                            className={`p-4 rounded-lg border ${notification.status === "unread"
                                                ? "bg-amber-50 border-amber-200"
                                                : "bg-white border-gray-200"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{notification.title}</p>
                                                    <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                        <span className="capitalize">{notification.category || "general"}</span>
                                                        <span>{new Date(notification.created_at).toLocaleString()}</span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full ${notification.status === "unread"
                                                                ? "bg-amber-100 text-amber-800"
                                                                : "bg-gray-100 text-gray-700"
                                                                }`}
                                                        >
                                                            {notification.status === "unread" ? "Unread" : "Read"}
                                                        </span>
                                                    </div>
                                                </div>
                                                {notification.status === "unread" && (
                                                    <button
                                                        onClick={() => handleMarkNotificationRead(notification.notification_id)}
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
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Profile;
