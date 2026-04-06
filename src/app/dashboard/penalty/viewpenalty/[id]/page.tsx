"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { penaltyApi } from "@/lib/api";

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

export default function ViewPenaltyDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [penalty, setPenalty] = useState<PenaltyDetail | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const result = await penaltyApi.getById(params.id);
      setLoading(false);

      if (!result.success || !result.data) {
        toast.error(result.message || "Failed to fetch penalty details.");
        return;
      }

      setPenalty(result.data as PenaltyDetail);
    };

    if (params.id) fetchDetail();
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-[#3b2b1c]">Loading penalty details...</div>;
  }

  if (!penalty) {
    return (
      <div className="p-8 text-[#3b2b1c]">
        <p className="mb-4">Penalty not found.</p>
        <Link href="/dashboard/penalty" className="text-[#4b1f16] underline">Back to penalties</Link>
      </div>
    );
  }

  const fullName = `${penalty.first_name || ""} ${penalty.last_name || ""}`.trim() || "Unknown Employee";

  return (
    <div className="p-6 bg-[#fff7ec] min-h-screen text-[#3b2b1c] space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Penalty Details</h1>
        <Link href="/dashboard/penalty" className="text-[#4b1f16] underline">Back to penalties</Link>
      </div>

      <div className="bg-[#faeddc] rounded-xl border border-[#e2d5c3] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><span className="font-semibold">Code:</span> {penalty.code}</div>
        <div><span className="font-semibold">Employee:</span> {fullName} ({penalty.employee_code || penalty.employee_id})</div>
        <div><span className="font-semibold">Title:</span> {penalty.title}</div>
        <div><span className="font-semibold">Type:</span> {penalty.penalty_type}</div>
        <div><span className="font-semibold">Status:</span> {penalty.status.toUpperCase()}</div>
        <div><span className="font-semibold">Deduction Mode:</span> {penalty.payroll_deduction_mode}</div>
        <div><span className="font-semibold">Amount:</span> ₱{Number(penalty.amount).toLocaleString()}</div>
        <div><span className="font-semibold">Deducted:</span> ₱{Number(penalty.amount_deducted).toLocaleString()}</div>
        <div><span className="font-semibold">Remaining:</span> ₱{Number(penalty.remaining_amount).toLocaleString()}</div>
        <div><span className="font-semibold">Issued Date:</span> {penalty.issued_date}</div>
        <div><span className="font-semibold">Incident Date:</span> {penalty.incident_date}</div>
        <div className="md:col-span-2"><span className="font-semibold">Description:</span> {penalty.description}</div>
      </div>

      <div className="bg-[#faeddc] rounded-xl border border-[#e2d5c3] p-6">
        <h2 className="text-lg font-semibold mb-3">Event History</h2>
        {penalty.events?.length ? (
          <ul className="space-y-2 text-sm">
            {penalty.events.map((event) => {
              const actor = `${event.first_name || ""} ${event.last_name || ""}`.trim() || event.username || "System";
              return (
                <li key={event.id} className="border-b border-[#e2d5c3] pb-2">
                  <div className="font-medium">{event.action_type} • {event.created_at}</div>
                  <div className="text-gray-700">{event.from_status || "-"} → {event.to_status || "-"} by {actor}</div>
                  {event.notes && <div className="text-gray-600 italic">{event.notes}</div>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No events recorded.</p>
        )}
      </div>

      <div className="bg-[#faeddc] rounded-xl border border-[#e2d5c3] p-6">
        <h2 className="text-lg font-semibold mb-3">Payroll Deductions</h2>
        {penalty.deductions?.length ? (
          <ul className="space-y-2 text-sm">
            {penalty.deductions.map((deduction) => (
              <li key={deduction.id} className="border-b border-[#e2d5c3] pb-2">
                <div className="font-medium">Run #{deduction.payroll_run_id} • ₱{Number(deduction.deducted_amount).toLocaleString()}</div>
                <div className="text-gray-700">Date: {deduction.deduction_date}</div>
                <div className="text-gray-600">Period: {deduction.pay_period_start} to {deduction.pay_period_end}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">No payroll deductions recorded yet.</p>
        )}
      </div>
    </div>
  );
}
