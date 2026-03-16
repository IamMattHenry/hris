"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MoreVertical, Plus, Eye, FileText, Download } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { toast } from "react-hot-toast";

const MOCK_PAYROLL_DATA = [
  { id: 1, code: "EMP-001", name: "Juan Dela Cruz", period: "Oct 1-15, 2024", basic: 25000, allowances: 2000, deductions: 1500, net: 25500, status: "paid" },
  { id: 2, code: "EMP-002", name: "Maria Santos", period: "Oct 1-15, 2024", basic: 30000, allowances: 2500, deductions: 2000, net: 30500, status: "paid" },
  { id: 3, code: "EMP-003", name: "Pedro Penduko", period: "Oct 1-15, 2024", basic: 22000, allowances: 1500, deductions: 1200, net: 22300, status: "processed" },
  { id: 4, code: "EMP-004", name: "Elena Reyes", period: "Oct 1-15, 2024", basic: 28000, allowances: 2000, deductions: 1800, net: 28200, status: "processed" },
  { id: 5, code: "EMP-005", name: "Roberto Gomez", period: "Oct 1-15, 2024", basic: 35000, allowances: 3000, deductions: 2500, net: 35500, status: "pending" },
  { id: 6, code: "EMP-006", name: "Liza Soberano", period: "Oct 1-15, 2024", basic: 45000, allowances: 5000, deductions: 4000, net: 46000, status: "pending" },
  { id: 7, code: "EMP-007", name: "Enrique Gil", period: "Oct 1-15, 2024", basic: 40000, allowances: 4000, deductions: 3500, net: 40500, status: "paid" },
  { id: 8, code: "EMP-008", name: "Kathryn Bernardo", period: "Oct 1-15, 2024", basic: 50000, allowances: 6000, deductions: 4500, net: 51500, status: "paid" },
  { id: 9, code: "EMP-009", name: "Daniel Padilla", period: "Oct 1-15, 2024", basic: 48000, allowances: 5500, deductions: 4200, net: 49300, status: "processed" },
  { id: 10, code: "EMP-010", name: "Anne Curtis", period: "Oct 1-15, 2024", basic: 55000, allowances: 7000, deductions: 5000, net: 57000, status: "pending" },
  { id: 11, code: "EMP-011", name: "Vice Ganda", period: "Oct 1-15, 2024", basic: 60000, allowances: 8000, deductions: 6000, net: 62000, status: "paid" },
];

export default function PayrollTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const itemsPerPage = 10;

  const filteredPayroll = useMemo(() => {
    return MOCK_PAYROLL_DATA.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredPayroll.length / itemsPerPage);
  const currentData = filteredPayroll.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleGeneratePayroll = () => {
    toast.success("Payroll generation started for the current period.");
  };

  const handleViewPayslip = (id: number) => {
    toast.success(`Viewing payslip for record #${id}`);
    setSelectedMenu(null);
  };

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-[#3b2b1c] font-poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-sm text-gray-600">Period: October 1, 2024 - October 15, 2024</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar 
            placeholder="Search Employee or Code" 
            value={searchTerm} 
            onChange={setSearchTerm} 
          />
          <ActionButton
            label="Generate Payroll"
            onClick={handleGeneratePayroll}
            icon={Plus}
            className="py-4"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Total Net Pay</p>
          <p className="text-2xl font-bold">₱458,300.00</p>
        </div>
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Processed Employees</p>
          <p className="text-2xl font-bold">11 / 11</p>
        </div>
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Payment Status</p>
          <p className="text-2xl font-bold text-green-600">On Track</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#3b2b1c] text-white">
              <th className="py-4 px-4 text-left">Employee</th>
              <th className="py-4 px-4 text-left">Period</th>
              <th className="py-4 px-4 text-right">Basic Salary</th>
              <th className="py-4 px-4 text-right">Allowances</th>
              <th className="py-4 px-4 text-right">Deductions</th>
              <th className="py-4 px-4 text-right">Net Pay</th>
              <th className="py-4 px-4 text-center">Status</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-base">
            {currentData.map((item) => (
              <tr key={item.id} className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition">
                <td className="py-4 px-4">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.code}</div>
                </td>
                <td className="py-4 px-4 text-gray-600">{item.period}</td>
                <td className="py-4 px-4 text-right">₱{item.basic.toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-green-600">+₱{item.allowances.toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-red-600">-₱{item.deductions.toLocaleString()}</td>
                <td className="py-4 px-4 text-right font-bold">₱{item.net.toLocaleString()}</td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'paid' ? 'bg-green-100 text-green-800' :
                    item.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center relative">
                  <button 
                    onClick={() => setSelectedMenu(selectedMenu === item.id ? null : item.id)}
                    className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {selectedMenu === item.id && (
                    <div className="absolute right-4 top-12 w-40 bg-white border border-[#e2d5c3] rounded-lg shadow-xl z-50">
                      <button 
                        onClick={() => handleViewPayslip(item.id)}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-left"
                      >
                        <Eye size={16} /> View Payslip
                      </button>
                      <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-left">
                        <Download size={16} /> Download PDF
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded bg-[#3b2b1c] text-white disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded bg-[#3b2b1c] text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
