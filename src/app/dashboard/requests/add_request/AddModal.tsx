"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { leaveApi, employeeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ActionButton from "@/components/buttons/ActionButton";
import { toast } from "react-hot-toast";

type LeaveType =
  | "vacation"
  | "sick"
  | "personal"
  | "parental"
  | "bereavement"
  | "emergency"
  | "half_day"
  | "others";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation Leave",
  sick: "Sick Leave",
  personal: "Personal Leave",
  parental: "Parental Leave",
  bereavement: "Bereavement Leave",
  emergency: "Emergency Leave",
  half_day: "Half Day",
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

  const [formData, setFormData] = useState({
    employee_id: 0,
    leave_type: "vacation" as LeaveType,
    start_date: "",
    end_date: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLeaveCredit, setSelectedLeaveCredit] = useState<number | null>(null);
  const [nonPaidReason, setNonPaidReason] = useState("");

  // Get today's date (YYYY-MM-DD) to set as minimum selectable date
  const today = new Date().toISOString().split("T")[0];

  // Always derive employee_id from the logged-in user; no employee selection
  useEffect(() => {
    const run = () => {
      if (!isOpen) return;
      const id = user?.employee_id ?? 0;
      setFormData((prev) => ({ ...prev, employee_id: id }));
    };
    run();
  }, [isOpen, user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.end_date) <= new Date(formData.start_date)
    ) {
      newErrors.end_date = "End date must be after start date";
    }

    const isNonSickZeroCredit = formData.leave_type !== "sick" && selectedLeaveCredit === 0;
    if (isNonSickZeroCredit && !nonPaidReason.trim()) {
      newErrors.nonPaidReason = "Reason for non-paid leave is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Load selected employee's leave credit
  useEffect(() => {
    if (!isOpen) return;
    const id = formData.employee_id;
    if (!id || id <= 0) {
      setSelectedLeaveCredit(null);
      return;
    }
    (async () => {
      const resp = await employeeApi.getById(id);
      if ((resp as any)?.success && (resp as any)?.data) {
        setSelectedLeaveCredit((resp as any).data.leave_credit ?? null);
      } else {
        setSelectedLeaveCredit(null);
      }
    })();
  }, [isOpen, formData.employee_id]);
  const handleSubmit = async () => {
    if (!validate()) return;
    if (!formData.employee_id) {
      toast.error("Your account is not linked to an employee record. Please contact admin.");
      return;
    }
    setIsSubmitting(true);

    const isNonSickZeroCredit = formData.leave_type !== "sick" && selectedLeaveCredit === 0;
    const combinedRemarks = isNonSickZeroCredit && nonPaidReason.trim()
      ? `[NON-PAID] ${nonPaidReason.trim()}${formData.remarks ? ` — ${formData.remarks}` : ''}`
      : formData.remarks;

    const result = await leaveApi.create({ ...formData, remarks: combinedRemarks });
    if (result.success) {
      toast.success("Leave request submitted successfully");
      onSuccess();
    } else {
      toast.error(result.message || "Failed to submit leave request");
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

          {/* Current Leave Credits (selected employee) */}
          {selectedLeaveCredit !== null && (
            <div className="text-sm">
              Current Leave Credits: <b>{selectedLeaveCredit}</b>
            </div>
          )}

          {/* Non-paid warning and reason when no credits for non-sick leaves */}
          {formData.leave_type !== "sick" && selectedLeaveCredit === 0 && (
            <>
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 p-3">
                This request will be filed as <b>NON-PAID LEAVE</b>. Please provide a reason.
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Reason for Non-paid Leave <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={nonPaidReason}
                  onChange={(e) => setNonPaidReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
                {errors.nonPaidReason && (
                  <p className="text-red-600 text-xs mt-1">{errors.nonPaidReason}</p>
                )}
              </div>
            </>
          )}

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
