"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ActionButton from "@/components/buttons/ActionButton";
import { positionApi, departmentApi } from "@/lib/api";

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    position_id: number;
    position_name: string;
    position_desc?: string;
    salary?: number;
    department_id: number;
    department_name?: string;
    availability?: number;
  } | null;
  onSave?: () => void;
}

export default function EditJobModal({ isOpen, onClose, position, onSave }: EditJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salary, setSalary] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [availability, setAvailability] = useState("0");

  const [departments, setDepartments] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  useEffect(() => {
    if (position) {
      setTitle(position.position_name);
      setDescription(position.position_desc || "");
      setSalary(position.salary ? position.salary.toString() : "");
      setDepartmentId(position.department_id.toString());
      setAvailability(position.availability?.toString() || "0");
    }
  }, [position]);

  const fetchDepartments = async () => {
    const result = await departmentApi.getAll();
    if (result.success && result.data) {
      setDepartments(result.data);
    }
  };

  const handleSave = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Job title is required";
    if (!departmentId) newErrors.department = "Select a department";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!position) return;

    setLoading(true);

    const cleanSalary = salary.replace(/[₱,\s]/g, "");

    const result = await positionApi.update(position.position_id, {
      position_name: title,
      position_desc: description || undefined,
      department_id: parseInt(departmentId),
      salary: cleanSalary ? parseFloat(cleanSalary) : undefined,
      availability: parseInt(availability),
    });

    setLoading(false);

    if (result.success) {
      alert("Position updated successfully");
      if (onSave) onSave();
      onClose();
    } else {
      alert(result.message || "Failed to update position");
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
            className="bg-[#fff7ec] rounded-2xl shadow-lg p-6 w-full max-w-lg relative"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#3b2b1c]">Edit Job Role</h2>
              <button onClick={onClose}>
                <X className="text-[#3b2b1c]" />
              </button>
            </div>

            <div className="space-y-4 text-[#3b2b1c]">
              <div>
                <label className="block text-sm font-medium">Job Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${
                    errors.title ? "border-red-400" : "border-[#d6c3aa]"
                  }`}
                />
                {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Job Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${
                    errors.description ? "border-red-400" : "border-[#d6c3aa]"
                  }`}
                  rows={3}
                />
                {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Job Salary</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={salary}
                  onChange={(e) =>
                    setSalary(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className={`w-full p-2 border rounded-lg focus:outline-none ${
                    errors.salary ? "border-red-400" : "border-[#d6c3aa]"
                  }`}
                />
                {errors.salary && <p className="text-red-500 text-xs">{errors.salary}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${
                    errors.department ? "border-red-400" : "border-[#d6c3aa]"
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-xs">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Available Slots</label>
                <input
                  type="number"
                  min="0"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder="Enter number of available slots"
                  className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end mt-6">
                <ActionButton
                  onClick={handleSave}
                  label={loading ? "Saving..." : "Save Changes"}
                  icon={Save}
                  disabled={loading}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
