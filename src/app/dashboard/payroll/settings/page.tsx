"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

type HolidayType = "regular" | "special";

interface HolidayOverride {
  date: string;
  name: string;
  type: HolidayType;
}

export default function PayrollSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("HRIS Company");
  const [paySchedule, setPaySchedule] = useState<"weekly" | "semi-monthly" | "monthly">("semi-monthly");
  const [monthlyWorkDays, setMonthlyWorkDays] = useState("22");

  const [riceSubsidyMonthly, setRiceSubsidyMonthly] = useState("2000");
  const [clothingAnnual, setClothingAnnual] = useState("6000");
  const [riceCap, setRiceCap] = useState("2000");
  const [clothingCap, setClothingCap] = useState("6000");

  const [holidayOverrides, setHolidayOverrides] = useState<HolidayOverride[]>([]);

  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayType, setNewHolidayType] = useState<HolidayType>("special");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getSettings();
      if (!response.success || !response.data?.current) {
        throw new Error(response.message || "Failed to fetch payroll settings");
      }

      const current = response.data.current;
      setCompanyName(current.company_name || "HRIS Company");
      setPaySchedule(current.pay_schedule || "semi-monthly");
      setMonthlyWorkDays(String(current.monthly_work_days || 22));

      const allowances = current.allowances_config || {};
      setRiceSubsidyMonthly(String(allowances.rice_subsidy_monthly ?? 2000));
      setClothingAnnual(String(allowances.clothing_annual ?? 6000));

      const deMinimis = current.de_minimis_config || {};
      setRiceCap(String(deMinimis.rice_subsidy_monthly_cap ?? 2000));
      setClothingCap(String(deMinimis.clothing_annual_cap ?? 6000));

      setHolidayOverrides(Array.isArray(current.holiday_overrides) ? current.holiday_overrides : []);
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch payroll settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const addHolidayOverride = () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      showToast.error("Holiday date and name are required");
      return;
    }

    setHolidayOverrides((prev) => [
      ...prev,
      {
        date: newHolidayDate,
        name: newHolidayName.trim(),
        type: newHolidayType,
      },
    ]);

    setNewHolidayDate("");
    setNewHolidayName("");
    setNewHolidayType("special");
  };

  const removeHolidayOverride = (index: number) => {
    setHolidayOverrides((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await payrollApi.updateSettings({
        pay_schedule: paySchedule,
        company_name: companyName,
        monthly_work_days: Number(monthlyWorkDays),
        allowances_config: {
          rice_subsidy_monthly: Number(riceSubsidyMonthly),
          clothing_annual: Number(clothingAnnual),
          custom: [],
        },
        de_minimis_config: {
          rice_subsidy_monthly_cap: Number(riceCap),
          clothing_annual_cap: Number(clothingCap),
        },
        holiday_overrides: holidayOverrides,
        effective_date: new Date().toISOString().slice(0, 10),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to update payroll settings");
      }

      showToast.success("Payroll settings updated successfully");
      await fetchSettings();
    } catch (error: any) {
      showToast.error(error.message || "Failed to update payroll settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[90vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading payroll settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 text-[#3D1A0B] font-poppins">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payroll Settings</h1>
          <p className="text-sm text-[#3D1A0B]/70">Pay schedule, allowances, and holiday calendar settings</p>
        </div>
        <Link href="/dashboard/payroll" className="px-4 py-2 rounded-lg bg-[#F3E5CF] border border-[#E8D9C4] hover:bg-[#f1dfc2] transition">
          Back to Payroll
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <label className="space-y-2">
          <span className="text-sm">Company Name</span>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
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
          <span className="text-sm">Monthly Work Days</span>
          <input type="number" min="1" value={monthlyWorkDays} onChange={(e) => setMonthlyWorkDays(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Allowance Configuration</h2>
          <label className="block space-y-1">
            <span className="text-sm">Rice Subsidy (Monthly)</span>
            <input type="number" value={riceSubsidyMonthly} onChange={(e) => setRiceSubsidyMonthly(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Clothing Allowance (Annual)</span>
            <input type="number" value={clothingAnnual} onChange={(e) => setClothingAnnual(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
          </label>
        </div>

        <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">De Minimis Caps</h2>
          <label className="block space-y-1">
            <span className="text-sm">Rice Subsidy Cap (Monthly)</span>
            <input type="number" value={riceCap} onChange={(e) => setRiceCap(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Clothing Cap (Annual)</span>
            <input type="number" value={clothingCap} onChange={(e) => setClothingCap(e.target.value)} className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
          </label>
        </div>
      </div>

      <div className="bg-white border border-[#E8D9C4] rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Holiday Overrides</h2>

        <div className="grid md:grid-cols-4 gap-3">
          <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
          <input value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} placeholder="Holiday name" className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2" />
          <select value={newHolidayType} onChange={(e) => setNewHolidayType(e.target.value as HolidayType)} className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2">
            <option value="regular">Regular Holiday</option>
            <option value="special">Special Holiday</option>
          </select>
          <button onClick={addHolidayOverride} className="px-4 py-2 rounded-lg bg-[#3D1A0B] text-white">Add Holiday</button>
        </div>

        <div className="space-y-2">
          {holidayOverrides.length === 0 ? (
            <p className="text-sm text-[#3D1A0B]/70">No holiday overrides configured.</p>
          ) : (
            holidayOverrides.map((holiday, index) => (
              <div key={`${holiday.date}-${holiday.name}-${index}`} className="flex justify-between items-center bg-[#FAF6F1] border border-[#E8D9C4] rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium">{holiday.date} • {holiday.name}</p>
                  <p className="text-xs text-[#3D1A0B]/70 uppercase">{holiday.type}</p>
                </div>
                <button onClick={() => removeHolidayOverride(index)} className="text-sm px-3 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <ActionButton label={saving ? "Saving..." : "Save Payroll Settings"} onClick={saveSettings} icon={Save} disabled={saving} />
      </div>
    </div>
  );
}
