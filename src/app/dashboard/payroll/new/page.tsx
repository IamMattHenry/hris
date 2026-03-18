"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save } from "lucide-react";
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

const today = new Date().toISOString().slice(0, 10);

export default function NewPayrollRunPage() {
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
        setDepartments((departmentRes.data || []).map((dept: any) => ({
          department_id: Number(dept.department_id),
          department_name: String(dept.department_name || ""),
        })));
      }

      if (settingsRes.success && settingsRes.data?.current?.pay_schedule) {
        setPaySchedule(settingsRes.data.current.pay_schedule);
      }
    } catch (error: any) {
      showToast.error(error.message || "Failed to load payroll setup data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

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
      const employmentTypeMatch = !employmentType || String(emp.employment_type || "").toLowerCase() === employmentType.toLowerCase();
      return (name.includes(q) || code.includes(q)) && departmentMatch && employmentTypeMatch;
    });
  }, [employees, search, departmentId, employmentType]);

  const toggle = (employeeId: number) => {
    setSelected((prev) => (prev.includes(employeeId)
      ? prev.filter((id) => id !== employeeId)
      : [...prev, employeeId]));
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
      router.push(`/dashboard/payroll/${response.data.id}`);
    } catch (error: any) {
      showToast.error(error.message || "Failed to create payroll run");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading payroll setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 text-[#3D1A0B] font-poppins">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Payroll Run</h1>
          <p className="text-sm text-[#3D1A0B]/70">Select period, schedule, and employees for this run.</p>
        </div>
        <Link href="/dashboard/payroll" className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
          Back to Payroll
        </Link>
      </div>

      <div className="grid md:grid-cols-6 gap-4">
        <label className="space-y-2">
          <span className="text-sm">Pay Period Start</span>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
        </label>
        <label className="space-y-2">
          <span className="text-sm">Pay Period End</span>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
        </label>
        <label className="space-y-2">
          <span className="text-sm">Pay Schedule</span>
          <select value={paySchedule} onChange={(e) => setPaySchedule(e.target.value as any)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2">
            <option value="weekly">Weekly</option>
            <option value="semi-monthly">Semi-Monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm">Department (Optional)</span>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2">
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.department_id} value={String(dept.department_id)}>{dept.department_name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm">Type of Work (Optional)</span>
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2">
            <option value="">All Types</option>
            {employmentTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm">Notes (Optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payroll batch note" className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
        </label>
      </div>

      <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <SearchBar placeholder="Search employees" value={search} onChange={setSearch} />
          <button onClick={selectAllVisible} className="px-4 py-2 rounded-lg bg-white border border-[#E8D9C4] hover:bg-[#FAF6F1] transition">
            Toggle Select Visible
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto rounded-lg border border-[#E8D9C4] bg-white">
          {filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-[#3D1A0B]/70">No employees found.</div>
          ) : (
            filteredEmployees.map((emp) => {
              const checked = selected.includes(emp.employee_id);
              return (
                <label key={emp.employee_id} className="flex items-center justify-between px-4 py-3 border-b border-[#F3E5CF] last:border-b-0 hover:bg-[#FAF6F1] cursor-pointer">
                  <div>
                    <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-sm text-[#3D1A0B]/70">{emp.employee_code || `EMP-${emp.employee_id}`}</p>
                  </div>
                  <input type="checkbox" checked={checked} onChange={() => toggle(emp.employee_id)} className="h-4 w-4" />
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <ActionButton label={saving ? "Creating..." : "Create Payroll Run"} onClick={handleCreate} icon={Save} disabled={saving} />
      </div>
    </div>
  );
}
