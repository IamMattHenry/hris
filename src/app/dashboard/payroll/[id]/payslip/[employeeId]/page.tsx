"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

const formatMoney = (value: number) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayrollPayslipPage() {
  const params = useParams<{ id: string; employeeId: string }>();
  const runId = params?.id;
  const employeeId = params?.employeeId;

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<any>(null);

  const fetchPayslip = useCallback(async () => {
    if (!runId || !employeeId) return;

    try {
      setLoading(true);
      const response = await payrollApi.getPayslip(runId, employeeId);
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch payslip");
      }
      setPayload(response.data);
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch payslip");
    } finally {
      setLoading(false);
    }
  }, [runId, employeeId]);

  useEffect(() => {
    fetchPayslip();
  }, [fetchPayslip]);

  const content = useMemo(() => {
    if (!payload) return null;

    const record = payload.record || {};
    const payslip = record.payslip_data || {};
    const earnings = payslip.earnings || {};
    const deductions = payslip.deductions || {};

    return {
      run: payload.run,
      record,
      payslip,
      earnings,
      deductions,
    };
  }, [payload]);

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading payslip...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return <div className="p-6 bg-[#FAF6F1] rounded-xl text-[#3D1A0B]">Payslip not found.</div>;
  }

  const mandatory = content.deductions?.mandatoryContributions || {};
  const withholding = content.deductions?.withholding || {};

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 text-[#3D1A0B] font-poppins">
      <div className="flex justify-between items-center gap-2 print:hidden">
        <Link href={`/dashboard/payroll/${runId}`} className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
          Back to Run Detail
        </Link>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-[#3D1A0B] text-white inline-flex items-center gap-2">
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      <div className="bg-white border border-[#E8D9C4] rounded-xl p-6 space-y-6 print:border-none print:shadow-none">
        <div className="text-center border-b border-[#E8D9C4] pb-4">
          <h1 className="text-2xl font-bold">{content.payslip.company_name || "HRIS Company"}</h1>
          <p className="text-sm text-[#3D1A0B]/70">Payroll Payslip</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Employee:</span> {content.record.employee_name}</p>
            <p><span className="font-semibold">Employee Code:</span> {content.record.employee_code || `EMP-${content.record.employee_id}`}</p>
            <p><span className="font-semibold">Pay Schedule:</span> {content.run.pay_schedule?.toUpperCase()}</p>
          </div>
          <div>
            <p><span className="font-semibold">Pay Period:</span> {content.run.pay_period_start} to {content.run.pay_period_end}</p>
            <p><span className="font-semibold">Run ID:</span> #{content.run.id}</p>
            <p><span className="font-semibold">Status:</span> {content.run.status?.toUpperCase()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-[#E8D9C4] rounded-lg overflow-hidden">
            <div className="bg-[#F3E5CF] px-4 py-2 font-semibold">Earnings</div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Basic Pay</span><span>{formatMoney(content.earnings.basePayForPeriod)}</span></div>
              <div className="flex justify-between"><span>Holiday Premium Pay</span><span>{formatMoney(content.earnings.holidayPremiumPay)}</span></div>
              <div className="flex justify-between"><span>Rest Day Pay</span><span>{formatMoney(content.earnings.restDayPay)}</span></div>
              <div className="flex justify-between"><span>Overtime Pay</span><span>{formatMoney(content.earnings.overtimePay)}</span></div>
              <div className="flex justify-between"><span>Night Differential</span><span>{formatMoney(content.earnings.nightDifferentialPay)}</span></div>
              <div className="flex justify-between"><span>Allowances</span><span>{formatMoney(content.earnings.allowances?.grossAllowances)}</span></div>
              <div className="flex justify-between"><span>13th Month Accrual</span><span>{formatMoney(content.earnings.thirteenthMonthAccrual)}</span></div>
              <div className="border-t border-[#E8D9C4] pt-2 flex justify-between font-bold"><span>Gross Pay</span><span>{formatMoney(content.record.gross_pay)}</span></div>
            </div>
          </div>

          <div className="border border-[#E8D9C4] rounded-lg overflow-hidden">
            <div className="bg-[#F3E5CF] px-4 py-2 font-semibold">Deductions</div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>SSS (EE)</span><span>{formatMoney(mandatory.sss?.employeeShare)}</span></div>
              <div className="flex justify-between"><span>PhilHealth (EE)</span><span>{formatMoney(mandatory.philHealth?.employeeShare)}</span></div>
              <div className="flex justify-between"><span>Pag-IBIG (EE)</span><span>{formatMoney(mandatory.pagIbig?.employeeShare)}</span></div>
              <div className="flex justify-between"><span>Late / Undertime</span><span>{formatMoney(content.deductions.lateUndertimeDeduction)}</span></div>
              <div className="flex justify-between"><span>LWOP</span><span>{formatMoney(content.deductions.lwopDeduction)}</span></div>
              <div className="flex justify-between"><span>Withholding Tax</span><span>{formatMoney(withholding.withholdingTax)}</span></div>
              <div className="border-t border-[#E8D9C4] pt-2 flex justify-between font-bold"><span>Total Deductions</span><span>{formatMoney(content.record.total_deductions)}</span></div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm border-t border-[#E8D9C4] pt-4">
          <div>
            <p className="font-semibold mb-2">Government Contributions (Employer Share)</p>
            <p>SSS (ER): {formatMoney(mandatory.sss?.employerShare)}</p>
            <p>PhilHealth (ER): {formatMoney(mandatory.philHealth?.employerShare)}</p>
            <p>Pag-IBIG (ER): {formatMoney(mandatory.pagIbig?.employerShare)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">NET PAY</p>
            <p className="text-3xl font-bold">{formatMoney(content.record.net_pay)}</p>
          </div>
        </div>

        <div className="pt-8 grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold">Notes</p>
            <p className="text-[#3D1A0B]/70">Tax bracket: {withholding.bracketDescription || "N/A"}</p>
            <p className="text-[#3D1A0B]/70">LWOP Days: {content.payslip.lwop_days || 0}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Employee Signature</p>
            <div className="mt-10 border-t border-[#3D1A0B] w-64 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
