"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Lock, Pencil, Trash2, X } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";
import PayrollPayslipModal from "./payslip/page"; // ← adjust path as needed

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

interface ViewPayrollDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  payrollId: number | null;
}

const formatMoney = (value: number) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PayrollRunDetailModal({
  isOpen,
  onClose,
  payrollId,
}: ViewPayrollDetailsProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const runId = payrollId;
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [finalizing, setFinalizing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const [overrideGross, setOverrideGross] = useState("");
  const [overrideDeductions, setOverrideDeductions] = useState("");
  const [overrideTax, setOverrideTax] = useState("");
  const [overrideNet, setOverrideNet] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  // State to control payslip modal
  const [selectedPayslip, setSelectedPayslip] = useState<{
    runId: number;
    employeeId: number;
  } | null>(null);

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const response = await payrollApi.getRunById(runId);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch payroll run");
      }
      setRun(response.data);
    } catch (error: any) {
      showToast.error(error.message || "Failed to load payroll details");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (isOpen && runId) fetchRun();
  }, [isOpen, runId, fetchRun]);

  // Escape key handling (closes innermost modal first)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isOpen) return;

      if (showOverrideModal) {
        setShowOverrideModal(false);
      } else if (showFinalizeModal) {
        setShowFinalizeModal(false);
      } else if (showDeleteModal) {
        setShowDeleteModal(false);
      } else if (selectedPayslip) {
        setSelectedPayslip(null);
      } else {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, showOverrideModal, showFinalizeModal, showDeleteModal, selectedPayslip]);

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

  const openPayslip = (record: PayrollRecord) => {
    setSelectedPayslip({
      runId: run!.id,
      employeeId: record.employee_id,
    });
  };

  const handleFinalize = async () => {
    if (!run) return;
    try {
      setFinalizing(true);
      const res = await payrollApi.finalizeRun(run.id);
      if (!res.success) throw new Error(res.message || "Failed to finalize");
      showToast.success("Payroll run finalized");
      setShowFinalizeModal(false);
      await fetchRun();
    } catch (err: any) {
      showToast.error(err.message || "Failed to finalize payroll run");
    } finally {
      setFinalizing(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!run) return;
    try {
      setDeleting(true);
      const res = await payrollApi.deleteRun(run.id);
      if (!res.success) throw new Error(res.message || "Failed to delete");
      showToast.success("Payroll run deleted");
      setShowDeleteModal(false);
      onClose();
    } catch (err: any) {
      showToast.error(err.message || "Failed to delete payroll run");
    } finally {
      setDeleting(false);
    }
  };

  const handleOverride = async () => {
    if (!run || !selectedRecord) return;
    try {
      setOverriding(true);
      const res = await payrollApi.overrideRecord(run.id, selectedRecord.employee_id, {
        gross_pay: Number(overrideGross),
        total_deductions: Number(overrideDeductions),
        withholding_tax: Number(overrideTax),
        net_pay: Number(overrideNet),
        reason: overrideReason || "Manual adjustment",
      });
      if (!res.success) throw new Error(res.message || "Override failed");
      showToast.success("Override applied successfully");
      setShowOverrideModal(false);
      await fetchRun();
    } catch (err: any) {
      showToast.error(err.message || "Failed to save override");
    } finally {
      setOverriding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              ref={modalRef}
              className="relative w-full max-w-6xl max-h-[94vh] bg-[#FAF6F1] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#3D1A0B]"
              initial={{ scale: 0.94, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D9C4]">
                <div>
                  <h2 className="text-xl font-bold">Payroll Run #{run?.id ?? "..."}</h2>
                  {run && (
                    <p className="text-sm text-[#3D1A0B]/70">
                      {run.pay_period_start} – {run.pay_period_end} • {run.pay_schedule.toUpperCase()}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[#F3E5CF] transition cursor-pointer"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main content */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
                    <p className="mt-4">Loading payroll details...</p>
                  </div>
                </div>
              ) : !run ? (
                <div className="flex-1 flex items-center justify-center text-[#3D1A0B]/70">
                  Payroll run not found.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                  {/* Summary cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    {[
                      { label: "Gross Pay", value: run.summary.gross_pay },
                      { label: "Total Deductions", value: run.summary.total_deductions },
                      { label: "Withholding Tax", value: run.summary.withholding_tax },
                      { label: "Net Pay", value: run.summary.net_pay },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4"
                      >
                        <p className="text-sm text-[#3D1A0B]/70">{item.label}</p>
                        <p className="text-xl font-bold">{formatMoney(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <SearchBar
                      placeholder="Search employee name or code..."
                      value={search}
                      onChange={setSearch}
                    />
                    <div className="text-sm text-[#3D1A0B]/70 whitespace-nowrap">
                      Employees: {run.summary.employee_count}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-[#E8D9C4] bg-white">
                    <table className="w-full text-sm min-w-[800px]">
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
                            <td colSpan={6} className="py-12 text-center text-[#3D1A0B]/60">
                              No records found.
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((record) => (
                            <tr
                              key={record.employee_id}
                              className="border-b border-[#F3E5CF] hover:bg-[#FAF6F1]"
                            >
                              <td className="py-3 px-4">
                                <p className="font-medium">
                                  {record.first_name} {record.last_name}
                                </p>
                                <p className="text-xs text-[#3D1A0B]/70">
                                  {record.employee_code || `EMP-${record.employee_id}`}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-right">{formatMoney(record.gross_pay)}</td>
                              <td className="py-3 px-4 text-right">{formatMoney(record.total_deductions)}</td>
                              <td className="py-3 px-4 text-right">{formatMoney(record.withholding_tax)}</td>
                              <td className="py-3 px-4 text-right font-semibold">{formatMoney(record.net_pay)}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex gap-2 flex-wrap justify-center">
                                  <button
                                    onClick={() => openPayslip(record)}
                                    className="px-3 py-1.5 rounded-lg cursor-pointer bg-[#3D1A0B] text-white hover:opacity-90 transition inline-flex items-center gap-1 text-sm"
                                  >
                                    <Eye size={14} /> Payslip
                                  </button>

                                  {run.status === "draft" && (
                                    <button
                                      onClick={() => openOverrideModal(record)}
                                      className="px-3 py-1.5 rounded-lg cursor-pointer bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition inline-flex items-center gap-1 text-sm"
                                    >
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
                </div>
              )}

              {/* Footer */}
              {run && !loading && (
                <div className="px-6 py-4 border-t border-[#E8D9C4] flex flex-wrap gap-3 justify-end bg-[#F3E5CF]/40">
                  {run.status === "draft" ? (
                    <>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-5 py-2 rounded-lg bg-red-100 text-red-700 border border-red-300 hover:opacity-90 transition inline-flex items-center gap-2"
                        disabled={deleting || finalizing}
                      >
                        <Trash2 size={16} />
                        {deleting ? "Deleting..." : "Delete Run"}
                      </button>

                      <ActionButton
                        label={finalizing ? "Finalizing..." : "Finalize Run"}
                        onClick={() => setShowFinalizeModal(true)}
                        icon={Lock}
                        disabled={finalizing || deleting}
                      />
                    </>
                  ) : (
                    <span className="px-5 py-2 rounded-lg bg-green-100 text-green-800 border border-green-300 font-semibold">
                      FINALIZED
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nested Modals */}
      <AnimatePresence>
        {showDeleteModal && run?.status === "draft" && (
          <ConfirmationModal
            title="Delete Payroll Run"
            message="This will permanently delete this payroll run and all associated records. This action cannot be undone."
            confirmText="Delete Run"
            confirmColor="bg-red-700"
            isLoading={deleting}
            onConfirm={handleDeleteRun}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}

        {showFinalizeModal && (
          <ConfirmationModal
            title="Finalize Payroll Run"
            message="Finalizing this run will lock all records and make them immutable for audit compliance."
            confirmText="Confirm Finalize"
            confirmColor="bg-[#3D1A0B]"
            isLoading={finalizing}
            onConfirm={handleFinalize}
            onCancel={() => setShowFinalizeModal(false)}
          />
        )}

        {showOverrideModal && selectedRecord && (
          <OverrideModal
            record={selectedRecord}
            overrideGross={overrideGross}
            setOverrideGross={setOverrideGross}
            overrideDeductions={overrideDeductions}
            setOverrideDeductions={setOverrideDeductions}
            overrideTax={overrideTax}
            setOverrideTax={setOverrideTax}
            overrideNet={overrideNet}
            setOverrideNet={setOverrideNet}
            overrideReason={overrideReason}
            setOverrideReason={setOverrideReason}
            onSave={handleOverride}
            onCancel={() => setShowOverrideModal(false)}
            isSaving={overriding}
          />
        )}

        {selectedPayslip && (
          <PayrollPayslipModal
            isOpen={!!selectedPayslip}
            onClose={() => setSelectedPayslip(null)}
            runId={selectedPayslip.runId}
            employeeId={selectedPayslip.employeeId}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ────────────────────────────────────────────────
// ConfirmationModal & OverrideModal components
// (same as you had – just making sure they're included)
// ────────────────────────────────────────────────

function ConfirmationModal({
  title,
  message,
  confirmText,
  confirmColor,
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md bg-white rounded-xl p-6 space-y-5 shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3 className="text-xl font-bold text-[#3D1A0B]">{title}</h3>
        <p className="text-sm text-[#3D1A0B]/70">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 border border-[#E8D9C4] rounded-lg hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-white rounded-lg ${confirmColor} hover:opacity-90 disabled:opacity-60 transition`}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OverrideModal({
  record,
  overrideGross,
  setOverrideGross,
  overrideDeductions,
  setOverrideDeductions,
  overrideTax,
  setOverrideTax,
  overrideNet,
  setOverrideNet,
  overrideReason,
  setOverrideReason,
  onSave,
  onCancel,
  isSaving,
}: {
  record: PayrollRecord;
  overrideGross: string;
  setOverrideGross: (v: string) => void;
  overrideDeductions: string;
  setOverrideDeductions: (v: string) => void;
  overrideTax: string;
  setOverrideTax: (v: string) => void;
  overrideNet: string;
  setOverrideNet: (v: string) => void;
  overrideReason: string;
  setOverrideReason: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl bg-white rounded-xl p-6 space-y-5 shadow-xl text-[#3D1A0B]"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">
            Manual Override – {record.first_name} {record.last_name}
          </h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600">All overrides are logged in the audit trail.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: "Gross Pay", value: overrideGross, setter: setOverrideGross },
            { label: "Total Deductions", value: overrideDeductions, setter: setOverrideDeductions },
            { label: "Withholding Tax", value: overrideTax, setter: setOverrideTax },
            { label: "Net Pay", value: overrideNet, setter: setOverrideNet },
          ].map(({ label, value, setter }) => (
            <label key={label} className="space-y-1.5">
              <span className="text-sm block font-medium">{label}</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30"
              />
            </label>
          ))}
        </div>

        <label className="space-y-1.5 block">
          <span className="text-sm block font-medium">Reason for Override</span>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={3}
            placeholder="Please explain why this adjustment is necessary..."
            className="w-full border border-[#E8D9C4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-[#E8D9C4] rounded-lg hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-[#3D1A0B] text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Override"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}