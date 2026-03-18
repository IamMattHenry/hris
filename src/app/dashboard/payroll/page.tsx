"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { departmentApi, payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

interface PayrollRun {
  id: number;
  pay_period_start: string;
  pay_period_end: string;
  pay_schedule: "weekly" | "semi-monthly" | "monthly";
  status: "draft" | "finalized";
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  employee_count: number;
  scope_filters?: {
    department_id?: number | null;
    employment_type?: string | null;
  };
}

interface Department {
  department_id: number;
  department_name: string;
}

const formatMoney = (value: number) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPeriod = (start: string, end: string) => {
  const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} - ${e}`;
};

export default function PayrollTable() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("");

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getRuns({
        department_id: departmentFilter || undefined,
        employment_type: employmentTypeFilter || undefined,
      });
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch payroll runs");
      }
      setRuns(response.data || []);
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch payroll runs");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch departments");
      }

      setDepartments((response.data || []).map((dept: any) => ({
        department_id: Number(dept.department_id),
        department_name: String(dept.department_name || ""),
      })));
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch departments");
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [departmentFilter, employmentTypeFilter]);

  const employmentTypeOptions = useMemo(() => {
    const fromRuns = runs
      .map((run) => String(run.scope_filters?.employment_type || "").trim())
      .filter(Boolean);

    const defaults = ["regular", "probationary", "full-time", "part-time"];
    return Array.from(new Set([...defaults, ...fromRuns]));
  }, [runs]);

  const resolveDepartmentName = (departmentId?: number | null) => {
    if (!departmentId) return "All Departments";
    const found = departments.find((dept) => dept.department_id === Number(departmentId));
    return found?.department_name || `Department #${departmentId}`;
  };

  const getScopeLabel = (run: PayrollRun) => {
    const departmentName = resolveDepartmentName(run.scope_filters?.department_id);
    const type = String(run.scope_filters?.employment_type || "").trim();
    return type ? `${departmentName} • ${type}` : departmentName;
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((run) =>
      String(run.id).includes(searchTerm) ||
      run.pay_schedule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getScopeLabel(run).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [runs, searchTerm, departments]);

  const summary = useMemo(() => {
    return filteredRuns.reduce(
      (acc, run) => {
        acc.gross += Number(run.gross_pay) || 0;
        acc.net += Number(run.net_pay) || 0;
        acc.employees += Number(run.employee_count) || 0;
        return acc;
      },
      { gross: 0, net: 0, employees: 0 }
    );
  }, [filteredRuns]);

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading payroll runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 overflow-hidden h-[90vh] shadow-inner relative font-poppins text-[#3D1A0B]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll Runs</h1>
          <p className="text-sm text-[#3D1A0B]/70">Current and historical payroll processing runs</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search run ID / schedule / status" value={searchTerm} onChange={setSearchTerm} />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.department_id} value={String(dept.department_id)}>{dept.department_name}</option>
            ))}
          </select>
          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {employmentTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <Link href="/dashboard/payroll/new">
            <ActionButton label="Create Payroll Run" onClick={() => undefined} icon={Plus} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#F3E5CF] p-6 rounded-xl shadow-sm border border-[#E8D9C4]">
          <p className="text-sm text-[#3D1A0B]/70">Total Gross Pay</p>
          <p className="text-2xl font-bold">{formatMoney(summary.gross)}</p>
        </div>
        <div className="bg-[#F3E5CF] p-6 rounded-xl shadow-sm border border-[#E8D9C4]">
          <p className="text-sm text-[#3D1A0B]/70">Total Net Pay</p>
          <p className="text-2xl font-bold">{formatMoney(summary.net)}</p>
        </div>
        <div className="bg-[#F3E5CF] p-6 rounded-xl shadow-sm border border-[#E8D9C4]">
          <p className="text-sm text-[#3D1A0B]/70">Employees Processed</p>
          <p className="text-2xl font-bold">{summary.employees}</p>
        </div>
      </div>

      <div className="overflow-x-auto shadow-sm bg-[#F3E5CF] rounded-lg border border-[#E8D9C4]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#3D1A0B] text-white">
              <th className="py-4 px-4 text-left">Run ID</th>
              <th className="py-4 px-4 text-left">Period</th>
              <th className="py-4 px-4 text-left">Scope</th>
              <th className="py-4 px-4 text-center">Schedule</th>
              <th className="py-4 px-4 text-center">Employees</th>
              <th className="py-4 px-4 text-right">Gross Pay</th>
              <th className="py-4 px-4 text-right">Deductions</th>
              <th className="py-4 px-4 text-right">Net Pay</th>
              <th className="py-4 px-4 text-center">Status</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-base bg-white">
            {filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-[#3D1A0B]/70">No payroll runs found.</td>
              </tr>
            ) : (
              filteredRuns.map((run) => (
                <tr key={run.id} className="border-b border-[#E8D9C4] hover:bg-[#FAF6F1] transition">
                  <td className="py-4 px-4 font-semibold">#{run.id}</td>
                  <td className="py-4 px-4">{formatPeriod(run.pay_period_start, run.pay_period_end)}</td>
                  <td className="py-4 px-4 text-sm">{getScopeLabel(run)}</td>
                  <td className="py-4 px-4 text-center uppercase">{run.pay_schedule}</td>
                  <td className="py-4 px-4 text-center">{run.employee_count}</td>
                  <td className="py-4 px-4 text-right">{formatMoney(run.gross_pay)}</td>
                  <td className="py-4 px-4 text-right text-red-700">{formatMoney(run.total_deductions)}</td>
                  <td className="py-4 px-4 text-right font-bold">{formatMoney(run.net_pay)}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      run.status === "finalized"
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {run.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Link href={`/dashboard/payroll/${run.id}`}>
                      <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3D1A0B] text-white hover:opacity-90 transition">
                        <Eye size={16} /> View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/dashboard/payroll/contributions">
          <button className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
            Contributions
          </button>
        </Link>
        <Link href="/dashboard/payroll/settings">
          <button className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
            Payroll Settings
          </button>
        </Link>
      </div>
    </div>
  );
}
