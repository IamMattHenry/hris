"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";
import { departmentApi, employeeApi } from "@/lib/api";

interface AddDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

export default function AddDepartmentModal({ isOpen, onClose, onSave }: AddDepartmentModalProps) {
    const [departmentName, setDepartmentName] = useState("");
    const [departmentDescription, setDepartmentDescription] = useState("");
    const [supervisorId, setSupervisorId] = useState("");
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        departmentName: "",
        departmentDescription: "",
    });

    useEffect(() => {
        if (isOpen) {
            fetchSupervisors();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setDepartmentName("");
            setDepartmentDescription("");
            setSupervisorId("");
            setErrors({
                departmentName: "",
                departmentDescription: "",
            });
        }
    }, [isOpen]);

    const fetchSupervisors = async () => {
        const result = await employeeApi.getAll();
        if (result.success && result.data) {
            // Filter only supervisors
            const supervisorList = result.data.filter((emp: any) => emp.role === 'supervisor');
            setSupervisors(supervisorList);
        }
    };


    const validate = () => {
        let valid = true;
        const newErrors = {
            departmentName: "",
            departmentDescription: "",
        };

        // Department Name
        if (!departmentName.trim()) {
            newErrors.departmentName = "Department name is required.";
            valid = false;
        } else if (departmentName.trim().length < 2) {
            newErrors.departmentName = "Department name must be at least 2 characters.";
            valid = false;
        } else if (departmentName.trim().length > 50) {
            newErrors.departmentName = "Department name must not exceed 50 characters.";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);

        const result = await departmentApi.create({
            department_name: departmentName,
            description: departmentDescription || undefined,
            supervisor_id: supervisorId ? parseInt(supervisorId) : undefined,
        });

        setLoading(false);

        if (result.success) {
            alert("Department created successfully");
            if (onSave) onSave();
            onClose();
        } else {
            alert(result.message || "Failed to create department");
        }
    };

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
                        className="bg-[#fff7ec] rounded-2xl shadow-lg p-6 w-full max-w-lg relative"
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-[#3b2b1c]">Add Department</h2>
                            <button onClick={onClose}>
                                <X className="text-[#3b2b1c]" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4 text-[#3b2b1c]">
                            {/* Department Name */}
                            <FormInput
                                type="text"
                                label="Department Name"
                                placeholder="Enter department name"
                                value={departmentName}
                                onChange={(e) => setDepartmentName(e.target.value)}
                                error={errors.departmentName}
                            />

                            {/* Department Description */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Department Description (Optional)
                                </label>
                                <textarea
                                    value={departmentDescription}
                                    onChange={(e) => setDepartmentDescription(e.target.value)}
                                    className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                        errors.departmentDescription
                                            ? "border-red-400 focus:ring-red-400"
                                            : "border-[#d6c3aa] focus:ring-[#3b2b1c]"
                                    }`}
                                    placeholder="Enter department description"
                                    rows={3}
                                />
                                {errors.departmentDescription && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.departmentDescription}
                                    </p>
                                )}
                            </div>

                            {/* Supervisor Selector */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Supervisor (Optional)
                                </label>
                                <select
                                    value={supervisorId}
                                    onChange={(e) => setSupervisorId(e.target.value)}
                                    className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
                                >
                                    <option value="">No Supervisor</option>
                                    {supervisors.map((sup) => (
                                        <option key={sup.employee_id} value={sup.employee_id}>
                                            {sup.employee_code} - {sup.first_name} {sup.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end mt-6">
                                <ActionButton
                                    onClick={handleSave}
                                    label={loading ? "Saving..." : "Save"}
                                    icon={Save}
                                    className="hover:opacity-90 transition"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}