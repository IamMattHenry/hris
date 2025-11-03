"use client";

import React, { useState, useEffect } from "react";
import { Search, Clock } from "lucide-react";
import { activityApi } from "@/lib/api";

const ActivityLogTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const [sortBy, setSortBy] = useState<"log_id" | "name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Live date/time
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

  // Limit date picker
  const today = new Date().toISOString().split("T")[0];

  // Fetch activity logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const result = await activityApi.getAll();
        if (result.success) {
          setLogs(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Filter + Sort
  const filteredActivities = logs
    .filter((a) => {
      const matchesSearch =
        a.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.module.toLowerCase().includes(searchTerm.toLowerCase());

      const normalize = (d: string) => new Date(d).toISOString().split("T")[0];
      const matchesDate = date ? normalize(a.created_at) === normalize(date) : true;

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === "log_id") {
        return sortOrder === "asc" ? a.log_id - b.log_id : b.log_id - a.log_id;
      } else if (sortBy === "name") {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        const dA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
        const dB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime();
        return sortOrder === "asc" ? dA - dB : dB - dA;
      }
    });

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentActivities = filteredActivities.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Reset page when filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, date, sortBy, sortOrder]);

  return (
    <div className="min-h-screen bg-[#fff7ec] p-8 space-y-6 text-gray-800 font-poppins">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-[#4B0B14]">Activity Log</h2>
        <div className="flex items-center justify-between text-[#4B0B14] text-sm font-medium">
          <p>{currentDate}</p>
          <p className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-[#4B0B14]" /> {currentTime}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-between items-center bg-[#FFF2E0] p-4 rounded-lg shadow-sm gap-3">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search activity or name..."
            className="pl-10 pr-4 py-2 rounded-lg border bg-white text-sm w-72"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Date filter */}
        <input
          type="date"
          className="px-4 py-2 rounded-lg border bg-white text-gray-700"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
        />

        {/* Sorting */}
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
          >
            <option value="log_id">Sort by Log ID</option>
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="px-3 py-2 rounded-lg bg-[#4B0B14] text-[#FFF2E0] text-sm"
          >
            {sortOrder === "asc" ? "Ascending ↑" : "Descending ↓"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[120px_150px_1fr_2fr_200px] bg-[#4B0B14] text-[#FFF2E0] px-6 py-4 font-medium">
          <div>Log ID</div>
          <div>Employee Code</div>
          <div>Employee</div>
          <div>Activity</div>
          <div>Date & Time</div>
        </div>

        {/* Body */}
        <div className={`${currentActivities.length > 5 ? "max-h-[300px] overflow-y-auto" : ""}`}>
          {loading ? (
            <div className="text-center py-6 text-gray-500 bg-[#FFF9F1]">Loading logs...</div>
          ) : currentActivities.length > 0 ? (
            currentActivities.map((activity, index) => (
              <div
                key={activity.log_id}
                className={`grid grid-cols-[120px_150px_1fr_2fr_200px] px-6 py-4 ${
                  index % 2 === 0 ? "bg-[#FFF9F1]" : "bg-[#FFF2E0]"
                }`}
              >
                <div className="font-medium">{activity.log_id}</div>
                <div>{activity.employee_code}</div>
                <div>{activity.first_name} {activity.last_name}</div>
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-gray-600">{activity.module}</div>
                  <div className="text-gray-700">{activity.description}</div>
                </div>
                <div>
                  <span className="px-3 py-1 bg-[#EAD7C4] rounded-full text-sm">
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
            <div className="text-center py-6 text-gray-500 bg-[#FFF9F1]">No activities found.</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-3 mt-4 select-none">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-[#3b2b1c] text-white rounded disabled:opacity-40"
        >
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => goToPage(num)}
            className={`px-3 py-2 rounded text-sm ${
              currentPage === num ? "bg-[#3b2b1c] text-white" : "text-[#3b2b1c]"
            }`}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-[#3b2b1c] text-white rounded disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ActivityLogTab;
