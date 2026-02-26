"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ActionButton from "@/components/buttons/ActionButton";
import { positionApi, departmentApi } from "@/lib/api";
import { toast } from "react-hot-toast";

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    position_id: number;
    position_name: string;
    position_desc?: string;
    department_id: number;
    department_name?: string;
    availability?: number;
    employment_type?: string;
    default_salary?: number;
  } | null;
  onSave?: () => void;
}

export default function EditJobModal({
  isOpen,
  onClose,
  position,
  onSave,
}: EditJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [availability, setAvailability] = useState("0");
  const [employmentType, setEmploymentType] = useState("regular");
  const [defaultSalary, setDefaultSalary] = useState("");

  const [departments, setDepartments] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  /* ================= FETCH DEPARTMENTS ================= */
  useEffect(() => {
    if (isOpen) fetchDepartments();
  }, [isOpen]);

  const fetchDepartments = async () => {
    const result = await departmentApi.getAll();
    if (result.success && result.data) {
      setDepartments(result.data);
    }
  };

  /* ================= LOAD POSITION ================= */
  useEffect(() => {
    if (position && isOpen) {
      setTitle(position.position_name || "");
      setDescription(position.position_desc || "");
      setDepartmentId(String(position.department_id || ""));
      setAvailability(String(position.availability ?? 0));
      setEmploymentType(position.employment_type || "regular");
      setDefaultSalary(
        position.default_salary != null
          ? String(position.default_salary)
          : ""
      );
      setErrors({});
    }
  }, [position, isOpen]);

  /* ================= RESET WHEN CLOSED ================= */
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setDepartmentId("");
      setAvailability("0");
      setEmploymentType("regular");
      setDefaultSalary("");
      setErrors({});
    }
  }, [isOpen]);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) newErrors.title = "Job title is required";
    if (!departmentId) newErrors.department = "Select a department";

    if (availability && Number(availability) < 0)
      newErrors.availability = "Cannot be negative";

    if (defaultSalary && Number(defaultSalary) < 0)
      newErrors.salary = "Salary cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!position) return;
    if (!validateForm()) return;

    setLoading(true);

    const result = await positionApi.update(position.position_id, {
      position_name: title.trim(),
      position_desc: description.trim() || undefined,
      department_id: Number(departmentId),
      availability: Number(availability || 0),
      employment_type: employmentType,
      default_salary: defaultSalary
        ? Number(defaultSalary)
        : undefined,
      salary_unit:
        employmentType === "regular" ? "monthly" : "hourly",
    });

    setLoading(false);

    if (result.success) {
      toast.success("Position updated successfully");
      onSave?.();
      onClose();
    } else {
      toast.error(result.message || "Failed to update position");
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
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#3b2b1c]">
                Edit Job Role
              </h2>
              <button onClick={onClose}>
                <X className="text-[#3b2b1c]" />
              </button>
            </div>

            <div className="space-y-4 text-[#3b2b1c]">

              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium">
                  Job Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${errors.title
                    ? "border-red-400"
                    : "border-[#d6c3aa]"
                    }`}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium">
                  Job Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none resize-none"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setErrors((prev) => ({ ...prev, department: "" }));
                  }}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${errors.department
                    ? "border-red-400"
                    : "border-[#d6c3aa]"
                    }`}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option
                      key={dept.department_id}
                      value={dept.department_id}
                    >
                      {dept.department_name}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-500 text-xs">
                    {errors.department}
                  </p>
                )}
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium">
                  Available Slots
                </label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={availability}
                  onKeyDown={(e) => {
                    // Prevent negative, scientific notation, and plus sign
                    if (e.key === "-" || e.key === "e" || e.key === "+") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Prevent negative values
                    if (Number(value) < 0) return;
                    setAvailability(value);
                  }}
                  className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none"
                  placeholder="0"
                />
              </div>
              {/* Employment + Salary */}
              <div className="flex gap-3">
                <div className="w-1/2">
                  <label className="block text-sm font-medium">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) =>
                      setEmploymentType(e.target.value)
                    }
                    className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none"
                  >
                    <option value="regular">
                      Regular
                    </option>
                    <option value="probationary">
                      Probationary
                    </option>
                  </select>
                </div>

                <div className="w-1/2">
                  <label className="block text-sm font-medium">
                    Default Salary (
                    {employmentType === "regular" ? "per month" : "per hour"}
                    )
                  </label>

                  <div className="relative">
                    {/* Peso Symbol */}
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3b2b1c]">
                      ₱
                    </span>

                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={defaultSalary}
                      onKeyDown={(e) => {
                        // Prevent negative and scientific notation
                        if (e.key === "-" || e.key === "e" || e.key === "+") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;

                        // Prevent negative values
                        if (Number(value) < 0) return;

                        setDefaultSalary(value);
                      }}
                      className="w-full pl-8 pr-3 p-2 border border-[#d6c3aa] rounded-lg focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end mt-6">
                <ActionButton
                  onClick={handleSave}
                  label={
                    loading ? "Saving..." : "Save Changes"
                  }
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