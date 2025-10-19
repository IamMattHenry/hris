"use client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const genderData = [
    { name: "Male", value: 45, color: "#1e40af" },
    { name: "Female", value: 30, color: "#f97316" },
    { name: "Other", value: 10, color: "#dc2626" },
];

const positionData = [
    { name: "Cleaners", value: 20 },
    { name: "Janitors", value: 10 },
    { name: "Manager", value: 3 },
    { name: "Receptionist", value: 10 },
    { name: "Waiter", value: 15 },
    { name: "Technicians", value: 15 },
    { name: "Security Guards", value: 15 },
];

export default function Dashboard() {
    return (
        <div className="min-h-screen p-8 space-y-8 font-poppins text-[#3C1E1E]">
            {/* Top Stats */}
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { title: "Employee Count", value: 100 },
                    { title: "No. Of Present", value: 50 },
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
                    <h3 className="font-semibold mb-4">Gender</h3>
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
                        {genderData.map((g, i) => (
                            <div key={i} className="flex items-center space-x-2">
                                <span
                                    className="inline-block w-3 h-3 rounded-full"
                                    style={{ backgroundColor: g.color }}
                                ></span>
                                <span>
                                    {g.name}: {g.value} ({((g.value / 85) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Position Chart */}
                <div className="bg-[#fff4e6] border border-orange-200 rounded-xl shadow-md p-5">
                    <h3 className="font-semibold mb-4">Positions</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]"> {/* Adjust width as needed */}
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
                </div>

            </div>
        </div>
    );
}
