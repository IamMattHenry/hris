"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import InfoBox from "@/components/forms/FormDisplay";
import { employeeApi } from "@/lib/api";
import QRCodeGenerator from "../QRgenerator/QRCodeGenerator";

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
}

interface ContactEmail {
  email_id: number;
  email: string;
}

interface ContactNumber {
  contact_id: number;
  contact_number: string;
}

interface Dependent {
  dependant_id: number;
  dependant_code: string;
  firstname: string;
  lastname: string;
  relationship: string;
  birth_date: string;
  email?: string;
  contact_no?: string;
  home_address?: string;
  region_name?: string;
  province_name?: string;
  city_name?: string;
}

interface EmployeeData {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender: string;
  civil_status: string;
  home_address: string;
  city: string;
  region: string;
  department_name: string;
  position_name: string;
  leave_credit?: number;
  hire_date: string;
  emails?: ContactEmail[];
  contact_numbers?: ContactNumber[];
  dependents?: Dependent[];
  shift: string;
  sub_role?: string;
  status: string;
  image_url?: string;
  province?: string;
  username?: string;
  role?: string;
  salary?: string;
}

type TabType = "profile" | "job" | "beneficiaries" | "authentication";

export default function ViewEmployeeModal({
  isOpen,
  onClose,
  id,
}: ViewEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && id) {
      setActiveTab("profile");
      fetchEmployeeData(id);
    }
  }, [isOpen, id]);

  const fetchEmployeeData = async (employeeId: number) => {
    try {
      const result = await employeeApi.getById(employeeId);
      if (result.success && result.data) {
        setEmployee(result.data as EmployeeData);
      } else {
        setMessage({ type: "error", text: "Failed to load employee data" });
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      setMessage({ type: "error", text: "An error occurred while loading employee data" });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  };

  const calculateAge = (birthdate: string) => {
    if (!birthdate) return "";
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return age.toString();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "profile" as TabType, label: "Profile & Contacts" },
    { id: "job" as TabType, label: "Job Information" },
    { id: "beneficiaries" as TabType, label: "Beneficiaries" },
    { id: "authentication" as TabType, label: "Authentication" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full  max-w-[90rem] rounded-2xl shadow-2xl relative text-[#3b2b1c] overflow-hidden flex max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-[#f4e6cf] p-6 space-y-2 flex-shrink-0 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#e8d4b8] text-[#3b2b1c] shadow-sm"
                  : "text-[#6b5844] hover:bg-[#ede0ca]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70 z-10 cursor-pointer"
          >
            <X size={26} />
          </button>

          <div className="p-10">
            {employee ? (
              <>
                {/* Page Title */}
                <h1 className="text-3xl font-bold text-[#3b2b1c] mb-6">View Employee</h1>

                {/* Message Alert */}
                {message && (
                  <div className={`mb-4 p-3 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {message.text}
                  </div>
                )}

                {/* Header Section */}
                <div className="flex items-start gap-3 my-8">
                  {/* Profile Image */}
                  {employee.image_url ? (
                    <img
                      src={employee.image_url}
                      alt="Employee"
                      className="w-24 h-24 rounded-full object-cover shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-[#5a2e2e] rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md flex-shrink-0">
                      {employee.first_name && employee.last_name
                        ? `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase()
                        : "?"}
                    </div>
                  )}

                  {/* Employee Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-[#3b2b1c] mb-1">
                      {employee.first_name} {employee.last_name}
                    </h2>
                    <p className="text-sm text-[#8b7355] mb-2">{employee.employee_code}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-[#8b7355]">Status:</span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Right Side Info */}
                  <div className="text-left space-y-1">
                    <p className="text-sm text-[#8b7355]">Job Title: <span className="text-[#3b2b1c] font-medium">{employee.position_name}</span></p>
                    <p className="text-sm text-[#8b7355]">Department: <span className="text-[#3b2b1c] font-medium">{employee.department_name}</span></p>
                    <p className="text-sm text-[#8b7355]">Shift: <span className="text-[#3b2b1c] font-medium">{employee.shift}</span></p>
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <InfoBox
                        label="Emails"
                        value={employee.emails
                          ?.map(e => `${e.email}`)
                          .join("\n")}
                        isTextarea={true}
                      />
                      <InfoBox label="Gender" value={employee.gender} />
                      <InfoBox label="Home Address" value={employee.home_address} isTextarea={true} />
                      <InfoBox
                        label="Contacts"
                        value={employee.contact_numbers
                          ?.map(c => c.contact_number)
                          .join("\n")}
                        isTextarea={true}
                      />
                      <InfoBox label="Civil Status" value={employee.civil_status} />
                      <InfoBox label="Region" value={employee.region} />
                      <InfoBox label="Age" value={calculateAge(employee.birthdate)} />
                      <InfoBox label="Birthdate" value={formatDate(employee.birthdate)} />
                      <InfoBox label="Province" value={employee.province || "N/A"} />
                      <InfoBox label="City" value={employee.city} />

                    </div>
                  </div>
                )}

                {activeTab === "job" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <InfoBox label="Hired Date" value={formatDate(employee.hire_date)} />
                      <InfoBox label="Shift" value={employee.shift || "N/A"} />
                      <InfoBox label="Department" value={employee.department_name || "N/A"} />
                      <InfoBox label="Position" value={employee.position_name || "N/A"} />
                      <InfoBox label="Leave Credits (Remaining)" value={(employee.leave_credit ?? 0).toString()} />
                    </div>
                  </div>
                )}

                {activeTab === "beneficiaries" && (
                  <div className="space-y-6">
                    {employee.dependents && employee.dependents.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[#3b2b1c] mb-4">Dependents</h3>
                        {employee.dependents.map((dependent) => (
                          <div key={dependent.dependant_id} className="border border-[#d4c5b9] rounded-lg p-4 bg-[#f9f6f1]">
                            <div className="grid grid-cols-3 gap-4">
                              <InfoBox label="Code" value={dependent.dependant_code} />
                              <InfoBox label="Name" value={`${dependent.firstname} ${dependent.lastname}`} />
                              <InfoBox label="Relationship" value={dependent.relationship} />
                              <InfoBox label="Email" value={dependent.email || "N/A"} />
                              <InfoBox label="Contact" value={dependent.contact_no || "N/A"} />
                              <InfoBox label="Address" value={dependent.home_address || "N/A"} isTextarea={true} />
                              <InfoBox label="Region" value={dependent.region_name || "N/A"} />
                              <InfoBox label="Province" value={dependent.province_name || "N/A"} />
                              <InfoBox label="City" value={dependent.city_name || "N/A"} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">No dependents found for this employee.</p>
                    )}
                  </div>
                )}

                {activeTab === "authentication" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <InfoBox label="Username" value={employee.username || "N/A"} />
                      <InfoBox label="Role" value={employee.role || "Employee"} />
                      <InfoBox label="Sub-Role" value={employee.sub_role || "N/A"} />
                    </div>

                    {/* QR Code Section */}
                    <div className="mt-6 pt-6 border-t border-[#d4c5b9]">
                      <h3 className="text-lg font-semibold text-[#3b2b1c] mb-4">Employee QR Code</h3>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="w-full md:w-auto">
                          <QRCodeGenerator
                            employeeData={{
                              employee_id: employee.employee_id,
                              employee_code: employee.employee_code,
                              first_name: employee.first_name,
                              last_name: employee.last_name,
                              position_name: employee.position_name || "N/A",
                              shift: employee.shift || "N/A",
                              schedule_time: employee.shift === "morning" ? "08:00" : "17:00",
                            }}
                            size={200}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[#6b5844] mb-2">
                            This QR code contains employee information including: <span className="font-semibold text-[#3b2b1c]">{employee.employee_code}</span>
                          </p>
                          <p className="text-xs text-[#8b7355] mb-2">
                            Scan this code for quick employee identification and attendance tracking.
                          </p>
                          <div className="text-xs text-[#8b7355] bg-[#fff7ec] p-3 rounded-md border border-[#d4c5b9]">
                            <p className="font-semibold mb-1">QR Code Data:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Employee ID: {employee.employee_id}</li>
                              <li>Employee Code: {employee.employee_code}</li>
                              <li>Name: {employee.first_name} {employee.last_name}</li>
                              <li>Position: {employee.position_name || "N/A"}</li>
                              <li>Shift: {employee.shift || "N/A"}</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-600">Loading employee details...</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}