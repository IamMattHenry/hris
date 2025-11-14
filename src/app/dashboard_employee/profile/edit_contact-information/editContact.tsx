"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { employeeApi } from "@/lib/api";
import FormInput from "@/components/forms/FormInput";

interface EditContactsModalProps {
    isOpen: boolean;
    onClose: () => void;
    id: number | null;
}

interface EmployeeData {
    employee_id: number;
    contacts?: { contact_number: string }[];
}

export default function EditContactsModal({
    isOpen,
    onClose,
    id,
}: EditContactsModalProps) {
    const [employee, setEmployee] = useState<EmployeeData | null>(null);
    const [contacts, setContacts] = useState<string[]>([""]);
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* ---------- Fetch employee contacts ---------- */
    useEffect(() => {
        if (isOpen && id) fetchEmployeeContacts(id);
    }, [isOpen, id]);

    const fetchEmployeeContacts = async (empId: number) => {
        try {
            const res = await employeeApi.getById(empId);
            if (res.success && res.data) {
                setEmployee(res.data);

                // Populate contacts from API
                const contactList =
                    res.data.contact_numbers?.map((c: any) => formatPHNumber(c.contact_number || c)) ?? [""];

                // If no contacts exist, show one empty input
                setContacts(contactList.length ? contactList : [""]);
            }
        } catch (err) {
            console.error("❌ Error fetching contacts:", err);
        }
    };

    /* ---------- Format PH mobile number with spacing ---------- */
    const formatPHNumber = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 11); // Only 11 digits
        if (digits.length <= 4) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    };

    /* ---------- Input handlers ---------- */
    const handleContactChange = (index: number, value: string) => {
        // Remove all non-digit characters
        let digits = value.replace(/\D/g, "").slice(0, 11);

        // Automatically prepend "09" if missing
        if (!digits.startsWith("09")) {
            digits = "09" + digits.replace(/^0?9?/, "");
        }

        // Format with spacing
        let formatted = "";
        if (digits.length <= 4) formatted = digits;
        else if (digits.length <= 7) formatted = `${digits.slice(0, 4)} ${digits.slice(4)}`;
        else formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;

        const updated = [...contacts];
        updated[index] = formatted;
        setContacts(updated);

        // Validation
        if (!/^09\d{9}$/.test(digits)) {
            setErrors((prev) => ({
                ...prev,
                [index]: "Invalid PH mobile number (must start with 09 and 11 digits)",
            }));
        } else {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
            });
        }
    };


    const addContact = () => setContacts([...contacts, ""]);
    const removeContact = (index: number) => {
        setContacts(contacts.filter((_, i) => i !== index));
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[index];
            return newErrors;
        });
    };

    /* ---------- Submit ---------- */
    const handleSubmit = async () => {
        if (!employee) return;

        const formErrors: Record<number, string> = {};
        const validContacts: string[] = [];

        contacts.forEach((c, i) => {
            const digits = c.replace(/\s/g, "");
            if (!/^09\d{9}$/.test(digits)) {
                formErrors[i] =
                    "Invalid PH mobile number. Must start with 09 and have 11 digits.";
            } else {
                validContacts.push(digits);
            }
        });

        setErrors(formErrors);
        if (Object.keys(formErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            const payload = { contact_numbers: validContacts };
            const result = await employeeApi.update(employee.employee_id, payload);
            if (result.success) {
                toast.success("Contact numbers updated successfully!");
                onClose();

                setTimeout(() => {
                    window.location.reload();
                }, 300);
            } else {
                toast.error(result.message || "Failed to update contacts.");
            }
        } catch (err) {
            console.error("Error updating contacts:", err);
            toast.error("An error occurred while updating contacts.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-[#fdf3e2] w-full max-w-3xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
                >
                    <X size={26} />
                </button>

                <h2 className="text-2xl font-semibold mb-1">Edit Contact Numbers</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Update your contact numbers below (PH mobile numbers only)
                </p>

                {employee ? (
                    <div className="space-y-4">
                        {contacts.map((contact, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <FormInput
                                    label=""
                                    type="text"
                                    value={contact}
                                    onChange={(e) => handleContactChange(i, e.target.value)}
                                    placeholder="0912 345 6789"
                                    error={errors[i]}
                                />
                                {contacts.length > 1 && (
                                    <button
                                        onClick={() => removeContact(i)}
                                        className="text-red-600 hover:text-red-800 font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={addContact}
                            className="text-sm text-[#4b0b14] hover:underline"
                        >
                            + Add another contact
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-gray-600">Loading contact info...</p>
                )}
                <div className="flex justify-end mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-[#4b0b14] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80 disabled:opacity-50"
                    >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
