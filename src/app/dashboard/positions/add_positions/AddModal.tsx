"use client";

import { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";

interface AddJobModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddJobModal({ isOpen, onClose }: AddJobModalProps) {
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [jobSalary, setJobSalary] = useState("");
    const [department, setDepartment] = useState("");
    const [departments, setDepartments] = useState(["HR", "Finance", "Marketing"]);
    const [newDept, setNewDept] = useState("");
    const [available, setAvailable] = useState(true);
    const [showNewDept, setShowNewDept] = useState(false);
    const [errors, setErrors] = useState({
        jobTitle: "",
        jobDescription: "",
        jobSalary: "",
        department: "",
    });

    // ✅ Reset fields when modal closes
    useEffect(() => {
        if (!isOpen) {
            setJobTitle("");
            setJobDescription("");
            setJobSalary("");
            setDepartment("");
            setNewDept("");
            setAvailable(true);
            setErrors({
                jobTitle: "",
                jobDescription: "",
                jobSalary: "",
                department: "",
            });
        }
    }, [isOpen]);

    const handleAddDepartment = () => {
        if (newDept.trim()) {
            setDepartments([...departments, newDept]);
            setDepartment(newDept);
            setNewDept("");
            setShowNewDept(false);
        }
    };

    // ✅ Validation function
    const validate = () => {
        let valid = true;
        const newErrors = {
            jobTitle: "",
            jobDescription: "",
            jobSalary: "",
            department: "",
        };

        // Job Title
        if (!jobTitle.trim()) {
            newErrors.jobTitle = "Job title is required.";
            valid = false;
        } else if (jobTitle.trim().split(" ").length > 50) {
            newErrors.jobTitle = "Job title must not exceed 50 words.";
            valid = false;
        }

        // Job Description
        if (!jobDescription.trim()) {
            newErrors.jobDescription = "Job description is required.";
            valid = false;
        } else if (jobDescription.trim().split(" ").length > 100) {
            newErrors.jobDescription = "Job description must not exceed 100 words.";
            valid = false;
        }

        // Job Salary (numeric validation)
        if (!jobSalary.trim()) {
            newErrors.jobSalary = "Job salary is required.";
            valid = false;
        } else {
            const cleanSalary = jobSalary.replace(/[₱,\s]/g, ""); // Remove ₱ and commas
            if (isNaN(Number(cleanSalary)) || Number(cleanSalary) <= 0) {
                newErrors.jobSalary = "Job salary must be a valid number.";
                valid = false;
            }
        }

        // Department
        if (!department.trim()) {
            newErrors.department = "Department is required.";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleSave = () => {
        if (!validate()) return;

        console.log({
            jobTitle,
            jobDescription,
            jobSalary,
            department,
            available,
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
                            <h2 className="text-xl font-bold text-[#3b2b1c]">Add Job Role</h2>
                            <button onClick={onClose}>
                                <X className="text-[#3b2b1c]" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-4 text-[#3b2b1c]">
                            {/* Job Title */}
                            <FormInput
                                type="text"
                                label="Job Title"
                                placeholder="Enter job title"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                error={errors.jobTitle}
                            />

                            {/* Job Description */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Job Description
                                </label>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.jobDescription
                                            ? "border-red-400 focus:ring-red-400"
                                            : "border-[#d6c3aa] focus:ring-[#3b2b1c]"
                                        }`}
                                    placeholder="Enter job description"
                                    rows={3}
                                />
                                {errors.jobDescription && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.jobDescription}
                                    </p>
                                )}
                            </div>

                          
                            {/* Job Salary */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Job Salary
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={jobSalary}
                                    onChange={(e) => {
                                        // Only allow numbers
                                        const numericValue = e.target.value.replace(/[^0-9]/g, "");
                                        setJobSalary(numericValue);
                                    }}
                                    className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.jobSalary
                                            ? "border-red-400 focus:ring-red-400"
                                            : "border-[#d6c3aa] focus:ring-[#3b2b1c]"
                                        }`}
                                    placeholder="Enter salary amount"
                                />
                                {errors.jobSalary && (
                                    <p className="text-red-500 text-xs mt-1">{errors.jobSalary}</p>
                                )}
                            </div>


                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Department
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.department
                                                ? "border-red-400 focus:ring-red-400"
                                                : "border-[#d6c3aa] focus:ring-[#3b2b1c]"
                                            }`}
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map((dept, idx) => (
                                            <option key={idx} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setShowNewDept(true)}
                                        className="p-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {errors.department && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.department}
                                    </p>
                                )}

                                {showNewDept && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            value={newDept}
                                            onChange={(e) => setNewDept(e.target.value)}
                                            className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
                                            placeholder="New department name"
                                        />
                                        <button
                                            onClick={handleAddDepartment}
                                            className="px-3 bg-green-700 text-white rounded-lg hover:bg-green-800"
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Availability */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={available}
                                    onChange={(e) => setAvailable(e.target.checked)}
                                    className="w-4 h-4 accent-[#3b2b1c]"
                                />
                                <label className="text-sm text-[#3b2b1c]">
                                    Available for assignment
                                </label>
                            </div>

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
