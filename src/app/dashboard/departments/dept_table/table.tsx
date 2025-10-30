"use client";

import { useState, useEffect, useRef } from "react";
import { MoreVertical, Eye, Trash2, Pencil } from "lucide-react";

// Define the Department interface (matches API response)
interface Department {
  department_id: number;
  department_code?: string;
  department_name: string;
  description?: string;
  supervisor_id?: number;
  supervisor_first_name?: string;
  supervisor_last_name?: string;
  supervisor_code?: string;
  employee_count: number;
  created_at?: string;
  updated_at?: string;
}

// Define component props
interface DepartmentTableProps {
  departments: Department[];
  onView?: (department: Department) => void;
  onEdit?: (department: Department) => void;
  onDelete?: (department: Department) => void;
}

export default function DepartmentTable({
  departments,
  onView,
  onEdit,
  onDelete,
}: DepartmentTableProps) {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (index: number) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  return (
    <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg max-h-136 h-136">
      <table className="w-full text-sm border-collapse">
        <thead className="text-md">
          <tr className="bg-[#3b2b1c] text-white">
            <th className="py-4 px-4 text-left">Department ID</th>
            <th className="py-4 px-4 text-left">Department Name</th>
            <th className="py-4 px-4 text-left">Department Supervisor</th>
            <th className="py-4 px-4 text-left">Total Employees</th>
            <th className="py-4 px-4 text-center">Actions</th>
          </tr>
        </thead>

        <tbody className="text-[#3b2b1c] text-base">
          {departments.map((dept, index) => {
            const supervisorName = dept.supervisor_first_name && dept.supervisor_last_name
              ? `${dept.supervisor_code} - ${dept.supervisor_first_name} ${dept.supervisor_last_name}`
              : "No Supervisor";

            return (
              <tr
                key={dept.department_id}
                className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition"
              >
                <td className="py-4 px-4">{dept.department_code || `DEPT-${dept.department_id}`}</td>
                <td className="py-4 px-4">{dept.department_name}</td>
                <td className="py-4 px-4">{supervisorName}</td>
                <td className="py-4 px-4">{dept.employee_count}</td>

              <td className="py-4 px-4 text-center relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(index);
                  }}
                  className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                  aria-label="Actions menu"
                >
                  <MoreVertical size={18} className="text-[#3b2b1c]" />
                </button>

                {openMenuIndex === index && (
                  <div
                    className="absolute right-4 mt-2 w-36 bg-white border border-[#e2d5c3] rounded-lg shadow-md z-50"
                    ref={menuRef}
                  >
                    {onView && (
                      <button
                        onClick={() => {
                          onView(dept);
                          setOpenMenuIndex(null);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c] rounded-t-lg"
                      >
                        <Eye size={16} /> View
                      </button>
                    )}

                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(dept);
                          setOpenMenuIndex(null);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
                      >
                        <Pencil size={16} /> Edit
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => {
                          onDelete(dept);
                          setOpenMenuIndex(null);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#ffe5e5] text-[#b91c1c] rounded-b-lg"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}