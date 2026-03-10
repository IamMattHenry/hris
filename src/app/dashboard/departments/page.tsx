"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, MoreVertical, Eye, Pencil, Trash2 } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import AddDepartmentModal from "./add_dept/AddModal";
import ViewDepartmentModal from "./view_dept/ViewModal";
import EditDepartmentModal from "./edit_dept/EditModal";
import { useAuth } from "@/contexts/AuthContext";
import { departmentApi } from "@/lib/api";
import SearchBar from "@/components/forms/FormSearch";
import { toast } from "react-hot-toast";
import ConfirmModal from "@/components/modals/ConfirmModal";
import { usePermissions } from "@/hooks/usePermissions";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { can, loading: permissionLoading } = usePermissions();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<number | null>(null);
  const [menuState, setMenuState] = useState<{ index: number; top: number; left: number; } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");

  const canCreateDepartment = can('departments.create');
  const canUpdateDepartment = can('departments.update');
  const canDeleteDepartment = can('departments.delete');

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!menuState) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current || menuRef.current.contains(target)) return;
      setMenuState(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [menuState]);

  const fetchDepartments = async () => {
    setLoading(true);
    const result = await departmentApi.getAll();
    if (result.success && result.data) {
      setDepartments(result.data);
    }
    setLoading(false);
  };

  const openMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuState({
      index,
      top: rect.bottom + window.scrollY,
      left: rect.right - 160 + window.scrollX, // 160 = menu width
    });
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
    setDepartmentToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!departmentToDelete) return;

    const result = await departmentApi.delete(departmentToDelete);
    if (result.success) {
      toast.success("Department deleted successfully");
      fetchDepartments();
    } else {
      toast.error(result.message || "Failed to delete department");
    }

    setDepartmentToDelete(null);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // Filter departments based on search term
  const filteredDepartments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    let list = departments.filter((dept) => {
      if (!query) return true;

      const deptCode = (dept.department_code || `DEPT-${dept.department_id}`).toLowerCase();
      const deptName = dept.department_name.toLowerCase();
      const supervisorName = dept.supervisor_first_name && dept.supervisor_last_name
        ? `${dept.supervisor_first_name} ${dept.supervisor_last_name}`.toLowerCase()
        : "";
      const supervisorCode = (dept.supervisor_code || "").toLowerCase();

      return (
        deptCode.includes(query) ||
        deptName.includes(query) ||
        supervisorName.includes(query) ||
        supervisorCode.includes(query)
      );
    });

    if (departmentFilter !== "all") {
      list = list.filter((dept) => String(dept.department_id) === departmentFilter);
    }

    if (sortOrder !== "default") {
      list = [...list].sort((a, b) => {
        const nameA = (a.department_name ?? "").toLowerCase();
        const nameB = (b.department_name ?? "").toLowerCase();
        if (nameA === nameB) return 0;
        const comparison = nameA < nameB ? -1 : 1;
        return sortOrder === "asc" ? comparison : -comparison;
      });
    }

    return list;
  }, [departments, searchTerm, departmentFilter, sortOrder]);

  const departmentOptions = useMemo(() => {
    return departments
      .map((dept) => ({ id: String(dept.department_id), name: dept.department_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

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
  }, [searchTerm, departmentFilter, sortOrder]);

  return (
    <div className="p-6 min-h-screen font-poppins bg-[#fff7ec]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 my-8">
        <h2 className="text-xl md:text-2xl font-semibold text-[#3b2b1c]">
          Total Departments: {departments.length}
        </h2>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
         
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-[#d6c3aa] rounded-lg bg-white text-sm text-[#3b2b1c] w-full sm:w-auto"
          >
            <option value="all">All Department IDs</option>
            {departmentOptions.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as typeof sortOrder);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-[#d6c3aa] rounded-lg bg-white text-sm text-[#3b2b1c] w-full sm:w-auto"
          >
            <option value="default">Sort: Default</option>
            <option value="asc">Sort: Name A-Z</option>
            <option value="desc">Sort: Name Z-A</option>
          </select>
          
          <div className="w-full sm:w-auto">
            <SearchBar placeholder="Search Department Code, Name, Supervisor" value={searchTerm} onChange={handleSearch} />
          </div>


          {!permissionLoading && canCreateDepartment && (
            <ActionButton
              label="Add Department"
              onClick={() => setIsAddModalOpen(true)}
              icon={Plus}
              className="py-2 w-full sm:w-auto justify-center"
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
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead className="text-md">
                <tr className="bg-[#3b2b1c] text-white">
                  <th className="py-4 px-4 text-left">Department Code</th>
                  <th className="py-4 px-4 text-left">Department Name</th>
                  <th className="py-4 px-4 text-left">Supervisor</th>
                  <th className="py-4 px-4 text-left">Total Positions</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[#3b2b1c] text-base">
                {currentDepartments.map((dept, index) => (
                  <tr key={dept.department_id} className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition">
                    <td className="py-4 px-4">{dept.department_code || `DEPT-${String(dept.department_id).padStart(3, '0')}`}</td>
                    <td className="py-4 px-4">{dept.department_name}</td>
                    <td className="py-4 px-4">
                      {dept.supervisor_first_name && dept.supervisor_last_name
                        ? `${dept.supervisor_first_name} ${dept.supervisor_last_name}`
                        : 'N/A'}
                    </td>
                    <td className="py-4 px-4">{dept.total_positions || 0}</td>
                    <td className="py-4 px-4 text-center relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenu(e, index);
                        }}
                        className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                      >
                        <MoreVertical size={18} className="text-[#3b2b1c]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {currentDepartments.map((dept, index) => (
              <div key={dept.department_id} className="bg-[#faeddc] p-4 rounded-lg shadow-sm border border-[#e2d5c3] relative">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-[#3b2b1c] text-lg">{dept.department_name}</h3>
                    <p className="text-xs text-[#3b2b1c]/70">{dept.department_code || `DEPT-${String(dept.department_id).padStart(3, '0')}`}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openMenu(e, index);
                    }}
                    className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                  >
                    <MoreVertical size={18} className="text-[#3b2b1c]" />
                  </button>
                </div>
                <div className="space-y-2 text-sm text-[#3b2b1c]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Supervisor:</span>
                    <span className="font-medium">
                      {dept.supervisor_first_name && dept.supervisor_last_name
                        ? `${dept.supervisor_first_name} ${dept.supervisor_last_name}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Positions:</span>
                    <span className="font-medium">{dept.total_positions || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Menu */}
      {menuState && (
        <div
          ref={menuRef}
          className="fixed w-40 bg-white border border-[#e2d5c3] rounded-lg shadow-xl z-[9999]"
          style={{ top: menuState.top, left: menuState.left }}
        >
          <button
            onClick={() => {
              handleView(currentDepartments[menuState.index]);
              setMenuState(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] rounded-t-lg text-[#3b2b1c]"
          >
            <Eye size={16} /> View
          </button>

          {(!permissionLoading && (canUpdateDepartment || canDeleteDepartment)) && (
            <>
              {canUpdateDepartment && (
                <button
                  onClick={() => {
                    handleEdit(currentDepartments[menuState.index]);
                    setMenuState(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
                >
                  <Pencil size={16} /> Edit
                </button>
              )}
              {canDeleteDepartment && (
                <button
                  onClick={() => {
                    handleDelete(currentDepartments[menuState.index].department_id);
                    setMenuState(null);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#ffe5e5] text-[#b91c1c] rounded-b-lg"
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </>
          )}
        </div>
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

          {/* Ellipsis if many pages */}
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

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setDepartmentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Department"
        message="Are you sure you want to delete this department? This action cannot be undone."
        confirmText="Delete"
      />

      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={async (newDept) => {
          // Refresh departments to ensure supervisor names and counts are correct
          await fetchDepartments();
        }}
      />
      <ViewDepartmentModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} department={selectedDepartment} />
      <EditDepartmentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} department={selectedDepartment} onSave={handleSave} />
    </div>
  );
}