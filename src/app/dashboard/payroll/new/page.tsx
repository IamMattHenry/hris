"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { departmentApi, employeeApi, payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";
import Payroll2FAModal, { type TwoFAMethod } from "@/components/payroll/Payroll2FAModal";

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
  department_budget_id?: number;
  amount: number;
}

interface NewPayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (payrollRunId: number) => void; // optional: if parent wants the new ID
}

const toDateInputString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getYesterdayDate = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return toDateInputString(now);
};

const derivePayPeriodFromSchedule = (
  referenceDate: string,
  paySchedule: "semi-monthly" | "monthly"
) => {
  const date = parseDateInput(referenceDate);
  if (!date) {
    return {
      start: referenceDate,
      end: referenceDate,
    };
  }

  if (paySchedule === "monthly") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      start: toDateInputString(start),
      end: toDateInputString(end),
    };
  }

  const dayOfMonth = date.getDate();
  if (dayOfMonth <= 15) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth(), 15);
    return {
      start: toDateInputString(start),
      end: toDateInputString(end),
    };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 16);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: toDateInputString(start),
    end: toDateInputString(end),
  };
};

const today = toDateInputString(new Date());
const defaultReferenceDate = getYesterdayDate();
const defaultPeriod = derivePayPeriodFromSchedule(defaultReferenceDate, "semi-monthly");

export default function NewPayrollRunModal(props: any) {
  const {
    isOpen,
    onClose,
    onSave,
  } = props as NewPayrollRunModalProps;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [referenceDate, setReferenceDate] = useState(defaultReferenceDate);
  const [periodStart, setPeriodStart] = useState(defaultPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.end);
  const [paySchedule, setPaySchedule] = useState<"semi-monthly" | "monthly">("semi-monthly");
  const [departmentId, setDepartmentId] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [notes, setNotes] = useState("");
  const [payrollBudget, setPayrollBudget] = useState<FinanceBudget | null>(null);

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);

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
          const schedule = settingsRes.data.current.pay_schedule === "monthly"
            ? "monthly"
            : "semi-monthly";
          setPaySchedule(schedule);
          const alignedPeriod = derivePayPeriodFromSchedule(defaultReferenceDate, schedule);
          setPeriodStart(alignedPeriod.start);
          setPeriodEnd(alignedPeriod.end);
        }

        const latestPayrollBudget = settingsRes.data?.budgets?.payroll;
        if (settingsRes.success && latestPayrollBudget) {
          setPayrollBudget({
            budget_id: Number(latestPayrollBudget.budget_id),
            department_budget_id: Number(latestPayrollBudget.department_budget_id),
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
      setReferenceDate(defaultReferenceDate);
      const resetPeriod = derivePayPeriodFromSchedule(defaultReferenceDate, "semi-monthly");
      setPeriodStart(resetPeriod.start);
      setPeriodEnd(resetPeriod.end);
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

  /** Called before creation — validates inputs then opens 2FA modal */
  const handleCreateClick = () => {
    if (!periodStart || !periodEnd) {
      showToast.error("Please choose a pay period.");
      return;
    }
    if (periodEnd >= today) {
      showToast.error(`Payroll period must be completed. Please choose a reference date before ${today}.`);
      return;
    }
    setShow2FAModal(true);
  };

  /** Called after 2FA is verified — actually creates the run */
  const handleCreate = async (twoFASessionId: number, _method: TwoFAMethod) => {
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
        twofa_session_id: twoFASessionId,
      } as any);

      if (!response.success || !response.data?.id) {
        throw new Error(response.message || "Failed to create payroll run");
      }

      showToast.success("Payroll run created successfully");
      onSave?.(response.data.id);
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
              <div className="grid md:grid-cols-5 gap-4">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Reference Date</span>
                  <input
                    type="date"
                    value={referenceDate}
                    onChange={(e) => {
                      const nextReferenceDate = e.target.value;
                      setReferenceDate(nextReferenceDate);
                      const alignedPeriod = derivePayPeriodFromSchedule(nextReferenceDate, paySchedule);
                      setPeriodStart(alignedPeriod.start);
                      setPeriodEnd(alignedPeriod.end);
                    }}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Pay Period End</span>
                  <input
                    type="date"
                    value={periodEnd}
                    readOnly
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#3D1A0B]/30"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Pay Schedule</span>
                  <select
                    value={paySchedule}
                    onChange={(e) => {
                      const schedule = e.target.value as "semi-monthly" | "monthly";
                      setPaySchedule(schedule);
                      const alignedPeriod = derivePayPeriodFromSchedule(referenceDate, schedule);
                      setPeriodStart(alignedPeriod.start);
                      setPeriodEnd(alignedPeriod.end);
                    }}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  >
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
              </div>

              {/* Second Row for Notes */}
              <div className="w-full relative">
                <label className="space-y-1.5 block">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Notes (opt)</span>
                    <span className={`text-xs ${notes.length > 200 ? 'text-red-500 font-bold' : 'text-[#3D1A0B]/60'}`}>
                      {notes.length} / 200
                    </span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setNotes(e.target.value);
                      }
                    }}
                    placeholder="Payroll batch note"
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 resize-y"
                    rows={2}
                    maxLength={500}
                  />
                </label>
              </div>

              <div className="rounded-lg border border-[#E8D9C4] bg-white px-4 py-3 text-sm text-[#3D1A0B]">
                <p className="font-medium">
                  Latest Payroll Budget: {formatCurrency(payrollBudget?.amount)}
                </p>
                {payrollBudget?.department_budget_id ? (
                  <p className="text-xs text-[#3D1A0B]/70 mt-1">
                    Source: Budget from the Finance Department
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
              onClick={handleCreateClick}
              icon={Save}
              disabled={saving || loading}
            />
          </div>
        </div>
      </div>

      {/* 2FA Modal — shown before creating the run */}
      <Payroll2FAModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        actionType="payroll_create"
        onVerified={(sessionId, method) => {
          setShow2FAModal(false);
          handleCreate(sessionId, method);
        }}
      />
    </>
  );
}