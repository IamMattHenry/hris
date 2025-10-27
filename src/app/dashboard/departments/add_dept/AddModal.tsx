"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";

interface AddDepartmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddDepartmentModal({ isOpen, onClose }: AddDepartmentModalProps) {
    const [departmentName, setDepartmentName] = useState("");
    const [departmentDescription, setDepartmentDescription] = useState("");
    const [supervisorId, setSupervisorId] = useState("");
    const [errors, setErrors] = useState({
        departmentName: "",
        departmentDescription: "",
        supervisorId: "",
    });

 
    useEffect(() => {
        if (!isOpen) {
            setDepartmentName("");
            setDepartmentDescription("");
            setSupervisorId("");
            setErrors({
                departmentName: "",
                departmentDescription: "",
                supervisorId: "",
            });
        }
    }, [isOpen]);

    
    const validate = () => {
        let valid = true;
        const newErrors = {
            departmentName: "",
            departmentDescription: "",
            supervisorId: "",
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

      
        if (!departmentDescription.trim()) {
            newErrors.departmentDescription = "Department description is required.";
            valid = false;
        } else if (departmentDescription.trim().split(" ").length > 100) {
            newErrors.departmentDescription = "Department description must not exceed 100 words.";
            valid = false;
        }

        
        if (!supervisorId.trim()) {
            newErrors.supervisorId = "Supervisor Employee ID is required.";
            valid = false;
        } else if (!/^[A-Za-z0-9-]+$/.test(supervisorId.trim())) {
            newErrors.supervisorId = "Employee ID must contain only letters, numbers, and hyphens.";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleSave = () => {
        if (!validate()) return;

        console.log({
            departmentName,
            departmentDescription,
            supervisorId,
        });

        onClose();
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
                                    Department Description
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

                            {/* Supervisor Employee ID */}
                            <FormInput
                                type="text"
                                label="Supervisor (Employee ID)"
                                placeholder="Enter employee ID (e.g., EMP-001)"
                                value={supervisorId}
                                onChange={(e) => setSupervisorId(e.target.value)}
                                error={errors.supervisorId}
                            />

                            {/* Save Button */}
                            <div className="flex justify-end mt-6">
                                <ActionButton
                                    onClick={handleSave}
                                    label="Save"
                                    icon={Save}
                                    className="hover:opacity-90 transition"
                                />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}