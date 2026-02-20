"use client";

import { useState, useEffect, useRef } from "react";
import { MoreVertical, Eye, Trash2, Pencil } from "lucide-react";

interface Department {
  department_id: number;
  department_code?: string;
  department_name: string;
  supervisor_first_name?: string;
  supervisor_last_name?: string;
  supervisor_code?: string;
  employee_count: number;
}

interface DepartmentTableProps {
  departments: Department[];
  onView?: (department: Department) => void;
  onEdit?: (department: Department) => void;
  onDelete?: (id: number) => void;
}

export default function DepartmentTable({
  departments,
  onView,
  onEdit,
  onDelete,
}: DepartmentTableProps) {
  const [menuState, setMenuState] = useState<{
    index: number;
    top: number;
    left: number;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg">
      <table className="w-full text-sm border-collapse">
        <thead>
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
            const supervisorName =
              dept.supervisor_first_name && dept.supervisor_last_name
                ? `${dept.supervisor_code} - ${dept.supervisor_first_name} ${dept.supervisor_last_name}`
                : "No Supervisor";

            return (
              <tr
                key={dept.department_id}
                className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7]"
              >
                <td className="py-4 px-4">
                  {dept.department_code || `DEPT-${dept.department_id}`}
                </td>
                <td className="py-4 px-4">{dept.department_name}</td>
                <td className="py-4 px-4">{supervisorName}</td>
                <td className="py-4 px-4">{dept.employee_count}</td>

                <td className="py-4 px-4 text-center">
                  <button
                    onClick={(e) => openMenu(e, index)}
                    className="p-2 rounded-full hover:bg-[#e8d6bb]"
                  >
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 🔥 MENU OUTSIDE TABLE */}
      {menuState && (
        <div
          ref={menuRef}
          className="fixed w-40 bg-white border border-[#e2d5c3] rounded-lg shadow-xl z-[9999]"
          style={{
            top: menuState.top,
            left: menuState.left,
          }}
        >
          {onView && (
            <button
              onClick={() => {
                onView(departments[menuState.index]);
                setMenuState(null);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c] rounded-t-lg"
            >
              <Eye size={16} /> View
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => {
                onEdit(departments[menuState.index]);
                setMenuState(null);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
            >
              <Pencil size={16} /> Edit
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => {
                onDelete(departments[menuState.index].department_id);
                setMenuState(null);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#ffe5e5] text-red-600 rounded-b-lg"
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}