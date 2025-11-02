"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import InfoBox from "@/components/forms/FormDisplay";

interface Department {
    department_id: number;
    department_code?: string;
    department_name: string;
    description?: string;
    supervisor_name?: string;
    employee_count?: number;
}

interface ViewDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
}

export default function ViewDepartmentModal({ isOpen, onClose, department }: ViewDepartmentModalProps) {
    if (!department) return null;

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
                        className="bg-[#faeddc] rounded-2xl shadow-lg p-6 w-full max-w-lg relative"
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-[#3b2b1c]">Department Details</h2>
                            <button onClick={onClose}>
                                <X className="text-[#3b2b1c]" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4 text-[#3b2b1c]">
                            {/* Department Code */}
                            {department.department_code && (
                                <InfoBox
                                    label="Department Code"
                                    value={department.department_code}
                                />
                            )}

                            {/* Department Name */}
                            <InfoBox
                                label="Department Name"
                                value={department.department_name}
                            />

                            {/* Department Description */}
                            <InfoBox
                                label="Description"
                                value={department.description || "N/A"}
                                isTextarea={true}
                                rows={4}
                            />

                            {/* Supervisor */}
                            <InfoBox
                                label="Department Supervisor"
                                value={department.supervisor_name || "No Supervisor Assigned"}
                            />

                            {/* Number of Employees */}
                            <InfoBox
                                label="Number of Employees"
                                value={`${department.employee_count || 0} ${department.employee_count === 1 ? 'Employee' : 'Employees'}`}
                            />

                            {/* Close Button */}
                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-90 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}