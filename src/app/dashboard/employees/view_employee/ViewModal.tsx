"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { employeeApi } from "@/lib/api";
import InfoBox from "@/components/forms/FormDisplay";
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
  contact_number_id: number;
  contact_number: string;
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
  hire_date: string;
  emails?: ContactEmail[];
  contact_numbers?: ContactNumber[];
  shift: string;
  sub_role?: string;
  status: string;
  image_url?: string;
}

export default function ViewEmployeeModal({
  isOpen,
  onClose,
  id,
}: ViewEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const statusOptions = ["active", "resigned", "terminated"];

  useEffect(() => {
    if (isOpen && id) fetchEmployee(id);
  }, [isOpen, id]);

  const fetchEmployee = async (empId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      console.log(res.data);
      if (res.success && res.data) {
        setEmployee(res.data);
        setSelectedStatus(res.data.status);
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!employee || selectedStatus === employee.status) {
      setIsEditingStatus(false);
      return;
    }

    setIsUpdating(true);
    try {
      const result = await employeeApi.update(employee.employee_id, {
        status: selectedStatus,
      });

      if (result.success) {
        setEmployee({ ...employee, status: selectedStatus });
        setMessage({ type: "success", text: "Status updated successfully" });
        setIsEditingStatus(false);

        // Broadcast status change to other components
        window.dispatchEvent(
          new CustomEvent("employeeStatusUpdated", {
            detail: { employee_id: employee.employee_id, status: selectedStatus },
          })
        );

        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.message || "Failed to update status" });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setMessage({ type: "error", text: "An error occurred while updating status" });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long", // "January"
      day: "2-digit", // "01"
      year: "numeric", // "2025"
    });
  };

  // Compute age from birthdate
  const calculateAge = (birthdate: string) => {
    if (!birthdate) return "";
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--; // Not yet had birthday this year
    }
    return age.toString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full max-w-6xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
        >
          <X size={26} />
        </button>

        {employee ? (
          <>
            {/* Message Alert */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {message.text}
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">
                {employee.first_name} {employee.last_name}
              </h2>
              {isEditingStatus ? (
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-1 border border-[#d8c3a5] rounded-full text-sm font-semibold bg-white text-[#3b2b1c]"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdating}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-full hover:bg-green-700 disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingStatus(false);
                      setSelectedStatus(employee.status);
                    }}
                    className="px-3 py-1 bg-gray-400 text-white text-sm rounded-full hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="px-4 py-1 bg-[#d8c3a5] rounded-full text-sm font-semibold hover:bg-[#c9b496] transition cursor-pointer"
                >
                  {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                </button>
              )}
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {/* Profile + Hire Info */}
              <div className="flex flex-col items-center space-y-4">
                {employee.image_url ? (
                  <img
                    src={employee.image_url}
                    alt="Employee"
                    className="w-32 h-32 rounded-xl object-cover shadow-md"
                  />
                ) : (
                  <div className="w-32 h-32 bg-[#800000] rounded-xl flex items-center justify-center text-white text-4xl font-bold shadow-md">
                    {employee.first_name && employee.last_name
                      ? `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase()
                      : "?"}
                  </div>
                )}
                <div className="bg-[#f4e6cf] px-6 py-2 rounded-xl text-sm shadow-inner">
                  Hire Date: <strong>{formatDate(employee.hire_date)}</strong>
                </div>

              </div>

              {/* Job Information */}
              <div className="space-y-5">
                <InfoBox label="Job Title" value={employee.position_name} />
                <InfoBox label="Department" value={employee.department_name} />
                <InfoBox label="Shift" value={employee.shift} />
                <InfoBox
                  label="Email"
                  value={
                    employee.emails?.length
                      ? employee.emails.map((e) => (
                        <div key={e.email_id}>{e.email}</div>
                      ))
                      : "N/A"
                  }
                />
                {employee.sub_role && (
                  <InfoBox label="Sub Role" value={employee.sub_role} />
                )}
              </div>

              {/* Contact Information */}
              <div className="space-y-5">
                <InfoBox
                  label="Contact Number"
                  value={
                    employee.contact_numbers?.length
                      ? employee.contact_numbers
                        .map((c) => c.contact_number)
                        .join(", ")
                      : "N/A"
                  }
                />
                <InfoBox label="Address" value={employee.home_address} />
                <InfoBox label="City" value={employee.city} />
                <InfoBox label="Region" value={employee.region} />
                <QRCodeGenerator
                  employeeData={{
                    employee_id: employee.employee_id,
                    employee_code: employee.employee_code,
                    first_name: employee.first_name,
                    last_name: employee.last_name,
                    position_name: employee.position_name,
                    shift: employee.shift,
                    schedule_time: employee.shift === 'night' ? '17:00' : '08:00',
                  }}
                />
              </div>
            </div>

            {/* Divider */}
            <hr className="my-10 border-[#d8c3a5]" />

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <InfoBox label="Age" value={calculateAge(employee.birthdate)} />
              <InfoBox
                label="Birthdate"
                value={formatDate(employee.birthdate)}
              />
              <InfoBox label="Gender" value={employee.gender} />
              <InfoBox label="Civil Status" value={employee.civil_status} />
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">
            Loading employee details...
          </p>
        )}
      </motion.div>
    </div>
  );
}

