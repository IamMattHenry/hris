"use client";

import { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";
import { positionApi, departmentApi } from "@/lib/api";
import { toast } from "react-hot-toast";

interface AddJobModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddJobModal({ isOpen, onClose }: AddJobModalProps) {
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [department, setDepartment] = useState("");
    const [departments, setDepartments] = useState<any[]>([]);
    const [availability, setAvailability] = useState("0");
    const [employmentType, setEmploymentType] = useState("regular");
    const [defaultSalary, setDefaultSalary] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        jobTitle: "",
        jobDescription: "",
        department: "",
        defaultSalary: "",
    });

    // Fetch departments on mount
    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
        }
    }, [isOpen]);

    const fetchDepartments = async () => {
        const result = await departmentApi.getAll();
        if (result.success && result.data) {
            setDepartments(result.data);
        }
    };

    // ✅ Reset fields when modal closes
    useEffect(() => {
        if (!isOpen) {
            setJobTitle("");
            setJobDescription("");
            setDepartment("");
            setAvailability("0");
            setErrors({
                jobTitle: "",
                jobDescription: "",
                department: "",
            });
        }
    }, [isOpen]);

    // ✅ Validation function
    const validate = () => {
        let valid = true;
        const newErrors = {
            jobTitle: "",
            jobDescription: "",
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

        // Job Description (optional)
        if (jobDescription.trim() && jobDescription.trim().split(" ").length > 100) {
            newErrors.jobDescription = "Job description must not exceed 100 words.";
            valid = false;
        }

        // Department
        if (!department.trim()) {
            newErrors.department = "Department is required.";
            valid = false;
        }

        // Default salary
        if (!defaultSalary || isNaN(Number(defaultSalary))) {
            newErrors.defaultSalary = "Default salary is required and must be a number.";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);

        const result = await positionApi.create({
            position_name: jobTitle,
            position_desc: jobDescription || undefined,
            department_id: parseInt(department),
            availability: parseInt(availability),
            employment_type: employmentType,
            default_salary: Number(defaultSalary),
            salary_unit: employmentType === 'regular' ? 'monthly' : 'hourly',
        });

        setLoading(false);

        if (result.success) {
            toast.success("Position created successfully");
            onClose();
        } else {
            toast.error(result.message || "Failed to create position");
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

                            {/* Employment Type & Default Salary */}
                            <div className="flex gap-3">
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium text-[#3b2b1c] mb-1">Employment Type</label>
                                    <select
                                        value={employmentType}
                                        onChange={(e) => setEmploymentType(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:outline-none border-[#d6c3aa] focus:ring-2 focus:ring-[#3b2b1c]"
                                    >
                                        <option value="regular">Regular</option>
                                        <option value="probationary">Probationary</option>
                                    </select>
                                </div>

                                <div className="w-1/2">
                                    <FormInput
                                        type="number"
                                        label={`Default Salary (${employmentType === 'regular' ? 'per month' : 'per hour'})`}
                                        placeholder="Enter default salary"
                                        value={defaultSalary}
                                        onChange={(e) => setDefaultSalary(e.target.value)}
                                        error={errors.defaultSalary}
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Department
                                </label>
                                <select
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.department
                                            ? "border-red-400 focus:ring-red-400"
                                            : "border-[#d6c3aa] focus:ring-[#3b2b1c]"
                                        }`}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.department_id} value={dept.department_id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.department && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.department}
                                    </p>
                                )}
                            </div>

                            {/* Availability */}
                            <div>
                                <label className="block text-sm font-medium text-[#3b2b1c] mb-1">
                                    Available Slots
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={availability}
                                    onChange={(e) => setAvailability(e.target.value)}
                                    className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
                                    placeholder="Enter number of available slots"
                                />
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
