"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { payrollApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import PayrollPayslipModal from "./viewpayslip/page";

interface EmployeePayslipItem {
  id: number;
  run_id: number;
  employee_id: number;
  pay_period_start: string;
  pay_period_end: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
}

export default function EmployeePayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<EmployeePayslipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | number | null>(null);

  const itemsPerPage = 5;

  useEffect(() => {
    const fetchPayslips = async () => {
      if (!user?.employee_id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const runsResult = await payrollApi.getRuns();
        if (!runsResult.success || !runsResult.data) {
          throw new Error(runsResult.message || "Failed to fetch payroll runs");
        }

        const settled = await Promise.allSettled(
          runsResult.data.map(async (run: any) => {
            const payslipResult = await payrollApi.getPayslip(run.id, user.employee_id!);
            if (!payslipResult.success || !payslipResult.data) {
              return null;
            }

            const runData = payslipResult.data.run || {};
            const recordData = payslipResult.data.record || {};

            return {
              id: Number(runData.id),
              run_id: Number(runData.id),
              employee_id: Number(recordData.employee_id),
              pay_period_start: String(runData.pay_period_start || ""),
              pay_period_end: String(runData.pay_period_end || ""),
              gross_pay: Number(recordData.gross_pay || 0),
              total_deductions: Number(recordData.total_deductions || 0),
              net_pay: Number(recordData.net_pay || 0),
              status: String(runData.status || "draft"),
            } as EmployeePayslipItem;
          })
        );

        const employeePayslips = settled
          .filter((result): result is PromiseFulfilledResult<EmployeePayslipItem | null> => result.status === "fulfilled")
          .map((result) => result.value)
          .filter((item): item is EmployeePayslipItem => item !== null)
          .sort((a, b) => new Date(b.pay_period_end).getTime() - new Date(a.pay_period_end).getTime());

        setPayslips(employeePayslips);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load payslips");
        setPayslips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [user?.employee_id]);

  const totalPages = Math.ceil(payslips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPayslips = payslips.slice(startIndex, startIndex + itemsPerPage);

  const handleViewPayslip = (runId: number, employeeId: number) => {
    setSelectedRunId(runId);
    setSelectedEmployeeId(employeeId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRunId(null);
    setSelectedEmployeeId(null);
  };

  const formatDateRange = (start: string, end: string) => {
    return `${new Date(start).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} - ${new Date(end).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading payslips...</p>
        </div>
      </div>
    );
  }

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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8D9C4]">
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
      </div>

      <PayrollPayslipModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        runId={selectedRunId}
        employeeId={selectedEmployeeId}
      />
    </div>
  );
}
