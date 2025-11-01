"use client";

import React, { useState, useEffect } from "react";
import { Eye, Search, Clock } from "lucide-react";

const ActivityLogTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // 🕒 Live update of date and time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🗓 Prevent selecting future date/time
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTimeValue = now.toTimeString().slice(0, 5);

  // 🧾 Mock Data
  const activities = [
    { id: "LOG-0009", name: "Juan Dela Cruz", position: "HR Assistant", activity: "Added Employee", date: "2025-10-30", time: "17:00" },
    { id: "LOG-0010", name: "John Doe", position: "Manager", activity: "Logged In", date: "2025-10-30", time: "15:00" },
    { id: "LOG-0011", name: "Maria Santos", position: "HR Manager", activity: "Updated Record", date: "2025-10-29", time: "10:30" },
    { id: "LOG-0012", name: "Pedro Ramos", position: "HR Specialist", activity: "Removed Employee", date: "2025-10-28", time: "13:15" },
    { id: "LOG-0013", name: "Lisa Tan", position: "HR Assistant", activity: "Logged Out", date: "2025-10-28", time: "17:00" },
    { id: "LOG-0014", name: "Ana Cruz", position: "HR Assistant", activity: "Added Employee", date: "2025-10-27", time: "11:00" },
    { id: "LOG-0015", name: "Mark Lee", position: "Manager", activity: "Updated Record", date: "2025-10-27", time: "09:00" },
    { id: "LOG-0016", name: "Sophia Reyes", position: "HR Officer", activity: "Logged In", date: "2025-10-26", time: "10:00" },
    { id: "LOG-0017", name: "Miguel Cruz", position: "Clerk", activity: "Logged Out", date: "2025-10-26", time: "18:00" },
    { id: "LOG-0018", name: "Catherine Uy", position: "HR Director", activity: "Added Employee", date: "2025-10-25", time: "14:00" },
    { id: "LOG-0019", name: "Robert Kim", position: "Supervisor", activity: "Logged In", date: "2025-10-25", time: "07:45" },
  ];

  // 🔍 Filter logic
  const filteredActivities = activities.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.activity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = date ? a.date === date : true;
    const matchesTime = time ? a.time.startsWith(time) : true;
    return matchesSearch && matchesDate && matchesTime;
  });

  return (
    <div className="p-6 bg-[#FAF1E4] rounded-lg space-y-6 overflow-hidden">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-[#4B0B14]">Activity Log</h2>
        <div className="flex items-center justify-between text-[#4B0B14] mt-1 text-sm font-medium">
          <p>{currentDate}</p>
          <p className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-[#4B0B14]" /> {currentTime}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FFF2E0] p-4 rounded-lg shadow-sm">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search activity or name..."
            className="pl-10 pr-4 py-2 rounded-lg border border-[#EAD7C4] bg-white focus:ring-2 focus:ring-[#D4A056] text-gray-700 w-72"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date & Time Filters */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="px-4 py-2 rounded-lg border border-[#EAD7C4] bg-white text-gray-700 focus:ring-2 focus:ring-[#D4A056]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
          />
          <input
            type="time"
            className="px-4 py-2 rounded-lg border border-[#EAD7C4] bg-white text-gray-700 focus:ring-2 focus:ring-[#D4A056]"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            max={date === today ? currentTimeValue : undefined}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-[#EAD7C4] rounded-xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[120px_1.5fr_1.5fr_150px_120px_100px] bg-[#4B0B14] text-[#FFF2E0] font-medium px-6 py-4">
          <div>Log ID</div>
          <div>Employee</div>
          <div>Activity</div>
          <div>Date</div>
          <div>Time</div>
        </div>

        {/* Scrollable Table Body */}
        <div
          className={`${
            filteredActivities.length > 10
              ? "max-h-[500px] overflow-y-auto"
              : ""
          }`}
        >
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <div
                key={index}
                className={`grid grid-cols-[120px_1.5fr_1.5fr_150px_120px_100px] items-center px-6 py-4 text-gray-800 border-b border-[#F3E5CF] ${
                  index % 2 === 0 ? "bg-[#FFF9F1]" : "bg-[#FFF2E0]"
                } hover:bg-[#F8EAD6] transition-colors`}
              >
                <div className="font-medium text-[#4B0B14]">{activity.id}</div>

                {/* Employee Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#4B0B14] text-[#FFF2E0] font-semibold">
                    {activity.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-[#4B0B14]">{activity.name}</div>
                    <div className="text-sm text-gray-600">{activity.position}</div>
                  </div>
                </div>

                <div className="text-gray-700">{activity.activity}</div>

                <div>
                  <span className="px-3 py-1 bg-[#EAD7C4] text-[#4B0B14] rounded-full text-sm">
                    {activity.date}
                  </span>
                </div>

                <div>
                  <span className="px-3 py-1 bg-[#EAD7C4] text-[#4B0B14] rounded-full text-sm">
                    {activity.time}
                  </span>
                </div>

              
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 bg-[#FFF9F1]">
              No activities found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogTab;
