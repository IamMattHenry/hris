"use client";

import React, { useState } from "react";
import { Eye, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ActionButton from "@/components/buttons/ActionButton";

const TechnicalSupportTab = () => {
  const [tickets, setTickets] = useState([
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
  ]);

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
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 overflow-hidden h-[90vh] shadow-inner relative font-poppins">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#3D1A0B] tracking-tight">
          Technical Support Tickets
        </h2>
        <p className="text-sm text-[#3D1A0B]/70 mt-1">
          Review and manage system-related employee concerns efficiently.
        </p>
      </div>

      {/* Table Container */}
      <div className="border border-[#E8D9C4] rounded-xl shadow-md overflow-hidden bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-[120px_1.5fr_1.5fr_1.5fr_150px_120px_100px] bg-[#3D1A0B] text-[#FFF8EE] font-semibold px-6 py-3 sticky top-0 z-10">
          <div>Ticket ID</div>
          <div>Employee</div>
          <div>Email</div>
          <div>Concern</div>
          <div>Date</div>
          <div>Status</div>
          <div className="text-center">Action</div>
        </div>

        {/* Scrollable Body */}
        <div className={tickets.length > 10 ? "max-h-[500px] overflow-y-auto" : ""}>
          {tickets.map((ticket, index) => (
            <div
              key={index}
              className={`grid grid-cols-[120px_1.5fr_1.5fr_1.5fr_150px_120px_100px] items-center px-6 py-4 border-b border-[#F3E5CF] ${
                index % 2 === 0 ? "bg-[#FFFBF5]" : "bg-[#FFF4E6]"
              } hover:bg-[#FFF0DC] transition-colors duration-150`}
            >
              <div className="font-medium text-[#3D1A0B]">{ticket.id}</div>

              {/* Employee Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#3D1A0B] text-[#FFF8EE] font-semibold">
                  {ticket.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-[#3D1A0B]">
                    {ticket.name}
                  </div>
                  <div className="text-sm text-gray-600">{ticket.position}</div>
                </div>
              </div>

              <div className="text-gray-700 truncate">{ticket.email}</div>
              <div className="text-gray-700 truncate">{ticket.concern}</div>
              <div>
                <span className="px-3 py-1 bg-[#F3E9DA] text-[#3D1A0B] rounded-full text-sm">
                  {ticket.date}
                </span>
              </div>

              <div>
                <span
                  className={`px-4 py-1 rounded-full text-sm font-medium ${
                    ticket.status === "Resolved"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
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
                  <Eye className="w-5 h-5 text-[#3D1A0B]" />
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 relative border border-[#EAD7C4]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-[#3D1A0B]/80 hover:text-[#3D1A0B]"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-xl font-semibold text-[#3D1A0B] mb-4">
                Ticket Details
              </h3>

              <div className="space-y-3 text-sm text-[#3b2b1c]">
                <p>
                  <span className="font-semibold">Ticket ID:</span>{" "}
                  {selectedTicket.id}
                </p>
                <p>
                  <span className="font-semibold">Employee:</span>{" "}
                  {selectedTicket.name} ({selectedTicket.position})
                </p>
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  {selectedTicket.email}
                </p>
                <p>
                  <span className="font-semibold">Concern:</span>{" "}
                  {selectedTicket.concern}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{" "}
                  {selectedTicket.date}
                </p>

                <div className="mt-4">
                  <span className="font-semibold">Description:</span>
                  <p className="bg-[#FFF7EC] p-3 rounded-lg mt-2 text-gray-700 leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <ActionButton
                    label="Close"
                    onClick={handleClose}
                    className="rounded-lg"
                  />
                  <button
                    onClick={handleResolve}
                    disabled={selectedTicket.status === "Resolved"}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm ${
                      selectedTicket.status === "Resolved"
                        ? "bg-green-500 text-white cursor-not-allowed"
                        : "bg-[#3D1A0B] text-[#FFF8EE] hover:bg-[#5C2A15]"
                    }`}
                  >
                    <CheckCircle className="w-5 h-5" />
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
