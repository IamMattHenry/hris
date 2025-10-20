"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, MoreVertical } from "lucide-react";
import AddModal from "./add_employee/AddModal";
import { employeeApi } from "@/lib/api";
import { Employee } from "@/types/api";


export default function EmployeeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);

  // Fetch employees from API
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

  // Filter employees by search term
  const filtered = employees.filter((e) => {
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    const employeeCode = e.employee_code?.toLowerCase() || '';
    const position = e.position_name?.toLowerCase() || '';
    const department = e.department_name?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return fullName.includes(search) ||
           employeeCode.includes(search) ||
           position.includes(search) ||
           department.includes(search);
  });

  // Handlers
  const handleView = (id: number) => {
    alert(`View employee ID: ${id}`);
  };

  const handleEdit = (id: number) => {
    alert(`Edit employee ID: ${id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    const result = await employeeApi.delete(id);

    if (result.success) {
      alert("Employee deleted successfully");
      fetchEmployees(); // Refresh the list
    } else {
      alert(result.message || "Failed to delete employee");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchEmployees(); // Refresh the list after adding employee
  };

  // Loading state
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

  // Error state
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

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-gray-800 font-poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-xl font-bold">{employees.length} Employees</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="flex items-center bg-[#fff1dd] px-4 py-4 rounded-full shadow-sm w-72 md:w-68">
            <Search className="text-[#3b2b1c] mr-2" size={18} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-sm"
            />
          </div>

          {/* Filter Button */}
          <button className="flex items-center bg-[#3b2b1c] text-white px-6 py-4 rounded-full shadow-md mr-8 hover:opacity-90 transition">
            <Filter size={16} />
          </button>

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

  <div className="overflow-y-auto max-h-96">
    <table className="w-full text-sm table-fixed border-separate border-spacing-y-2">
      <tbody>
        {filtered.length > 0 ? (
          filtered.map((emp) => (
            <tr
              key={emp.employee_id}
              className="bg-[#fff4e6] border border-orange-100 rounded-lg hover:shadow-sm transition relative"
            >
              <td className="py-3 px-4">{emp.employee_code}</td>
              <td className="py-3 px-4 flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                <span>{emp.first_name} {emp.last_name}</span>
              </td>
              <td className="py-3 px-4">{emp.position_name || 'N/A'}</td>
              <td className="py-3 px-4">{emp.department_name || 'N/A'}</td>
              <td className="py-3 px-4">
                <span
                  className={`px-3 py-2 rounded-full text-xs font-medium ${
                    emp.status === "active"
                      ? "bg-green-100 text-green-700"
                      : emp.status === "resigned"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                </span>
              </td>
              <td className="py-3 px-4 text-left relative">
                <button
                  onClick={() =>
                    setSelectedMenu(selectedMenu === emp.employee_id ? null : emp.employee_id)
                  }
                  className="p-1 rounded hover:bg-gray-200"
                >
                  <MoreVertical size={18} className="text-gray-600" />
                </button>

                {selectedMenu === emp.employee_id && (
                  <div className="absolute right-4 top-10 bg-[#FFF2E0] rounded-lg shadow-lg w-36 z-10">
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

      <AddModal isOpen={isModalOpen} onClose={handleModalClose} />
    </div>
  );
}
