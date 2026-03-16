"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MoreVertical, Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { toast } from "react-hot-toast";
import AddPenaltyModal from "./addpenalty/page";

const MOCK_PENALTY_DATA = [
  { id: 1, code: "EMP-001", name: "Juan Dela Cruz", type: "Late Arrival", reason: "Arrived 45 minutes late without prior notification.", status: "pending", date: "2024-10-10" },
  { id: 2, code: "EMP-002", name: "Maria Santos", type: "Dress Code", reason: "Wearing casual attire on a strictly formal event day.", status: "settled", date: "2024-10-08" },
  { id: 3, code: "EMP-003", name: "Pedro Penduko", type: "Unapproved Absence", reason: "Absent for a full shift without filing a leave request.", status: "cancelled", date: "2024-10-05" },
  { id: 4, code: "EMP-004", name: "Elena Reyes", type: "Policy Violation", reason: "Using personal device for non-work activities during production hours.", status: "pending", date: "2024-10-12" },
  { id: 5, code: "EMP-005", name: "Roberto Gomez", type: "Late Arrival", reason: "Habitual lateness (3rd instance this month).", status: "settled", date: "2024-10-11" },
  { id: 6, code: "EMP-006", name: "Liza Soberano", type: "Property Damage", reason: "Accidental damage to office peripherals due to negligence.", status: "pending", date: "2024-10-09" },
  { id: 7, code: "EMP-007", name: "Enrique Gil", type: "Dress Code", reason: "Inappropriate footwear in hazardous workspace.", status: "settled", date: "2024-10-07" },
];

export default function PenaltyTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [isAddPenaltyModalOpen, setAddPenaltyModalOpen] = useState(false);
  const itemsPerPage = 10;

  const filteredPenalties = useMemo(() => {
    return MOCK_PENALTY_DATA.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredPenalties.length / itemsPerPage);
  const currentData = filteredPenalties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleAddPenalty = () => {
    setAddPenaltyModalOpen(true);
  };

  const handleSettlePenalty = (id: number) => {
    toast.success(`Penalty #${id} marked as settled.`);
    setSelectedMenu(null);
  };

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-[#3b2b1c] font-poppins">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Penalty Management</h1>
          <p className="text-sm text-gray-600">Review and manage employee disciplinary penalties.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar 
            placeholder="Search Employee, Code or Type" 
            value={searchTerm} 
            onChange={setSearchTerm} 
          />
          <ActionButton
            label="Add Penalty"
            onClick={handleAddPenalty}
            icon={Plus}
            className="py-4"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Pending Penalties</p>
          <p className="text-2xl font-bold">3</p>
        </div>
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Settled this Month</p>
          <p className="text-2xl font-bold text-green-600">4</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#3b2b1c] text-white">
              <th className="py-4 px-4 text-left">Employee</th>
              <th className="py-4 px-4 text-left">Penalty Type</th>
              <th className="py-4 px-4 text-left">Reason</th>
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
                <td className="py-4 px-4 text-gray-600">{item.type}</td>
                <td className="py-4 px-4 text-gray-600 max-w-xs italic">"{item.reason}"</td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === 'settled' ? 'bg-green-100 text-green-800' :
                    item.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
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
                        onClick={() => toast.success(`Viewing details for #${item.id}`)}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-left"
                      >
                        <Eye size={16} /> View Details
                      </button>
                      <button 
                        onClick={() => handleSettlePenalty(item.id)}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-left"
                      >
                        <CheckCircle size={16} /> Settle Penalty
                      </button>
                      <button 
                        onClick={() => toast.error(`Cancelled penalty #${item.id}`)}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-50 text-red-600 text-left"
                      >
                        <XCircle size={16} /> Cancel Penalty
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

      <AddPenaltyModal
        isOpen={isAddPenaltyModalOpen}
        onClose={() => setAddPenaltyModalOpen(false)}
      />
    </div>
  );
}
