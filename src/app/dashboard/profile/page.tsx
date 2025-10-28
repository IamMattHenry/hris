"use client";

import React, { useState } from "react";
import { X, User, Briefcase, Shield } from "lucide-react";

const mockEmployeeData = {
    personal: {
        photo: null,
        firstName: 'Juan',
        middleName: 'Dela',
        lastName: 'Cruz',
        extensionName: '',
        employeeCode: 'EMP-001',
        gender: 'Male',
        birthdate: '1990-05-15',
        civilStatus: 'Married',
        status: 'Active',
        hireDate: '2020-01-15',
        shift: 'Morning',
        leaveCredit: 15,
        address: {
            region: 'NCR',
            province: 'Metro Manila',
            city: 'Quezon City',
            homeAddress: '123 Main Street, Barangay Santo Domingo'
        },
        contacts: [
            { id: 1, number: '+63 917 123 4567' },
            { id: 2, number: '+63 2 8123 4567' }
        ],
        emails: [
            { id: 1, email: 'juan.delacruz@company.com', isPrimary: true },
            { id: 2, email: 'juan.personal@email.com', isPrimary: false }
        ]
    },
    job: {
        department: 'Human Resource',
        position: 'Manager',
        positionCode: 'POS-HR-001',
        supervisor: 'Maria Santos',
        salary: 75000,
        employmentStatus: 'Regular',
        availability: 'Available'
    },
    account: {
        username: 'juan.delacruz',
        role: 'employee',
        subRoles: ['HR Manager', 'Team Lead'],
        isActive: true,
        isSuperAdmin: false,
        lastUpdated: '2024-10-15T10:30:00'
    },
    dependents: [
        {
            id: 1,
            firstName: 'Maria',
            lastName: 'Dela Cruz',
            relationship: 'Spouse',
            birthdate: '1992-08-20',
            email: 'maria.delacruz@email.com',
            contact: '+63 917 987 6543',
            address: '123 Main Street, Quezon City'
        },
        {
            id: 2,
            firstName: 'Jose',
            lastName: 'Dela Cruz',
            relationship: 'Son',
            birthdate: '2015-03-10',
            email: null,
            contact: null,
            address: '123 Main Street, Quezon City'
        }
    ],
    emergencyContacts: [
        {
            id: 1,
            name: 'Maria Dela Cruz',
            relation: 'Spouse',
            number: '+63 917 987 6543'
        }
    ],
    attendance: [
        { id: 1, date: '2024-10-28', timeIn: '08:00 AM', timeOut: '05:15 PM', totalHours: 9.25, remarks: 'On Time' },
        { id: 2, date: '2024-10-27', timeIn: '08:15 AM', timeOut: '05:00 PM', totalHours: 8.75, remarks: 'Late' },
        { id: 3, date: '2024-10-26', timeIn: '08:00 AM', timeOut: '06:00 PM', totalHours: 10, remarks: 'Overtime' },
        { id: 4, date: '2024-10-25', timeIn: '08:00 AM', timeOut: '05:00 PM', totalHours: 9, remarks: 'On Time' },
        { id: 5, date: '2024-10-24', timeIn: null, timeOut: null, totalHours: 0, remarks: 'Absent' }
    ]
};


