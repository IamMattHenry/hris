"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { departmentApi } from "@/lib/api";
import { Department } from "@/types/api";

export default function BudgetForm() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    department_id: "",
    department_name: "",
    amount: "",
    budgetName: "",
    senderName: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await departmentApi.getAll();
        if (response.success && Array.isArray(response.data)) {
          setDepartments(response.data as Department[]);
        } else {
          setDepartments([]);
        }
      } catch {
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Log the form data (currently no backend endpoint specified)
      console.log("Finance Form Data Submitted:", formData);
      toast.success("Finance request submitted successfully!");
      
      // Reset form
      setFormData({
        department_id: "",
        department_name: "",
        amount: "",
        budgetName: "",
        senderName: "",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit finance request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 min-h-screen font-poppins bg-[#fff7ec] flex flex-col items-center">
      <div className="w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-semibold text-[#3b2b1c]">
          Budget Request Form
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Fill up the details below to submit a new finance or budget request.
        </p>
      </div>

      <div className="bg-white w-full max-w-4xl p-8 rounded-lg shadow-sm border border-[#d6c3aa]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2">
              <label htmlFor="department_id" className="text-sm font-medium text-[#3b2b1c]">
                Department
              </label>
              <select
                id="department_id"
                name="department_id"
                value={formData.department_id}
                onChange={(e) => {
                  const selectedDepartment = departments.find(
                    (department) => String(department.department_id) === e.target.value
                  );
                  setFormData((prev) => ({
                    ...prev,
                    department_id: e.target.value,
                    department_name: selectedDepartment?.department_name || "",
                  }));
                }}
                required
                className="px-4 py-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c] text-[#3b2b1c]"
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.department_id} value={department.department_id}>
                    {department.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="department_name" className="text-sm font-medium text-[#3b2b1c]">
                Department Name
              </label>
              <input
                type="text"
                id="department_name"
                name="department_name"
                value={formData.department_name}
                onChange={handleChange}
                readOnly
                className="px-4 py-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c] text-[#3b2b1c]"
                placeholder="Auto-filled from selected department"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="budgetName" className="text-sm font-medium text-[#3b2b1c]">
              Budget Name
            </label>
            <input
              type="text"
              id="budgetName"
              name="budgetName"
              value={formData.budgetName}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c] text-[#3b2b1c]"
              placeholder="e.g. Payroll, Operations, etc."
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="amount" className="text-sm font-medium text-[#3b2b1c]">
              Amount
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c] text-[#3b2b1c]"
              placeholder="Enter Amount"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="senderName" className="text-sm font-medium text-[#3b2b1c]">
              Name of Sender
            </label>
            <input
              type="text"
              id="senderName"
              name="senderName"
              value={formData.senderName}
              onChange={handleChange}
              required
              className="px-4 py-2 border border-[#d6c3aa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2b1c] text-[#3b2b1c]"
              placeholder="Enter your name"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#3b2b1c] text-white rounded-lg hover:bg-opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
