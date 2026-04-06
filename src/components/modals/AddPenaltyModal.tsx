"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import ActionButton from "@/components/buttons/ActionButton";
import { employeeApi, penaltyApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import FormSelect from "@/components/forms/FormSelect";

interface AddPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const PENALTY_TYPE_OPTIONS = [
  "Late Arrival",
  "Unapproved Absence",
  "Policy Violation",
  "Property Damage",
  "Dress Code",
  "Other",
];

const DEDUCTION_MODE_OPTIONS = [
  { value: "none", label: "No Payroll Deduction" },
  { value: "full", label: "Full Amount on Next Payroll" },
  { value: "next_payroll", label: "Next Payroll" },
  { value: "installment", label: "Installment" },
  { value: "manual", label: "Manual Settlement" },
];

export default function AddPenaltyModal({
  isOpen,
  onClose,
  onSaved,
}: AddPenaltyModalProps) {
  const [penaltyTitle, setPenaltyTitle] = useState("");
  const [penaltyType, setPenaltyType] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltyDescription, setPenaltyDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [deductionMode, setDeductionMode] = useState("none");
  const [installmentCount, setInstallmentCount] = useState("");

  const [errors, setErrors] = useState<{
    penaltyTitle?: string;
    penaltyType?: string;
    employeeId?: string;
    penaltyAmount?: string;
    penaltyDescription?: string;
    incidentDate?: string;
    issuedDate?: string;
    installmentCount?: string;
  }>({});

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      const result = await employeeApi.getAll({ status: "active" });
      if (result.success && result.data) {
        setEmployees(result.data as any[]);
      } else {
        toast.error(result.message || "Failed to fetch employees.");
      }
      setLoading(false);
    };

    if (isOpen) {
      const today = new Date().toISOString().slice(0, 10);
      setIncidentDate(today);
      setIssuedDate(today);
      fetchEmployees();
    }
  }, [isOpen]);

  const resetForm = () => {
    setPenaltyTitle("");
    setPenaltyType("");
    setPenaltyAmount("");
    setPenaltyDescription("");
    setEmployeeId("");
    setDeductionMode("none");
    setInstallmentCount("");
    setErrors({});
  };

  const handleSave = async () => {
    const nextErrors: typeof errors = {};

    if (!penaltyTitle.trim()) nextErrors.penaltyTitle = "Penalty title is required.";
    if (!penaltyType.trim()) nextErrors.penaltyType = "Penalty type is required.";
    if (!employeeId) nextErrors.employeeId = "Employee is required.";

    const amountNumber = Number(penaltyAmount);
    if (!penaltyAmount || Number.isNaN(amountNumber) || amountNumber < 0) {
      nextErrors.penaltyAmount = "Please enter a valid non-negative amount.";
    }

    if (!penaltyDescription.trim()) nextErrors.penaltyDescription = "Description is required.";
    if (!incidentDate) nextErrors.incidentDate = "Incident date is required.";
    if (!issuedDate) nextErrors.issuedDate = "Issued date is required.";

    if (deductionMode === "installment") {
      const installments = Number(installmentCount);
      if (!installmentCount || Number.isNaN(installments) || installments < 1) {
        nextErrors.installmentCount = "Installment count must be at least 1.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    const result = await penaltyApi.create({
      employee_id: Number(employeeId),
      penalty_type: penaltyType,
      title: penaltyTitle,
      description: penaltyDescription,
      amount: amountNumber,
      incident_date: incidentDate,
      issued_date: issuedDate,
      payroll_deduction_mode: deductionMode as any,
      installment_count: deductionMode === "installment" ? Number(installmentCount) : null,
      installment_frequency: deductionMode === "installment" ? "per_payroll" : null,
      status: "pending",
    });

    setSaving(false);

    if (!result.success) {
      toast.error(result.message || "Failed to create penalty.");
      return;
    }

    toast.success("Penalty added successfully.");
    resetForm();
    onClose();
    onSaved?.();
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#3b2b1c]">Add Penalty</h2>
              <button onClick={onClose}>
                <X className="text-[#3b2b1c]" />
              </button>
            </div>

            <div className="space-y-4 text-[#3b2b1c]">
              <FormInput
                label="Penalty Title"
                type="text"
                placeholder="Enter penalty title"
                value={penaltyTitle}
                onChange={(e) => setPenaltyTitle(e.target.value)}
                error={errors.penaltyTitle}
              />

              <FormSelect
                label="Penalty Type"
                value={penaltyType}
                onChange={(e) => setPenaltyType(e.target.value)}
                options={PENALTY_TYPE_OPTIONS}
                placeholder="Select penalty type"
                error={errors.penaltyType}
              />

              <FormSelect
                label="Employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                options={employees.map((employee) => ({
                  value: String(employee.employee_id || employee.id),
                  label: `${employee.employee_code || employee.employee_id} - ${employee.first_name} ${employee.last_name}`,
                }))}
                placeholder={loading ? "Loading employees..." : "Select employee"}
                error={errors.employeeId}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Incident Date"
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  error={errors.incidentDate}
                />
                <FormInput
                  label="Issued Date"
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  error={errors.issuedDate}
                />
              </div>

              <FormInput
                label="Penalty Amount"
                type="number"
                placeholder="Enter penalty amount"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                error={errors.penaltyAmount}
              />

              <FormSelect
                label="Payroll Deduction Mode"
                value={deductionMode}
                onChange={(e) => setDeductionMode(e.target.value)}
                options={DEDUCTION_MODE_OPTIONS}
                placeholder="Select deduction mode"
              />

              {deductionMode === "installment" && (
                <FormInput
                  label="Installment Count"
                  type="number"
                  placeholder="e.g. 3"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  error={errors.installmentCount}
                />
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Penalty Description</label>
                <textarea
                  value={penaltyDescription}
                  onChange={(e) => setPenaltyDescription(e.target.value.slice(0, 2000))}
                  rows={4}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 resize-none ${errors.penaltyDescription ? "border-red-500 ring-red-500" : "border-[#d6c3aa] focus:ring-[#3b2b1c]"}`}
                  placeholder="Enter the reason for the penalty"
                />
                {errors.penaltyDescription && (
                  <p className="text-red-500 text-sm mt-1">{errors.penaltyDescription}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <ActionButton
                onClick={handleSave}
                label={saving ? "Saving..." : "Save"}
                icon={Save}
                disabled={saving}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
