"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Filter, MoreVertical } from "lucide-react";
import AddModal from "./add_employee/AddModal";
import ViewModal from "./view_employee/ViewModal";

export default function EmployeeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<number>(0);
  const [employees, setEmployees] = useState([
    { id: 1, name: "King, Oliver J.", position: "Manager", department: "HR", status: "Active" },
    { id: 2, name: "Montgomery, Sophie L.", position: "Waiter", department: "HR", status: "On Leave" },
    { id: 3, name: "Adams, Grace T.", position: "Receptionist", department: "Front Desk", status: "Active" },
    { id: 4, name: "Johnson, Emily R.", position: "Cook", department: "Kitchen", status: "Active" },
    { id: 5, name: "Brown, Liam P.", position: "Guard", department: "Security", status: "On Leave" },
  ]);

  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setSelectedMenu(null); 
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Example handlers
  const handleView = (id: number) => {
    //alert(`View employee ID: ${id}`);
    setIsViewModalOpen(true);
    setEmployeeId(id);
  };

  const handleEdit = (id: number) => {
    alert(`Edit employee ID: ${id}`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      setEmployees(employees.filter((emp) => emp.id !== id));
    }
  };

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
            onClick={() => setIsAddModalOpen(true)}
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
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="bg-[#fff4e6] border border-orange-100 rounded-lg hover:shadow-sm transition relative"
                >
                  <td className="py-3 px-4">{emp.id}</td>
                  <td className="py-3 px-4 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <span>{emp.name}</span>
                  </td>
                  <td className="py-3 px-4">{emp.position}</td>
                  <td className="py-3 px-4">{emp.department}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-2 rounded-full text-xs font-medium ${emp.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-left relative">
                    <button
                      onClick={() =>
                        setSelectedMenu(selectedMenu === emp.id ? null : emp.id)
                      }
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      <MoreVertical size={18} className="text-gray-600" />
                    </button>

                    {selectedMenu === emp.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-4 top-10 bg-[#FFF2E0] rounded-lg shadow-lg w-36 z-10"
                      >
                        <button
                          onClick={() => handleView(emp.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(emp.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <ViewModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} id={employeeId} />
    </div>
  );
}
