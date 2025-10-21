"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AddModal from "./add_employee/AddModal";
import ViewEmployeeModal from "./view_employee/ViewModal";
import EditEmployeeModal from "./edit_employee/EditModal";
import { employeeApi } from "@/lib/api";
import { Employee } from "@/types/api";


export default function EmployeeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [employeeToView, setEmployeeToView] = useState<number | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);

    const result = await employeeApi.getAll();

    if (result.success && result.data) {
      setEmployees(result.data as Employee[]);
    } else {
      setError(result.message || "Failed to fetch employees");
    }

    setLoading(false);
  };

  // 🔹 Sort employees
  const sortEmployees = (list: Employee[]) => {
    if (!sortBy) return list;
    return [...list].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

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
          valA = a.status?.toLowerCase() || "";
          valB = b.status?.toLowerCase() || "";
          break;
        default:
          return 0;
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

  // 🔹 Handlers
  const handleView = (id: number) => setEmployeeToView(id);
  const handleEdit = (id: number) => setEmployeeToEdit(id);
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    const result = await employeeApi.delete(id);
    if (result.success) {
      alert("Employee deleted successfully");
      fetchEmployees();
    } else {
      alert(result.message || "Failed to delete employee");
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
          <button
            onClick={fetchEmployees}
            className="bg-[#3b2b1c] text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 🔹 UI
  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-gray-800 font-poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">{employees.length} Employees</h1>

        <div className="flex flex-wrap items-center gap-3 relative">
          {/* Search */}
          <div className="flex items-center bg-[#fff1dd] px-4 py-4 rounded-full shadow-sm w-72 md:w-68">
            <Search className="text-[#3b2b1c] mr-2" size={18} />
            <input
              type="text"
              placeholder="Search Employee"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-sm"
            />
          </div>

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

          {/* Add Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-[#3b2b1c] text-white px-6 py-4 rounded-full shadow-md hover:opacity-90 transition"
          >
            <Plus size={16} className="mr-2" /> Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
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
        </table>

        <div className="overflow-y-auto max-h-136 h-136">
          <table className="w-full text-sm table-fixed border-separate border-spacing-y-2">
            <tbody>
              {sortedEmployees.length > 0 ? (
                sortedEmployees.map((emp) => (
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
                      <span>
                        {emp.first_name} {emp.last_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {emp.position_name || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      {emp.department_name || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-2 rounded-full text-xs font-medium ${emp.status === "active"
                          ? "bg-green-100 text-green-700"
                          : emp.status === "resigned"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {emp.status.charAt(0).toUpperCase() +
                          emp.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMenu(
                            selectedMenu === emp.employee_id
                              ? null
                              : emp.employee_id
                          );
                        }}
                        className="p-1 rounded hover:bg-gray-200 menu-button"
                      >
                        <MoreVertical size={18} className="text-gray-600" />
                      </button>

                      {selectedMenu === emp.employee_id && (
                        <div className="absolute right-4 top-10 bg-[#FFF2E0] rounded-lg shadow-lg w-36 z-50 employee-dropdown">
                          <button
                            onClick={() => handleView(emp.employee_id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(emp.employee_id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(emp.employee_id)}
                            className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600"
                          >
                            Delete
                          </button>
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
        </div>
      </div>

      {/* Modals */}
      <AddModal isOpen={isModalOpen} onClose={handleModalClose} />
      <ViewEmployeeModal isOpen={employeeToView !== null} onClose={() => setEmployeeToView(null)} id={employeeToView!}/>
      <EditEmployeeModal isOpen={employeeToEdit !== null} onClose={() => setEmployeeToEdit(null)} id={employeeToEdit!}/>
    </div>
  );
}
