"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { toast } from "react-hot-toast";
import AddPenaltyModal from "@/components/modals/AddPenaltyModal";
import { penaltyApi } from "@/lib/api";

type PenaltyRow = {
  id: number;
  code: string;
  employee_id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  penalty_type: string;
  title: string;
  description: string;
  status: string;
  amount: number;
  remaining_amount: number;
  issued_date: string;
};

const ITEMS_PER_PAGE = 10;

export default function PenaltyTable() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [isAddPenaltyModalOpen, setAddPenaltyModalOpen] = useState(false);

  const [rows, setRows] = useState<PenaltyRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    pending_count: 0,
    settled_this_month: 0,
    total_amount_pending: 0,
  });

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(count / ITEMS_PER_PAGE));
  }, [count]);

  const fetchPenalties = useCallback(async () => {
    setLoading(true);
    const result = await penaltyApi.getAll({
      search: debouncedSearch,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sort_by: "created_at",
      sort_dir: "desc",
    });

    if (!result.success) {
      toast.error(result.message || "Failed to fetch penalties.");
      setRows([]);
      setCount(0);
      setLoading(false);
      return;
    }

    setRows((result.data || []) as PenaltyRow[]);
    setCount(Number((result as any).count || 0));

    const fetchedSummary = (result as any).summary;
    setSummary({
      pending_count: Number(fetchedSummary?.pending_count || 0),
      settled_this_month: Number(fetchedSummary?.settled_this_month || 0),
      total_amount_pending: Number(fetchedSummary?.total_amount_pending || 0),
    });

    setLoading(false);
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchPenalties();
  }, [fetchPenalties]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSettlePenalty = async (id: number) => {
    const amountInput = window.prompt("Optional settlement amount. Leave blank to settle full remaining amount:");
    const settledAmount = amountInput && amountInput.trim() !== "" ? Number(amountInput) : undefined;

    if (amountInput && (Number.isNaN(settledAmount) || Number(settledAmount) <= 0)) {
      toast.error("Settlement amount must be a positive number.");
      return;
    }

    const result = await penaltyApi.settle(id, settledAmount ? { settled_amount: settledAmount } : undefined);

    if (!result.success) {
      toast.error(result.message || "Failed to settle penalty.");
      return;
    }

    toast.success("Penalty settled successfully.");
    setSelectedMenu(null);
    fetchPenalties();
  };

  const handleCancelPenalty = async (id: number) => {
    const reason = window.prompt("Enter cancellation reason:");
    if (!reason || !reason.trim()) {
      toast.error("Cancellation reason is required.");
      return;
    }

    const result = await penaltyApi.cancel(id, { reason: reason.trim() });

    if (!result.success) {
      toast.error(result.message || "Failed to cancel penalty.");
      return;
    }

    toast.success("Penalty cancelled successfully.");
    setSelectedMenu(null);
    fetchPenalties();
  };

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-[#3b2b1c] font-poppins">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Penalty Management</h1>
          <p className="text-sm text-gray-600">Review and manage employee disciplinary penalties.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            placeholder="Search employee, code, title or type"
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <ActionButton
            label="Add Penalty"
            onClick={() => setAddPenaltyModalOpen(true)}
            icon={Plus}
            className="py-4"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Pending Penalties</p>
          <p className="text-2xl font-bold">{summary.pending_count}</p>
        </div>
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Settled this Month</p>
          <p className="text-2xl font-bold text-green-600">{summary.settled_this_month}</p>
        </div>
        <div className="bg-[#faeddc] p-6 rounded-xl shadow-sm border border-[#e2d5c3]">
          <p className="text-sm text-gray-600">Total Amount Pending</p>
          <p className="text-2xl font-bold">₱{summary.total_amount_pending.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#3b2b1c] text-white">
              <th className="py-4 px-4 text-left">Employee</th>
              <th className="py-4 px-4 text-left">Penalty</th>
              <th className="py-4 px-4 text-left">Reason</th>
              <th className="py-4 px-4 text-right">Amount</th>
              <th className="py-4 px-4 text-center">Status</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-base">
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  No penalties found.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  Loading penalties...
                </td>
              </tr>
            )}

            {!loading && rows.map((item) => {
              const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unknown Employee";

              return (
                <tr key={item.id} className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition">
                  <td className="py-4 px-4">
                    <div className="font-medium">{fullName}</div>
                    <div className="text-xs text-gray-500">{item.employee_code || `ID-${item.employee_id}`}</div>
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.penalty_type}</div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 max-w-xs italic">{item.description}</td>
                  <td className="py-4 px-4 text-right font-semibold">
                    ₱{Number(item.amount || 0).toLocaleString()}<br />
                    <span className="text-xs text-gray-500">Remaining: ₱{Number(item.remaining_amount || 0).toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === "settled"
                          ? "bg-green-100 text-green-800"
                          : item.status === "cancelled"
                            ? "bg-gray-100 text-gray-800"
                            : item.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
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
                      <div className="absolute right-4 top-12 w-44 bg-white border border-[#e2d5c3] rounded-lg shadow-xl z-50">
                        <button
                          onClick={() => {
                            router.push(`/dashboard/penalty/viewpenalty/${item.id}`);
                          }}
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
                          onClick={() => handleCancelPenalty(item.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-50 text-red-600 text-left"
                        >
                          <XCircle size={16} /> Cancel Penalty
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded bg-[#3b2b1c] text-white disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
        onSaved={() => {
          setCurrentPage(1);
          fetchPenalties();
        }}
      />
    </div>
  );
}
