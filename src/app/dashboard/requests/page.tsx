"use client";

import { useState, useEffect } from "react";
import { Plus, MoreVertical, Filter, ChevronDown, ChevronUp, X, RotateCw } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { leaveApi, employeeApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import AddLeaveModal from "./add_request/AddModal";
import ViewLeaveModal from "./view_request/ViewModal";
import { toast } from "react-hot-toast";

type TabKey = "Leave Request" | "History";
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
  | "vawc"
  // Legacy
  | "personal"
  | "parental";
type LeaveStatus = "pending" | "supervisor_approved" | "approved" | "rejected";

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
  // Optional approver info
  supervisor_approved_by?: number | null;
  supervisor_approved_at?: string | null;
  supervisor_approver_first_name?: string;
  supervisor_approver_last_name?: string;
  approver_first_name?: string;
  approver_last_name?: string;
  hr_approved_at?: string | null;
}

const tabs: TabKey[] = ["Leave Request", "History"];

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
  // Legacy
  personal: "Personal Leave",
  parental: "Parental Leave",
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
  const [filterRequesterRole, setFilterRequesterRole] = useState<string | "">("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // change page size here

  // Role helpers
  const isSupervisor = user?.role === "supervisor";
  const isSuperadmin = user?.role === "superadmin";

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

    // Filter by tab and role-specific stage
    if (activeTab === "Leave Request") {
      if (isSupervisor) {
        filtered = filtered.filter(l => l.status === "pending");
      } else if (isSuperadmin) {
        filtered = filtered.filter(l => l.status === "supervisor_approved");
      } else {
        filtered = filtered.filter(l => l.status === "pending" || l.status === "supervisor_approved");
      }
    } else {
      filtered = filtered.filter(l => !(l.status === "pending" || l.status === "supervisor_approved"));
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

    // Filter by requester role (if requested)
    if (filterRequesterRole) {
      const roleLower = filterRequesterRole.toLowerCase();
      filtered = filtered.filter(l => (l.requester_role || '').toLowerCase() === roleLower);
    }

    return filtered;
  };

  const filteredLeaves = getFilteredLeaves();

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeaves = filteredLeaves.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchRequest, filterLeaveType, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRequesterRole]);

  const handleView = (leave: Leave) => {
    setSelectedLeave(leave);
    setIsViewModalOpen(true);
    setSelectedMenu(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this leave request?")) return;
    const result = await leaveApi.delete(id);
    if (result.success) {
      toast.success("Leave request deleted successfully");
      fetchLeaves();
    } else {
      toast.error(result.message || "Failed to delete leave request");
    }
  };

  const handleApprove = async (id: number) => {
    const result = await leaveApi.approve(id);
    if (result.success) {
      toast.success("Leave request approved");
      setIsViewModalOpen(false);
      fetchLeaves(); // Refresh the list
    } else {
      toast.error(result.message || "Failed to approve leave request");
    }
  };

  const handleReject = async (id: number) => {
    const result = await leaveApi.reject(id);
    if (result.success) {
      toast.success("Leave request rejected");
      setIsViewModalOpen(false);
      fetchLeaves(); // Refresh the list
    } else {
      toast.error(result.message || "Failed to reject leave request");
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
                  <option value="supervisor_approved">Pending HR Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Requester Role</label>
                <select
                  value={filterRequesterRole}
                  onChange={(e) => setFilterRequesterRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
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
                {currentLeaves.map((leave) => (
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
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          leave.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : leave.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : leave.status === "supervisor_approved"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {leave.status === "supervisor_approved" ? "Pending HR Review" : leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
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
      {/* pagination */}
      <div className="flex justify-center items-center gap-4 mt-4 select-none">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
        >
          Prev
        </button>

        <div className="flex items-center gap-1 overflow-hidden truncate">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .slice(
              Math.max(currentPage - 2, 0),
              Math.min(currentPage + 1, totalPages)
            )
            .map((num) => (
              <button
                key={num}
                onClick={() => goToPage(num)}
                className={`px-3 py-2 rounded text-sm transition cursor-pointer ${currentPage === num
                    ? "bg-[#3b2b1c] text-white"
                    : "text-[#3b2b1c] hover:underline"
                  }`}
              >
                {num}
              </button>
            ))}

          {/* Ellipsis */}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="px-1 text-[#3b2b1c] truncate">...</span>
          )}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
        >
          Next
        </button>
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