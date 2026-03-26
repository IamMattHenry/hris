"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Printer, X, Download, Eye, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import PayrollPayslipModalProps from "./viewpayslip/page";


const formatMoney = (value: number) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Mock Data - Single Employee Payslips (for Employee Portal)
const mockPayslips = [
  {
    id: 101,
    run_id: 202503,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2025-03-01",
    pay_period_end: "2025-03-15",
    gross_pay: 28500,
    total_deductions: 4850,
    net_pay: 23650,
    status: "completed",
    created_at: "2025-03-20",
  },
  {
    id: 98,
    run_id: 202502,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2025-02-01",
    pay_period_end: "2025-02-15",
    gross_pay: 27800,
    total_deductions: 4720,
    net_pay: 23080,
    status: "completed",
    created_at: "2025-02-18",
  },
  {
    id: 95,
    run_id: 202501,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2025-01-01",
    pay_period_end: "2025-01-15",
    gross_pay: 27500,
    total_deductions: 4650,
    net_pay: 22850,
    status: "completed",
    created_at: "2025-01-20",
  },
  {
    id: 92,
    run_id: 202412,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2024-12-01",
    pay_period_end: "2024-12-15",
    gross_pay: 27200,
    total_deductions: 4580,
    net_pay: 22620,
    status: "completed",
    created_at: "2024-12-18",
  },
  {
    id: 89,
    run_id: 202411,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2024-11-01",
    pay_period_end: "2024-11-15",
    gross_pay: 27000,
    total_deductions: 4520,
    net_pay: 22480,
    status: "completed",
    created_at: "2024-11-20",
  },
  // ==================== NEW 3 RECORDS ADDED ====================
  {
    id: 86,
    run_id: 202410,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2024-10-01",
    pay_period_end: "2024-10-15",
    gross_pay: 26800,
    total_deductions: 4480,
    net_pay: 22320,
    status: "completed",
    created_at: "2024-10-18",
  },
  {
    id: 83,
    run_id: 202409,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2024-09-01",
    pay_period_end: "2024-09-15",
    gross_pay: 26500,
    total_deductions: 4420,
    net_pay: 22080,
    status: "completed",
    created_at: "2024-09-20",
  },
  {
    id: 80,
    run_id: 202408,
    employee_id: 14567,
    employee_name: "Juan Dela Cruz",
    employee_code: "EMP-14567",
    pay_period_start: "2024-08-01",
    pay_period_end: "2024-08-15",
    gross_pay: 26200,
    total_deductions: 4350,
    net_pay: 21850,
    status: "completed",
    created_at: "2024-08-18",
  },
];

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
export default function EmployeePayslipsPage() {
  const [payslips] = useState(mockPayslips);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | number | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 5;

  // Calculate pagination
  const totalPages = Math.ceil(payslips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPayslips = payslips.slice(startIndex, startIndex + itemsPerPage);

  // Simulate fetching payslip details with mock data
  const fetchPayslipDetails = useCallback(async () => {
    if (!selectedRunId) return;
    setPayslipLoading(true);
    
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPayload(mockPayslipDetail);
    setPayslipLoading(false);
  }, [selectedRunId]);

  useEffect(() => {
    if (modalOpen && selectedRunId) {
      fetchPayslipDetails();
    }
  }, [modalOpen, selectedRunId, fetchPayslipDetails]);

  // Print styles
  useEffect(() => {
    if (!modalOpen) return;
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
  }, [modalOpen]);

  const handleViewPayslip = (runId: number, employeeId: number) => {
    setSelectedRunId(runId);
    setSelectedEmployeeId(employeeId);
    setModalOpen(true);
    setPayload(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRunId(null);
    setSelectedEmployeeId(null);
    setPayload(null);
  };

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

  const formatDateRange = (start: string, end: string) => {
    return `${new Date(start).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} - ${new Date(end).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F1] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#3D1A0B]">My Payslips</h1>
          <p className="text-[#3D1A0B]/70 mt-1">View and download your payroll payslips</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E8D9C4] overflow-hidden">
          <div className="divide-y divide-[#E8D9C4]">
            {currentPayslips.length === 0 ? (
              <div className="text-center py-20 text-[#3D1A0B]/60">
                <Calendar className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">No payslips available yet</p>
              </div>
            ) : (
              currentPayslips.map((slip) => (
                <div
                  key={slip.id}
                  className="p-6 hover:bg-[#FAF6F1] transition-colors flex flex-col md:flex-row md:items-center gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#3D1A0B] text-white text-xs font-mono px-3 py-1 rounded">
                        #{slip.run_id}
                      </div>
                      <p className="font-semibold text-[#3D1A0B]">
                        {formatDateRange(slip.pay_period_start, slip.pay_period_end)}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-10 text-sm">
                      <p className="text-[#3D1A0B]/80">
                        Gross: <span className="font-medium">₱{slip.gross_pay.toLocaleString()}</span>
                      </p>
                      <p className="text-[#3D1A0B]/80">
                        Net Pay: <span className="font-semibold text-[#3D1A0B]">₱{slip.net_pay.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleViewPayslip(slip.run_id, slip.employee_id)}
                      className="flex items-center gap-2 px-6 py-3 bg-white cursor-pointer border border-[#3D1A0B] text-[#3D1A0B] rounded-xl hover:bg-[#3D1A0B] hover:text-white transition"
                    >
                      <Eye size={18} />
                      View
                    </button>
                    <button
                      onClick={() => {
                        handleViewPayslip(slip.run_id, slip.employee_id);
                        setTimeout(() => window.print(), 800);
                      }}
                      className="flex cursor-pointer items-center gap-2 px-6 py-3 bg-[#3D1A0B] text-white rounded-xl hover:bg-[#2A1308] transition"
                    >
                      <Download size={18} />
                      Download
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8D9C4] ">
              <p className="text-sm text-[#3D1A0B]/70">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, payslips.length)} of {payslips.length} payslips
              </p>
              
              <div className="flex items-center gap-2 text-sm text-[#3D1A0B]/70">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-[#F3E5CF] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1 px-4 py-1 bg-[#FAF6F1] rounded-lg text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-[#F3E5CF] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#3D1A0B]/50 mt-10">
           The data was for temporary use only.
        </p>
      </div>
      <PayrollPayslipModalProps
        isOpen={modalOpen}
        onClose={handleCloseModal}
        runId={selectedRunId}
        employeeId={selectedEmployeeId}
      />
    </div>
  );
}