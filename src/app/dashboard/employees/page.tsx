"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import JSZip from "jszip";
import QRCode from "qrcode";
import AddModal from "./add_employee/AddModal";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import ViewEmployeeModal from "./view_employee/ViewModal";
import EditEmployeeModal from "./edit_employee/EditModal";
import BudgetRequestsModal from "./view_budget/page";


import LeaveDetailsModal from "@/components/dashboard/LeaveDetailsModal";
import { employeeApi, payrollApi } from "@/lib/api";
import { Employee } from "@/types/api";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "react-hot-toast";
import { a } from "framer-motion/client";


interface FinanceBudget {
  budget_id: number;
  department_budget_id?: number;
  amount: number;
}

interface BudgetRequestForm {
  title: string;
  description: string;
  requested_amount: string;
  priority: "low" | "medium" | "high";
}

interface ExpenseBudgetRequestItem {
  notification_id: number;
  title: string;
  requested_amount: number;
  status: string;
  priority: "low" | "medium" | "high";
  created_at: string;
}



export default function EmployeeTable() {
  const { can, canAny, loading: permLoading } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [employeeToView, setEmployeeToView] = useState<number | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<number | null>(null);
  const [leaveDetailEmployee, setLeaveDetailEmployee] = useState<{ id: number; name: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [staffSalariesBudget, setStaffSalariesBudget] = useState<FinanceBudget | null>(null);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseBudgetRequestItem[]>([]);
  const [expenseRequestsLoading, setExpenseRequestsLoading] = useState(false);
  const [isExpenseRequestsModalOpen, setIsExpenseRequestsModalOpen] = useState(false);
  const [isBudgetRequestOpen, setIsBudgetRequestOpen] = useState(false);
  const [budgetRequestSubmitting, setBudgetRequestSubmitting] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [budgetRequestForm, setBudgetRequestForm] = useState<BudgetRequestForm>({
    title: "",
    description: "",
    requested_amount: "",
    priority: "medium",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [activeComponentTab, setActiveComponentTab] = useState<'budget' | 'employees'>('employees');
  const itemsPerPage = 10; // change page size here


  const formatCurrency = (value?: number | null) => {
    if (value == null || Number.isNaN(Number(value))) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  };


  // RBAC permission checks (replaces hardcoded role checks)
  const canCreate = can('employees.create');
  const canEdit = can('employees.update');
  const canTerminate = canAny('employees.terminate', 'employees.delete');
  const canViewLeave = canAny('leave.read', 'leave.read_department');

  // 🔹 Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Only close if click is outside dropdowns or buttons
      if (
        !target.closest(".employee-dropdown") &&
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

  // 🔹 Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const res = await payrollApi.getSettings();
        const budget = res.data?.budgets?.staff_salaries;

        if (res.success && budget) {
          setStaffSalariesBudget({
            budget_id: Number(budget.budget_id),
            department_budget_id: Number(budget.department_budget_id),
            amount: Number(budget.amount),
          });
        } else {
          setStaffSalariesBudget(null);
        }
      } catch {
        setStaffSalariesBudget(null);
      }
    };

    fetchBudget();
  }, []);

  const fetchExpenseRequests = async () => {
    setExpenseRequestsLoading(true);
    try {
      const res = await payrollApi.getExpenseRequests();
      if (res.success && Array.isArray(res.data)) {
        setExpenseRequests(res.data as ExpenseBudgetRequestItem[]);
      } else {
        setExpenseRequests([]);
      }
    } catch {
      setExpenseRequests([]);
    } finally {
      setExpenseRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseRequests();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await employeeApi.getAll();
      if (result.success && result.data) {
        setEmployees(result.data as Employee[]);
      } else {
        const msg = result.message || "Failed to fetch employees.";
        setError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to fetch employees.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Sort employees
  const sortEmployees = (list: Employee[]) => {
    if (!sortBy) return list;
    return [...list].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      const normalizeStatus = (value?: string) => String(value || "").toLowerCase().trim();
      const statusRank = (value?: string) => {
        const status = normalizeStatus(value);
        if (status === "terminated") return 999;
        if (status === "active") return 0;
        if (status === "on-leave") return 1;
        if (status === "resigned") return 2;
        return 3;
      };

      switch (sortBy) {
        case "id":
          valA = a.employee_id;
          valB = b.employee_id;
          break;
        case "name":
          valA = `${a.first_name} ${a.last_name}`.toLowerCase();
          valB = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case "position":
          valA = a.position_name?.toLowerCase() || "";
          valB = b.position_name?.toLowerCase() || "";
          break;
        case "department":
          valA = a.department_name?.toLowerCase() || "";
          valB = b.department_name?.toLowerCase() || "";
          break;
        case "status":
          valA = statusRank(a.status);
          valB = statusRank(b.status);
          break;
        default:
          return 0;
      }

      if (sortBy === "status") {
        if (valA === valB) {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          if (nameA < nameB) return sortOrder === "asc" ? -1 : 1;
          if (nameA > nameB) return sortOrder === "asc" ? 1 : -1;
          return 0;
        }

        if (valA === 999) return 1;
        if (valB === 999) return -1;

        return sortOrder === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };
  // 🔹 Filter employees by search
  const filtered = employees.filter((e) => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    const employeeCode = e.employee_code?.toLowerCase() || "";
    const position = e.position_name?.toLowerCase() || "";
    const department = e.department_name?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();

    return (
      fullName.includes(search) ||
      employeeCode.includes(search) ||
      position.includes(search) ||
      department.includes(search)
    );
  });

  const sortedEmployees = sortEmployees(filtered);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = sortedEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);



  // Download all EmployeeQR
  const handleDownloadAllQR = async () => {
    try {
      if (employees.length === 0) {
        toast.error("No employees to generate QR codes for.");
        return;
      }

      const toastId = toast.loading("Generating QR codes...");
      const zip = new JSZip();

      for (const emp of employees) {
        const dataToEncode = JSON.stringify({
          employee_id: Number(emp.employee_id),
          employee_code: emp.employee_code || "",
          first_name: emp.first_name || "",
          last_name: emp.last_name || "",
          position_name: emp.position_name || "N/A",
          department_name: emp.department_name || "Department",
          schedule_time: "08:00",
        });

        const url = await QRCode.toDataURL(dataToEncode, {
          width: 160,
          margin: 1,
          color: {
            dark: "#3b2b1c",
            light: "#fff7ec",
          },
        });

        const base64Data = url.split(",")[1];

        const dept = emp.department_name || "Department";
        const fileName = `${emp.first_name}_${emp.last_name}_${dept}.png`.replace(/\s+/g, "_");

        zip.file(fileName, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "all_employee_qrcodes.zip";
      link.click();
      URL.revokeObjectURL(link.href);

      toast.dismiss(toastId);
      toast.success("Successfully downloaded all QR codes!");
    } catch (error) {
      console.error("Failed to generate zip:", error);
      toast.error("Failed to generate ZIP file.");
    }
  };

  const handleView = (id: number) => setEmployeeToView(id);
  const handleEdit = (id: number) => setEmployeeToEdit(id);
  const handleTerminate = async (id: number) => {
    if (!window.confirm("Are you sure you want to terminate this employee?")) return;
    const result = await employeeApi.terminate(id);
    if (result.success) {
      toast.success("Employee terminated successfully");
      fetchEmployees();
    } else {
      toast.error(result.message || "Failed to terminate employee");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchEmployees();
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setIsFilterOpen(false);
  };

  const resetBudgetRequestForm = () => {
    setBudgetRequestForm({
      title: "",
      description: "",
      requested_amount: "",
      priority: "medium",
    });
  };

  const handleBudgetRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = budgetRequestForm.title.trim();
    const description = budgetRequestForm.description.trim();

    if (!title) {
      toast.error("Title cannot be empty.");
      return;
    }

    if (!description) {
      toast.error("Description cannot be empty.");
      return;
    }

    const amount = Number(budgetRequestForm.requested_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Requested amount must be greater than 0.");
      return;
    }

    if (amount > 1000000) {
      toast.error("Requested amount cannot exceed 1,000,000.");
      return;
    }

    setBudgetRequestSubmitting(true);
    try {
      const result = await payrollApi.createExpenseRequest({
        title,
        description,
        requested_amount: amount,
        priority: budgetRequestForm.priority,
      });

      if (result.success) {
        toast.success(result.message || "Budget request sent to Finance Department.");
        setIsBudgetRequestOpen(false);
        resetBudgetRequestForm();
        fetchExpenseRequests();
        return;
      }

      toast.error(result.message || "Failed to submit budget request.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit budget request.");
    } finally {
      setBudgetRequestSubmitting(false);
    }
  };

  // 🔹 Loading / Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b2b1c] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <ActionButton label="Retry" onClick={fetchEmployees} className="" />
        </div>
      </div>
    );
  }

  // 🔹 UI
  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-gray-800 font-poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">{employees.length} {employees.length > 1 ? "employees" : "employee"} </h1>
        <div className="flex flex-wrap items-center gap-3 relative">
          {/* Search */}
          <SearchBar placeholder="Search Employee" value={searchTerm} onChange={setSearchTerm} />

          {/* Sort Filter */}
          <div className="relative filter-dropdown">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center bg-[#3b2b1c] text-white px-6 py-4 rounded-full mr-16 shadow-md hover:opacity-90 transition filter-button"
            >

              <Filter size={16} className="mr-2" /> Sort
              {isFilterOpen ? (
                <ChevronUp className="ml-1" size={16} />
              ) : (
                <ChevronDown className="ml-1" size={16} />
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-[#FFF2E0] rounded-lg shadow-lg text-sm z-50 employee-dropdown">
                <button
                  onClick={() => handleSortChange("id")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  ID {sortBy === "id" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSortChange("name")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSortChange("position")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Position{" "}
                  {sortBy === "position" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSortChange("department")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Department{" "}
                  {sortBy === "department" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => handleSortChange("status")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Status{" "}
                  {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </div>
            )}
          </div>

          {/* Add Button - only shown when user has employees.create permission */}
          {canCreate && (
            <ActionButton
              label="Add Employee"
              onClick={() => setIsModalOpen(true)}
              icon={Plus}
              className="py-4"
            />
          )}


        </div>
      </div>

      {/* Staff Salaries Budget */}
      <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-[#e6d2b5]">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveComponentTab('employees')}
            className={`pb-4 px-1 text-sm font-medium transition-all relative ${
              activeComponentTab === 'employees'
                ? 'text-[#3b2b1c] border-b-2 border-[#3b2b1c]'
                : 'text-[#6b5344] hover:text-[#3b2b1c]'
            }`}
          >
            Employee Records
          </button>

            <button
            onClick={() => setActiveComponentTab('budget')}
            className={`pb-4 px-1 text-sm font-medium transition-all relative ${
              activeComponentTab === 'budget'
                ? 'text-[#3b2b1c] border-b-2 border-[#3b2b1c]'
                : 'text-[#6b5344] hover:text-[#3b2b1c]'
            }`}
          >
            Budget Overview
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* ==================== BUDGET TAB ==================== */}
        {activeComponentTab === 'budget' && (
          <div className="rounded-lg border border-[#e6d2b5] bg-[#FFF2E0] px-4 py-5 text-sm text-[#3b2b1c]">
            {/* Main Budget Info */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">
                  Latest Staff Salaries Budget:{' '}
                  {staffSalariesBudget?.amount
                    ? formatCurrency(staffSalariesBudget.amount)
                    : 'Not set'}
                </p>

                {staffSalariesBudget?.budget_id ? (
                  <p className="mt-1 text-xs text-[#6b5344]">
                    Source: budget_department
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#6b5344]">
                    Budget data unavailable. Employee salary updates may be blocked until Finance budget is configured.
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsBudgetRequestOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#3b2b1c] text-white text-xs font-medium hover:bg-[#2a2118] active:bg-[#1f1812] transition-all whitespace-nowrap"
              >
                Request Additional Budget
              </button>
            </div>

            {/* Recent Submitted Budget Requests */}
            <div className="mt-6 border-t border-[#e6d2b5] pt-4">
              <div className="flex items-center justify-center mb-3">
                <p className="text-xs font-semibold text-[#6b5344]">
                  Recent Submitted Budget Requests
                </p>
              </div>

              {expenseRequestsLoading ? (
                <p className="text-xs text-[#6b5344] py-4">Loading requests...</p>
              ) : expenseRequests.length === 0 ? (
                <p className="text-xs text-[#6b5344] py-4">No submitted requests yet.</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {expenseRequests.slice(0, 5).map((request) => (
                    <div
                      key={request.notification_id}
                      className="rounded-md border border-[#e6d2b5] bg-[#fff7ec] px-3 py-3 hover:bg-[#ffebd0] transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#3b2b1c] truncate">
                            {request.title}
                          </p>
                          <p className="text-[11px] text-[#6b5344] mt-1">
                            {formatCurrency(request.requested_amount)} •{' '}
                            <span className="capitalize">{request.priority}</span> priority
                          </p>
                        </div>

                        <span
                          className={`text-[10px] px-3 py-1 rounded-full whitespace-nowrap self-start ${
                            request.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : request.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : request.status === "cancelled"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expenseRequests.length > 10 && (
              <button
                onClick={() => setShowAllRequests(true)}
                className="text-md text-[#6b5344] hover:text-[#3b2b1c] mt-4 w-full flex items-center justify-center font-medium gap-1 transition-colors"
              >
                View all ({expenseRequests.length})
              </button>
            )}
          </div>
        )}

        {/* ==================== EMPLOYEES TAB ==================== */}
        {activeComponentTab === 'employees' && (
          <div className="w-full">
        
            <table className="w-full text-sm table-fixed border-separate border-spacing-y-2">
              <thead className="bg-[#3b2b1c] text-white text-left sticky top-0 z-20">
                <tr>
                  <th className="py-4 px-4 rounded-l-lg">ID</th>
                  <th className="py-4 px-4">Name</th>
                  <th className="py-4 px-4">Position</th>
                  <th className="py-4 px-4">Department</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentEmployees.length > 0 ? (
                  currentEmployees.map((emp) => (
                    <tr
                      key={emp.employee_id}
                      className="bg-[#fff4e6] border border-orange-100 rounded-lg hover:shadow-sm transition relative"
                    >
                      <td className="py-3 px-4">{emp.employee_code}</td>
                      <td className="py-3 px-4 flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#800000] flex items-center justify-center text-white text-sm font-semibold">
                          {emp.first_name && emp.last_name
                            ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
                            : "?"}
                        </div>
                        <span>{emp.first_name} {emp.last_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span>{emp.position_name || "N/A"}</span>
                      </td>
                      <td className="py-3 px-4">{emp.department_name || "N/A"}</td>
                      <td className="py-3 px-4">
                        <span
                          onClick={() => {
                            if (emp.status === "on-leave") {
                              setLeaveDetailEmployee({
                                id: emp.employee_id,
                                name: `${emp.first_name} ${emp.last_name}`,
                              });
                            }
                          }}
                          className={`px-3 py-2 rounded-full text-xs font-medium inline-block cursor-pointer ${
                            emp.status === "active"
                              ? "bg-green-100 text-green-700"
                              : emp.status === "resigned"
                                ? "bg-yellow-100 text-yellow-700"
                                : emp.status === "on-leave"
                                  ? "bg-blue-100 text-blue-700 hover:shadow-md transition"
                                  : "bg-red-100 text-red-700"
                          }`}
                        >
                          {emp.status.charAt(0).toUpperCase() +
                            emp.status.slice(1).replace("-", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMenu(selectedMenu === emp.employee_id ? null : emp.employee_id);
                          }}
                          className="p-1 rounded hover:bg-gray-200 menu-button"
                        >
                          <MoreVertical size={18} className="text-gray-600" />
                        </button>

                        {selectedMenu === emp.employee_id && (
                          <div className="absolute right-4 top-10 bg-[#FFF2E0] rounded-lg shadow-lg w-36 z-50 employee-dropdown">
                            <button onClick={() => handleView(emp.employee_id)} className="w-full text-left px-4 py-2 hover:bg-gray-50">View</button>
                            {canEdit && (
                              <button onClick={() => handleEdit(emp.employee_id)} className="w-full text-left px-4 py-2 hover:bg-gray-50">Edit</button>
                            )}
                            {canTerminate && (
                              <button
                                onClick={() => handleTerminate(emp.employee_id)}
                                disabled={emp.status === "terminated"}
                                className={`w-full text-left px-4 py-2 ${
                                  emp.status === "terminated"
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "hover:bg-red-100 text-red-600"
                                }`}
                              >
                                {emp.status === "terminated" ? "Terminated" : "Terminate"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 select-none w-full gap-4">
              <div className="flex items-center gap-2">
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
                        className={`px-3 py-2 rounded text-sm transition cursor-pointer ${
                          currentPage === num
                            ? "bg-[#3b2b1c] text-white"
                            : "text-[#3b2b1c] hover:underline"
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="px-1 text-[#3b2b1c]">...</span>
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

              <ActionButton
                label="Download All QR"
                onClick={handleDownloadAllQR}
                icon={Download}
                className="py-4 gap-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>


      {/* Modals */}
      <AddModal isOpen={isModalOpen} onClose={handleModalClose} />
      <ViewEmployeeModal isOpen={employeeToView !== null} onClose={() => setEmployeeToView(null)} id={employeeToView!} />
      <EditEmployeeModal isOpen={employeeToEdit !== null} onClose={() => setEmployeeToEdit(null)} id={employeeToEdit!} />
      <BudgetRequestsModal
        isOpen={showAllRequests}
        onClose={() => setShowAllRequests(false)}
        expenseRequests={expenseRequests}
        expenseRequestsLoading={expenseRequestsLoading}
        formatCurrency={formatCurrency}
      />
      <LeaveDetailsModal
        isOpen={leaveDetailEmployee !== null}
        onClose={() => setLeaveDetailEmployee(null)}
        employeeId={leaveDetailEmployee?.id || 0}
        employeeName={leaveDetailEmployee?.name || ""}
      />

      {isBudgetRequestOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#3b2b1c]">Request Additional Budget</h3>
            <p className="text-xs text-[#6b5344] mt-1">This will send an expense request to the Finance Department.</p>

            <form className="mt-4 space-y-3" onSubmit={handleBudgetRequestSubmit}>
              <div>
                <label className="block text-xs font-medium mb-1 text-[#3b2b1c]">Title</label>
                <input
                  type="text"
                  value={budgetRequestForm.title}
                  onChange={(e) => setBudgetRequestForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border border-[#d9c3a4] px-3 py-2 text-sm focus:outline-none"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[#3b2b1c]">Description</label>
                <textarea
                  value={budgetRequestForm.description}
                  onChange={(e) => setBudgetRequestForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-[#d9c3a4] px-3 py-2 text-sm min-h-28 focus:outline-none"
                  maxLength={2000}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[#3b2b1c]">Requested Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5344] text-sm font-medium">₱</span>
                    <input
                      type="text"
                      value={budgetRequestForm.requested_amount ? budgetRequestForm.requested_amount.split('.').map((part, i) => i === 0 ? part.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : part).join('.') : ""}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9.]/g, "");
                        const parts = val.split(".");
                        if (parts.length > 2) val = parts[0] + "." + parts.slice(1).join("");
                        if (parts[1] && parts[1].length > 2) val = parts[0] + "." + parts[1].substring(0, 2);
                        if (Number(val) > 1000000) val = "1000000";
                        setBudgetRequestForm((prev) => ({ ...prev, requested_amount: val }));
                      }}
                      className="w-full rounded-md border border-[#d9c3a4] pl-7 pr-3 py-2 text-sm focus:outline-none"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-[#3b2b1c]">Priority</label>
                  <select
                    value={budgetRequestForm.priority}
                    onChange={(e) => setBudgetRequestForm((prev) => ({ ...prev, priority: e.target.value as BudgetRequestForm["priority"] }))}
                    className="w-full rounded-md border border-[#d9c3a4] px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBudgetRequestOpen(false);
                    resetBudgetRequestForm();
                  }}
                  className="px-4 py-2 text-sm rounded-md border border-[#d9c3a4] text-[#3b2b1c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={budgetRequestSubmitting}
                  className="px-4 py-2 text-sm rounded-md bg-[#3b2b1c] text-white disabled:opacity-50"
                >
                  {budgetRequestSubmitting ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
