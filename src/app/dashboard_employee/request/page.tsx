"use client";

import { useState, useEffect } from "react";
import { leaveApi, employeeApi, authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

type LeaveType = "vacation" | "sick" | "emergency" | "half_day" | "others";
type LeaveStatus = "pending" | "approved" | "rejected";

interface Leave {
  leave_id: number;
  leave_code: string;
  employee_id: number;
  first_name: string;
  last_name: string;
  position_name?: string;
  department_id?: number;
  department_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  remarks?: string;
  leave_credit?: number;
  requester_role?: string;
  requester_sub_role?: string | null;
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation Leave",
  sick: "Sick Leave",
  emergency: "Emergency Leave",
  half_day: "Half Day",
  others: "Others",
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveCredit, setLeaveCredit] = useState<number | null>(null);
  const [nonPaidReason, setNonPaidReason] = useState<string>("");

  const [formData, setFormData] = useState({
    leave_type: "" as LeaveType | "",
    start_date: "",
    end_date: "",
    remarks: "",
  });

  // Prevent selecting past dates
  const today = new Date().toISOString().split("T")[0];

  const fetchLeaves = async () => {
    if (!user?.employee_id) return;

    setLoading(true);
    const result = await leaveApi.getAll();
    if (result.success && result.data) {
      const userLeaves = (result.data as Leave[]).filter(
        (leave) => leave.employee_id === user.employee_id
      );
      setLeaves(userLeaves);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
    // also load current leave credits for this employee
    (async () => {
      try {
        const me = await authApi.getCurrentUser();
        if ((me as any)?.success && (me as any)?.data) {
          setLeaveCredit((me as any).data.leave_credit ?? null);
        }
      } catch {
        // ignore; credit banner just won't show
      }
    })();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee_id) return;

    // Validation
    if (!formData.leave_type || !formData.start_date || !formData.end_date || !formData.remarks) {
      toast.error("Please fill out all required fields.");
      return;
    }
    if (leaveCredit === 0 && !nonPaidReason.trim()) {
      toast.error("Please provide a reason for your non-paid leave.");
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const now = new Date(today);

    if (start < now) {
      toast.error("Start date cannot be in the past.");
      return;
    }

    if (end < start) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedRemarks = leaveCredit === 0 && nonPaidReason.trim()
        ? `[NON-PAID] ${nonPaidReason.trim()}${formData.remarks ? ` — ${formData.remarks}` : ''}`
        : formData.remarks;

      const result = await leaveApi.create({
        employee_id: user.employee_id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        remarks: combinedRemarks,
      });

      if (result.success) {
        toast.success("Leave request submitted successfully");
        setFormData({
          leave_type: "",
          start_date: "",
          end_date: "",
          remarks: "",
        });
        fetchLeaves();
      } else {
        toast.error(result.message || "Failed to submit leave request");
      }
    } catch {
      toast.error("An error occurred while submitting the request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b2b1c] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7ec] p-6 text-[#3b2b1c] font-poppins">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold">Leave Requests</h1>

        {/* Leave Request Form */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] p-6">
          <h2 className="text-xl font-semibold mb-4">Submit New Leave Request</h2>
          {leaveCredit !== null && (
            <div className="mb-3 text-sm text-gray-600">
              Current Leave Credits: <span className="font-semibold">{leaveCredit}</span>
            </div>
          )}
          {leaveCredit === 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded p-3">
              You have 0 leave credits. This request will be filed as <span className="font-semibold">NON-PAID LEAVE</span>.
              Please provide a reason below.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Request <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => handleInputChange("leave_type", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                >
                  <option value="">Select leave type</option>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={today}
                  value={formData.start_date}
                  onChange={(e) => {

                    const newStart = e.target.value;
                    handleInputChange("start_date", newStart);

                    // If end date is before new start, reset it
                    if (formData.end_date && newStart > formData.end_date) {
                      handleInputChange("end_date", "");
                    }
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={formData.start_date || today}
                  value={formData.end_date}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  required
                  disabled={!formData.start_date}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532] ${
                    !formData.start_date ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </div>
            {/* Non-paid reason (visible when no credits) */}
            {leaveCredit === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Non-paid Leave <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={nonPaidReason}
                  onChange={(e) => setNonPaidReason(e.target.value)}
                  rows={2}
                  required={leaveCredit === 0}
                  placeholder="Explain why you need a non-paid leave..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                />
              </div>
            )}


            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason/Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                rows={3}
                required
                placeholder="Please provide a reason for your leave request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#073532] text-white py-2 px-4 rounded-lg hover:bg-[#073532]/90 disabled:opacity-50 transition"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* Request History */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
          <div className="bg-[#073532] px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Request History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Requested Role
                      </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.length > 0 ? (
                  leaves.map((leave) => (
                    <tr key={leave.leave_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {leave.leave_code}
                      </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {leave.requester_role || '-'}{leave.requester_sub_role ? ` — ${leave.requester_sub_role}` : ''}
                          </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {LEAVE_TYPE_LABELS[leave.leave_type]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(leave.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            leave.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : leave.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {leave.remarks || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
