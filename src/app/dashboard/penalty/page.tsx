"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Plus, Eye, CheckCircle, XCircle, X } from "lucide-react";
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

type PenaltyDetail = {
  id: number;
  code: string;
  employee_id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  title: string;
  penalty_type: string;
  description: string;
  amount: number;
  amount_deducted: number;
  remaining_amount: number;
  status: string;
  issued_date: string;
  incident_date: string;
  payroll_deduction_mode: string;
  events: Array<{
    id: number;
    action_type: string;
    from_status?: string;
    to_status?: string;
    notes?: string;
    created_at: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  }>;
  deductions: Array<{
    id: number;
    payroll_run_id: number;
    deducted_amount: number;
    deduction_date: string;
    pay_period_start?: string;
    pay_period_end?: string;
  }>;
};

const ITEMS_PER_PAGE = 10;

export default function PenaltyTable() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [isAddPenaltyModalOpen, setAddPenaltyModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePenaltyId, setSettlePenaltyId] = useState<number | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState("");
  const [settling, setSettling] = useState(false);

  // View Detail Modal States
  const [selectedPenaltyId, setSelectedPenaltyId] = useState<number | null>(null);
  const [penaltyDetail, setPenaltyDetail] = useState<PenaltyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Fetch Penalty Detail for Modal
  useEffect(() => {
    const fetchPenaltyDetail = async () => {
      if (!selectedPenaltyId) return;

      setDetailLoading(true);
      const result = await penaltyApi.getById(selectedPenaltyId.toString());

      if (!result.success || !result.data) {
        toast.error(result.message || "Failed to fetch penalty details.");
        setSelectedPenaltyId(null);
        setDetailLoading(false);
        return;
      }

      setPenaltyDetail(result.data as PenaltyDetail);
      setDetailLoading(false);
    };

    if (selectedPenaltyId) {
      fetchPenaltyDetail();
    } else {
      setPenaltyDetail(null);
    }
  }, [selectedPenaltyId]);

  const openSettleModal = (id: number) => {
    setSettlePenaltyId(id);
    setSettleAmountInput("");
    setIsSettleModalOpen(true);
    setSelectedMenu(null);
  };

  const closeSettleModal = () => {
    setIsSettleModalOpen(false);
    setSettlePenaltyId(null);
    setSettleAmountInput("");
  };

  const handleSettlePenalty = async () => {
    if (settlePenaltyId == null) return;

    const trimmedAmount = settleAmountInput.trim();
    const settledAmount = trimmedAmount !== "" ? Number(trimmedAmount) : undefined;

    if (trimmedAmount !== "" && (Number.isNaN(settledAmount) || Number(settledAmount) <= 0)) {
      toast.error("Settlement amount must be a positive number.");
      return;
    }

    setSettling(true);
    const result = await penaltyApi.settle(
      settlePenaltyId,
      settledAmount != null ? { settled_amount: settledAmount } : undefined
    );
    setSettling(false);

    if (!result.success) {
      toast.error(result.message || "Failed to settle penalty.");
      return;
    }

    toast.success("Penalty settled successfully.");
    closeSettleModal();
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

  const closeDetailModal = () => {
    setSelectedPenaltyId(null);
    setPenaltyDetail(null);
  };

  const fullName = penaltyDetail
    ? `${penaltyDetail.first_name || ""} ${penaltyDetail.last_name || ""}`.trim() || "Unknown Employee"
    : "";

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-[#3b2b1c] font-poppins">
      {/* Header & Summary Cards - unchanged */}
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

      {/* Table - unchanged */}
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
            {/* Loading & Empty states unchanged */}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-gray-500">No penalties found.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="py-10 text-center text-gray-500">Loading penalties...</td></tr>
            )}

            {!loading && rows.map((item) => {
              const rowFullName = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unknown Employee";

              return (
                <tr key={item.id} className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition">
                  <td className="py-4 px-4">
                    <div className="font-medium">{rowFullName}</div>
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
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === "settled" ? "bg-green-100 text-green-800" :
                      item.status === "cancelled" ? "bg-gray-100 text-gray-800" :
                      item.status === "approved" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
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
                      <div className="absolute right-4 top-12 w-44 bg-white border border-[#e2d5c3] rounded-lg shadow-xl z-50">
                        <button
                          onClick={() => setSelectedPenaltyId(item.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-left"
                        >
                          <Eye size={16} /> View Details
                        </button>
                        <button
                          onClick={() => openSettleModal(item.id)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6 select-none">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                  onClick={() => setCurrentPage(num)}
                  className={`px-3 py-2 rounded text-sm transition cursor-pointer ${
                    currentPage === num
                      ? "bg-[#3b2b1c] text-white"
                      : "text-[#3b2b1c] hover:underline"
                  }`}
                >
                  {num}
                </button>
              ))}

            {/* Ellipsis if many pages */}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-1 text-[#3b2b1c]">...</span>
            )}
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40"
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

      {/* ====================== INTEGRATED PENALTY DETAIL MODAL ====================== */}
      {selectedPenaltyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e2d5c3] px-6 py-4 bg-[#faeddc]">
              <h2 className="text-xl font-semibold text-[#3b2b1c]">Penalty Details</h2>
              <button onClick={closeDetailModal} className="text-[#3b2b1c] hover:text-red-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6 space-y-6 bg-[#fff7ec] flex-1">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12 text-[#3b2b1c]">
                  Loading penalty details...
                </div>
              ) : !penaltyDetail ? (
                <div className="text-center py-12 text-red-600">Penalty not found.</div>
              ) : (
                <>
                  {/* Main Info */}
                  <div className="bg-[#faeddc] rounded-xl border border-[#e2d5c3] p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div><span className="font-semibold">Code:</span> {penaltyDetail.code}</div>
                    <div><span className="font-semibold">Employee:</span> {fullName}</div>
                    <div><span className="font-semibold">Employee Code:</span> {penaltyDetail.employee_code || penaltyDetail.employee_id}</div>
                    <div><span className="font-semibold">Title:</span> {penaltyDetail.title}</div>
                    <div><span className="font-semibold">Type:</span> {penaltyDetail.penalty_type}</div>
                    <div><span className="font-semibold">Status:</span> 
                      <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                        penaltyDetail.status.toLowerCase() === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {penaltyDetail.status.toUpperCase()}
                      </span>
                    </div>
                    <div><span className="font-semibold">Deduction Mode:</span> {penaltyDetail.payroll_deduction_mode}</div>
                    <div><span className="font-semibold">Amount:</span> ₱{Number(penaltyDetail.amount).toLocaleString()}</div>
                    <div><span className="font-semibold">Deducted:</span> ₱{Number(penaltyDetail.amount_deducted).toLocaleString()}</div>
                    <div><span className="font-semibold">Remaining:</span> ₱{Number(penaltyDetail.remaining_amount).toLocaleString()}</div>
                    <div><span className="font-semibold">Issued Date:</span> {penaltyDetail.issued_date}</div>
                    <div><span className="font-semibold">Incident Date:</span> {penaltyDetail.incident_date}</div>

                    <div className="md:col-span-2">
                      <span className="font-semibold block mb-1">Description:</span>
                      <p className="bg-white/70 p-4 rounded-lg border border-[#e2d5c3]">
                        {penaltyDetail.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  {/* Event History */}
                  <div className="bg-[#faeddc] rounded-xl border border-[#e2d5c3] p-6">
                    <h3 className="font-semibold mb-4">Event History</h3>
                    {penaltyDetail.events?.length ? (
                      <div className="space-y-3">
                        {penaltyDetail.events.map((event) => {
                          const actor = `${event.first_name || ""} ${event.last_name || ""}`.trim() || event.username || "System";
                          return (
                            <div key={event.id} className="bg-white rounded-lg p-4 border border-[#e2d5c3]">
                              <div className="flex justify-between">
                                <span className="font-medium">{event.action_type}</span>
                                <span className="text-gray-500 text-sm">{event.created_at}</span>
                              </div>
                              <div className="text-gray-700 mt-1">
                                {event.from_status || "—"} → {event.to_status || "—"} by <span className="font-medium">{actor}</span>
                              </div>
                              {event.notes && <div className="mt-2 italic text-sm text-gray-600">{event.notes}</div>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No events recorded yet.</p>
                    )}
                  </div>

                  {/* Payroll Deductions */}
                  <div className="bg-[#faeddc] rounded-xl border border-[#e2d5c3] p-6">
                    <h3 className="font-semibold mb-4">Payroll Deductions</h3>
                    {penaltyDetail.deductions?.length ? (
                      <div className="space-y-3">
                        {penaltyDetail.deductions.map((ded) => (
                          <div key={ded.id} className="bg-white rounded-lg p-4 border border-[#e2d5c3]">
                            <div className="font-medium">Payroll Run #{ded.payroll_run_id}</div>
                            <div className="text-lg font-semibold text-[#4b1f16]">
                              ₱{Number(ded.deducted_amount).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">{ded.deduction_date}</div>
                            {ded.pay_period_start && (
                              <div className="text-xs text-gray-500">
                                Period: {ded.pay_period_start} — {ded.pay_period_end}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No payroll deductions recorded yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#e2d5c3] bg-[#faeddc] px-6 py-4 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-6 py-2.5 bg-[#3b2b1c] text-white rounded-xl hover:bg-[#4b1f16] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal - unchanged */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#3b2b1c]">Confirm Settlement</h3>
            <p className="text-sm text-[#6b5344] mt-1">
              Enter an optional settlement amount. Leave blank to settle the full remaining amount.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium mb-1 text-[#3b2b1c]">Settlement Amount (Optional)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={settleAmountInput}
                onChange={(e) => setSettleAmountInput(e.target.value)}
                className="w-full rounded-md border border-[#d9c3a4] px-3 py-2 text-sm focus:outline-none"
                placeholder="Leave blank for full settlement"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button onClick={closeSettleModal} disabled={settling}
                className="px-4 py-2 text-sm rounded-md border border-[#d9c3a4] text-[#3b2b1c]">
                Cancel
              </button>
              <button onClick={handleSettlePenalty} disabled={settling}
                className="px-4 py-2 text-sm rounded-md bg-[#3b2b1c] text-white disabled:opacity-50">
                {settling ? "Settling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}