const Profile = () => {
    const [activeSection, setActiveSection] = useState("personal");

    const menuItems = [
        { id: "personal", label: "Personal Information", icon: User },
        { id: "job", label: "Job Information", icon: Briefcase },
        { id: "account", label: "Account Information", icon: Shield },
    ];

    return (
        <div className="min-h-screen max-w-screen w-full mx-auto font-poppins">
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
            <main className="w-full mx-auto p-8">
                <div className="bg-white rounded-lg shadow-sm p-8 relative">
                    <button className="absolute top-8 right-8 text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>

                    {/* PERSONAL SECTION */}
                    {activeSection === "personal" && (
                        <>
                            {/* Header Info */}
                            <div className="flex items-start gap-6 mb-8 pb-8 border-b">
                                <div className="w-32 h-32 bg-gradient-to-br from-amber-900 to-amber-800 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                                    {mockEmployeeData.personal.firstName[0]}
                                    {mockEmployeeData.personal.lastName[0]}
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                        {mockEmployeeData.personal.firstName}{" "}
                                        {mockEmployeeData.personal.lastName}
                                    </h1>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-gray-700">
                                        <div>
                                            <span className="text-gray-500">Job Title:</span>{" "}
                                            <span className="font-medium">
                                                {mockEmployeeData.job.position}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Department:</span>{" "}
                                            <span className="font-medium">
                                                {mockEmployeeData.job.department}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                {mockEmployeeData.personal.employeeCode}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Shift:</span>{" "}
                                            <span className="font-medium">
                                                {mockEmployeeData.personal.shift}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Status:</span>{" "}
                                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                                {mockEmployeeData.personal.status}
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
                                    const emergency = mockEmployeeData.emergencyContacts[0] || {};
                                    return (
                                        <div className="grid grid-cols-3 gap-4">
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
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    {[
                                        ["First Name", mockEmployeeData.personal.firstName],
                                        ["Last Name", mockEmployeeData.personal.lastName],
                                        ["Middle Name", mockEmployeeData.personal.middleName],
                                        [
                                            "Extension Name",
                                            mockEmployeeData.personal.extensionName || "N/A",
                                        ],
                                        ["Gender", mockEmployeeData.personal.gender],
                                        [
                                            "Birthdate",
                                            new Date(
                                                mockEmployeeData.personal.birthdate
                                            ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            }),
                                        ],
                                        ["Civil Status", mockEmployeeData.personal.civilStatus],
                                        [
                                            "Hire Date",
                                            new Date(
                                                mockEmployeeData.personal.hireDate
                                            ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            }),
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
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    {Object.entries(mockEmployeeData.personal.address).map(
                                        ([label, value]) => (
                                            <div key={label}>
                                                <label className="block text-sm text-gray-600 mb-1 capitalize">
                                                    {label}
                                                </label>
                                                <p className="text-gray-900">{value}</p>
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
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Phone Numbers
                                        </label>
                                        {mockEmployeeData.personal.contacts.map((contact) => (
                                            <p key={contact.id} className="text-gray-900">
                                                {contact.number}
                                            </p>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">
                                            Email Addresses
                                        </label>
                                        {mockEmployeeData.personal.emails.map((email) => (
                                            <div key={email.id} className="flex items-center gap-2">
                                                <p className="text-gray-900">{email.email}</p>
                                                {email.isPrimary && (
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                        ))}
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
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                {Object.entries({
                                    Department: mockEmployeeData.job.department,
                                    "Position / Job Title": mockEmployeeData.job.position,
                                    "Position Code": mockEmployeeData.job.positionCode,
                                    Supervisor: mockEmployeeData.job.supervisor,
                                    Salary: `₱${mockEmployeeData.job.salary.toLocaleString()}`,
                                    "Employment Status": mockEmployeeData.job.employmentStatus,
                                    Availability: mockEmployeeData.job.availability,
                                    "Leave Credits": `${mockEmployeeData.personal.leaveCredit} days`,
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
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Username
                                    </label>
                                    <p className="text-gray-900">
                                        {mockEmployeeData.account.username}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Role</label>
                                    <p className="text-gray-900 capitalize">
                                        {mockEmployeeData.account.role}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Sub-Roles
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {mockEmployeeData.account.subRoles.map((role, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                                            >
                                                {role}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Account Status
                                    </label>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-sm ${mockEmployeeData.account.isActive
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {mockEmployeeData.account.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Super Admin
                                    </label>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-sm ${mockEmployeeData.account.isSuperAdmin
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {mockEmployeeData.account.isSuperAdmin ? "Yes" : "No"}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Last Updated
                                    </label>
                                    <p className="text-gray-900">
                                        {new Date(
                                            mockEmployeeData.account.lastUpdated
                                        ).toLocaleString("en-US", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Profile;
