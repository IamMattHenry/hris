"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { employeeApi } from "@/lib/api";
import { Employee } from "@/types/api";

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);

      const result = await employeeApi.getAll();

      if (result.success && result.data) {
        setEmployees(result.data as Employee[]);
      } else {
        setError(result.message || "Failed to fetch employees");
      }

      setLoading(false);
    };

    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4B0B14] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#4B0B14] text-white px-6 py-2 rounded-lg hover:bg-[#60101C] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate statistics from real employee data
  const employeeCount = employees.length;
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;

  // Gender statistics
  const maleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'male').length;
  const femaleCount = employees.filter(emp => emp.gender?.toLowerCase() === 'female').length;
  const otherCount = employees.filter(emp => emp.gender && !['male', 'female'].includes(emp.gender.toLowerCase())).length;

  const genderData = [
    { name: 'Male', value: maleCount, color: '#3b82f6' },
    { name: 'Female', value: femaleCount, color: '#ec4899' },
    ...(otherCount > 0 ? [{ name: 'Other', value: otherCount, color: '#8b5cf6' }] : []),
  ];

  // Position statistics
  const positionCounts = employees.reduce((acc: { [key: string]: number }, emp) => {
    const position = emp.position_name || 'Unassigned';
    acc[position] = (acc[position] || 0) + 1;
    return acc;
  }, {});

  const positionData = Object.entries(positionCounts).map(([name, value]) => ({
    name,
    value,
  }));
  return (
    <div className="min-h-screen p-8 space-y-8 font-poppins text-[#3C1E1E]">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Employee Count", value: employeeCount },
          { title: "Active Employees", value: activeEmployees },
          { title: "Available Positions", value: 15 },
          { title: "No. Of Leave", value: 21 },
          { title: "No. Of Absence", value: 29 },
          { title: "No. Of Requests", value: 32 },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-[#fff4e6] border border-orange-200 rounded-xl shadow-md p-5 py-8 text-center hover:shadow-lg transition"
          >
            <h2 className="text-3xl font-bold text-orange-800">{item.value}</h2>
            <p className="text-sm text-gray-700 mt-2">{item.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Chart */}
        <div className="bg-[#fff4e6] border border-orange-200 rounded-xl shadow-md p-5">
          <h3 className="font-semibold mb-4">Gender Distribution</h3>
          {genderData.length > 0 ? (
            <>
              <div className="flex justify-center">
                <ResponsiveContainer width="80%" height={250}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      innerRadius={50}
                      label
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {genderData.map((g, i) => {
                  const total = genderData.reduce((sum, item) => sum + item.value, 0);
                  const percentage = total > 0 ? ((g.value / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={i} className="flex items-center space-x-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: g.color }}
                      ></span>
                      <span>
                        {g.name}: {g.value} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-8">No gender data available</p>
          )}
        </div>

        {/* Position Chart */}
        <div className="bg-[#fff4e6] border border-orange-200 rounded-xl shadow-md p-5">
          <h3 className="font-semibold mb-4">Positions</h3>
          {positionData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={positionData}>
                    <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" barSize={60} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No position data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
