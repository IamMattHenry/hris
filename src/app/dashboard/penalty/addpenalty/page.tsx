"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";
import { employeeApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import FormSelect from "@/components/forms/FormSelect";

interface AddpenaltyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddPenaltyModal({
    isOpen,
    onClose,
}: AddpenaltyModalProps) {

    //These variables must be sent to the database
    const [penaltyTitle, setPenaltyTitle] = useState<string>("");
    const [penaltyAmount, setPenaltyAmount] = useState<string>("");
    const [penaltyDescription, setPenaltyDescription] = useState<string>("");
    const [employeeID, setEmployeeID] = useState<string>("");

    const [errors, setErrors] = useState<{
        penaltyTitle?: string;
        employeeID?: string;
        penaltyAmount?: string;
        penaltyDescription?: string;
    }>({});

    //fetch employee data
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        const newErrors: typeof errors = {};

        if (!penaltyTitle.trim()) {
            newErrors.penaltyTitle = "Penalty Title is required.";
        }
        if (!employeeID) {
            newErrors.employeeID = "Employee ID is required.";
        }
        if (!penaltyAmount || parseFloat(penaltyAmount) <= 0) {
            newErrors.penaltyAmount = "Please enter a valid penalty amount.";
        }
        if (!penaltyDescription.trim()) {
            newErrors.penaltyDescription = "Penalty Description is required.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);
        // Here would be the API call to save the penalty
        // For now, it's just an alert.
        alert("Penalty added successfully!");
        onClose();
        setLoading(false);
    };
    
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            const result = await employeeApi.getAll();
            if (result.success && result.data) {
                setEmployees(result.data as any[]);
            } else {
                toast.error(result.message || "Failed to fetch employees.");
            }
            setLoading(false);
        };
        if (isOpen) {
            fetchEmployees();
        }
    }, [isOpen]);

     const validateNameFormat = (
        value: string,
        setValue: (v: string) => void,
        maxLength: number = 30
    ) => {
        if (value.length > maxLength) return;
        setValue(value);
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
                                Add Penalty
                            </h2>
                            <button onClick={onClose}>
                                <X className="text-[#3b2b1c]" />
                            </button>
                        </div>  

                        {/* Content */}
                        <div className="space-y-4 text-[#3b2b1c]">
                
                            <FormInput
                                label={"Penalty Title"}
                                type="text"
                                placeholder="Enter penalty title"
                                value={penaltyTitle}
                                onChange={(e) => {
                                    setPenaltyTitle(e.target.value);
                                    if (errors.penaltyTitle) {
                                        setErrors({ ...errors, penaltyTitle: undefined });
                                    }
                                }}
                                error={errors.penaltyTitle}
                            />
                            <FormSelect
                                label={"Employee ID"}
                                value={employeeID}
                                onChange={(e) => {
                                    setEmployeeID(e.target.value);
                                    if (errors.employeeID) {
                                        setErrors({ ...errors, employeeID: undefined });
                                    }
                                }}
                                options={
                                    employees.map((employee) => ({
                                        value: employee.id,
                                        label: `${employee.id} - ${employee.first_name} ${employee.last_name}`,
                                    }))
                                }
                                placeholder="Select employee"
                                error={errors.employeeID}
                            />
                            <FormInput
                                label={"Penalty Amount"}
                                type="number"
                                placeholder="Enter penalty amount"
                                value={penaltyAmount}
                                onChange={(e) => {
                                    setPenaltyAmount(e.target.value);
                                    if (errors.penaltyAmount) {
                                        setErrors({ ...errors, penaltyAmount: undefined });
                                    }
                                }}
                                error={errors.penaltyAmount}
                            />
                          
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Penalty Description
                                </label>

                                <textarea
                                    value={penaltyDescription}
                                    onChange={(e) => {
                                        validateNameFormat(e.target.value, setPenaltyDescription, 200)
                                        if (errors.penaltyDescription) {
                                            setErrors(prev => ({ ...prev, penaltyDescription: undefined }));
                                        }
                                    }}
                                    rows={4}
                                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 resize-none ${errors.penaltyDescription ? 'border-red-500 ring-red-500' : 'border-[#d6c3aa] focus:ring-[#3b2b1c]'}`}
                                    placeholder="Enter the reason for the penalty"
                                />
                                {errors.penaltyDescription && <p className="text-red-500 text-sm mt-1">{errors.penaltyDescription}</p>}
                            </div>
                            
                          
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end mt-6">
                            <ActionButton
                                onClick={handleSave}
                                label={loading ? "Saving..." : "Save"}
                                icon={Save}
                                disabled={loading}
                            />
                        </div>


                
                    </motion.div>
                
                </motion.div>
                
            )}
        </AnimatePresence>
    );
}