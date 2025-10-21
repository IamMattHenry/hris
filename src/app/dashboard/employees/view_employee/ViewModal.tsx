"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { employeeApi } from "@/lib/api";

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

  useEffect(() => {
    if (isOpen && id) fetchEmployee(id);
  }, [isOpen, id]);

  const fetchEmployee = async (empId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      console.log(res.data);
      if (res.success && res.data) setEmployee(res.data);
    } catch (error) {
      console.error("Error fetching employee:", error);
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
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">
                {employee.first_name} {employee.last_name}
              </h2>
              <span className="px-4 py-1 bg-[#d8c3a5] rounded-full text-sm font-semibold">
                {employee.status}
              </span>
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

/* Small reusable info box */
function InfoBox({ label, value }: { label: string; value?: string | React.ReactNode; }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
      <div className="bg-[#fff7ec] px-4 py-2 rounded-xl shadow-inner min-h-[42px]">
        {value || "—"}
      </div>
    </div>
  );
}
