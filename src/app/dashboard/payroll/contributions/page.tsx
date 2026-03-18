"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

const formatMoney = (value: number) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayrollContributionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getContributions();
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch payroll contributions");
      }
      setRows(response.data?.rows || []);
      setTotals(response.data?.totals || {});
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch payroll contributions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalEmployees = useMemo(() => new Set(rows.map((row) => row.employee_id)).size, [rows]);

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

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading contribution reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 text-[#3D1A0B] font-poppins">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Government Contributions</h1>
          <p className="text-sm text-[#3D1A0B]/70">SSS R-3, PhilHealth RF-1, Pag-IBIG MCRF, and BIR 1601-C exports</p>
        </div>
        <Link href="/dashboard/payroll" className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
          Back to Payroll
        </Link>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">SSS Total</p>
          <p className="text-xl font-bold">{formatMoney((totals.sss_ee || 0) + (totals.sss_er || 0))}</p>
        </div>
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">PhilHealth Total</p>
          <p className="text-xl font-bold">{formatMoney((totals.philhealth_ee || 0) + (totals.philhealth_er || 0))}</p>
        </div>
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">Pag-IBIG Total</p>
          <p className="text-xl font-bold">{formatMoney((totals.pagibig_ee || 0) + (totals.pagibig_er || 0))}</p>
        </div>
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4">
          <p className="text-sm text-[#3D1A0B]/70">Employees</p>
          <p className="text-xl font-bold">{totalEmployees}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton label="Export SSS R-3" onClick={() => handleExport("sss")} icon={Download} />
        <ActionButton label="Export PhilHealth RF-1" onClick={() => handleExport("philhealth")} icon={Download} />
        <ActionButton label="Export Pag-IBIG MCRF" onClick={() => handleExport("pagibig")} icon={Download} />
        <ActionButton label="Export BIR 1601-C" onClick={() => handleExport("bir")} icon={Download} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E8D9C4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#3D1A0B] text-white">
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-right">SSS (EE/ER)</th>
              <th className="py-3 px-4 text-right">PhilHealth (EE/ER)</th>
              <th className="py-3 px-4 text-right">Pag-IBIG (EE/ER)</th>
              <th className="py-3 px-4 text-right">BIR Tax</th>
              <th className="py-3 px-4 text-left">Period</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#3D1A0B]/70">No contribution records available.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[#F3E5CF] hover:bg-[#FAF6F1]">
                  <td className="py-3 px-4">
                    <p className="font-medium">{row.first_name} {row.last_name}</p>
                    <p className="text-xs text-[#3D1A0B]/70">{row.employee_code || `EMP-${row.employee_id}`}</p>
                  </td>
                  <td className="py-3 px-4 text-right">{formatMoney(row.sss_ee)} / {formatMoney(row.sss_er)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(row.philhealth_ee)} / {formatMoney(row.philhealth_er)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(row.pagibig_ee)} / {formatMoney(row.pagibig_er)}</td>
                  <td className="py-3 px-4 text-right">{formatMoney(row.bir_withholding)}</td>
                  <td className="py-3 px-4">{row.period_start} to {row.period_end}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
