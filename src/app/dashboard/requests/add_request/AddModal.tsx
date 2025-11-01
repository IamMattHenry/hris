"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { leaveApi, employeeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ActionButton from "@/components/buttons/ActionButton";

type LeaveType =
  | "vacation"
  | "sick"
  | "personal"
  | "parental"
  | "bereavement"
  | "emergency"
  | "others";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation Leave",
  sick: "Sick Leave",
  personal: "Personal Leave",
  parental: "Parental Leave",
  bereavement: "Bereavement Leave",
  emergency: "Emergency Leave",
  others: "Others",
};

export default function AddLeaveModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [formData, setFormData] = useState({
    employee_id: 0,
    leave_type: "vacation" as LeaveType,
    start_date: "",
    end_date: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get today's date (YYYY-MM-DD) to set as minimum selectable date
  const today = new Date().toISOString().split("T")[0];

  // Fetch employees filtered by department for admins
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      const result = await employeeApi.getAll();
      if (result.success && result.data) {
        let filteredEmployees = result.data as any[];

        // If admin, filter employees by their department
        if (user?.role === "admin" && user?.department_id) {
          filteredEmployees = filteredEmployees.filter(
            (emp: any) => emp.department_id === user.department_id
          );
        }

        setEmployees(filteredEmployees);

        // Set default employee_id (current user or first available)
        if (filteredEmployees.length > 0) {
          const defaultEmployeeId =
            user?.employee_id || filteredEmployees[0].employee_id;
          setFormData((prev) => ({
            ...prev,
            employee_id: defaultEmployeeId,
          }));
        }
      }
      setLoadingEmployees(false);
    };

    if (isOpen) {
      fetchEmployees();
    }
  }, [isOpen, user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.employee_id) newErrors.employee_id = "Employee is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.end_date) <= new Date(formData.start_date)
    ) {
      newErrors.end_date = "End date must be after start date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const result = await leaveApi.create(formData);
    if (result.success) {
      alert("Leave request submitted successfully");
      onSuccess();
    } else {
      alert(result.message || "Failed to submit leave request");
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#fdf3e2] w-full max-w-md p-8 rounded-2xl shadow-lg relative text-[#3b2b1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold mb-6">Leave Request</h2>

        <div className="space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Employee <span className="text-red-600">*</span>
            </label>
            {loadingEmployees ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading employees...
              </div>
            ) : (
              <select
                value={formData.employee_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    employee_id: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value={0}>Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_code} - {emp.first_name} {emp.last_name} (
                    {emp.department_name || "No Dept"})
                  </option>
                ))}
              </select>
            )}
            {errors.employee_id && (
              <p className="text-red-600 text-xs mt-1">{errors.employee_id}</p>
            )}
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Leave Type
            </label>
            <select
              value={formData.leave_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  leave_type: e.target.value as LeaveType,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Start Date
            </label>
            <input
              type="date"
              min={today}
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {errors.start_date && (
              <p className="text-red-600 text-xs mt-1">{errors.start_date}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold mb-2">End Date</label>
            <input
              type="date"
              min={formData.start_date || today}
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {errors.end_date && (
              <p className="text-red-600 text-xs mt-1">{errors.end_date}</p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold mb-2">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#4b0b14] text-white rounded-lg hover:opacity-80 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
