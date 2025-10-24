"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ActionButton from "@/components/buttons/ActionButton";

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    title: string;
    description: string;
    salary: string;
    department: string;
    available: boolean;
  } | null;
  onSave: (updatedJob: any) => void;
}

export default function EditJobModal({ isOpen, onClose, job, onSave }: EditJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salary, setSalary] = useState("");
  const [department, setDepartment] = useState("");
  const [available, setAvailable] = useState(true);

  const [departments, setDepartments] = useState(["HR", "Finance", "Marketing"]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setDescription(job.description);
      setSalary(job.salary);
      setDepartment(job.department);
      setAvailable(job.available);
    }
  }, [job]);

  const handleSave = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Job title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!salary.trim()) newErrors.salary = "Salary is required";
    if (!department.trim()) newErrors.department = "Select a department";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({ title, description, salary, department, available });
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
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:outline-none ${
                    errors.department ? "border-red-400" : "border-[#d6c3aa]"
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments.map((d, i) => (
                    <option key={i} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-xs">{errors.department}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-4 h-4 accent-[#3b2b1c]"
                />
                <label className="text-sm">Available for assignment</label>
              </div>

              <div className="flex justify-end mt-6">
                <ActionButton
                  onClick={handleSave}
                  label="Save Changes"
                  icon={Save}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
