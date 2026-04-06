"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertCircle } from "lucide-react";
import { leaveApi } from "@/lib/api";
import { Leave } from "@/types/api";
import { toast } from "react-hot-toast";

interface LeaveDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string;
}

export default function LeaveDetailsModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: LeaveDetailsModalProps) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeaves();
    }
  }, [isOpen, employeeId]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      // Get all leaves for the employee
      const result = await leaveApi.getAll();
      if (result.success && result.data) {
        // Filter for this employee and only approved/active leaves
        const employeeLeaves = (result.data as Leave[])
          .filter(
            (leave) =>
              leave.employee_id === employeeId &&
              (leave.status === "approved" ||
                leave.status === "hr_approved" ||
                leave.status === "supervisor_approved")
          )
          .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

        setLeaves(employeeLeaves);
      }
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to load leave details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getLeaveTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      vacation: "Vacation",
      sick: "Sick Leave",
      emergency: "Emergency Leave",
      half_day: "Half Day",
      maternity: "Maternity Leave",
      paternity: "Paternity Leave",
      sil: "Service Incentive Leave",
      special_women: "Special Leave for Women",
      bereavement: "Bereavement Leave",
      solo_parent: "Solo Parent Leave",
      vawc: "VAWC Leave",
      others: "Other",
    };
    return typeMap[type] || type;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
      case "hr_approved":
      case "supervisor_approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#281b0d] text-white px-6 py-4 flex items-center justify-between border-b">
          <h2 className="text-xl font-semibold">Leave Details</h2>
          <button
            onClick={onClose}
            className="text-white hover:opacity-80 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 pb-4 border-b border-gray-200">
            <p className="text-lg font-semibold text-gray-800">
              {employeeName}
            </p>
            <p className="text-sm text-gray-600">Employee Leave Information</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b4513]"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No active leave records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div
                  key={leave.leave_id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {getLeaveTypeDisplay(leave.leave_type)}
                      </h3>
                      <p className="text-sm text-gray-600">{leave.leave_code}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        leave.status
                      )}`}
                    >
                      {leave.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-[#8b4513]" />
                      <span>
                        {formatDate(leave.start_date)} -{" "}
                        {formatDate(leave.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-[#8b4513]" />
                      <span>
                        {calculateDuration(leave.start_date, leave.end_date)}{" "}
                        day(s)
                      </span>
                    </div>
                  </div>

                  {leave.remarks && (
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-3">
                      <p className="font-medium mb-1">Remarks:</p>
                      <p>{leave.remarks}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                    Created: {new Date(leave.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
