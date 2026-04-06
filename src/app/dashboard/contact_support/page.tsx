"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Eye, CheckCircle, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ActionButton from "@/components/buttons/ActionButton";
import SearchBar from "@/components/forms/FormSearch";
import { ticketApi } from "@/lib/api";
import { showToast } from "@/utils/toast";

// Define proper types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

interface ApiError {
  message: string;
  code?: string;
}

interface Ticket {
  ticket_id: number;
  ticket_code: string;
  user_id: number;
  fixed_by: number | null;
  title: string;
  description: string | null;
  resolution_description?: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  employee_code: string;
  email?: string;
  position_name: string;
  fixed_by_first_name: string | null;
  fixed_by_last_name: string | null;
  fixed_by_code: string | null;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusDisplay = (status: string) => {
  const statusMap: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  return statusMap[status] || status;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "resolved":
    case "closed":
      return "bg-green-100 text-green-800 border border-green-300";
    case "in_progress":
      return "bg-blue-100 text-blue-800 border border-blue-300";
    case "open":
    default:
      return "bg-amber-100 text-amber-800 border border-amber-300";
  }
};

const TechnicalSupportTab = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 7;

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response: ApiResponse<Ticket[]> = await ticketApi.getAll();

      if (response.success && response.data) {
        const uniqueTickets = response.data.filter(
          (t, index, self) => index === self.findIndex((s) => s.ticket_id === t.ticket_id)
        );
        setTickets(uniqueTickets);
      } else {
        throw new Error(response.message || "Failed to fetch tickets");
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error("Error fetching tickets:", error);
      showToast.error(apiError.message || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!ignore) await fetchTickets();
    })();
    return () => {
      ignore = true;
    };
  }, [fetchTickets]);

  const handleView = useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setSelectedTicket(null);
  }, []);

  const handleResolve = useCallback(() => {
    if (!selectedTicket || resolving) return;
    setResolutionText("");
    setResolutionError("");
    setShowResolveModal(true);
  }, [selectedTicket, resolving]);

  const confirmResolve = useCallback(async () => {
    if (!selectedTicket || resolving) return;

    const desc = resolutionText.trim();
    if (desc.length < 10) {
      setResolutionError("Resolution description must be at least 10 characters.");
      return;
    }

    try {
      setResolving(true);
      const response: ApiResponse<unknown> = await ticketApi.updateStatus(
        selectedTicket.ticket_id,
        "resolved",
        undefined,
        desc
      );

      if (response.success) {
        showToast.success("Ticket marked as resolved");

        setTickets((prev) =>
          prev.map((t) =>
            t.ticket_id === selectedTicket.ticket_id
              ? { ...t, status: "resolved", resolution_description: desc }
              : t
          )
        );

        setSelectedTicket((prev) =>
          prev ? { ...prev, status: "resolved", resolution_description: desc } : null
        );

        setShowResolveModal(false);
      } else {
        throw new Error(response.message || "Failed to resolve ticket");
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error("Error resolving ticket:", error);
      showToast.error(apiError.message || "Failed to resolve ticket");
    } finally {
      setResolving(false);
    }
  }, [selectedTicket, resolving, resolutionText]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Filtered & Paginated tickets
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const search = searchTerm.toLowerCase();
    return tickets.filter((ticket) =>
      [
        ticket.ticket_code,
        ticket.first_name,
        ticket.last_name,
        ticket.email,
        ticket.title,
        ticket.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [tickets, searchTerm]);

  const { currentTickets, totalPages, pageNumbers } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTickets = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return { currentTickets, totalPages, pageNumbers };
  }, [filteredTickets, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-6 bg-[#FAF6F1] rounded-xl h-[85vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D1A0B] mx-auto"></div>
          <p className="mt-4 text-[#3D1A0B]">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#FAF6F1] rounded-xl space-y-6 font-poppins flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-[#3D1A0B] tracking-tight">
            Contact Support Tickets
          </h2>
          <p className="text-sm text-[#3D1A0B]/70 mt-1">
            Review and manage system-related employee concerns efficiently.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar
            placeholder="Search Ticket"
            value={searchTerm}
            onChange={handleSearch}
          />
          <ActionButton label="Refresh" icon={RefreshCw} onClick={fetchTickets} />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 border border-[#E8D9C4] rounded-xl shadow-md bg-white overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[80px_1fr_1fr_120px_100px] md:grid-cols-[100px_1.5fr_1.5fr_1.5fr_150px_120px_100px] bg-[#3D1A0B] text-[#FFF8EE] font-semibold px-4 md:px-6 py-3 sticky top-0 z-10 flex-shrink-0">
          <div>ID</div>
          <div>Employee</div>
          <div>Email</div>
          <div className="hidden md:block">Concern</div>
          <div className="hidden md:block">Date</div>
          <div>Status</div>
          <div className="text-center">Action</div>
        </div>

        {/* Scrollable Table Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {currentTickets.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No tickets found</div>
          ) : (
            currentTickets.map((ticket, index) => (
              <div
                key={ticket.ticket_id}
                className={`grid grid-cols-[80px_1fr_1fr_120px_100px] md:grid-cols-[100px_1.5fr_1.5fr_1.5fr_150px_120px_100px] items-center px-4 md:px-6 py-4 border-b border-[#F3E5CF] ${
                  index % 2 === 0 ? "bg-[#FFFBF5]" : "bg-[#FFF4E6]"
                } hover:bg-[#FFF0DC] transition-colors duration-150`}
              >
                <div className="font-medium text-[#3D1A0B] truncate">{ticket.ticket_code}</div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#3D1A0B] text-[#FFF8EE] font-semibold text-sm">
                    {`${ticket.first_name} ${ticket.last_name}`
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-[#3D1A0B]">
                      {ticket.first_name} {ticket.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{ticket.position_name || "N/A"}</div>
                  </div>
                </div>

                <div className="text-gray-700 truncate">{ticket.email || "N/A"}</div>
                <div className="hidden md:block text-gray-700 truncate">{ticket.title}</div>
                <div className="hidden md:block">
                  <span className="px-3 py-1 bg-[#F3E9DA] text-[#3D1A0B] rounded-full text-sm">
                    {formatDate(ticket.created_at)}
                  </span>
                </div>

                <div>
                  <span className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusDisplay(ticket.status)}
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
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center px-4 md:px-6 py-3 bg-[#F3E5CF] flex-shrink-0 border-t border-[#E8D9C4]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded bg-[#3b2b1c] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#4b1f16]"
              >
                Prev
              </button>
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => goToPage(num)}
                  className={`px-3 py-2 rounded text-sm transition ${
                    currentPage === num
                      ? "bg-[#3b2b1c] text-white"
                      : "text-[#3b2b1c] hover:bg-[#E8D9C4]"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded bg-[#3b2b1c] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#4b1f16]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showModal && selectedTicket && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#EAD7C4] px-6 py-4 bg-[#FAF6F1] flex-shrink-0">
                <h3 className="text-xl font-semibold text-[#3D1A0B]">Ticket Details</h3>
                <button onClick={handleClose} className="text-[#3D1A0B] hover:text-red-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-[#3b2b1c]">
                <p>
                  <span className="font-semibold">Ticket ID:</span> {selectedTicket.ticket_code}
                </p>
                <p>
                  <span className="font-semibold">Employee:</span>{" "}
                  {selectedTicket.first_name} {selectedTicket.last_name} ({selectedTicket.position_name || "N/A"})
                </p>
                <p>
                  <span className="font-semibold">Email:</span> {selectedTicket.email || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Concern:</span> {selectedTicket.title}
                </p>

                <div>
                  <span className="font-semibold block mb-1">Description:</span>
                  <div className="p-4 bg-[#F3E9DA]/30 rounded-lg whitespace-pre-wrap border border-[#E8D9C4]">
                    {selectedTicket.description || "No description provided"}
                  </div>
                </div>

                {selectedTicket.status === "resolved" && selectedTicket.resolution_description && (
                  <div>
                    <span className="font-semibold block mb-1">Resolution:</span>
                    <div className="p-4 bg-[#EEF6EE]/70 rounded-lg whitespace-pre-wrap border border-green-200 text-[#1f4723]">
                      {selectedTicket.resolution_description}
                    </div>
                  </div>
                )}

                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusDisplay(selectedTicket.status)}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Submitted:</span> {formatDate(selectedTicket.created_at)}
                </p>
                {selectedTicket.updated_at !== selectedTicket.created_at && (
                  <p>
                    <span className="font-semibold">Last Updated:</span> {formatDate(selectedTicket.updated_at)}
                  </p>
                )}
                {selectedTicket.fixed_by_first_name && (
                  <p>
                    <span className="font-semibold">Fixed By:</span>{" "}
                    {selectedTicket.fixed_by_first_name} {selectedTicket.fixed_by_last_name} (
                    {selectedTicket.fixed_by_code})
                  </p>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-[#EAD7C4] p-6 flex justify-end gap-3 bg-[#FAF6F1] flex-shrink-0">
                {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-md transition text-white ${
                      resolving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {resolving ? "Resolving..." : "Mark as Resolved"}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-[#3D1A0B] text-white rounded-md hover:bg-[#5C2A15] transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Resolve Confirmation Modal */}
        {showResolveModal && selectedTicket && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[85vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-[#3D1A0B] mb-4">
                Resolve Ticket — {selectedTicket.ticket_code}
              </h3>

              <p className="text-sm text-[#3b2b1c] mb-3">
                Please enter a resolution description (minimum 10 characters).
              </p>

              <textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="flex-1 min-h-[140px] p-4 border border-[#E8D9C4] rounded-lg text-sm resize-y focus:outline-none focus:border-[#3D1A0B]"
                placeholder="Describe the resolution performed, steps taken, and any notes..."
              />

              {resolutionError && <div className="text-red-600 text-sm mt-2">{resolutionError}</div>}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolutionError("");
                  }}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResolve}
                  disabled={resolving}
                  className={`px-5 py-2 rounded-md text-white transition ${
                    resolving ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {resolving ? "Resolving..." : "Confirm Resolve"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TechnicalSupportTab;