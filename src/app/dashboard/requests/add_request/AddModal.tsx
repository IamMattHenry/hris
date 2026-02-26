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
  | "emergency"
  | "half_day"
  | "others"
  | "maternity"
  | "paternity"
  | "sil"
  | "special_women"
  | "bereavement"
  | "solo_parent"
  | "vawc";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation Leave",
  sick: "Sick Leave",
  emergency: "Emergency Leave",
  half_day: "Half Day",
  others: "Others",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  sil: "Service Incentive Leave (SIL)",
  special_women: "Special Leave for Women",
  bereavement: "Bereavement Leave",
  solo_parent: "Solo Parent Leave",
  vawc: "VAWC Leave",
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
    // Statutory/doc fields (conditional)
    maternity_type: "live_birth" as 'live_birth' | 'solo' | 'miscarriage',
    pregnancy_doc_ref: "",
    marriage_cert_no: "",
    solo_parent_id: "",
    vawc_cert_ref: "",
    medical_cert_no: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLeaveCredit, setSelectedLeaveCredit] = useState<number | null>(null);
  const [nonPaidReason, setNonPaidReason] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<{
    gender?: string;
    civil_status?: string;
    hire_date?: string;
  }>({});

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

    // Frontend eligibility checks and required docs
    const gender = (selectedEmployee.gender || '').toLowerCase();
    const isFemale = gender === 'female' || gender === 'f';
    const isMale = gender === 'male' || gender === 'm';
    const hireDate = selectedEmployee.hire_date ? new Date(selectedEmployee.hire_date) : null;
    const msSinceHire = hireDate ? (new Date().getTime() - hireDate.getTime()) : 0;
    const monthsOfService = msSinceHire / (1000 * 60 * 60 * 24 * 30.4375);
    const yearsOfService = msSinceHire / (1000 * 60 * 60 * 24 * 365);

    if (formData.leave_type === 'maternity' && !isFemale) {
      newErrors.leave_type = 'Maternity leave is available to female employees only.';
    }
    if (formData.leave_type === 'paternity' && !isMale) {
      newErrors.leave_type = 'Paternity leave is available to male employees only.';
    }
    if (formData.leave_type === 'sil' && yearsOfService < 1) {
      newErrors.leave_type = 'SIL is available after one (1) year of service.';
    }
    if (formData.leave_type === 'solo_parent') {
      if (yearsOfService < 1) newErrors.leave_type = 'Solo Parent Leave requires at least one (1) year of service.';
      if (!formData.solo_parent_id.trim()) newErrors.solo_parent_id = 'Solo Parent ID is required.';
    }
    if (formData.leave_type === 'vawc') {
      if (!isFemale) newErrors.leave_type = 'VAWC leave is available to female employees only.';
      if (!formData.vawc_cert_ref.trim()) newErrors.vawc_cert_ref = 'Barangay/Police certification reference is required.';
    }
    if (formData.leave_type === 'special_women') {
      if (!isFemale) newErrors.leave_type = 'Special leave for women is available to female employees only.';
      if (monthsOfService < 6) newErrors.leave_type = 'Special leave for women requires at least six (6) months of service.';
      if (!formData.medical_cert_no.trim()) newErrors.medical_cert_no = 'Medical certificate number is required.';
    }
    if (formData.leave_type === 'maternity') {
      if (!formData.pregnancy_doc_ref.trim()) newErrors.pregnancy_doc_ref = 'Pregnancy/birth document reference is required.';
      if (formData.maternity_type === 'solo' && !formData.solo_parent_id.trim()) newErrors.solo_parent_id = 'Solo Parent ID is required for maternity (solo).';
    }

    const nonStatDeductable = ['vacation','emergency','others','half_day'] as LeaveType[];
    const isNonSickZeroCredit = nonStatDeductable.includes(formData.leave_type) && selectedLeaveCredit === 0;
    if (isNonSickZeroCredit && !nonPaidReason.trim()) {
      newErrors.nonPaidReason = "Reason for non-paid leave is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Load selected employee's leave credit and eligibility info
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
        const emp = (resp as any).data;
        setSelectedLeaveCredit(emp.leave_credit ?? null);
        setSelectedEmployee({
          gender: emp.gender,
          civil_status: emp.civil_status,
          hire_date: emp.hire_date,
        });
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

    const nonStatDeductable = ['vacation','emergency','others','half_day'] as LeaveType[];
    const isNonSickZeroCredit = nonStatDeductable.includes(formData.leave_type) && selectedLeaveCredit === 0;
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

          {/* Eligibility notes / warnings */}
          {formData.leave_type === 'sil' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-800 p-3 text-sm">
              SIL: up to 5 days/year after 1 year of service.
            </div>
          )}
          {formData.leave_type === 'special_women' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-800 p-3 text-sm">
              Special Leave for Women: female only; requires 6 months of service and medical certificate.
            </div>
          )}
          {formData.leave_type === 'vawc' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 text-blue-800 p-3 text-sm">
              VAWC Leave: female only; requires barangay/police certification.
            </div>
          )}

          {/* Non-paid warning and reason when no credits for non-statutory deductable leaves */}
          {(['vacation','emergency','others','half_day'] as LeaveType[]).includes(formData.leave_type) && selectedLeaveCredit === 0 && (
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
          {/* Conditional statutory/document fields */}
          {formData.leave_type === 'maternity' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold mb-1">Maternity Type</label>
              <select
                value={formData.maternity_type}
                onChange={(e) => setFormData({ ...formData, maternity_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="live_birth">Live Birth (105 days)</option>
                <option value="solo">Solo Parent (120 days)</option>
                <option value="miscarriage">Miscarriage (60 days)</option>
              </select>
              <div className="mt-2">
                <label className="block text-sm font-semibold mb-1">Pregnancy/Birth Doc Ref <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={formData.pregnancy_doc_ref}
                  onChange={(e) => setFormData({ ...formData, pregnancy_doc_ref: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {errors.pregnancy_doc_ref && <p className="text-red-600 text-xs mt-1">{errors.pregnancy_doc_ref}</p>}
              </div>
              {(formData.maternity_type === 'solo') && (
                <div className="mt-2">
                  <label className="block text-sm font-semibold mb-1">Solo Parent ID <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    value={formData.solo_parent_id}
                    onChange={(e) => setFormData({ ...formData, solo_parent_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {errors.solo_parent_id && <p className="text-red-600 text-xs mt-1">{errors.solo_parent_id}</p>}
                </div>
              )}
            </div>
          )}

          {formData.leave_type === 'paternity' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Marriage Certificate No. <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.marriage_cert_no}
                onChange={(e) => setFormData({ ...formData, marriage_cert_no: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {errors.marriage_cert_no && <p className="text-red-600 text-xs mt-1">{errors.marriage_cert_no}</p>}
            </div>
          )}

          {formData.leave_type === 'solo_parent' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Solo Parent ID <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.solo_parent_id}
                onChange={(e) => setFormData({ ...formData, solo_parent_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {errors.solo_parent_id && <p className="text-red-600 text-xs mt-1">{errors.solo_parent_id}</p>}
            </div>
          )}

          {formData.leave_type === 'vawc' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Barangay/Police Certification Ref <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.vawc_cert_ref}
                onChange={(e) => setFormData({ ...formData, vawc_cert_ref: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {errors.vawc_cert_ref && <p className="text-red-600 text-xs mt-1">{errors.vawc_cert_ref}</p>}
            </div>
          )}

          {formData.leave_type === 'special_women' && (
            <div>
              <label className="block text-sm font-semibold mb-1">Medical Certificate No. <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.medical_cert_no}
                onChange={(e) => setFormData({ ...formData, medical_cert_no: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {errors.medical_cert_no && <p className="text-red-600 text-xs mt-1">{errors.medical_cert_no}</p>}
            </div>
          )}
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
