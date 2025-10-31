"use client";

import { useState, useEffect } from "react";
import { Plus, MoreVertical, Filter, ChevronDown, ChevronUp, X, RotateCw } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { leaveApi, employeeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type TabKey = "Leave Request" | "History";
type LeaveType = "vacation" | "sick" | "personal" | "parental" | "bereavement" | "emergency" | "others";
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

const tabs: TabKey[] = ["Leave Request", "History"];

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation Leave",
  sick: "Sick Leave",
  personal: "Personal Leave",
  parental: "Parental Leave",
  bereavement: "Bereavement Leave",
  emergency: "Emergency Leave",
  others: "Others",
};

export default function RequestsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("Leave Request");
  const [searchRequest, setSearchRequest] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLeaveType, setFilterLeaveType] = useState<LeaveType | "">("");
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | "">("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is supervisor (view-only access for CRUD, but can approve/reject)
  const isSupervisor = user?.role === "supervisor";

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".leave-dropdown") &&
        !target.closest(".menu-button") &&
        !target.closest(".filter-dropdown") &&
        !target.closest(".filter-button")
      ) {
        setSelectedMenu(null);
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch leaves
  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    const result = await leaveApi.getAll();
    if (result.success && result.data) {
      setLeaves(result.data as Leave[]);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeaves();
    setIsRefreshing(false);
  };

  // Filter leaves based on tab and search
  const getFilteredLeaves = () => {
    let filtered = leaves;

    // Filter by tab
    if (activeTab === "Leave Request") {
      filtered = filtered.filter(l => l.status === "pending");
    } else {
      filtered = filtered.filter(l => l.status !== "pending");
    }

    // Filter by search
    if (searchRequest) {
      const search = searchRequest.toLowerCase();
      filtered = filtered.filter(l =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(search) ||
        l.leave_code.toLowerCase().includes(search)
      );
    }

    // Filter by leave type
    if (filterLeaveType) {
      filtered = filtered.filter(l => l.leave_type === filterLeaveType);
    }

    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(l => l.status === filterStatus);
    }

    return filtered;
  };

  const filteredLeaves = getFilteredLeaves();

  const handleView = (leave: Leave) => {
    setSelectedLeave(leave);
    setIsViewModalOpen(true);
    setSelectedMenu(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this leave request?")) return;
    const result = await leaveApi.delete(id);
    if (result.success) {
      alert("Leave request deleted successfully");
      fetchLeaves();
    } else {
      alert(result.message || "Failed to delete leave request");
    }
  };

  const handleApprove = async (id: number) => {
    const result = await leaveApi.approve(id);
    if (result.success) {
      alert("Leave request approved");
      setIsViewModalOpen(false);
      fetchLeaves(); // Refresh the list
    } else {
      alert(result.message || "Failed to approve leave request");
    }
  };

  const handleReject = async (id: number) => {
    const result = await leaveApi.reject(id);
    if (result.success) {
      alert("Leave request rejected");
      setIsViewModalOpen(false);
      fetchLeaves(); // Refresh the list
    } else {
      alert(result.message || "Failed to reject leave request");
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
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold">Requests</h1>

        <div className="flex gap-2">
          <SearchBar placeholder="Search Request" onChange={setSearchRequest} value={searchRequest} />

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-2 py-2 rounded-lg bg-[#3b2b1c] hover:bg-[#3b2b1c]-600 disabled:bg-gray-400 text-white transition flex items-center gap-2"
            title="Refresh leave requests"
          >
            <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Add Request button - Disabled for supervisors */}
          {!isSupervisor && (
            <ActionButton label="Add Request" onClick={() => setIsAddModalOpen(true)} icon={Plus} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl overflow-hidden shadow-md bg-[#fff7ec]">
        <div className="flex border-b border-[#d5b9a1] bg-[#fff7ec]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-3 text-md cursor-pointer transition-all ${activeTab === tab
                ? "text-[#6d2b24] border-b-4 border-[#6d2b24]"
                : "text-[#7a5c4a] hover:text-[#6d2b24]/80"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Button */}
        <div className="px-4 py-3 border-b border-[#d5b9a1] flex items-center gap-2 relative filter-dropdown">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center bg-[#3b2b1c] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 transition filter-button"
          >
            <Filter size={14} className="mr-2" /> Filter
            {isFilterOpen ? (
              <ChevronUp className="ml-1" size={14} />
            ) : (
              <ChevronDown className="ml-1" size={14} />
            )}
          </button>

          {isFilterOpen && (
            <div
              className="absolute flex flex-column left-4 top-12 bg-white gap-4 rounded-lg shadow-lg p-4 z-[9999] w-80 leave-dropdown"
            >
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Leave Type</label>
                <select
                  value={filterLeaveType}
                  onChange={(e) => setFilterLeaveType(e.target.value as LeaveType | "")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Types</option>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as LeaveStatus | "")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Table */}
        <div className="overflow-x-auto z-50">
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] h-200 shadow-sm z-50">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#3b2b1c] text-white">
                <tr>
                  <th className="py-4 px-4 text-left">Code</th>
                  <th className="py-4 px-4 text-left">Employee</th>
                  <th className="py-4 px-4 text-left">Leave Type</th>
                  <th className="py-4 px-4 text-left">Start Date</th>
                  <th className="py-4 px-4 text-left">End Date</th>
                  <th className="py-4 px-4 text-left">Status</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => (
                  <tr
                    key={leave.leave_id}
                    className="border-b border-[#eadfcd] hover:bg-[#fdf4e7] transition"
                  >
                    <td className="py-3 px-4">{leave.leave_code}</td>
                    <td className="py-3 px-4">{leave.first_name} {leave.last_name}</td>
                    <td className="py-3 px-4">{LEAVE_TYPE_LABELS[leave.leave_type]}</td>
                    <td className="py-3 px-4">{new Date(leave.start_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{new Date(leave.end_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${leave.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : leave.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center relative">
                      <button
                        onClick={() =>
                          setSelectedMenu(
                            selectedMenu === leave.leave_id ? null : leave.leave_id
                          )
                        }
                        className="menu-button inline-block"
                      >
                        <MoreVertical
                          size={18}
                          className="text-[#3b2b1c]/70 cursor-pointer"
                        />
                      </button>

                      {selectedMenu === leave.leave_id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-50 leave-dropdown">
                          <button
                            onClick={() => handleView(leave)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          >
                            View
                          </button>
                          {!isSupervisor && (
                            <button
                              onClick={() => {
                                handleDelete(leave.leave_id);
                                setSelectedMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {filteredLeaves.length === 0 && (
            <div className="text-center py-6 text-[#7a5c4a]/70">
              No {activeTab.toLowerCase()} found.
            </div>
          )}
        </div>
      </div>

      {/* Add Leave Modal */}
      {isAddModalOpen && (
        <AddLeaveModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchLeaves();
          }}
        />
      )}

      {/* View Leave Modal */}
      {isViewModalOpen && selectedLeave && (
        <ViewLeaveModal
          isOpen={isViewModalOpen}
          leave={selectedLeave}
          onClose={() => setIsViewModalOpen(false)}
          onApprove={() => handleApprove(selectedLeave.leave_id)}
          onReject={() => handleReject(selectedLeave.leave_id)}
        />
      )}
    </div>
  );
}

// Add Leave Modal Component
function AddLeaveModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [formData, setFormData] = useState({
    employee_id: 0, // Will be set after employees load
    leave_type: "vacation" as LeaveType,
    start_date: "",
    end_date: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employees filtered by department for admins
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      const result = await employeeApi.getAll();
      if (result.success && result.data) {
        let filteredEmployees = result.data as any[];

        // If admin, filter by department
        if (user?.role === 'admin' && user?.department_id) {
          filteredEmployees = filteredEmployees.filter(
            (emp: any) => emp.department_id === user.department_id
          );
        }

        setEmployees(filteredEmployees);

        // Set default employee_id to first employee or current user's employee_id
        if (filteredEmployees.length > 0) {
          const defaultEmployeeId = user?.employee_id || filteredEmployees[0].employee_id;
          setFormData(prev => ({ ...prev, employee_id: defaultEmployeeId }));
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
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#fdf3e2] w-full max-w-md p-8 rounded-2xl shadow-lg relative text-[#3b2b1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold mb-6">Leave Request</h2>

        <div className="space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="block text-sm font-semibold mb-2">Employee <span className="text-red-600">*</span></label>
            {loadingEmployees ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading employees...
              </div>
            ) : (
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value={0}>Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_code} - {emp.first_name} {emp.last_name} ({emp.department_name || 'No Dept'})
                  </option>
                ))}
              </select>
            )}
            {formData.employee_id !== 0 && (
              <p className="text-sm text-gray-700 mt-1">
                Remaining Leave Credits: <span className="font-semibold">{employees.find((emp) => emp.employee_id === formData.employee_id)?.leave_credit ?? 'N/A'}</span>
              </p>
            )}
            {errors.employee_id && <p className="text-red-600 text-xs mt-1">{errors.employee_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Leave Type</label>
            <select
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value as LeaveType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Start Date</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {errors.start_date && <p className="text-red-600 text-xs mt-1">{errors.start_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">End Date</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {errors.end_date && <p className="text-red-600 text-xs mt-1">{errors.end_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
        </div>

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

// View Leave Modal Component
function ViewLeaveModal({
  isOpen,
  leave,
  onClose,
  onApprove,
  onReject,
}: {
  isOpen: boolean;
  leave: Leave;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { user } = useAuth();
  const role = user?.role;
  const sameDepartment = user?.department_id !== undefined && leave?.department_id !== undefined && user?.department_id === leave?.department_id;
  const notSelf = user?.employee_id !== undefined && leave?.employee_id !== undefined && user?.employee_id !== leave?.employee_id;

  const canApproveReject = leave.status === "pending" && (
    (leave.requester_role === 'employee' && role === 'supervisor' && sameDepartment && notSelf) ||
    (leave.requester_role === 'supervisor' && (role === 'admin' || role === 'superadmin')) ||
    (leave.requester_role === 'admin' && role === 'superadmin')
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#fdf3e2] w-full max-w-md p-8 rounded-2xl shadow-lg relative text-[#3b2b1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold mb-6">Leave Request Details</h2>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Code</p>
            <p className="font-semibold">{leave.leave_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Employee</p>
            <p className="font-semibold">{leave.first_name} {leave.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Leave Type</p>
            <p className="font-semibold">{LEAVE_TYPE_LABELS[leave.leave_type]}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Start Date</p>
            <p className="font-semibold">{new Date(leave.start_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">End Date</p>
            <p className="font-semibold">{new Date(leave.end_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold">{leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}</p>
          </div>
          {typeof leave.leave_credit === "number" && (
            <div>
              <p className="text-sm text-gray-600">Remaining Leave Credits</p>
              <p className="font-semibold">{leave.leave_credit}</p>
            </div>
          )}
          {leave.remarks && (
            <div>
              <p className="text-sm text-gray-600">Remarks</p>
              <p className="font-semibold">{leave.remarks}</p>
            </div>
          )}
        </div>

        {/* Only same-department supervisors (not self) can approve/reject pending requests */}
        {canApproveReject && (
          <div className="flex justify-end gap-3">
            <button
              onClick={onReject}
              className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:opacity-80"
            >
              Approve
            </button>
          </div>
        )}

        {/* No permission message for pending requests */}
        {leave.status === "pending" && !canApproveReject && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              You don't have permission to approve or reject this request.
            </p>
          </div>
        )}

        {/* Close button for non-pending or when user can't approve/reject */}
        {(leave.status !== "pending" || !canApproveReject) && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#4b0b14] text-white rounded-lg hover:opacity-80"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
