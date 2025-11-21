"use client";

import { useState, useEffect } from "react";
import { employeeApi } from "@/lib/api";
import { EmployeeAvailability } from "@/types/api";

/**
 * Example component showing how to use the Employee Availability API
 * This can be used in any part of the system that needs to know which employees are available/offline
 */
export default function EmployeeAvailabilityExample() {
  const [employees, setEmployees] = useState<EmployeeAvailability[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    available: number;
    offline: number;
    on_leave: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const result = await employeeApi.getAvailability(selectedDate);
      if (result.success) {
        setEmployees(result.data);
        setSummary(result.summary);
      }
    } catch (error) {
      console.error("Failed to fetch employee availability:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter functions for easy access
  const availableEmployees = employees.filter(
    (e) => e.availability_status === "available"
  );
  const offlineEmployees = employees.filter(
    (e) => e.availability_status === "offline"
  );
  const onLeaveEmployees = employees.filter(
    (e) => e.availability_status === "on_leave"
  );

  if (loading) {
    return <div className="p-4">Loading employee availability...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Employee Availability</h2>

      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded">
            <div className="text-sm text-gray-600">Total Employees</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <div className="text-sm text-green-600">Available</div>
            <div className="text-2xl font-bold text-green-700">
              {summary.available}
            </div>
          </div>
          <div className="bg-gray-200 p-4 rounded">
            <div className="text-sm text-gray-600">Offline</div>
            <div className="text-2xl font-bold text-gray-700">
              {summary.offline}
            </div>
          </div>
          <div className="bg-blue-100 p-4 rounded">
            <div className="text-sm text-blue-600">On Leave</div>
            <div className="text-2xl font-bold text-blue-700">
              {summary.on_leave}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-4">
        <div className="flex gap-4">
          <button className="px-4 py-2 border-b-2 border-green-500 font-semibold">
            Available ({availableEmployees.length})
          </button>
          <button className="px-4 py-2 text-gray-600">
            Offline ({offlineEmployees.length})
          </button>
          <button className="px-4 py-2 text-gray-600">
            On Leave ({onLeaveEmployees.length})
          </button>
        </div>
      </div>

      {/* Employee List - Available */}
      <div className="space-y-2">
        {availableEmployees.map((emp) => (
          <div
            key={emp.employee_id}
            className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="font-semibold">
                {emp.employee_code} - {emp.full_name}
              </div>
              <div className="text-sm text-gray-600">
                {emp.position_name} • {emp.department_name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                  Available
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Time In: {emp.time_in ? new Date(emp.time_in).toLocaleTimeString() : "-"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {availableEmployees.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No employees are currently available
        </div>
      )}
    </div>
  );
}

