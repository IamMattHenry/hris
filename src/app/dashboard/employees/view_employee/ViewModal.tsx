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

interface ContactEmail { email_id: number; email: string; }
interface ContactNumber { contact_id: number; contact_number: string; }

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

interface EmployeeDocuments {
  document_id?: number;
  employee_id: number;
  sss: boolean;
  pagIbig: boolean;
  tin: boolean;
  philhealth: boolean;
  cedula: boolean;
  birthCert: boolean;
  policeClearance: boolean;
  barangayClearance: boolean;
  medicalCert: boolean;
  others: boolean;
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
  documents?: EmployeeDocuments;
  status: string;
  image_url?: string;
  province?: string;
  barangay?: string;
  username?: string;
  role?: string;
  salary?: string;
}

type TabType = "profile" | "job" | "beneficiaries" | "documents" | "authentication";

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
    return new Date(dateStr).toLocaleDateString("en-US", {
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
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age.toString();
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: "profile", label: "Profile & Contacts" },
    { id: "job", label: "Job Information" },
    { id: "beneficiaries", label: "Beneficiaries" },
    { id: "documents", label: "Documents" },
    { id: "authentication", label: "Authentication" },
  ];

  const capitalize = (str: string | undefined) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#fdf3e2] w-full max-w-6xl rounded-xl sm:rounded-2xl shadow-2xl relative text-[#3b2b1c] overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Tabs (horizontal scroll) */}
        <div className="sm:hidden bg-[#f4e6cf] border-b border-[#e8d4b8] p-3 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#e8d4b8] text-[#3b2b1c] shadow-sm"
                    : "text-[#6b5844] hover:bg-[#ede0ca]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Desktop Sidebar */}
          <div className="hidden sm:block w-52 bg-[#f4e6cf] p-5 space-y-2 border-r border-[#e8d4b8] overflow-y-auto flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
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
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[#3b2b1c] hover:opacity-70 z-20"
              aria-label="Close"
            >
              <X size={28} />
            </button>

            <div className="p-5 sm:p-8 md:p-10">
              {employee ? (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#3b2b1c] mb-5 sm:mb-6">
                    View Employee
                  </h1>

                  {message && (
                    <div
                      className={`mb-5 p-3 rounded-lg text-sm ${
                        message.type === "success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  {/* Header - stacked on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6 mb-6 sm:mb-10">
                    {/* Avatar */}
                    {employee.image_url ? (
                      <img
                        src={employee.image_url}
                        alt="Employee"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-md ring-2 ring-[#e8d4b8]/50 flex-shrink-0 mx-auto sm:mx-0"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#5a2e2e] rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md ring-2 ring-[#e8d4b8]/50 flex-shrink-0 mx-auto sm:mx-0">
                        {employee.first_name?.[0]}
                        {employee.last_name?.[0]}
                      </div>
                    )}

                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-semibold text-[#3b2b1c]">
                        {employee.first_name} {employee.last_name}
                      </h2>
                      <p className="text-sm text-[#8b7355] mt-1 font-medium">
                        {employee.employee_code}
                      </p>

                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                        <span className="text-sm text-[#8b7355]">Status:</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm space-y-1.5 text-center sm:text-right mt-3 sm:mt-0">
                      <p>
                        <span className="text-[#8b7355]">Position: </span>
                        <span className="font-medium text-[#3b2b1c]">{employee.position_name || "—"}</span>
                      </p>
                      <p>
                        <span className="text-[#8b7355]">Department: </span>
                        <span className="font-medium text-[#3b2b1c]">{employee.department_name || "—"}</span>
                      </p>
                    </div>
                  </div>

                  {/* ──────────────────────────────────────────────── */}
                  {/* Tab Content */}
                  {/* ──────────────────────────────────────────────── */}

                  {activeTab === "profile" && (
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          <InfoBox label="Emails" value={employee.emails?.map(e => e.email).join("\n") || "—"} isTextarea />
                          <InfoBox label="Contact Numbers" value={employee.contact_numbers?.map(c => c.contact_number).join("\n") || "—"} isTextarea />
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                          <InfoBox label="Gender" value={capitalize(employee.gender)} />
                          <InfoBox label="Civil Status" value={capitalize(employee.civil_status)} />
                          <InfoBox label="Age" value={calculateAge(employee.birthdate)} />
                          <InfoBox label="Birthdate" value={formatDate(employee.birthdate)} />
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold mb-4">Address Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          <InfoBox label="Home Address" value={employee.home_address || "—"} isTextarea />
                          <InfoBox label="Region" value={employee.region || "—"} />
                          <InfoBox label="Province" value={employee.province || "N/A"} />
                          <InfoBox label="City" value={employee.city || "—"} />
                          <InfoBox label="Barangay" value={employee.barangay || "N/A"} />
                        </div>
                      </section>
                    </div>
                  )}

                  {activeTab === "job" && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <InfoBox label="Hired Date" value={formatDate(employee.hire_date)} />
                        <InfoBox label="Department" value={employee.department_name || "N/A"} />
                        <InfoBox label="Position" value={employee.position_name || "N/A"} />
                        <InfoBox label="Leave Credits" value={(employee.leave_credit ?? 0).toString()} />
                      </div>
                    </div>
                  )}

                  {activeTab === "beneficiaries" && (
                    <div className="space-y-6">
                      {employee.dependents?.length ? (
                        employee.dependents.map((dep) => (
                          <div key={dep.dependant_id} className="border border-[#d4c5b9] rounded-lg p-5 bg-[#f9f6f1]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              <InfoBox label="Code" value={dep.dependant_code} />
                              <InfoBox label="Name" value={`${dep.firstname} ${dep.lastname}`} />
                              <InfoBox label="Relationship" value={dep.relationship} />
                              <InfoBox label="Email" value={dep.email || "N/A"} />
                              <InfoBox label="Contact" value={dep.contact_no || "N/A"} />
                              <InfoBox label="Address" value={dep.home_address || "N/A"} isTextarea />
                              <InfoBox label="Region" value={dep.region_name || "N/A"} />
                              <InfoBox label="Province" value={dep.province_name || "N/A"} />
                              <InfoBox label="City" value={dep.city_name || "N/A"} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No dependents recorded.</p>
                      )}
                    </div>
                  )}

                  {activeTab === "documents" && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold mb-4">Document Checklist</h3>
                      {employee.documents ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { key: "sss", label: "SSS" },
                            { key: "pagIbig", label: "Pag-IBIG" },
                            { key: "tin", label: "TIN" },
                            { key: "philhealth", label: "PhilHealth" },
                            { key: "cedula", label: "Cedula" },
                            { key: "birthCert", label: "Birth Certificate" },
                            { key: "policeClearance", label: "Police Clearance" },
                            { key: "barangayClearance", label: "Barangay Clearance" },
                            { key: "medicalCert", label: "Medical Certificate" },
                            { key: "others", label: "Others" },
                          ].map((doc) => (
                            <div
                              key={doc.key}
                              className={`p-4 rounded-lg border-2 flex items-center gap-3 ${
                                employee.documents![doc.key as keyof EmployeeDocuments]
                                  ? "bg-green-50/70 border-green-300"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  employee.documents![doc.key as keyof EmployeeDocuments]
                                    ? "bg-green-500"
                                    : "bg-gray-300"
                                }`}
                              >
                                {employee.documents![doc.key as keyof EmployeeDocuments] && (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className={`font-medium ${
                                employee.documents![doc.key as keyof EmployeeDocuments]
                                  ? "text-green-800"
                                  : "text-gray-700"
                              }`}>
                                {doc.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                          <p className="text-yellow-700">No document information available.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "authentication" && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <InfoBox label="Username" value={employee.username || "N/A"} />
                        <InfoBox label="Role" value={employee.role || "Employee"} />
                      </div>

                      <div className="pt-6 border-t border-[#d4c5b9]">
                        <h3 className="text-lg font-semibold mb-5">Employee QR Code</h3>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e8d4b8]/60">
                            <QRCodeGenerator
                              employeeData={{
                                employee_id: employee.employee_id,
                                employee_code: employee.employee_code,
                                first_name: employee.first_name,
                                last_name: employee.last_name,
                                position_name: employee.position_name || "N/A",
                                schedule_time: "08:00",
                              }}
                              size={180}
                            />
                          </div>

                          <div className="flex-1 space-y-3 text-sm">
                            <p className="text-[#6b5844]">
                              Contains: <strong className="text-[#3b2b1c]">{employee.employee_code}</strong>
                            </p>
                            <p className="text-xs text-[#8b7355]">
                              Used for quick identification & attendance
                            </p>
                            <div className="bg-[#fff7ec] p-4 rounded-lg border border-[#d4c5b9] text-xs space-y-1.5">
                              <p className="font-semibold">QR Data:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                <li>ID: {employee.employee_id}</li>
                                <li>Code: {employee.employee_code}</li>
                                <li>Name: {employee.first_name} {employee.last_name}</li>
                                <li>Position: {employee.position_name || "N/A"}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-600 animate-pulse">Loading employee details...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}