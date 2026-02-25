"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";
import { positionApi, departmentApi } from "@/lib/api";
import { toast } from "react-hot-toast";

interface AddJobModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddJobModal({
    isOpen,
    onClose,
}: AddJobModalProps) {
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [department, setDepartment] = useState("");
    const [departments, setDepartments] = useState<any[]>([]);
    const [availability, setAvailability] = useState<number | "">("");
    const [employmentType, setEmploymentType] = useState("regular");
    const [defaultSalary, setDefaultSalary] = useState<number | "">("");
    const [loading, setLoading] = useState(false);

    const [errors, setErrors] = useState({
        jobTitle: "",
        department: "",
        defaultSalary: "",
        availability: "",
    });

    // Fetch departments
    useEffect(() => {
        if (isOpen) fetchDepartments();
    }, [isOpen]);

    const fetchDepartments = async () => {
        const result = await departmentApi.getAll();
        if (result.success && result.data) {
            setDepartments(result.data);
        }
    };

    // Reset modal state
    useEffect(() => {
        if (!isOpen) {
            setJobTitle("");
            setJobDescription("");
            setDepartment("");
            setAvailability("");
            setEmploymentType("regular");
            setDefaultSalary("");
            setErrors({
                jobTitle: "",
                jobDescription: "",
                department: "",
                defaultSalary: "",
                availability: "",
            });
        }
    }, [isOpen]);

    // Salary handler
    const handleSalaryChange = (value: string) => {
        if (value === "") {
            setDefaultSalary("");
            return;
        }

        const numericValue = Number(value);

        if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 1000000) {
            setDefaultSalary(numericValue);
        }
    };

    // Availability handler
    const handleAvailabilityChange = (value: string) => {
        if (value === "") {
            setAvailability("");
            return;
        }

        const numericValue = Number(value);

        if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 1000) {
            setAvailability(numericValue);
        }
    };


    const validateNameFormat = (
        value: string,
        setValue: (v: string) => void,
        maxLength: number = 30
    ) => {
        
        if (!/^[A-Za-zñÑ\s]*$/.test(value)) return;
        if (value.length > maxLength) return;
        const formattedValue = value
            .toLowerCase()
            .replace(/(^|\s)[a-zñ]/g, (char) => char.toUpperCase());

        setValue(formattedValue);
    };

    // Validation
    const validate = () => {
        let valid = true;

        const newErrors = {
            jobTitle: "",
            jobDescription: "",
            department: "",
            defaultSalary: "",
            availability: "",
        };

        if (!jobTitle.trim()) {
            newErrors.jobTitle = "Job title is required.";
            valid = false;
        }

        if (!jobDescription.trim()) {
            newErrors.jobDescription = "Job description is required.";
            valid = false;
        }

        if (!department) {
            newErrors.department = "Department is required.";
            valid = false;
        }

        if (defaultSalary === "") {
            newErrors.defaultSalary = "Default salary is required.";
            valid = false;
        } else if (defaultSalary < 0 || defaultSalary > 1000000) {
            newErrors.defaultSalary =
                "Salary must be between ₱0 and ₱1,000,000.";
            valid = false;
        }

        if (availability === "") {
            newErrors.availability = "Availability is required.";
            valid = false;
        } else if (availability < 0 || availability > 1000) {
            newErrors.availability =
                "Availability must be between 0 and 1000.";
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    // Save handler
    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);

        const result = await positionApi.create({
            position_name: jobTitle,
            position_desc: jobDescription || undefined,
            department_id: Number(department),
            availability: Number(availability),
            employment_type: employmentType,
            default_salary: Number(defaultSalary),
            salary_unit:
                employmentType === "regular" ? "monthly" : "hourly",
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
                            <h2 className="text-xl font-bold text-[#3b2b1c]">
                                Add Job Role
                            </h2>
                            <button onClick={onClose}>
                                <X className="text-[#3b2b1c]" />
                            </button>
                        </div>

                        <div className="space-y-4 text-[#3b2b1c]">
                            {/* Job Title */}
                            <FormInput
                                type="text"
                                label="Job Title"
                                value={jobTitle}
                                onChange={(e) => validateNameFormat(e.target.value, setJobTitle, 50)}
                                error={errors.jobTitle}
                            />

                            {/* Job Description */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Job Description
                                </label>

                                <textarea
                                    value={jobDescription}
                                    onChange={(e) =>
                                        validateNameFormat(e.target.value, setJobDescription, 200)
                                    }
                                    rows={4}
                                    className="w-full p-3 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c] resize-none"
                                    placeholder="Enter job description"
                                />
                            </div>
                            
                            {/* Employment + Salary */}
                            <div className="flex gap-4">
                                {/* Employment Type */}
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium mb-1">
                                        Employment Type
                                    </label>
                                    <select
                                        value={employmentType}
                                        onChange={(e) =>
                                            setEmploymentType(e.target.value)
                                        }
                                        className="w-full h-[42px] px-3 border rounded-lg border-[#d6c3aa] focus:ring-2 focus:ring-[#3b2b1c]"
                                    >
                                        <option value="regular">Regular</option>
                                        <option value="probationary">
                                            Probationary
                                        </option>
                                    </select>
                                </div>

                                {/* Salary */}
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium mb-1">
                                        Default Salary (
                                        {employmentType === "regular"
                                            ? "per month"
                                            : "per hour"}
                                        )
                                    </label>

                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm">
                                            ₱
                                        </span>

                                        <input
                                            type="number"
                                            min={0}
                                            max={1000000}
                                            value={defaultSalary}
                                            onChange={(e) =>
                                                handleSalaryChange(e.target.value)
                                            }
                                            className="w-full h-[42px] pl-8 pr-3 border rounded-lg border-[#d6c3aa] focus:outline-none focus:ring-2 focus:ring-[#3b2b1c]"
                                        />
                                    </div>

                                    {errors.defaultSalary && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.defaultSalary}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Department
                                </label>
                                <select
                                    value={department}
                                    onChange={(e) =>
                                        setDepartment(e.target.value)
                                    }
                                    className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:ring-2 focus:ring-[#3b2b1c]"
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option
                                            key={dept.department_id}
                                            value={dept.department_id}
                                        >
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
                                <label className="block text-sm font-medium mb-1">
                                    Available Slots
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={1000}
                                    value={availability}
                                    onChange={(e) =>
                                        handleAvailabilityChange(e.target.value)
                                    }
                                    className="w-full p-2 border border-[#d6c3aa] rounded-lg focus:ring-2 focus:ring-[#3b2b1c]"
                                />
                                {errors.availability && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors.availability}
                                    </p>
                                )}
                            </div>

                            {/* Save */}
                            <div className="flex justify-end mt-6">
                                <ActionButton
                                    onClick={handleSave}
                                    label={loading ? "Saving..." : "Save"}
                                    icon={Save}
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