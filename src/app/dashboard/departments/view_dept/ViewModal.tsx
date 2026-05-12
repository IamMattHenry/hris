"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import InfoBox from "@/components/forms/FormDisplay";

interface Department {
    department_id: number;
    department_code?: string;
    department_name: string;
    description?: string;
    supervisor_id?: number | null;
    supervisor_name?: string;
    supervisor_first_name?: string;
    supervisor_last_name?: string;
    supervisor_code?: string;
    employee_count?: number;
}

interface ViewDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
    onViewSupervisor?: (employeeId: number) => void;
}

export default function ViewDepartmentModal({ isOpen, onClose, department, onViewSupervisor }: ViewDepartmentModalProps) {
    if (!department) return null;

    const supervisorName = department.supervisor_first_name && department.supervisor_last_name
        ? `${department.supervisor_code ? `${department.supervisor_code} - ` : ""}${department.supervisor_first_name} ${department.supervisor_last_name}`
        : department.supervisor_name || "No Supervisor Assigned";

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
                            <div className="space-y-2">
                                <p className="font-medium">Department Supervisor</p>
                                {department.supervisor_id && onViewSupervisor ? (
                                    <button
                                        onClick={() => onViewSupervisor(department.supervisor_id as number)}
                                        className="w-full text-left px-4 py-3 rounded-lg bg-[#fff7ec] border border-[#e6d2b5] hover:underline"
                                    >
                                        {supervisorName}
                                    </button>
                                ) : (
                                    <InfoBox
                                        label="Department Supervisor"
                                        value={supervisorName}
                                    />
                                )}
                            </div>

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