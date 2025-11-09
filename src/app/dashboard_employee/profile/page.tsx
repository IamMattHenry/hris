"use client";

import { useState, useEffect } from "react";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { Employee } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import EditPersonalModal from "./edit_personal-information/EditPersonalModal";
import EditEmployeeModal from "./edit_employee-information/EditEmployeeModal";

export default function Dashboard() {
  const { user } = useAuth();

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"basic" | "job">("basic");
  const [employeeAttendanceSummary, setEmployeeAttendanceSummary] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);

  // Modal states
  const [isEditPersonalModalOpen, setIsEditPersonalModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [empResult, statsResult] = await Promise.all([
          employeeApi.getAll(),
          leaveApi.getDashboardStats(),
        ]);

        // Fetch current employee's detailed data
        if (user?.employee_id) {
          const employeeResult = await employeeApi.getById(user.employee_id);
          if (employeeResult.success && employeeResult.data) {
            setCurrentEmployee(employeeResult.data as Employee);
          }

          // Fetch current employee's attendance summary
          const attendanceSummaryResult = await attendanceApi.getSummary(user.employee_id);
          if (attendanceSummaryResult.success && attendanceSummaryResult.data) {
            setEmployeeAttendanceSummary(attendanceSummaryResult.data);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b4513] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5e6d3]">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#8b4513] text-white px-6 py-2 rounded-lg hover:bg-[#a0522d] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-poppins">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Title */}
        {currentEmployee ? (
          <div className="text-right">
            <p className="text-md font-normal text-gray-500 font-poppins">Employee ID: {currentEmployee.employee_code}</p>
          </div>
        ) : null}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Employee Profile Card */}
          <div className="bg-[#eed4b3] rounded-xl shadow-sm p-7 border border-[#e8dcc8] flex flex-col">
            {currentEmployee ? (
              <div className="space-y-6 flex flex-col items-center justify-center flex-1">
                {/* Profile Image / Initials */}
                <div className="flex justify-center">
                  {currentEmployee?.first_name && currentEmployee?.last_name ? (
                    <div className="w-36 h-36 rounded-full bg-[#412f23] text-white flex items-center justify-center text-4xl font-bold shadow-md">
                      {`${currentEmployee.first_name[0]}${currentEmployee.last_name[0]}`.toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-36 h-36 rounded-full bg-gray-400 text-white flex items-center justify-center text-4xl font-bold shadow-md">
                      ?
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div className="space-y-2 text-center mt-4">
                  <h1 className="text-2xl font-semibold text-[#281b0d] font-poppins">
                    {currentEmployee?.first_name} {currentEmployee?.last_name}
                  </h1>

                  <p className="text-lg text-[#412f23d4]">
                    {currentEmployee?.position_name || 'N/A'}
                  </p>

                  {/* Divider */}
                  <hr className="w-full border-none mb-4" />

                  <div className="text-left">
                    <p className="text-sm font-bold text-[#412f23de]">Department</p>
                  </div>
                  <hr className="w-80 border-[#e3b983]" />
                  <div className="text-left">
                    <p className="text-sm text-[#412f23d4]">
                      {currentEmployee?.department_name || 'N/A'}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-gray-500">Loading profile...</p>
              </div>
            )}
          </div>

          {/* Right Column - Shifts and Attendance Summary */}
          <div className="space-y-6">
            {/* Tab Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setActiveTab("basic")}
                className={`px-20 py-5 rounded-lg font-medium transition-all ${activeTab === "basic"
                    ? "bg-[#073532] text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Basic Information
              </button>
              <button
                onClick={() => setActiveTab("job")}
                className={`px-20 py-5 rounded-lg font-medium transition-all ${activeTab === "job"
                    ? "bg-[#073532] text-white shadow-md"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
              >
                Job Information
              </button>
            </div>

            {/* Basic Information Tab Content */}
            {activeTab === "basic" && (
              <>
                {/* Employee Information Card */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Employee Information</h2>
                    <button
                      onClick={() => setIsEditEmployeeModalOpen(true)}
                      className="bg-white text-[#281b0d] px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Edit
                    </button>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top">Gender:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.gender
                                ? currentEmployee.gender.charAt(0).toUpperCase() + currentEmployee.gender.slice(1)
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top">Birthdate:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.birthdate
                                ? new Date(currentEmployee.birthdate).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric"
                                })
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>


                {/* Personal Information Card */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                    <button
                      onClick={() => setIsEditPersonalModalOpen(true)}
                      className="bg-white text-[#281b0d] px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Edit
                    </button>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Home Address:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.home_address || 'N/A'} {currentEmployee?.city || 'N/A'},  {currentEmployee?.province || 'N/A'}, {currentEmployee?.region || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Civil Status:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.civil_status || 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Job Information Tab Content */}
            {activeTab === "job" && (
              <>
                {/* Job Description */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
                    <h2 className="text-lg font-semibold text-white">Job Description</h2>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Job Title:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.position_name || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top"> Department:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.department_name || 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/*Job History Information */}
                <div className="bg-white rounded-xl shadow-sm border border-[#e8dcc8] overflow-hidden">
                  {/* Title Box */}
                  <div className="bg-[#281b0d] px-6 py-3 shadow-lg rounded-b-lg">
                    <h2 className="text-lg font-semibold text-white">History</h2>
                  </div>
                  {/* Information Content */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                      <table className="w-full border-none">
                        <tbody>
                          <tr>
                            <td className="py-2 pr-4 text-sm font-semibold text-gray-700 align-top">Employment Date:</td>
                            <td className="py-2 text-sm text-gray-600 align-top">
                              {currentEmployee?.hire_date
                                ? new Date(currentEmployee.hire_date).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric"
                                })
                                : 'N/A'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditPersonalModal
        isOpen={isEditPersonalModalOpen}
        onClose={() => setIsEditPersonalModalOpen(false)}
        id={user?.employee_id || null}
      />
      <EditEmployeeModal
        isOpen={isEditEmployeeModalOpen}
        onClose={() => setIsEditEmployeeModalOpen(false)}
        id={user?.employee_id || null}
      />

      {/* Floating Ticket Button */}
      <FloatingTicketButton />
    </div>
  );
}