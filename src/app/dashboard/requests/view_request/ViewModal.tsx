
"use client";
import { X } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { useAuth } from "@/contexts/AuthContext";
import InfoBox from "@/components/forms/FormDisplay";


type LeaveStatus = "pending" | "approved" | "rejected";

interface Leave {
  leave_id: number;
  leave_code: string;
  employee_id: number;
  first_name: string;
  last_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  remarks?: string;
}


type LeaveType = "vacation" | "sick" | "personal" | "parental" | "bereavement" | "emergency" | "half_day" | "others";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    vacation: "Vacation Leave",
    sick: "Sick Leave",
    personal: "Personal Leave",
    parental: "Parental Leave",
    bereavement: "Bereavement Leave",
    emergency: "Emergency Leave",
    half_day: "Half Day",
    others: "Others",
};



// View Leave Modal Component
export default function ViewLeaveModal({
  isOpen,
  leave,
  onClose,
  onApprove,
  onReject,
}: {
  isOpen: boolean;
  leave: Leave;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { user } = useAuth();
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#fdf3e2] w-full max-w-md p-8 rounded-2xl shadow-lg relative text-[#3b2b1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold mb-6">Leave Request Details</h2>

        <div className="space-y-4 mb-6">
          <InfoBox label="Code" value={leave.leave_code} />
          <InfoBox label="Employee" value={`${leave.first_name} ${leave.last_name}`} />
          <InfoBox label="Leave Type" value={LEAVE_TYPE_LABELS[leave.leave_type]} />
          <InfoBox label="Start Date" value={new Date(leave.start_date).toLocaleDateString()} />
          <InfoBox label="End Date" value={new Date(leave.end_date).toLocaleDateString()} />
          <InfoBox label="Status" value={leave.status.charAt(0).toUpperCase() + leave.status.slice(1)} />
          {leave.remarks && (
            <InfoBox label="Remarks" value={leave.remarks} />
          )}
        </div>

        {/* Only supervisors can approve/reject */}
        {leave.status === "pending" && isSupervisor && (
          <div className="flex justify-end gap-3">
            <ActionButton label="Reject" onClick={onReject} />
            <ActionButton label="Approve" onClick={onApprove} />
          </div>
        )}

        {/* Admins can only view, show message */}
        {leave.status === "pending" && isAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              ℹ️ Only supervisors can approve or reject leave requests.
            </p>
          </div>
        )}

        {/* Close button for non-pending or when user can't approve/reject */}
        {(leave.status !== "pending" || isAdmin) && (
          <div className="flex justify-end">
            <ActionButton label="Close" onClick={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}
