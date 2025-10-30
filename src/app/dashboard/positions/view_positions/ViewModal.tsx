"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import InfoBox from "@/components/forms/FormDisplay";

interface ViewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    position_id?: number;
    position_code?: string;
    position_name: string;
    position_desc?: string;
    salary?: number;
    department_name?: string;
    availability?: number;
  } | null;
}

export default function ViewJobModal({ isOpen, onClose, job }: ViewJobModalProps) {
  if (!job) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#fff7ec] rounded-2xl shadow-lg p-6 w-full max-w-lg relative overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#3b2b1c]">View Position</h2>
              <button onClick={onClose}>
                <X className="text-[#3b2b1c]" />
              </button>
            </div>

            {/* Position Details */}
            <div className="space-y-4 text-[#3b2b1c]">
              {job.position_code && <InfoBox label="Position Code" value={job.position_code} />}
              <InfoBox label="Position Name" value={job.position_name} />
              <InfoBox label="Description" value={job.position_desc || "N/A"} />
              <InfoBox label="Salary" value={job.salary ? `₱ ${parseFloat(job.salary.toString()).toLocaleString()}` : "N/A"} />
              <InfoBox label="Department" value={job.department_name || "N/A"} />
              <InfoBox label="Available Slots" value={job.availability?.toString() || "0"} />
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#3b2b1c] text-white rounded-xl hover:bg-[#4d3824] transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
