"use client";

import { useState, useEffect } from "react";
import { leaveApi, employeeApi, authApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

type LeaveType = "vacation" | "sick" | "emergency" | "half_day" | "others" | "maternity" | "paternity" | "sil" | "special_women" | "bereavement";
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

}

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
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState<number | null>(null);
  const [leaveCredit, setLeaveCredit] = useState<number | null>(null);
  const [nonPaidReason, setNonPaidReason] = useState<string>("");

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    leave_type: "" as LeaveType | "",
    start_date: "",
    end_date: "",
    remarks: "",
  });
  const [maternityType, setMaternityType] = useState<"normal" | "solo" | "miscarriage">("normal");
  const [isProbationActive, setIsProbationActive] = useState(false);

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
            // check probation status from user data
            const empType = (me as any).data.employment_type;
            const probationEnd = (me as any).data.probation_end_date;
            if (empType === 'probationary') {
              const todayStr = new Date().toISOString().split('T')[0];
              if (probationEnd && probationEnd > todayStr) {
                setIsProbationActive(true);
              } else {
                setIsProbationActive(false);
              }
            }
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

  useEffect(() => {
    if (!formData.start_date || !formData.leave_type) return;

    let daysToAdd = 0;
    switch (formData.leave_type) {
      case "maternity":
        if (maternityType === "normal") daysToAdd = 105;
        else if (maternityType === "solo") daysToAdd = 120;
        else if (maternityType === "miscarriage") daysToAdd = 60;
        break;
      case "paternity":
      case "solo_parent":
        daysToAdd = 7;
        break;
      case "vawc":
        daysToAdd = 10;
        break;
      case "special_women":
        daysToAdd = 60;
        break;
      case "bereavement":
        daysToAdd = 3;
        break;
      case "half_day":
        daysToAdd = 1;
        break;
      default:
        break;
    }

    if (daysToAdd > 0) {
      const start = new Date(formData.start_date);
      start.setDate(start.getDate() + (daysToAdd - 1));
      const newEndDate = start.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, end_date: newEndDate }));
    } else if (!formData.end_date || new Date(formData.end_date) < new Date(formData.start_date)) {
      setFormData((prev) => ({ ...prev, end_date: formData.start_date }));
    }
  }, [formData.start_date, formData.leave_type, maternityType]);

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
        maternity_type: maternityType === 'normal' ? undefined : maternityType,
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

  const handleCancelLeave = async (leaveId: number) => {
    if (!window.confirm("Cancel this pending leave request?")) return;

    setDeletingLeaveId(leaveId);
    try {
      const result = await leaveApi.delete(leaveId);
      if (result.success) {
        toast.success("Leave request cancelled successfully");
        fetchLeaves();
      } else {
        toast.error(result.message || "Failed to cancel leave request");
      }
    } catch {
      toast.error("An error occurred while cancelling the request");
    } finally {
      setDeletingLeaveId(null);
    }
  };

  const totalPages = Math.ceil(leaves.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeaves = leaves.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const isFixedDuration = ["maternity", "paternity", "solo_parent", "vawc", "special_women", "bereavement", "half_day"].includes(formData.leave_type);

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Submit New Leave Request</h2>
            <button
              onClick={() => setIsFormVisible(!isFormVisible)}
              className="text-[#073532] font-medium hover:text-[#073532]/80 transition flex items-center gap-2"
            >
              {isFormVisible ? (
                <>
                  <span>Hide Form</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Show Form</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>
          </div>
          
          {isFormVisible && (
            <div className="mt-6 border-t border-gray-100 pt-6 animate-fade-in-up">
              {isProbationActive && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-900 rounded p-3">
                  You are currently on probation. Leave requests are not allowed until probation ends.
                </div>
              )}
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
                  disabled={isProbationActive}
                >
                  <option value="">Select leave type</option>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Maternity subtype */}
              {formData.leave_type === 'maternity' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maternity Type</label>
                  <select
                    value={maternityType}
                    onChange={(e) => setMaternityType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                  >
                    <option value="normal">Normal (105 days)</option>
                    <option value="solo">Solo Parent (120 days)</option>
                    <option value="miscarriage">Miscarriage/Emergency Termination (60 days)</option>
                  </select>
                </div>
              )}

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
                  readOnly={isFixedDuration}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532] ${
                    !formData.start_date || isFixedDuration ? "bg-gray-100 cursor-not-allowed" : ""
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
              disabled={isSubmitting || isProbationActive}
              className="w-full bg-[#073532] text-white py-2 px-4 rounded-lg hover:bg-[#073532]/90 disabled:opacity-50 transition"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
          </div>
          )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentLeaves.length > 0 ? (
                  currentLeaves.map((leave) => (
                    <tr key={leave.leave_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {leave.leave_code}
                      </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {leave.requester_role || '-'}
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
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {leave.status === "pending" ? (
                          <button
                            onClick={() => handleCancelLeave(leave.leave_id)}
                            disabled={deletingLeaveId === leave.leave_id}
                            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingLeaveId === leave.leave_id ? "Cancelling..." : "Cancel"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastItem, leaves.length)}
                    </span>{" "}
                    of <span className="font-medium">{leaves.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? "z-10 bg-[#073532] border-[#073532] text-white"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
