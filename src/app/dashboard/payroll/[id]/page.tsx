"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Lock, Pencil, Trash2 } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

interface PayrollRecord {
  employee_id: number;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  gross_pay: number;
  total_deductions: number;
  withholding_tax: number;
  net_pay: number;
  json_breakdown?: any;
}

interface PayrollRunDetail {
  id: number;
  pay_period_start: string;
  pay_period_end: string;
  pay_schedule: string;
  status: "draft" | "finalized";
  summary: {
    gross_pay: number;
    total_deductions: number;
    withholding_tax: number;
    net_pay: number;
    employee_count: number;
  };
  records: PayrollRecord[];
}

const formatMoney = (value: number) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayrollRunDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const runId = params?.id;

  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [overrideGross, setOverrideGross] = useState("");
  const [overrideDeductions, setOverrideDeductions] = useState("");
  const [overrideTax, setOverrideTax] = useState("");
  const [overrideNet, setOverrideNet] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const fetchRun = useCallback(async () => {
    if (!runId) return;

    try {
      setLoading(true);
      const response = await payrollApi.getRunById(runId);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch payroll run detail");
      }
      setRun(response.data);
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch payroll run detail");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const filteredRecords = useMemo(() => {
    if (!run) return [];
    const q = search.toLowerCase();
    return run.records.filter((row) => {
      const name = `${row.first_name || ""} ${row.last_name || ""}`.toLowerCase();
      const code = String(row.employee_code || "").toLowerCase();
      return name.includes(q) || code.includes(q) || String(row.employee_id).includes(q);
    });
  }, [run, search]);

  const openOverrideModal = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setOverrideGross(String(record.gross_pay || 0));
    setOverrideDeductions(String(record.total_deductions || 0));
    setOverrideTax(String(record.withholding_tax || 0));
    setOverrideNet(String(record.net_pay || 0));
    setOverrideReason("");
    setShowOverrideModal(true);
  };

  const handleFinalize = async () => {
    if (!run) return;

    try {
      setFinalizing(true);
      const response = await payrollApi.finalizeRun(run.id);
      if (!response.success) {
        throw new Error(response.message || "Failed to finalize payroll run");
      }
      showToast.success("Payroll run finalized successfully");
      setShowFinalizeModal(false);
      await fetchRun();
    } catch (error: any) {
      showToast.error(error.message || "Failed to finalize payroll run");
    } finally {
      setFinalizing(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!run) return;

    try {
      setDeleting(true);
      const response = await payrollApi.deleteRun(run.id);
      if (!response.success) {
        throw new Error(response.message || "Failed to delete payroll run");
      }

      showToast.success("Payroll run deleted successfully");
      setShowDeleteModal(false);
      router.push("/dashboard/payroll");
    } catch (error: any) {
      showToast.error(error.message || "Failed to delete payroll run");
    } finally {
      setDeleting(false);
    }
  };

  const handleOverride = async () => {
    if (!run || !selectedRecord) return;

    try {
      setOverriding(true);
      const response = await payrollApi.overrideRecord(run.id, selectedRecord.employee_id, {
        gross_pay: Number(overrideGross),
        total_deductions: Number(overrideDeductions),
        withholding_tax: Number(overrideTax),
        net_pay: Number(overrideNet),
        reason: overrideReason || "Manual adjustment before finalization",
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to apply override");
      }

      showToast.success("Payroll record override saved");
      setShowOverrideModal(false);
      await fetchRun();
    } catch (error: any) {
      showToast.error(error.message || "Failed to apply override");
    } finally {
      setOverriding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading payroll run detail...</p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl text-[#3D1A0B]">
        Payroll run not found.
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 text-[#3D1A0B] font-poppins relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Run #{run.id}</h1>
          <p className="text-sm text-[#3D1A0B]/70">{run.pay_period_start} to {run.pay_period_end} • {run.pay_schedule.toUpperCase()}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/payroll" className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
            Back
          </Link>
          {run.status === "draft" ? (
            <>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:opacity-90 transition inline-flex items-center gap-2"
                disabled={deleting || finalizing}
              >
                <Trash2 size={16} /> {deleting ? "Deleting..." : "Cancel / Delete Run"}
              </button>
              <ActionButton label={finalizing ? "Finalizing..." : "Finalize Run"} onClick={() => setShowFinalizeModal(true)} icon={Lock} disabled={finalizing || deleting} />
            </>
          ) : (
            <span className="px-4 py-2 rounded-lg bg-green-100 text-green-800 border border-green-300 font-semibold">FINALIZED</span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">Gross Pay</p>
          <p className="text-xl font-bold">{formatMoney(run.summary.gross_pay)}</p>
        </div>
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">Total Deductions</p>
          <p className="text-xl font-bold">{formatMoney(run.summary.total_deductions)}</p>
        </div>
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">Withholding Tax</p>
          <p className="text-xl font-bold">{formatMoney(run.summary.withholding_tax)}</p>
        </div>
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">Net Pay</p>
          <p className="text-xl font-bold">{formatMoney(run.summary.net_pay)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchBar placeholder="Search employee" value={search} onChange={setSearch} />
        <div className="text-sm text-[#3D1A0B]/70">Employees: {run.summary.employee_count}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E8D9C4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#3D1A0B] text-white">
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-right">Gross</th>
              <th className="py-3 px-4 text-right">Deductions</th>
              <th className="py-3 px-4 text-right">Tax</th>
              <th className="py-3 px-4 text-right">Net</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#3D1A0B]/70">No payroll records found.</td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.employee_id} className="border-b border-[#F3E5CF] hover:bg-[#FAF6F1]">
                  <td className="py-3 px-4">
                    <p className="font-medium">{record.first_name} {record.last_name}</p>
                    <p className="text-xs text-[#3D1A0B]/70">{record.employee_code || `EMP-${record.employee_id}`}</p>
                  </td>
                  <td className="py-3 px-4 text-right">{formatMoney(record.gross_pay)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(record.total_deductions)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(record.withholding_tax)}</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatMoney(record.net_pay)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex gap-2">
                      <Link href={`/dashboard/payroll/${run.id}/payslip/${record.employee_id}`}>
                        <button className="px-3 py-2 rounded-lg bg-[#3D1A0B] text-white hover:opacity-90 transition inline-flex items-center gap-1">
                          <Eye size={14} /> Payslip
                        </button>
                      </Link>
                      {run.status === "draft" && (
                        <button onClick={() => openOverrideModal(record)} className="px-3 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition inline-flex items-center gap-1">
                          <Pencil size={14} /> Override
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showDeleteModal && run.status === "draft" && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-lg bg-white rounded-xl p-6 space-y-4 text-[#3D1A0B]" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h2 className="text-xl font-bold">Cancel / Delete Payroll Run</h2>
              <p className="text-sm text-[#3D1A0B]/70">
                This will permanently delete payroll run #{run.id} and all its records/contributions. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg border border-[#E8D9C4]" disabled={deleting}>Keep Run</button>
                <button onClick={handleDeleteRun} className="px-4 py-2 rounded-lg bg-red-700 text-white" disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Run"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFinalizeModal && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-lg bg-white rounded-xl p-6 space-y-4 text-[#3D1A0B]" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h2 className="text-xl font-bold">Finalize Payroll Run</h2>
              <p className="text-sm text-[#3D1A0B]/70">
                Finalizing will lock this payroll run and make all records immutable for audit compliance.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowFinalizeModal(false)} className="px-4 py-2 rounded-lg border border-[#E8D9C4]">Cancel</button>
                <button onClick={handleFinalize} className="px-4 py-2 rounded-lg bg-[#3D1A0B] text-white" disabled={finalizing}>
                  {finalizing ? "Finalizing..." : "Confirm Finalize"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOverrideModal && selectedRecord && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-2xl bg-white rounded-xl p-6 space-y-4 text-[#3D1A0B]" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h2 className="text-xl font-bold">Manual Payroll Override</h2>
              <p className="text-sm text-[#3D1A0B]/70">All changes are logged in the payroll override audit trail.</p>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm">Gross Pay</span>
                  <input type="number" value={overrideGross} onChange={(e) => setOverrideGross(e.target.value)} className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm">Total Deductions</span>
                  <input type="number" value={overrideDeductions} onChange={(e) => setOverrideDeductions(e.target.value)} className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm">Withholding Tax</span>
                  <input type="number" value={overrideTax} onChange={(e) => setOverrideTax(e.target.value)} className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm">Net Pay</span>
                  <input type="number" value={overrideNet} onChange={(e) => setOverrideNet(e.target.value)} className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2" />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm">Override Reason</span>
                <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={3} className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2" placeholder="Explain why this override is needed" />
              </label>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 rounded-lg border border-[#E8D9C4]">Cancel</button>
                <button onClick={handleOverride} className="px-4 py-2 rounded-lg bg-[#3D1A0B] text-white" disabled={overriding}>
                  {overriding ? "Saving..." : "Save Override"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
