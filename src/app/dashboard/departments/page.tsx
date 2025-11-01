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

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 min-h-screen font-poppins bg-[#fff7ec]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-[#3b2b1c]">
          Total Departments: {departments.length}
        </h2>
        {!isSupervisor && (
          <ActionButton
            label="Add Department"
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
            className="py-4"
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-[#3b2b1c] text-lg">Loading departments...</p>
        </div>
      ) : (
        <DepartmentTable
          departments={departments}
          onView={handleView}
          onEdit={!isSupervisor ? handleEdit : undefined}
          onDelete={!isSupervisor ? handleDelete : undefined}
        />
      )}

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