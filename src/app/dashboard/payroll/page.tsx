"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Pencil, Trash2, Printer } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";

interface Payroll {
  id: string;
  name: string;
  position: string;
  hoursWorked: number;
  hourlyRate: number;
  status: string;
}

export default function PayrollTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Sample Payroll Data
  const payrollData: Payroll[] = [
    { id: "E001", name: "Bennett, Maya R.", position: "Janitor", hoursWorked: 40, hourlyRate: 120, status: "Paid" },
    { id: "E002", name: "Brooks, Jasper A.", position: "Technician", hoursWorked: 35, hourlyRate: 150, status: "Unpaid" },
    { id: "E003", name: "King, Oliver J.", position: "Manager", hoursWorked: 45, hourlyRate: 200, status: "Paid" },
  ];

  // Filter by search
  const filteredData = payrollData.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle action menu
  const toggleMenu = (index: number) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Print Function
  const handlePrint = () => {
    const printContent = tableRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open("", "", "width=900,height=700");
      printWindow?.document.write(`
      <html>
        <head>
          <title>Payroll Table</title>
          <style>
            body {
              font-family: 'Poppins', sans-serif;
              padding: 20px;
              background: #fff;
              color: #3b2b1c;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #e2d5c3;
              padding: 10px;
              text-align: center;
            }
            th {
              background-color: #3b2b1c;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #fdf4e7;
            }
            tr:hover {
              background-color: #fff3e3;
            }

            /* ✅ Hide Action column */
            th:last-child,
            td:last-child {
              display: none;
            }
          </style>
        </head>
        <body>
          <h2 style="text-align:center; margin-bottom: 20px;">Payroll Summary</h2>
          ${printContent}
        </body>
      </html>
    `);
      printWindow?.document.close();
      printWindow?.print();
    }
  };


  return (
    <div className="p-6 bg-[#fff8ef] min-h-screen font-poppins">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        {/* Search Bar */}
        <SearchBar
          placeholder="Search employee..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="w-80"
        />

        {/* Print Button */}
        <ActionButton
          label="Print"
          icon={Printer}
          onClick={handlePrint}
          className="text-white px-4 hover:bg-[#5a412e]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-md border border-[#e4d6c2] text-[#3b2b1c]" ref={tableRef}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#3b2b1c] text-white text-left">
              <th className="py-4 px-4 ">ID</th>
              <th className="py-4 px-4">Name</th>
              <th className="py-4 px-4">Position</th>
              <th className="py-4 px-4 text-center">Hours Worked</th>
              <th className="py-4 px-4 text-center">Hourly Rate</th>
              <th className="py-4 px-4 text-center">Total Pay</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((payroll, index) => (
                <tr
                  key={index}
                  className="border-b border-[#ecdcc9] hover:bg-[#fff3e3] transition"
                >
                  <td className="py-4 px-4">{payroll.id}</td>
                  <td className="py-4 px-4">{payroll.name}</td>
                  <td className="py-4 px-4">{payroll.position}</td>
                  <td className="py-4 px-4 text-center">{payroll.hoursWorked}</td>
                  <td className="py-4 px-4 text-center">
                    ₱{payroll.hourlyRate.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-center font-semibold">
                    ₱{(payroll.hoursWorked * payroll.hourlyRate).toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${payroll.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {payroll.status}
                    </span>
                  </td>

                  {/* 3-Dot Dropdown */}
                  <td className="py-4 px-4 text-center relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(index);
                      }}
                      className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                    >
                      <MoreVertical size={18} className="text-[#3b2b1c]" />
                    </button>

                    {openMenuIndex === index && (
                      <div
                        ref={menuRef}
                        className="absolute right-4 mt-2 w-36 bg-white border border-[#e2d5c3] rounded-lg shadow-md z-50"
                      >
                        <button
                          onClick={() => alert(`View ${payroll.name}`)}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
                        >
                          <Eye size={16} /> View
                        </button>
                        <button
                          onClick={() => alert(`Edit ${payroll.name}`)}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        <button
                          onClick={() => alert(`Delete ${payroll.name}`)}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#ffe5e5] text-[#b91c1c]"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-6 text-gray-500 italic"
                >
                  No payroll data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
