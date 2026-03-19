"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { payrollApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

type HolidayType = "regular" | "special";

interface HolidayOverride {
  date: string;
  name: string;
  type: HolidayType;
}

interface PayrollSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Optional callback if parent wants to know settings were saved
  // onSettingsSaved?: () => void;
}

export default function PayrollSettingsModal({
  isOpen,
  onClose,
}: PayrollSettingsModalProps) {
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
    if (!isOpen) return;

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
      showToast.error(error.message || "Failed to load payroll settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [isOpen]);

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
    setHolidayOverrides((prev) => prev.filter((_, i) => i !== index));
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

      showToast.success("Payroll settings saved successfully");

      // Optional: refresh after save
      await fetchSettings();

      // You can choose to close automatically or keep open
      // onClose();
    } catch (error: any) {
      showToast.error(error.message || "Failed to save payroll settings");
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
            bg-[#FAF6F1] rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] 
            flex flex-col overflow-hidden border border-[#E8D9C4]
            animate-in fade-in zoom-in-95 duration-200
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E8D9C4] flex items-center justify-between bg-[#F3E5CF]/60">
            <div>
              <h2 className="text-xl font-bold text-[#3D1A0B]">Payroll Settings</h2>
              <p className="text-sm text-[#3D1A0B]/70">
                Configure pay schedule, allowances, de minimis caps & holiday overrides
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#E8D9C4]/40 transition"
              disabled={loading || saving}
            >
              <X className="h-5 w-5 text-[#3D1A0B]" />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
                <p className="mt-4 text-[#3D1A0B]">Loading payroll settings...</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Settings */}
              <div className="grid sm:grid-cols-3 gap-4">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Company Name</span>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
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
                  <span className="text-sm font-medium">Monthly Work Days</span>
                  <input
                    type="number"
                    min="1"
                    value={monthlyWorkDays}
                    onChange={(e) => setMonthlyWorkDays(e.target.value)}
                    className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  />
                </label>
              </div>

              {/* Allowances & Caps */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-[#3D1A0B]">Allowance Configuration</h3>
                  <label className="block space-y-1.5">
                    <span className="text-sm">Rice Subsidy (Monthly)</span>
                    <input
                      type="number"
                      value={riceSubsidyMonthly}
                      onChange={(e) => setRiceSubsidyMonthly(e.target.value)}
                      className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm">Clothing Allowance (Annual)</span>
                    <input
                      type="number"
                      value={clothingAnnual}
                      onChange={(e) => setClothingAnnual(e.target.value)}
                      className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                    />
                  </label>
                </div>

                <div className="bg-[#F3E5CF] border border-[#E8D9C4] rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-[#3D1A0B]">De Minimis Caps</h3>
                  <label className="block space-y-1.5">
                    <span className="text-sm">Rice Subsidy Cap (Monthly)</span>
                    <input
                      type="number"
                      value={riceCap}
                      onChange={(e) => setRiceCap(e.target.value)}
                      className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm">Clothing Cap (Annual)</span>
                    <input
                      type="number"
                      value={clothingCap}
                      onChange={(e) => setClothingCap(e.target.value)}
                      className="w-full bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                    />
                  </label>
                </div>
              </div>

              {/* Holiday Overrides */}
              <div className="bg-white border border-[#E8D9C4] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-[#3D1A0B]">Holiday Overrides</h3>

                <div className="grid sm:grid-cols-4 gap-3">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  />
                  <input
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="Holiday name"
                    className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  />
                  <select
                    value={newHolidayType}
                    onChange={(e) => setNewHolidayType(e.target.value as HolidayType)}
                    className="bg-white border border-[#E8D9C4] rounded-lg px-3 py-2"
                  >
                    <option value="regular">Regular Holiday</option>
                    <option value="special">Special Holiday</option>
                  </select>
                  <button
                    onClick={addHolidayOverride}
                    className="px-4 py-2 rounded-lg bg-[#3D1A0B] text-white hover:bg-[#3D1A0B]/90 transition font-medium"
                  >
                    Add Holiday
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {holidayOverrides.length === 0 ? (
                    <p className="text-sm text-[#3D1A0B]/70 py-4 text-center">
                      No holiday overrides configured yet.
                    </p>
                  ) : (
                    holidayOverrides.map((holiday, index) => (
                      <div
                        key={`${holiday.date}-${holiday.name}-${index}`}
                        className="flex items-center justify-between bg-[#FAF6F1] border border-[#E8D9C4] rounded-lg px-4 py-2.5"
                      >
                        <div>
                          <p className="font-medium">
                            {holiday.date} • {holiday.name}
                          </p>
                          <p className="text-xs text-[#3D1A0B]/70 uppercase mt-0.5">
                            {holiday.type}
                          </p>
                        </div>
                        <button
                          onClick={() => removeHolidayOverride(index)}
                          className="text-sm px-3 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E8D9C4] bg-[#F3E5CF]/40 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving || loading}
              className="px-6 py-2.5 rounded-lg border border-[#E8D9C4] hover:bg-[#FAF6F1] transition disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <ActionButton
              label={saving ? "Saving..." : "Save Settings"}
              onClick={saveSettings}
              icon={Save}
              disabled={saving || loading}
            />
          </div>
        </div>
      </div>
    </>
  );
}