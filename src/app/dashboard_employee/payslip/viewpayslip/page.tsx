"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Printer, X } from "lucide-react";

const formatMoney = (value: number) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface PayrollPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string | number | null;
  employeeId: string | number | null;
}

const mockPayslipDetail = {
  run: {
    id: 202503,
    pay_period_start: "2025-03-01",
    pay_period_end: "2025-03-15",
    pay_schedule: "semi-monthly",
    status: "completed",
  },
  record: {
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    employee_id: 14567,
    gross_pay: 28500,
    total_deductions: 4850,
    net_pay: 23650,
  },
  payslip: {
    company_name: "TechNova Solutions Inc.",
    lwop_days: 0,
  },
  earnings: {
    basePayForPeriod: 25000,
    holidayPremiumPay: 1200,
    restDayPay: 800,
    overtimePay: 950,
    nightDifferentialPay: 450,
    allowances: { grossAllowances: 1100 },
    thirteenthMonthAccrual: 0,
  },
  deductions: {
    mandatoryContributions: {
      sss: { employeeShare: 1200, employerShare: 1400 },
      philHealth: { employeeShare: 450, employerShare: 450 },
      pagIbig: { employeeShare: 200, employerShare: 200 },
    },
    lateUndertimeDeduction: 150,
    lwopDeduction: 0,
    withholding: {
      withholdingTax: 1850,
      bracketDescription: "Tax Bracket 3 (20%)",
    },
  },
};

