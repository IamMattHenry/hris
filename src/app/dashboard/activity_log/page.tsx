"use client";

import React, { useState, useEffect } from "react";
import { Search, Clock } from "lucide-react";
import { activityApi } from "@/lib/api";
import SearchBar from "@/components/forms/FormSearch";
import ActionButton from "@/components/buttons/ActionButton";

const ActivityLogTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 4;
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
        (a.employee_code && a.employee_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.first_name && a.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.last_name && a.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.action && a.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.module && a.module.toLowerCase().includes(searchTerm.toLowerCase()));

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
    <div className="h-screen bg-[#fff7ec] p-8 flex flex-col text-gray-800 font-poppins overflow-hidden">
      {/* 🔸 Header & Filters Section (non-scrollable) */}
      <div className="flex-shrink-0 space-y-6">
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
          <div className="relative">
            <SearchBar
              placeholder="Search activity or name..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="bg-white"
            />
          </div>

          <input
            type="date"
            className="px-4 py-2 rounded-lg bg-white text-gray-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
          />

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg text-gray-500 bg-white text-sm"
            >
              <option value="log_id">Sort by Log ID</option>
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
            <ActionButton
              label={sortOrder === "asc" ? "Descending ↓" : "Ascending ↑"}
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            />
          </div>
        </div>
      </div>

      {/* 🔸 Logs Table Section (scrollable only here) */}
      <div className="flex-1 overflow-y-auto mt-4 rounded-xl shadow-sm bg-[#FFF9F1]">
        <div className="grid grid-cols-[120px_150px_1fr_2fr_200px] bg-[#4B0B14] text-[#FFF2E0] px-6 py-4 font-medium sticky top-0 z-10">
          <div>Log ID</div>
          <div>Employee Code</div>
          <div>Employee</div>
          <div>Activity</div>
          <div>Date & Time</div>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading logs...</div>
        ) : currentActivities.length > 0 ? (
          currentActivities.map((activity, index) => (
            <div
              key={activity.log_id}
              className={`grid grid-cols-[120px_150px_1fr_2fr_200px] px-6 py-4 ${index % 2 === 0 ? "bg-[#FFF9F1]" : "bg-[#FFF2E0]"
                }`}
            >
              <div className="font-medium">{activity.log_id}</div>
              <div>{activity.employee_code}</div>
              <div>
                {activity.first_name} {activity.last_name}
              </div>
              <div>
                <div className="font-medium">{activity.action}</div>
                <div className="text-sm text-gray-600">{activity.module}</div>
                <div className="text-gray-700">{activity.description}</div>
              </div>
              <div>
                <span className="px-3 py-1 bg-[#EAD7C4] rounded-full text-sm">
                  {(() => {
                    const date = new Date(activity.created_at);
                    date.setHours(date.getHours() + 8);
                    return date.toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  })()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">No activities found.</div>
        )}
      </div>

      {/* Pagination*/}
      <div className="flex-shrink-0 flex justify-center items-center mt-4 select-none">
        <div className="flex items-center gap-2  px-4 py-2 max-w-[400px] w-full justify-center truncate">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-[#3b2b1c] text-white rounded disabled:opacity-40 truncate"
            title="Previous Page"
          >
            Prev
          </button>

          {/* ✅ Truncated pagination numbers */}
          <div className="flex items-center gap-1 overflow-hidden truncate">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(currentPage - 2, 0),
                Math.min(currentPage + 1, totalPages)
              )
              .map((num) => (
                <button
                  key={num}
                  onClick={() => goToPage(num)}
                  className={`px-3 py-1 rounded text-sm truncate ${currentPage === num
                      ? "bg-[#3b2b1c] text-white"
                      : "text-[#3b2b1c] hover:bg-[#EAD7C4]"
                    }`}
                >
                  {num}
                </button>
              ))}

            {/* Ellipsis if many pages */}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-1 text-[#3b2b1c] truncate">...</span>
            )}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-[#3b2b1c] text-white rounded disabled:opacity-40 truncate"
            title="Next Page"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );

};

export default ActivityLogTab;
