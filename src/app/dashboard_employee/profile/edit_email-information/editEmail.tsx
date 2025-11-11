"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { employeeApi } from "@/lib/api";
import FormInput from "@/components/forms/FormInput";
import { useAuth } from "@/contexts/AuthContext";

interface EditEmailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
}

interface EmployeeData {
  employee_id: number;
  emails?: { email: string }[];
}

export default function EditEmailsModal({
  isOpen,
  onClose,
  id,
}: EditEmailsModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [emails, setEmails] = useState<string[]>([""]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (isOpen && id) fetchEmployeeEmails(id);
  }, [isOpen, id]);

  const fetchEmployeeEmails = async (empId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      if (res.success && res.data) {
        setEmployee(res.data);
        const rawEmails = res.data.emails ?? [];
        const emailList = Array.isArray(rawEmails)
          ? rawEmails
              .map((e: any) => (typeof e === "string" ? e : e?.email || ""))
              .filter(Boolean)
          : [];

        setEmails(emailList.length ? emailList : [""]);
      }
    } catch (err) {
      console.error("❌ Error fetching emails:", err);
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (index: number) =>
    setEmails(emails.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!employee) return;

    const validEmails = emails.filter((e) => e.trim() !== "");
    if (validEmails.length === 0) {
      setErrors({ emails: "At least one email is required." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { emails: validEmails };
      const result = await employeeApi.updateMe(payload);
      if (result.success) {
        toast.success("Emails updated successfully!");
        await refreshUser();
        if (employee?.employee_id) {
          await fetchEmployeeEmails(employee.employee_id);
        }
        onClose();
      } else {
        toast.error(result.message || "Failed to update emails.");
      }
    } catch (err) {
      console.error("Error updating emails:", err);
      toast.error("An error occurred while updating emails.");
    } finally {
      setIsSubmitting(false);
    }
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
        className="bg-[#fdf3e2] w-full max-w-2xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
        >
          <X size={26} />
        </button>

        <h2 className="text-2xl font-semibold mb-1">Edit Email Addresses</h2>
        <p className="text-sm text-gray-600 mb-6">Update your email list</p>

        {employee ? (
  <div className="space-y-4 w-full">
    {emails.map((email, i) => (
      <div key={i} className="flex items-center gap-2">
        <FormInput
          label=""
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(i, e.target.value)}
          placeholder="Enter email"   // <- Make input take full width
        />
        {emails.length > 1 && (
          <button
            onClick={() => removeEmail(i)}
            className="text-red-600 hover:text-red-800 font-bold"
          >
            ✕
          </button>
        )}
      </div>
    ))}
    <button
      onClick={addEmail}
      className="text-sm text-[#4b0b14] hover:underline"
    >
      + Add another email
    </button>
    {errors.emails && (
      <p className="text-red-600 text-sm">{errors.emails}</p>
    )}
  </div>
) : (
  <p className="text-center text-gray-600">Loading emails...</p>
)}

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#4b0b14] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
