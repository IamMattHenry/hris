"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import AddDepartmentModal from "./add_dept/AddModal";
import ViewDepartmentModal from "./view_dept/ViewModal";
import EditDepartmentModal from "./edit_dept/EditModal";
import DepartmentTable from "./dept_table/table";
import { useAuth } from "@/contexts/AuthContext";


export default function DepartmentsPage() {
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  // Check if user is supervisor (view-only access)
  const isSupervisor = user?.role === "supervisor";


  const [departments, setDepartments] = useState([
    {
      id: "DEPT-001",
      name: "Human Resources",
      description: "Handles employee records, recruitment, and payroll",
      employeeCount: 10,
      supervisor: "John Smith",
      supervisorCode: "EMP-0001",
    },
    {
      id: "DEPT-002",
      name: "Marketing",
      description: "Handles marketing strategies and promotional activities",
      employeeCount: 15,
      supervisor: "Jane Doe",
      supervisorCode: "EMP-0002",
    },
    {
      id: "DEPT-003",
      name: "Finance",
      description: "Handles financial operations and reporting",
      employeeCount: 5,
      supervisor: "Robert Johnson",
      supervisorCode: "EMP-0003",
    },
    {
      id: "DEPT-004",
      name: "IT Department",
      description: "Maintains company systems and databases",
      employeeCount: 8,
      supervisor: "Sarah Williams",
      supervisorCode: "EMP-0004",
    },
  ]);


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

  const handleSave = (updatedDept: any) => {
  setDepartments((prev) =>
    prev.map((dept) =>
      dept.id === updatedDept.id ? updatedDept : dept
    )
  );

  console.log("Department updated:", updatedDept);
};

  const handleDelete = (department: any) => {
    console.log("Delete department:", department);
   
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

      <DepartmentTable
        departments={departments}
        onView={handleView}
        onEdit={!isSupervisor ? handleEdit : undefined}
        onDelete={!isSupervisor ? handleDelete : undefined}
      />

      <AddDepartmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <ViewDepartmentModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} department={selectedDepartment} />
      <EditDepartmentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} department={selectedDepartment} onSave={handleSave} />
    </div>
  );
}