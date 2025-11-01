"use client";

import React, { useState } from "react";
import { Eye, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ActionButton from "@/components/buttons/ActionButton";

const TechnicalSupportTab = () => {
  const [tickets, setTickets] = useState(
    [
      {
        id: "TCK-0001",
        name: "Juan Dela Cruz",
        position: "HR Assistant",
        email: "juan@gmail.com",
        concern: "Forgot Password",
        description:
          "I can’t log in to my account because I forgot my password. I’ve already tried the recovery link but it didn’t send any email.",
        date: "2025-10-20",
        status: "Resolved",
      },
      {
        id: "TCK-0002",
        name: "Maria Santos",
        position: "Manager",
        email: "maria@gmail.com",
        concern: "Exporting Report",
        description:
          "When I try to export the employee performance report, the system shows an error message. Please assist.",
        date: "2025-10-21",
        status: "Pending",
      },
      ...Array.from({ length: 12 }).map((_, i) => ({
        id: `TCK-${100 + i}`,
        name: `Employee ${i + 1}`,
        position: "Staff",
        email: `user${i + 1}@gmail.com`,
        concern: "System Error",
        description: "Encountered unexpected error while processing data.",
        date: "2025-10-20",
        status: i % 2 === 0 ? "Resolved" : "Pending",
      })),
    ]
  );

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const handleView = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => setSelectedTicket(null), 200);
  };

  const handleResolve = () => {
    if (!selectedTicket) return;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id ? { ...t, status: "Resolved" } : t
      )
    );

    setSelectedTicket({ ...selectedTicket, status: "Resolved" });
  };

  return (
    <div className="p-6 bg-[#FAF1E4] rounded-lg space-y-6 overflow-hidden">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-[#4B0B14]">
          Technical Support Tickets
        </h2>
        <p className="text-sm text-[#4B0B14]/80 mt-1">
          View and manage support concerns submitted by employees.
        </p>
      </div>

      {/* Table Container */}
      <div className="border border-[#EAD7C4] rounded-xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[120px_1.5fr_1.5fr_1.5fr_150px_120px_100px] bg-[#4B0B14] text-[#FFF2E0] font-medium px-6 py-4">
          <div>Ticket ID</div>
          <div>Employee</div>
          <div>Email</div>
          <div>Concern</div>
          <div>Date</div>
          <div>Status</div>
          <div className="text-center">Action</div>
        </div>

        {/* Scrollable Body */}
        <div
          className={`${
            tickets.length > 10 ? "max-h-[500px] overflow-y-auto" : ""
          }`}
        >
          {tickets.map((ticket, index) => (
            <div
              key={index}
              className={`grid grid-cols-[120px_1.5fr_1.5fr_1.5fr_150px_120px_100px] items-center px-6 py-4 border-b border-[#F3E5CF] ${
                index % 2 === 0 ? "bg-[#FFF9F1]" : "bg-[#FFF2E0]"
              } hover:bg-[#F8EAD6] transition-colors`}
            >
              <div className="font-medium text-[#4B0B14]">{ticket.id}</div>

              {/* Employee Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#4B0B14] text-[#FFF2E0] font-semibold">
                  {ticket.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-[#4B0B14]">{ticket.name}</div>
                  <div className="text-sm text-gray-600">{ticket.position}</div>
                </div>
              </div>

              <div className="text-gray-700">{ticket.email}</div>
              <div className="text-gray-700 truncate">{ticket.concern}</div>

              <div>
                <span className="px-3 py-1 bg-[#EAD7C4] text-[#4B0B14] rounded-full text-sm">
                  {ticket.date}
                </span>
              </div>

              <div>
                <span
                  className={`px-4 py-1 rounded-full text-sm font-medium ${
                    ticket.status === "Resolved"
                      ? "bg-green-200 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => handleView(ticket)}
                  className="p-2 hover:bg-[#F3E5CF] rounded-lg transition"
                  title="View Ticket"
                >
                  <Eye className="w-5 h-5 text-[#4B0B14]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {showModal && selectedTicket && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#FFF2E0] rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 text-[#4B0B14] hover:text-[#6b0b1f]"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-xl font-semibold text-[#4B0B14] mb-4">
                View Concern Details
              </h3>

              <div className="space-y-3 text-[#3b2b1c] text-sm">
                <p>
                  <span className="font-semibold text-[#4B0B14]">Ticket ID:</span>{" "}
                  {selectedTicket.id}
                </p>
                <p>
                  <span className="font-semibold text-[#4B0B14]">Employee:</span>{" "}
                  {selectedTicket.name} ({selectedTicket.position})
                </p>
                <p>
                  <span className="font-semibold text-[#4B0B14]">Email:</span>{" "}
                  {selectedTicket.email}
                </p>
                <p>
                  <span className="font-semibold text-[#4B0B14]">Concern:</span>{" "}
                  {selectedTicket.concern}
                </p>
                <p>
                  <span className="font-semibold text-[#4B0B14]">Date:</span>{" "}
                  {selectedTicket.date}
                </p>

                <div className="mt-4">
                  <span className="font-semibold text-[#4B0B14]">Description:</span>
                  <p className="bg-[#FAEFD8] p-3 rounded-lg mt-2 text-gray-700">
                    {selectedTicket.description}
                  </p>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <ActionButton
                    label="Close"
                    onClick={handleClose}
                    className="rounded-lg"
                  />

                  {/* ✅ Revised Resolve Button */}
                  <button
                    onClick={handleResolve}
                    disabled={selectedTicket.status === "Resolved"}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selectedTicket.status === "Resolved"
                        ? "bg-green-500 text-white cursor-not-allowed"
                        : "bg-[#4B0B14] text-[#FFF2E0] hover:bg-[#6b0b1f]"
                    }`}
                  >
                    <CheckCircle
                      className={`w-5 h-5 ${
                        selectedTicket.status === "Resolved"
                          ? "text-white"
                          : "text-[#FFF2E0]"
                      }`}
                    />
                    {selectedTicket.status === "Resolved"
                      ? "Resolved"
                      : "Mark as Resolved"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TechnicalSupportTab;
