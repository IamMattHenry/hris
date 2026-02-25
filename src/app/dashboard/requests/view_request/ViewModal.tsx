
"use client";
import { X } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { useAuth } from "@/contexts/AuthContext";
import InfoBox from "@/components/forms/FormDisplay";


type LeaveStatus = "pending" | "supervisor_approved" | "approved" | "rejected";

interface Leave {
  leave_id: number;
  leave_code: string;
  employee_id: number;
  first_name: string;
  last_name: string;
  department_id?: number;
  department_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  remarks?: string;
  requester_role?: string;
  requester_sub_role?: string | null;
  // Optional approver info (may be provided as approved_by_name or approver_first/last fields)
  approved_by?: number;
  approved_by_name?: string;
  approver_first_name?: string;
  approver_last_name?: string;
  approver_employee_code?: string;
  // Two-stage approval fields (optional)
  supervisor_approved_by?: number | null;
  supervisor_approved_at?: string | null;
  supervisor_approver_first_name?: string;
  supervisor_approver_last_name?: string;
  hr_approved_at?: string | null;
  // Supporting documents JSON string (optional)
  supporting_docs?: string | null;
}


type LeaveType =
  | "vacation"
  | "sick"
  | "emergency"
  | "half_day"
  | "others"
  | "maternity"
  | "paternity"
  | "sil"
  | "special_women"
  | "bereavement"
  | "solo_parent"
  | "vawc"
  // Legacy types kept for backward compatibility with old data
  | "personal"
  | "parental";

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation Leave",
  sick: "Sick Leave",
  emergency: "Emergency Leave",
  half_day: "Half Day",
  others: "Others",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  sil: "Service Incentive Leave (SIL)",
  special_women: "Special Leave for Women",
  bereavement: "Bereavement Leave",
  solo_parent: "Solo Parent Leave",
  vawc: "VAWC Leave",
  // Legacy
  personal: "Personal Leave",
  parental: "Parental Leave",
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
  const isSuperadmin = user?.role === "superadmin";

  if (!isOpen) return null;

  // Parse supporting documents JSON (if any)
  let docs: Record<string, any> | null = null;
  try {
    docs = leave.supporting_docs ? JSON.parse(leave.supporting_docs) : null;
  } catch (e) {
    docs = null;
  }

  const stageLabel =
    leave.status === 'pending'
      ? 'Pending Supervisor Review'
      : leave.status === 'supervisor_approved'
      ? 'Pending HR Review'
      : leave.status === 'approved'
      ? 'Approved'
      : 'Rejected';

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
          <InfoBox label="Department" value={leave.department_name || (leave.department_id ? `Department #${leave.department_id}` : 'N/A')} />
          {leave.requester_role && (
            <InfoBox label="Requested role" value={leave.requester_role + (leave.requester_sub_role ? ` — ${leave.requester_sub_role}` : '')} />
          )}
          <InfoBox label="Leave Type" value={LEAVE_TYPE_LABELS[leave.leave_type]} />
          <InfoBox label="Start Date" value={new Date(leave.start_date).toLocaleDateString()} />
          <InfoBox label="End Date" value={new Date(leave.end_date).toLocaleDateString()} />
          <InfoBox label="Status" value={stageLabel} />
          {leave.remarks && (
            <InfoBox label="Remarks" value={leave.remarks} />
          )}
          {/* Supervisor approver info when available */}
          {(leave.status === "supervisor_approved" || leave.status === "approved") &&
            (leave.supervisor_approver_first_name || leave.supervisor_approver_last_name) && (
            <InfoBox
              label="Supervisor Approved By"
              value={`${leave.supervisor_approver_first_name || ''} ${leave.supervisor_approver_last_name || ''}`.trim()}
            />
          )}
          {(leave.status === "supervisor_approved" || leave.status === "approved") && leave.supervisor_approved_at && (
            <InfoBox label="Supervisor Approved At" value={new Date(leave.supervisor_approved_at).toLocaleString()} />
          )}
          {/* HR approver info when available */}
          {leave.status === "approved" && (leave.approved_by_name || leave.approver_first_name || leave.approver_employee_code) && (
            <InfoBox
              label="Approved By"
              value={
                leave.approved_by_name
                  ?? ((leave.approver_first_name || leave.approver_last_name)
                      ? `${leave.approver_first_name || ''} ${leave.approver_last_name || ''}`.trim()
                      : leave.approver_employee_code || 'N/A')
              }
            />
          )}
          {leave.status === "approved" && leave.hr_approved_at && (
            <InfoBox label="HR Approved At" value={new Date(leave.hr_approved_at).toLocaleString()} />
          )}
        </div>

        {/* Supporting Documents section (visible to supervisors, HR, admins) */}
        {(isSupervisor || isSuperadmin || isAdmin) && docs && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Supporting Documents</h3>
            <div className="space-y-2">
              {leave.leave_type === 'maternity' && (
                <>
                  {docs.maternity_type && <InfoBox label="Maternity Type" value={docs.maternity_type} />}
                  {docs.pregnancy_doc_ref && <InfoBox label="Pregnancy Doc Ref" value={docs.pregnancy_doc_ref} />} 
                  {docs.solo_parent_id && <InfoBox label="Solo Parent ID" value={docs.solo_parent_id} />}
                </>
              )}
              {leave.leave_type === 'paternity' && (
                <>
                  {docs.marriage_cert_no && <InfoBox label="Marriage Certificate No." value={docs.marriage_cert_no} />}
                </>
              )}
              {leave.leave_type === 'solo_parent' && (
                <>
                  {docs.solo_parent_id && <InfoBox label="Solo Parent ID" value={docs.solo_parent_id} />}
                </>
              )}
              {leave.leave_type === 'vawc' && (
                <>
                  {docs.vawc_cert_ref && <InfoBox label="VAWC Certification Ref" value={docs.vawc_cert_ref} />}
                </>
              )}
              {leave.leave_type === 'special_women' && (
                <>
                  {docs.medical_cert_no && <InfoBox label="Medical Certificate No." value={docs.medical_cert_no} />}
                </>
              )}
            </div>
          </div>
        )}

        {/* Stage-based actions */}
        {leave.status === "pending" && isSupervisor && (
          <div className="flex justify-end gap-3">
            <ActionButton label="Reject" onClick={onReject} />
            <ActionButton label="Approve" onClick={onApprove} />
          </div>
        )}
        {leave.status === "supervisor_approved" && isSuperadmin && (
          <div className="flex justify-end gap-3">
            <ActionButton label="Reject" onClick={onReject} />
            <ActionButton label="Approve" onClick={onApprove} />
          </div>
        )}

        {/* Admins can only view, show message (superadmin excluded) */}
        {leave.status === "pending" && isAdmin && !isSuperadmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              ℹ️ Only supervisors can approve or reject leave requests.
            </p>
          </div>
        )}

        {/* Close button when user can't act at this stage */}
        {((leave.status === "pending" && !isSupervisor) ||
          (leave.status === "supervisor_approved" && !isSuperadmin) ||
          (leave.status !== "pending" && leave.status !== "supervisor_approved")) && (
          <div className="flex justify-end">
            <ActionButton label="Close" onClick={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}
