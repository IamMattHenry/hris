"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import AddDepartmentModal from "./add_dept/AddModal";
import ViewDepartmentModal from "./view_dept/ViewModal";
import EditDepartmentModal from "./edit_dept/EditModal";
import DepartmentTable from "./dept_table/table";
import { useAuth } from "@/contexts/AuthContext";
import { departmentApi } from "@/lib/api";
import SearchBar from "@/components/forms/FormSearch";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Check if user is supervisor (view-only access)
  const isSupervisor = user?.role === "supervisor";

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const result = await departmentApi.getAll();
    if (result.success && result.data) {
      setDepartments(result.data);
    }
    setLoading(false);
  };

  const handleView = (department: any) => {
    console.log("View department:", department);
    setIsViewModalOpen(true);
    setSelectedDepartment(department);
  };

  const handleEdit = (department: any) => {
    console.log("Edit department:", department);
    setIsEditModalOpen(true);
    setSelectedDepartment(department);
  };

  const handleSave = () => {
    // Refresh the departments list after saving changes
    fetchDepartments();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    const result = await departmentApi.delete(id);
    if (result.success) {
      alert("Department deleted successfully");
      fetchDepartments();
    } else {
      alert(result.message || "Failed to delete department");
    } 
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Filter departments based on search term
  const filteredDepartments = departments.filter((dept) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase();
    const deptCode = (dept.department_code || `DEPT-${dept.department_id}`).toLowerCase();
    const deptName = dept.department_name.toLowerCase();
    const supervisorName = dept.supervisor_first_name && dept.supervisor_last_name
      ? `${dept.supervisor_first_name} ${dept.supervisor_last_name}`.toLowerCase()
      : "";
    const supervisorCode = (dept.supervisor_code || "").toLowerCase();
    
    return (
      deptCode.includes(search) ||
      deptName.includes(search) ||
      supervisorName.includes(search) ||
      supervisorCode.includes(search)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDepartments = filteredDepartments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredDepartments]);



  return (
    <div className="p-6 min-h-screen font-poppins bg-[#fff7ec]">
      <div className="flex justify-between items-center my-8">
        <h2 className="text-2xl font-semibold text-[#3b2b1c]">
          Total Departments: {departments.length}
        </h2>

        <div className="flex items-center gap-4">
          <SearchBar placeholder="Search Department" value={searchTerm} onChange={handleSearch} />
          {!isSupervisor && (
            <ActionButton
              label="Add Department"
              onClick={() => setIsAddModalOpen(true)}
              icon={Plus}
              className="py-4"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-[#3b2b1c] text-lg">Loading departments...</p>
        </div>
      ) : filteredDepartments.length === 0 && searchTerm ? (
        <div className="flex justify-center items-center h-64 bg-[#faeddc] rounded-lg shadow-sm">
          <p className="text-[#3b2b1c] text-lg">No departments found matching "{searchTerm}"</p>
        </div>
      ) : (
        <DepartmentTable
          departments={currentDepartments}
          onView={handleView}
          onEdit={!isSupervisor ? handleEdit : undefined}
          onDelete={!isSupervisor ? handleDelete : undefined}
        />
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-4 select-none">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
        >
          Prev
        </button>

        {pageNumbers.map((num) => (
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

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(newDept) => {
          // Add new department to the departments list
          setDepartments([...departments, newDept]);
        }}
      />
      <ViewDepartmentModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} department={selectedDepartment} />
      <EditDepartmentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} department={selectedDepartment} onSave={handleSave} />
    </div>
  );
}