"use client";

import { useState, useEffect, useRef } from "react";
import { MoreVertical, Plus, Eye, Trash2, Pencil } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import AddJobModal from "./add_positions/AddModal";
import ViewJobModal from "./view_positions/ViewModal";
import EditJobModal from "./edit_positions/EditModal";
import { useAuth } from "@/contexts/AuthContext";
import { positionApi } from "@/lib/api";

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

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Check if user is supervisor (view-only access)
  const isSupervisor = user?.role === "supervisor";

  // Fetch positions from API
  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
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
    if (!confirm("Are you sure you want to delete this position?")) return;
    const result = await positionApi.delete(id);
    if (result.success) {
      alert("Position deleted successfully");
      fetchPositions();
    } else {
      alert(result.message || "Failed to delete position");
    }
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-[#3b2b1c]">
          Total Positions:
        </h2>
        {!isSupervisor && (
          <ActionButton
            label="Add Position"
            onClick={() => setInsertIsOpen(true)}
            icon={Plus}
            className="py-4"
          />
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-sm bg-[#faeddc] rounded-lg max-h-136 h-136">
        <table className="w-full text-sm border-collapse">
          <thead className="text-md">
            <tr className="bg-[#3b2b1c] text-white">
              <th className="py-4 px-4 text-left">ID</th>
              <th className="py-4 px-4 text-left">Department</th>
              <th className="py-4 px-4 text-left">Job Position</th>
              <th className="py-4 px-4 text-left">Availability</th>
              <th className="py-4 px-4 text-left">Salary</th>
              <th className="py-4 px-4 text-left">Total Assigned</th>
              <th className="py-4 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="text-[#3b2b1c] text-base">
            {positions.map((pos, index) => (
              <tr
                key={pos.position_id}
                className="border-b border-[#e2d5c3] hover:bg-[#fdf4e7] transition"
              >
                <td className="py-4 px-4">{pos.position_code || `POS-${String(pos.position_id).padStart(4, '0')}`}</td>
                <td className="py-4 px-4">{pos.department_name || 'N/A'}</td>
                <td className="py-4 px-4">{pos.position_name}</td>
                <td className="py-4 px-4">{pos.availability > 0 ? 'Yes' : 'No'}</td>
                <td className="py-4 px-4">₱ {pos.salary ? parseFloat(pos.salary).toLocaleString() : 'N/A'}</td>
                <td className="py-4 px-4">{pos.availability || 0}</td>

                <td className="py-4 px-4 text-center relative">
                  {/* 3 Dots Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(index);
                    }}
                    className="p-2 rounded-full hover:bg-[#e8d6bb] transition"
                  >
                    <MoreVertical size={18} className="text-[#3b2b1c]" />
                  </button>

                  {/* Dropdown Menu */}
                  {openMenuIndex === index && (
                    <div className="absolute right-4 mt-2 w-36 bg-white border border-[#e2d5c3] rounded-lg shadow-md z-50"  ref={menuRef}>
                      <button
                        onClick={() => {
                          handleView(pos);
                          setOpenMenuIndex(null);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#fdf4e7] text-[#3b2b1c]"
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
                            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[#ffe5e5] text-[#b91c1c]"
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

      {/* Modals */}
      <AddJobModal
        isOpen={isInsertOpen}
        onClose={() => {
          setInsertIsOpen(false);
          fetchPositions(); // Refresh list after adding
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
          fetchPositions(); // Refresh list after editing
        }}
      />
    </div>
  );
}
