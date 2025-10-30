"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import FormInput from "@/components/forms/FormInput";
import { departmentApi, employeeApi } from "@/lib/api";

interface Department {
  department_id: number;
  department_name: string;
  description?: string;
  supervisor_id?: number;
  supervisor_name?: string;
  employee_count?: number;
}

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  onSave?: () => void;
}

export default function EditDepartmentModal({
  isOpen,
  onClose,
  department,
  onSave,
}: EditDepartmentModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      fetchSupervisors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (department) {
      setName(department.department_name);
      setDescription(department.description || "");
      setSupervisorId(department.supervisor_id?.toString() || "");
    }
  }, [department]);

  const fetchSupervisors = async () => {
    const result = await employeeApi.getAll();
    if (result.success && result.data) {
      // Filter only supervisors
      const supervisorList = result.data.filter((emp: any) => emp.role === 'supervisor');
      setSupervisors(supervisorList);
    }
  };

  if (!department) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = "Department name is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const result = await departmentApi.update(department.department_id, {
      department_name: name,
      description: description || undefined,
      supervisor_id: supervisorId ? parseInt(supervisorId) : undefined,
    });

    setLoading(false);

    if (result.success) {
      alert("Department updated successfully");
      if (onSave) onSave();
      onClose();
    } else {
      alert(result.message || "Failed to update department");
    }
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
              {/* Department Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Department Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${
                    errors.name ? "border-red-400" : "border-[#d6c3aa]"
                  }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none resize-none"
                />
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-sm font-medium mb-1">Supervisor (Optional)</label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none"
                >
                  <option value="">No Supervisor</option>
                  {supervisors.map((sup) => (
                    <option key={sup.employee_id} value={sup.employee_id}>
                      {sup.employee_code} - {sup.first_name} {sup.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-300 text-[#3b2b1c] rounded-lg hover:opacity-80 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
