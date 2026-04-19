'use client';

import React from 'react';

interface ExpenseRequest {
  notification_id: number;
  title: string;
  requested_amount: number;
  department_id?: number | null;
  department_name?: string | null;
  priority: string;
  status: string;
}

interface BudgetRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseRequests: ExpenseRequest[];
  expenseRequestsLoading: boolean;
  formatCurrency: (amount: number) => string;
}

const BudgetRequestsModal: React.FC<BudgetRequestsModalProps> = ({
  isOpen,
  onClose,
  expenseRequests,
  expenseRequestsLoading,
  formatCurrency,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl mx-4 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e6d2b5] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#3b2b1c]">
              All Submitted Budget Requests
            </h2>
            <p className="text-xs text-[#6b5344] mt-0.5">
              Total: {expenseRequests.length} requests
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b5344] hover:text-[#3b2b1c] text-3xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {expenseRequestsLoading ? (
            <div className="flex justify-center items-center py-16">
              <p className="text-xs text-[#6b5344]">Loading requests...</p>
            </div>
          ) : expenseRequests.length === 0 ? (
            <div className="flex justify-center items-center py-16">
              <p className="text-xs text-[#6b5344]">No submitted requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
              {expenseRequests.map((request) => (
                <div
                  key={request.notification_id}
                  className="rounded-xl border border-[#e6d2b5] bg-[#fff7ec] px-5 py-4 hover:bg-[#ffebd0] transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#3b2b1c] leading-snug truncate">
                        {request.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-medium text-[#3b2b1c]">
                          {formatCurrency(request.requested_amount)}
                        </span>
                        <span className="text-[#6b5344]">•</span>
                        <span className="text-[#6b5344] text-sm">
                          {request.department_name || (request.department_id ? `Department #${request.department_id}` : "No department")}
                        </span>
                        <span className="text-[#6b5344]">•</span>
                        <span className="capitalize text-[#6b5344] text-sm">
                          {request.priority} priority
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-medium px-4 py-1.5 rounded-full whitespace-nowrap self-start md:self-center ${
                        request.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : request.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : request.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#e6d2b5] px-6 py-4 bg-[#fffaf0] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-[#6b5344] hover:text-[#3b2b1c] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetRequestsModal;