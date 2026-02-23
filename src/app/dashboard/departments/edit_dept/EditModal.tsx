"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import FormInput from "@/components/forms/FormInput";
import { departmentApi, employeeApi } from "@/lib/api";
import { toast } from "react-hot-toast";

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
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen && department?.department_id) {
      fetchEmployees(department.department_id);
    } else {
      setSupervisors([]);
      setEmployeesList([]);
    }
  }, [isOpen, department?.department_id]);

  useEffect(() => {
    if (department) {
      setName(department.department_name);
      setDescription(department.description || "");
      setSupervisorId(department.supervisor_id?.toString() || "");
    }
  }, [department]);

  const fetchEmployees = async (deptId: number) => {
    // Fetch department employees for the list
    const deptResult = await employeeApi.getAll({
      department_id: deptId,
      status: 'active',
    });

    // Fetch all active employees to populate the supervisor select (allow promoting/assigning)
    const allResult = await employeeApi.getAll({ status: 'active' });

    if (deptResult.success && Array.isArray(deptResult.data)) {
      setEmployeesList(deptResult.data);
    } else {
      setEmployeesList([]);
    }

    if (allResult.success && Array.isArray(allResult.data)) {
      setSupervisors(allResult.data);
    } else {
      setSupervisors([]);
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
      supervisor_id: supervisorId === "" ? null : (supervisorId ? parseInt(supervisorId) : undefined),
    });

    setLoading(false);

    if (result.success) {
      toast.success("Department updated successfully");
      if (onSave) onSave();
      onClose();
    } else {
      toast.error(result.message || "Failed to update department");
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

              {/* Department Employees List */}
              <div>
                <label className="block text-sm font-medium mb-2">Department Employees</label>
                {employeesList.length === 0 ? (
                  <p className="text-sm text-gray-500">No employees found in this department.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-[#e6dcc8] rounded-md p-2">
                    {employeesList.map((emp) => (
                      <div key={emp.employee_id} className="flex items-center justify-between py-2 px-2 hover:bg-white/50 rounded">
                        <div>
                          <p className="text-sm font-medium">{emp.first_name} {emp.last_name} <span className="text-xs text-gray-500">({emp.employee_code})</span></p>
                          <p className="text-xs text-gray-500">{emp.position_name || emp.sub_role || ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {String(emp.employee_id) === String(supervisorId) && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Current Supervisor</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSupervisorId(String(emp.employee_id));
                              toast.success(`Assigned ${emp.first_name} ${emp.last_name} as supervisor (will be saved on Save Changes)`);
                            }}
                            className="text-sm px-3 py-1 bg-[#3b2b1c] text-white rounded hover:opacity-90"
                          >
                            Assign as Supervisor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
