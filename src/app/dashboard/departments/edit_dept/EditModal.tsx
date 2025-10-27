"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import FormInput from "@/components/forms/FormInput";

interface Department {
  id: string;
  name: string;
  description: string;
  supervisor: string;
  supervisorCode?: string; // ✅ new optional field
  employeeCount: number;
}

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  onSave: (updatedDepartment: Department) => void;
}

export default function EditDepartmentModal({
  isOpen,
  onClose,
  department,
  onSave,
}: EditDepartmentModalProps) {
  const [formData, setFormData] = useState<Department>({
    id: "",
    name: "",
    description: "",
    supervisor: "",
    supervisorCode: "",
    employeeCount: 0,
  });

  // Populate form when modal opens
  useEffect(() => {
    if (department) {
      setFormData({
        ...department,
        supervisorCode: department.supervisorCode || "", // fallback
      });
    }
  }, [department]);

  if (!department) return null;

  // ✅ Handle editable fields only
const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,  
  }));
};


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#faeddc] rounded-2xl shadow-lg p-6 w-full max-w-lg relative"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#3b2b1c]">
                Edit Department
              </h2>
              <button onClick={onClose}>
                <X className="text-[#3b2b1c]" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-[#3b2b1c]">
              {/* Department ID (read-only) */}
              <FormInput
                label="Department ID"
                type="text"
                value={formData.id}
                onChange={() => {}}
                readOnly
              />

              {/* Department Name */}
              <FormInput
                label="Department Name"
                type="text"
                value={formData.name}
                onChange={handleChange}
              />

              {/* Description */}
              <div className="flex flex-col">
                <label className="block text-[#3b2b1c] mb-1 font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-[#fdf4e3] border border-[#e6d2b5] rounded-lg px-3 py-2 shadow-inner focus:outline-none resize-none"
                />
              </div>

              {/* Supervisor Name */}
              <FormInput
                label="Supervisor Name"
                type="text"
                value={formData.supervisor}
                onChange={handleChange}
              />

              {/* ✅ New Field: Supervisor Employee Code */}
              <FormInput
                label="Supervisor Employee Code"
                type="text"
                placeholder="e.g., EMP-0001"
                value={formData.supervisorCode || ""}
                onChange={handleChange}
              />

              {/* Employee Count (read-only) */}
              <FormInput
                label="Number of Employees"
                type="number"
                value={formData.employeeCount.toString()}
                onChange={() => {}}
                readOnly
              />

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-300 text-[#3b2b1c] rounded-lg hover:opacity-80 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-90 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