export default function PayrollPayslipModal({
  isOpen,
  onClose,
  runId,
  employeeId,
}: PayrollPayslipModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  // Simulate fetching payslip (using mock data)
  const fetchPayslipDetails = useCallback(async () => {
    if (!runId) return;
    setPayslipLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPayload(mockPayslipDetail);
    setPayslipLoading(false);
  }, [runId]);

  useEffect(() => {
    if (isOpen && runId) {
      fetchPayslipDetails();
    }
  }, [isOpen, runId, fetchPayslipDetails]);

  // Print styles
  useEffect(() => {
    if (!isOpen) return;
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        @page { size: A5 portrait; margin: 10mm 8mm; }
        body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        *::-webkit-scrollbar { display: none !important; }
        .print-modal-outer { overflow: hidden !important; padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
        .payslip-content {
          width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important;
          border: none !important; border-radius: 0 !important; box-shadow: none !important;
          background: white !important; font-size: 9.8pt !important; line-height: 1.35 !important;
        }
        .modal-header { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const content = useMemo(() => {
    if (!payload) return null;
    const record = payload.record || {};
    const payslip = payload.payslip || {};
    const earnings = payload.earnings || {};
    const deductions = payload.deductions || {};
    return { run: payload.run, record, payslip, earnings, deductions };
  }, [payload]);

  const formatMoneyLocal = formatMoney; // Reuse the same formatter

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF6F1] print:bg-white print-modal-outer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            className="relative w-full max-w-3xl bg-[#FAF6F1] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#3D1A0B] print:bg-white print:max-w-none print:rounded-none print:shadow-none print:overflow-visible"
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header flex items-center justify-between px-5 py-3 border-b border-[#E8D9C4] bg-white/90 backdrop-blur-sm print:hidden">
              <h2 className="text-lg font-bold">Payslip Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 rounded-lg bg-[#3D1A0B] text-white inline-flex items-center gap-2 text-sm hover:opacity-90 transition"
                >
                  <Printer size={16} /> Print / Save as PDF
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[#F3E5CF] transition"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Payslip Content */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 print:overflow-visible print:p-0">
              {payslipLoading ? (
                <div className="flex items-center justify-center min-h-[50vh] print:hidden">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3D1A0B] mx-auto"></div>
                    <p className="mt-3 text-[#3D1A0B]">Loading payslip...</p>
                  </div>
                </div>
              ) : !content ? (
                <div className="text-center py-12 text-[#3D1A0B]/70 print:hidden">
                  Payslip not found.
                </div>
              ) : (
                <div className="payslip-content bg-white border border-[#E8D9C4] rounded-xl p-5 md:p-6 space-y-5 print:border-0 print:p-0 print:rounded-none">
                  {/* Header */}
                  <div className="text-center border-b border-gray-300 pb-4">
                    <h1 className="text-xl font-bold">
                      {content.payslip.company_name || "Company Name"}
                    </h1>
                    <p className="text-xs text-gray-600 mt-1">Payroll Payslip</p>
                  </div>

                  {/* Employee & Period Info */}
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p><span className="font-semibold">Employee:</span> {content.record.employee_name}</p>
                      <p><span className="font-semibold">Employee Code:</span> {content.record.employee_code || `EMP-${content.record.employee_id}`}</p>
                      <p><span className="font-semibold">Pay Schedule:</span> {content.run.pay_schedule?.toUpperCase()}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-semibold">Pay Period:</span> {content.run.pay_period_start} – {content.run.pay_period_end}</p>
                      <p><span className="font-semibold">Run ID:</span> #{content.run.id}</p>
                      <p><span className="font-semibold">Status:</span> {content.run.status?.toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Earnings & Deductions */}
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 font-semibold text-sm">Earnings</div>
                      <div className="p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span>Basic Pay</span><span>{formatMoneyLocal(content.earnings.basePayForPeriod)}</span></div>
                        <div className="flex justify-between"><span>Holiday Premium</span><span>{formatMoneyLocal(content.earnings.holidayPremiumPay)}</span></div>
                        <div className="flex justify-between"><span>Rest Day Pay</span><span>{formatMoneyLocal(content.earnings.restDayPay)}</span></div>
                        <div className="flex justify-between"><span>Overtime Pay</span><span>{formatMoneyLocal(content.earnings.overtimePay)}</span></div>
                        <div className="flex justify-between"><span>Night Differential</span><span>{formatMoneyLocal(content.earnings.nightDifferentialPay)}</span></div>
                        <div className="flex justify-between"><span>Allowances</span><span>{formatMoneyLocal(content.earnings.allowances?.grossAllowances)}</span></div>
                        <div className="flex justify-between"><span>13th Month Accrual</span><span>{formatMoneyLocal(content.earnings.thirteenthMonthAccrual)}</span></div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                          <span>Gross Pay</span>
                          <span>{formatMoneyLocal(content.record.gross_pay)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 font-semibold text-sm">Deductions</div>
                      <div className="p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span>SSS (EE)</span><span>{formatMoneyLocal(content.deductions.mandatoryContributions?.sss?.employeeShare)}</span></div>
                        <div className="flex justify-between"><span>PhilHealth (EE)</span><span>{formatMoneyLocal(content.deductions.mandatoryContributions?.philHealth?.employeeShare)}</span></div>
                        <div className="flex justify-between"><span>Pag-IBIG (EE)</span><span>{formatMoneyLocal(content.deductions.mandatoryContributions?.pagIbig?.employeeShare)}</span></div>
                        <div className="flex justify-between"><span>Late / Undertime</span><span>{formatMoneyLocal(content.deductions.lateUndertimeDeduction)}</span></div>
                        <div className="flex justify-between"><span>LWOP</span><span>{formatMoneyLocal(content.deductions.lwopDeduction)}</span></div>
                        <div className="flex justify-between"><span>Withholding Tax</span><span>{formatMoneyLocal(content.deductions.withholding?.withholdingTax)}</span></div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                          <span>Total Deductions</span>
                          <span>{formatMoneyLocal(content.record.total_deductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Pay & Employer Contributions */}
                  <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-gray-300">
                    <div className="space-y-1.5 text-xs">
                      <p className="font-semibold">Employer Contributions</p>
                      <p>SSS (ER): {formatMoneyLocal(content.deductions.mandatoryContributions?.sss?.employerShare)}</p>
                      <p>PhilHealth (ER): {formatMoneyLocal(content.deductions.mandatoryContributions?.philHealth?.employerShare)}</p>
                      <p>Pag-IBIG (ER): {formatMoneyLocal(content.deductions.mandatoryContributions?.pagIbig?.employerShare)}</p>
                    </div>
                    <div className="flex flex-col items-end justify-end">
                      <p className="font-semibold text-base">NET PAY</p>
                      <p className="text-3xl font-bold text-[#3D1A0B]">
                        {formatMoneyLocal(content.record.net_pay)}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-6 grid md:grid-cols-2 gap-5 text-xs">
                    <div>
                      <p className="font-semibold mb-1">Notes</p>
                      <p className="text-gray-700">Tax bracket: {content.deductions.withholding?.bracketDescription || "N/A"}</p>
                      <p className="text-gray-700">LWOP Days: {content.payslip.lwop_days || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Employee Signature</p>
                      <div className="mt-8 border-t border-black w-56 ml-auto"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}