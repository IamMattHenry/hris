"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Download } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

const formatMoney = (value: number) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface PayrollContributionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PayrollContributionsModal({
  isOpen,
  onClose,
}: PayrollContributionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});

  const fetchData = async () => {
    if (!isOpen) return;

    try {
      setLoading(true);
      const response = await payrollApi.getContributions();
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch payroll contributions");
      }
      setRows(response.data?.rows || []);
      setTotals(response.data?.totals || {});
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch contribution reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOpen]);

  const totalEmployees = useMemo(
    () => new Set(rows.map((row) => row.employee_id)).size,
    [rows]
  );

  const handleExport = async (type: "sss" | "philhealth" | "pagibig" | "bir") => {
    try {
      const response = await payrollApi.exportContributions(type);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Export failed");
      }

      const { blob, filename } = response.data;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showToast.success(`${type.toUpperCase()} export downloaded`);
    } catch (error: any) {
      showToast.error(error.message || "Failed to export contribution file");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 h-screen"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`
            bg-[#FAF6F1] rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] 
            flex flex-col overflow-hidden border border-[#E8D9C4]
            animate-in fade-in zoom-in-95 duration-200
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E8D9C4] flex items-center justify-between bg-[#F3E5CF]/60">
            <div>
              <h2 className="text-xl font-bold text-[#3D1A0B]">Government Contributions</h2>
              <p className="text-sm text-[#3D1A0B]/70">
                SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF, and BIR 1601-C overview & exports
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#E8D9C4]/40 transition"
              disabled={loading}
            >
              <X className="h-5 w-5 text-[#3D1A0B]" />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
                <p className="mt-4 text-[#3D1A0B]">Loading contribution reports...</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-[#3D1A0B]/70">SSS Total</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatMoney((totals.sss_ee || 0) + (totals.sss_er || 0))}
                  </p>
                </div>
                <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-[#3D1A0B]/70">PhilHealth Total</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatMoney((totals.philhealth_ee || 0) + (totals.philhealth_er || 0))}
                  </p>
                </div>
                <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-[#3D1A0B]/70">Pag-IBIG Total</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatMoney((totals.pagibig_ee || 0) + (totals.pagibig_er || 0))}
                  </p>
                </div>
                <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-[#3D1A0B]/70">Employees</p>
                  <p className="text-2xl font-bold mt-1">{totalEmployees}</p>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  label="Export SSS R-3"
                  onClick={() => handleExport("sss")}
                  icon={Download}
                 
                />
                <ActionButton
                  label="Export PhilHealth RF-1"
                  onClick={() => handleExport("philhealth")}
                  icon={Download}
                
                />
                <ActionButton
                  label="Export Pag-IBIG MCRF"
                  onClick={() => handleExport("pagibig")}
                  icon={Download}
                  
                />
                <ActionButton
                  label="Export BIR 1601-C"
                  onClick={() => handleExport("bir")}
                  icon={Download}
                
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-[#E8D9C4] bg-white">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-[#3D1A0B] text-white">
                      <th className="py-3 px-5 text-left">Employee</th>
                      <th className="py-3 px-5 text-right">SSS (EE / ER)</th>
                      <th className="py-3 px-5 text-right">PhilHealth (EE / ER)</th>
                      <th className="py-3 px-5 text-right">Pag-IBIG (EE / ER)</th>
                      <th className="py-3 px-5 text-right">BIR Tax</th>
                      <th className="py-3 px-5 text-left">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-[#3D1A0B]/60 font-medium"
                        >
                          No contribution records available for this period.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-[#F3E5CF] hover:bg-[#FAF6F1] transition-colors"
                        >
                          <td className="py-4 px-5">
                            <p className="font-medium">
                              {row.first_name} {row.last_name}
                            </p>
                            <p className="text-xs text-[#3D1A0B]/70 mt-0.5">
                              {row.employee_code || `EMP-${row.employee_id}`}
                            </p>
                          </td>
                          <td className="py-4 px-5 text-right tabular-nums">
                            {formatMoney(row.sss_ee)} / {formatMoney(row.sss_er)}
                          </td>
                          <td className="py-4 px-5 text-right tabular-nums">
                            {formatMoney(row.philhealth_ee)} /{" "}
                            {formatMoney(row.philhealth_er)}
                          </td>
                          <td className="py-4 px-5 text-right tabular-nums">
                            {formatMoney(row.pagibig_ee)} / {formatMoney(row.pagibig_er)}
                          </td>
                          <td className="py-4 px-5 text-right tabular-nums">
                            {formatMoney(row.bir_withholding)}
                          </td>
                          <td className="py-4 px-5">
                            {row.period_start} – {row.period_end}
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
          <div className="px-6 py-4 border-t border-[#E8D9C4] bg-[#F3E5CF]/40 flex justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg border border-[#E8D9C4] hover:bg-[#FAF6F1] transition disabled:opacity-50 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}