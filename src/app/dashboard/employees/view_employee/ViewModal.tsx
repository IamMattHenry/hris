"use client"

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    id: number;
}

export default function ViewModal({ isOpen, onClose, id }: EmployeeModalProps) {
    if (!isOpen) return null;

    const handleCloseModal = () => {
        onClose();
    }



    return (
        <>
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={handleCloseModal}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#f9ecd7] w-full max-w-4xl p-8 rounded-2xl shadow-lg relative"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* Close Button */}
                    <button
                        onClick={handleCloseModal}
                        className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70 text-xl font-bold"
                    >
                        &times;
                    </button>

                <h1>{`Employee ID: ${id}`}</h1>


                </motion.div>
            </div>
        </>
    );

}