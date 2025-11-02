"use client";

import React, { useState, useEffect } from "react";
import { Eye, Search, Clock } from "lucide-react";
import { activityApi } from "@/lib/api";

const ActivityLogTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  //  Live update of date and time
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

  // 🔍 Filter logic
  const filteredActivities = logs.filter((a) => {
    const matchesSearch =
      a.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.module.toLowerCase().includes(searchTerm.toLowerCase());
    const normalize = (d: string) => new Date(d).toISOString().split("T")[0];

    const matchesDate = date
      ? normalize(a.created_at) === normalize(date)
      : true;

    return matchesSearch && matchesDate;
  });

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const result = await activityApi.getAll();
        if (result.success) {
          setLogs(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-6 bg-[#FAF1E4] rounded-lg space-y-6 overflow-hidden font-poppins">
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

        {/* Date Filter */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="px-4 py-2 rounded-lg border border-[#EAD7C4] bg-white text-gray-700 focus:ring-2 focus:ring-[#D4A056]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-[#EAD7C4] rounded-xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[120px_1.5fr_1.5fr_150px_120px_100px] bg-[#4B0B14] text-[#FFF2E0] font-medium px-6 py-4">
          <div>Log ID</div>
          <div>Employee Code</div>
          <div>Employee</div>
          <div>Activity</div>
          <div>Date</div>
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
                <div className="font-medium text-[#4B0B14]">
                  {activity.log_id}
                </div>
                <div>{activity.employee_code}</div>
                {/* Employee Info */}
                <div className="flex items-center gap-3">
                  {activity.first_name + " " + activity.last_name}
                </div>
                <div>
                  <div className="font-medium text-[#4B0B14]">
                    {activity.action}
                  </div>
                  <div className="text-sm text-gray-600">{activity.module}</div>
                  <div className="text-gray-700">{activity.description}</div>
                </div>x44
                <div>
                  <span className="px-3 py-1 bg-[#EAD7C4] text-[#4B0B14] rounded-full text-sm">
                    {new Date(activity.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
