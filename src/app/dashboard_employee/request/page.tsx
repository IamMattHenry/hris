"use client";

import { useState, useEffect } from "react";
import { leaveApi, employeeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

type LeaveType = "vacation" | "sick" | "emergency" | "others";
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
  others: "Others",
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    leave_type: "" as LeaveType | "",
    start_date: "",
    end_date: "",
    remarks: "",
  });

  const fetchLeaves = async () => {
    if (!user?.employee_id) return;

    setLoading(true);
    const result = await leaveApi.getAll();
    if (result.success && result.data) {
      // Filter to only show current user's requests
      const userLeaves = (result.data as Leave[]).filter(
        leave => leave.employee_id === user.employee_id
      );
      setLeaves(userLeaves);
    }
    setLoading(false);
  };

  // Fetch user's leave requests
  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee_id) return;

    setIsSubmitting(true);
    try {
      const result = await leaveApi.create({
        employee_id: user.employee_id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        remarks: formData.remarks,
      });

      if (result.success) {
        toast.success("Leave request submitted successfully");
        setFormData({
          leave_type: "",
          start_date: "",
          end_date: "",
          remarks: "",
        });
        fetchLeaves(); // Refresh the list
      } else {
        toast.error(result.message || "Failed to submit leave request");
      }
    } catch (error) {
      toast.error("An error occurred while submitting the request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        {/* Header */}
        <h1 className="text-3xl font-extrabold">Leave Requests</h1>

        {/* Request Form */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] p-6">
          <h2 className="text-xl font-semibold mb-4">Submit New Leave Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Request
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => handleInputChange('leave_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                  required
                >
                  <option value="">Select leave type</option>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason/Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#073532]"
                placeholder="Please provide a reason for your leave request..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#073532] text-white py-2 px-4 rounded-lg hover:bg-[#073532]/90 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Request History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
          <div className="bg-[#073532] px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Request History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.length > 0 ? (
                  leaves.map((leave) => (
                    <tr key={leave.leave_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {leave.leave_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {LEAVE_TYPE_LABELS[leave.leave_type]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(leave.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          leave.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : leave.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {leave.remarks || '-'}
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