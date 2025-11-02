"use client";

import { useState, useEffect, useRef } from "react";
import { MoreVertical, Plus, Eye, Trash2, Pencil } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import AddJobModal from "./add_positions/AddModal";
import ViewJobModal from "./view_positions/ViewModal";
import EditJobModal from "./edit_positions/EditModal";
import { useAuth } from "@/contexts/AuthContext";
import { positionApi } from "@/lib/api";
import SearchBar from "@/components/forms/FormSearch";
import { toast } from "react-hot-toast";

export default function PositionTable() {
  const { user } = useAuth();
  const [isInsertOpen, setInsertIsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const itemsPerPage = 10;

  // Check if user is supervisor (view-only access)
  const isSupervisor = user?.role === "supervisor";

  // Fetch positions from API
  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPositions = async () => {
    setLoading(true);
    setError(null);
    const result = await positionApi.getAll();
    if (result.success && result.data) {
      setPositions(result.data);
    } else {
      setError(result.message || "Failed to fetch positions");
    }
    setLoading(false);
  };

  const toggleMenu = (index: number) => {
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleView = (job: any) => {
    setSelectedJob(job);
    setIsViewOpen(true);
  };

  const handleEdit = (job: any) => {
    setSelectedJob(job);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this position?")) return;
    const result = await positionApi.delete(id);
    if (result.success) {
      toast.success("Position deleted successfully");
      fetchPositions();
    } else {
      toast.error(result.message || "Failed to delete position");
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const filteredPositions = positions.filter((pos) => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();
    const posCode = (pos.position_code || `POS-${pos.position_id}`).toLowerCase();
    const posName = pos.position_name.toLowerCase();
    const deptName = (pos.department_name || '').toLowerCase();

    return (
      posCode.includes(search) ||
      posName.includes(search) ||
      deptName.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredPositions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPositions = filteredPositions.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b2b1c] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fff7ec] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchPositions}
            className="bg-[#3b2b1c] text-white px-6 py-2 rounded-lg hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen font-poppins bg-[#fff7ec]">
      {/* Header */}
      <div className="flex justify-between items-center my-8">
        <h2 className="text-2xl font-semibold text-[#3b2b1c]">
          Total Positions: {positions.length}
          {searchTerm && ` (Showing ${filteredPositions.length})`}
        </h2>

        <div className="flex items-center gap-2">
          <SearchBar placeholder="Search Position" value={searchTerm} onChange={handleSearch} />
          {!isSupervisor && (
            <ActionButton
              label="Add Position"
              onClick={() => setInsertIsOpen(true)}
              icon={Plus}
              className="py-4"
            />
          )}
        </div>
      </div>

      {/* Table */}
      {filteredPositions.length === 0 && searchTerm ? (
        <div className="flex justify-center items-center h-64 bg-[#faeddc] rounded-lg shadow-sm">
          <p className="text-[#3b2b1c] text-lg">No positions found matching "{searchTerm}"</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead className="text-md">
                <tr className="bg-[#3b2b1c] text-white">
                  <th className="py-4 px-4 text-left">ID</th>
                  <th className="py-4 px-4 text-left">Department</th>
                  <th className="py-4 px-4 text-left">Job Position</th>
                  <th className="py-4 px-4 text-left">Availability</th>
                  <th className="py-4 px-4 text-left">Total Assigned</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="text-[#3b2b1c] text-base">
                {currentPositions.map((pos, index) => (
                  <tr
                    key={pos.position_id}
                    className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition"
                  >
                    <td className="py-4 px-4">{pos.position_code || `POS-${String(pos.position_id).padStart(4, '0')}`}</td>
                    <td className="py-4 px-4">{pos.department_name || 'N/A'}</td>
                    <td className="py-4 px-4">{pos.position_name}</td>
                    <td className="py-4 px-4">{pos.availability > 0 ? 'Yes' : 'No'}</td>
                    <td className="py-4 px-4">{pos.availability || 0}</td>

                    <td className="py-4 px-4 text-center relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(index);
                        }}
                        className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                      >
                        <MoreVertical size={18} className="text-[#3b2b1c]" />
                      </button>

                      {openMenuIndex === index && (
                        <div className="absolute right-4 mt-2 w-36 bg-white border border-[#e2d5c3] rounded-lg shadow-md z-50" ref={menuRef}>
                          <button
                            onClick={() => {
                              handleView(pos);
                              setOpenMenuIndex(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c] rounded-t-lg"
                          >
                            <Eye size={16} /> View
                          </button>

                          {!isSupervisor && (
                            <>
                              <button
                                onClick={() => {
                                  handleEdit(pos);
                                  setOpenMenuIndex(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
                              >
                                <Pencil size={16} /> Edit
                              </button>

                              <button
                                onClick={() => {
                                  handleDelete(pos.position_id);
                                  setOpenMenuIndex(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#ffe5e5] text-[#b91c1c] rounded-b-lg"
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 select-none">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-3 rounded bg-[#3b2b1c] text-white cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
              >
                Prev
              </button>

              {getPageNumbers().map((num, idx) => (
                num === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2  text-[#3b2b1c]">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => goToPage(num as number)}
                    className={`px-3 py-2 rounded text-sm cursor-pointer transition ${currentPage === num
                        ? "bg-[#3b2b1c] text-white"
                        : "text-[#3b2b1c] hover:bg-[#e8d6bb]"
                      }`}
                  >
                    {num}
                  </button>
                )
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-3 rounded bg-[#3b2b1c] cursor-pointer text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AddJobModal
        isOpen={isInsertOpen}
        onClose={() => {
          setInsertIsOpen(false);
          fetchPositions();
        }}
      />

      <ViewJobModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        job={selectedJob}
      />

      <EditJobModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        position={selectedJob}
        onSave={() => {
          fetchPositions();
        }}
      />
    </div>
  );
}
