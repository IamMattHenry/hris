"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { departmentApi, employeeApi, payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

interface Employee {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  status: string;
  department_id?: number;
  department_name?: string;
  employment_type?: string;
}

interface Department {
  department_id: number;
  department_name: string;
}

interface FinanceBudget {
  budget_id: number;
  amount: number;
}

interface NewPayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (payrollRunId: number) => void; // optional: if parent wants the new ID
}

const today = new Date().toISOString().slice(0, 10);

export default function NewPayrollRunModal({
  isOpen,
  onClose,
  onSave,
}: NewPayrollRunModalProps) {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [paySchedule, setPaySchedule] = useState<"weekly" | "semi-monthly" | "monthly">("semi-monthly");
  const [departmentId, setDepartmentId] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [notes, setNotes] = useState("");
  const [payrollBudget, setPayrollBudget] = useState<FinanceBudget | null>(null);

  const formatCurrency = (value?: number | null) => {
    if (value == null || Number.isNaN(Number(value))) return "₱0.00";
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  // ────────────────────────────────────────────────
  // Fetch data once when modal opens
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const fetchInitial = async () => {
      try {
        setLoading(true);
        const [employeeRes, settingsRes, departmentRes] = await Promise.all([
          employeeApi.getAll({ status: "active" }),
          payrollApi.getSettings(),
          departmentApi.getAll(),
        ]);

        if (employeeRes.success) {
          const data = (employeeRes.data || []).map((row: any) => ({
            employee_id: row.employee_id,
            employee_code: row.employee_code,
            first_name: row.first_name,
            last_name: row.last_name,
            status: row.status,
            department_id: row.department_id,
            department_name: row.department_name,
            employment_type: row.employment_type,
          }));
          setEmployees(data);
        }

        if (departmentRes.success) {
          setDepartments(
            (departmentRes.data || []).map((dept: any) => ({
              department_id: Number(dept.department_id),
              department_name: String(dept.department_name || ""),
            }))
          );
        }

        if (settingsRes.success && settingsRes.data?.current?.pay_schedule) {
          setPaySchedule(settingsRes.data.current.pay_schedule);
        }

        const latestPayrollBudget = settingsRes.data?.budgets?.payroll;
        if (settingsRes.success && latestPayrollBudget) {
          setPayrollBudget({
            budget_id: Number(latestPayrollBudget.budget_id),
            amount: Number(latestPayrollBudget.amount),
          });
        } else {
          setPayrollBudget(null);
        }
      } catch (error: any) {
        showToast.error(error.message || "Failed to load payroll setup data");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();

    // Optional: reset form when modal opens
    return () => {
      setSelected([]);
      setSearch("");
      setPeriodStart(today);
      setPeriodEnd(today);
      setDepartmentId("");
      setEmploymentType("");
      setNotes("");
      setPayrollBudget(null);
    };
  }, [isOpen]);

  const employmentTypeOptions = useMemo(() => {
    const options = Array.from(
      new Set(
        employees
          .map((emp) => String(emp.employment_type || "").trim())
          .filter(Boolean)
      )
    );
    return options.length ? options : ["regular", "probationary"];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const code = String(emp.employee_code || "").toLowerCase();
      const q = search.toLowerCase();
      const departmentMatch = !departmentId || Number(emp.department_id) === Number(departmentId);
      const employmentTypeMatch =
        !employmentType || String(emp.employment_type || "").toLowerCase() === employmentType.toLowerCase();
      return (name.includes(q) || code.includes(q)) && departmentMatch && employmentTypeMatch;
    });
  }, [employees, search, departmentId, employmentType]);

  const toggle = (employeeId: number) => {
    setSelected((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  const selectAllVisible = () => {
    const allIds = filteredEmployees.map((emp) => emp.employee_id);
    const allSelected = allIds.every((id) => selected.includes(id));

    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) {
      showToast.error("Please choose a pay period.");
      return;
    }

    try {
      setSaving(true);
      const response = await payrollApi.createRun({
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        pay_schedule: paySchedule,
        employee_ids: selected.length ? selected : undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
        employment_type: employmentType || undefined,
        notes,
      });

      if (!response.success || !response.data?.id) {
        throw new Error(response.message || "Failed to create payroll run");
      }

      showToast.success("Payroll run created successfully");

      const newId = response.data.id;

      // Two possible behaviors:
      // 1. Redirect (original behavior)
      // router.push(`/dashboard/payroll/${newId}`);

      // 2. Close modal + notify parent (more modal-friendly)
      onSave?.(newId);
      onClose();

    } catch (error: any) {
      showToast.error(error.message || "Failed to create payroll run");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 h-screen"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`
            bg-[#FAF6F1] rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] 
            flex flex-col overflow-hidden border border-[#E8D9C4]
            animate-in fade-in zoom-in-95 duration-200
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E8D9C4] flex items-center justify-between bg-[#F3E5CF]/60">
            <div>
              <h2 className="text-xl font-bold text-[#3D1A0B]">Create New Payroll Run</h2>
              <p className="text-sm text-[#3D1A0B]/70">
                Select period, schedule, and employees for this run
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#E8D9C4]/40 transition"
              disabled={saving}
            >
              <X className="h-5 w-5 text-[#3D1A0B]" />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
                <p className="mt-4 text-[#3D1A0B]">Loading payroll setup...</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Form row */}
              <div className="grid md:grid-cols-6 gap-4">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Pay Period Start</span>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Pay Period End</span>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Pay Schedule</span>
                  <select
                    value={paySchedule}
                    onChange={(e) => setPaySchedule(e.target.value as any)}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="semi-monthly">Semi-Monthly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Department (opt)</span>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Type of Work (opt)</span>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  >
                    <option value="">All Types</option>
                    {employmentTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2 lg:col-span-1">
                  <span className="text-sm font-medium">Notes (opt)</span>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payroll batch note"
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-[#E8D9C4] bg-white px-4 py-3 text-sm text-[#3D1A0B]">
                <p className="font-medium">
                  Latest Payroll Budget: {formatCurrency(payrollBudget?.amount)}
                </p>
                {payrollBudget?.budget_id ? (
                  <p className="text-xs text-[#3D1A0B]/70 mt-1">
                    Source: budget_category (budget_id #{payrollBudget.budget_id})
                  </p>
                ) : (
                  <p className="text-xs text-[#3D1A0B]/70 mt-1">
                    Budget data unavailable. Payroll creation will be blocked until Finance budget is configured.
                  </p>
                )}
              </div>

              {/* Employee selection */}
              <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <SearchBar placeholder="Search employees..." value={search} onChange={setSearch} />
                  <button
                    onClick={selectAllVisible}
                    className="px-4 py-2 rounded-lg bg-white border border-[#E8D9C4] hover:bg-[#FAF6F1] transition text-sm"
                  >
                    Toggle Visible
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto rounded-lg border border-[#E8D9C4] bg-white divide-y divide-[#F3E5CF]">
                  {filteredEmployees.length === 0 ? (
                    <div className="py-10 text-center text-[#3D1A0B]/60">
                      No employees match the current filters.
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const checked = selected.includes(emp.employee_id);
                      return (
                        <label
                          key={emp.employee_id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-[#FAF6F1] cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-sm text-[#3D1A0B]/70">
                              {emp.employee_code || `EMP-${emp.employee_id}`}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(emp.employee_id)}
                            className="h-4 w-4 rounded border-[#E8D9C4] text-[#3D1A0B] focus:ring-[#3D1A0B]/30"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E8D9C4] bg-[#F3E5CF]/40 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-[#E8D9C4] hover:bg-[#FAF6F1] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <ActionButton
              label={saving ? "Creating..." : "Create Payroll Run"}
              onClick={handleCreate}
              icon={Save}
              disabled={saving || loading}
            />
          </div>
        </div>
      </div>
    </>
  );
}