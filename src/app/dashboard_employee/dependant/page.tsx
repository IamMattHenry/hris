"use client";

import { useState, useEffect } from "react";
import { Cell, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from "recharts";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { Employee, Dependent } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import EditDependantModal from "./edit_employee-dependant/EditDependantModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeAttendanceSummary, setEmployeeAttendanceSummary] = useState<{
    present: number;
    absent: number;
    leave: number;
    late: number;
  } | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    relationship: "",
    birth_date: "",
    email: "",
    contact_no: "",
    home_address: "",
    region: "",
    province: "",
    city: "",
  });
  const [regions, setRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [isEditDependantModalOpen, setIsEditDependantModalOpen] = useState(false);
  const [selectedDependantId, setSelectedDependantId] = useState<number | null>(null);
 
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [empResult] = await Promise.all([
          employeeApi.getAll(),
          leaveApi.getDashboardStats(),
        ]);

        if (empResult.success && empResult.data) {
          setEmployees(empResult.data as Employee[]);
        } else {
          setError(empResult.message || "Failed to fetch employees");
        }

        // Fetch current employee's detailed data
        if (user?.employee_id) {
          const employeeResult = await employeeApi.getById(user.employee_id);
          if (employeeResult.success && employeeResult.data) {
            const employee = employeeResult.data as Employee;
            setCurrentEmployee(employee);
            setDependents(employee.dependents || []);
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

  // Load Philippine locations data
  useEffect(() => {
    async function loadPhLocationsData() {
      try {
        const res = await fetch("/data/ph_locations.json");
        if (!res.ok) {
          throw new Error(
            `Failed to fetch PH locations data: ${res.status} ${res.statusText}`
          );
        }
        const data = await res.json();
        setPhLocationsData(data);
        const regionNames = data.map((r: any) => r.region);
        setRegions(regionNames);
      } catch (error) {
        console.error("Error loading PH locations data:", error);
        setRegions([]);
      }
    }
    loadPhLocationsData();
  }, []);

  // Update provinces when region changes
  useEffect(() => {
    if (formData.region) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === formData.region);
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map((p: any) => p.province);
        setProvinces(provinceNames);
        setCities([]);
      } else {
        setProvinces([]);
        setCities([]);
      }
    } else {
      setProvinces([]);
      setCities([]);
    }
  }, [formData.region, phLocationsData]);

  // Update cities when province changes
  useEffect(() => {
    if (formData.region && formData.province) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === formData.region);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.province === formData.province);
        if (selectedProvince) {
          setCities(selectedProvince.cities);
        } else {
          setCities([]);
        }
      }
    } else {
      setCities([]);
    }
  }, [formData.region, formData.province, phLocationsData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstname.trim()) newErrors.firstname = "First name is required.";
    if (!formData.lastname.trim()) newErrors.lastname = "Last name is required.";
    if (!formData.relationship) newErrors.relationship = "Relationship is required.";
    if (!formData.birth_date) newErrors.birth_date = "Birth date is required.";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Contact number validation (Philippine format)
    const contactRegex = /^09\d{9}$/;
    if (!formData.contact_no.trim()) {
      newErrors.contact_no = "Contact number is required.";
    } else if (!contactRegex.test(formData.contact_no.replace(/\s/g, ""))) {
      newErrors.contact_no = "Please enter a valid Philippine contact number (09xxxxxxxxx).";
    }

    if (!formData.home_address.trim()) newErrors.home_address = "Home address is required.";
    if (!formData.region) newErrors.region = "Region is required.";
    if (!formData.province) newErrors.province = "Province is required.";
    if (!formData.city) newErrors.city = "City is required.";

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee_id) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const dependentData = {
        firstName: formData.firstname,
        lastName: formData.lastname,
        relationship: formData.relationship,
        birth_date: formData.birth_date,
        email: formData.email,
        contactInfo: formData.contact_no,
        homeAddress: formData.home_address,
        region: formData.region,
        province: formData.province,
        city: formData.city,
      };

      const result = await employeeApi.update(user.employee_id, {
        dependents: [...dependents.map(d => ({
          firstName: d.firstname,
          lastName: d.lastname,
          relationship: d.relationship,
          birth_date: d.birth_date,
          email: d.email,
          contactInfo: d.contact_no,
          homeAddress: d.home_address,
          region: d.region_name,
          province: d.province_name,
          city: d.city_name,
        })), dependentData]
      });

      if (result.success) {
        toast.success("Dependent added successfully!");
        setFormData({
          firstname: "",
          lastname: "",
          relationship: "",
          birth_date: "",
          email: "",
          contact_no: "",
          home_address: "",
          region: "",
          province: "",
          city: "",
        });
        setErrors({});
        setShowForm(false);

        // Refresh dependents
        const employeeResult = await employeeApi.getById(user.employee_id);
        if (employeeResult.success && employeeResult.data) {
          setDependents(employeeResult.data.dependents || []);
        }
      } else {
        toast.error(result.message || "Failed to add dependent");
      }
    } catch (err) {
      console.error("Error adding dependent:", err);
      toast.error("Failed to add dependent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditDependant = (dependantId: number) => {
    setSelectedDependantId(dependantId);
    setIsEditDependantModalOpen(true);
  };

  const handleRemoveDependent = async (dependantId: number) => {
    if (!user?.employee_id) return;

    const confirmDelete = window.confirm("Are you sure you want to remove this dependent?");
    if (!confirmDelete) return;

    try {
      // Get current dependents and filter out the one to remove
      const currentDependents = dependents.filter(d => d.dependant_id !== dependantId);
      const updatedDependents = currentDependents.map(d => ({
        firstName: d.firstname,
        lastName: d.lastname,
        relationship: d.relationship,
        birth_date: d.birth_date,
        email: d.email,
        contactInfo: d.contact_no,
        homeAddress: d.home_address,
        region: d.region_name,
        province: d.province_name,
        city: d.city_name,
      }));

      const result = await employeeApi.update(user.employee_id, {
        dependents: updatedDependents
      });

      if (result.success) {
        toast.success("Dependent removed successfully!");
        setDependents(currentDependents);
      } else {
        toast.error(result.message || "Failed to remove dependent");
      }
    } catch (err) {
      console.error("Error removing dependent:", err);
      toast.error("Failed to remove dependent");
    }
  };

  const handleDependantUpdate = async () => {
    // Refresh dependents after update
    if (user?.employee_id) {
      const employeeResult = await employeeApi.getById(user.employee_id);
      if (employeeResult.success && employeeResult.data) {
        setDependents(employeeResult.data.dependents || []);
      }
    }
  };

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
          <div className="text-left">
            <h1 className="text-3xl font-semibold text-gray-800 font-poppins">
              <p>Employee Dependent Information</p>
            </h1>
          </div>
        ) : null}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Dependents Section */}
          <div className="bg-white rounded-xl shadow-sm p-7 border border-[#e8dcc8]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Dependents</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-[#073532] text-white px-4 py-2 rounded-lg hover:bg-[#0a4a4a] transition"
              >
                {showForm ? 'Cancel' : 'Add Dependent'}
              </button>
            </div>

            {/* Add Dependent Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstname"
                      value={formData.firstname}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                    <select
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                    >
                      <option value="">Select Relationship</option>
                      <option value="spouse">Spouse</option>
                      <option value="child">Child</option>
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                      }}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${
                        errors.email ? "border-red-500" : ""
                      }`}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                    <input
                      type="tel"
                      name="contact_no"
                      value={formData.contact_no}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.contact_no) setErrors(prev => ({ ...prev, contact_no: "" }));
                      }}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${
                        errors.contact_no ? "border-red-500" : ""
                      }`}
                    />
                    {errors.contact_no && (
                      <p className="text-red-500 text-xs mt-1">{errors.contact_no}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                    <input
                      type="text"
                      name="home_address"
                      value={formData.home_address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.region) setErrors(prev => ({ ...prev, region: "" }));
                      }}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${
                        errors.region ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select Region</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    {errors.region && (
                      <p className="text-red-500 text-xs mt-1">{errors.region}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.province) setErrors(prev => ({ ...prev, province: "" }));
                      }}
                      required
                      disabled={!formData.region}
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        errors.province ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">
                        {formData.region ? "Select Province" : "Select Region First"}
                      </option>
                      {provinces.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                    {errors.province && (
                      <p className="text-red-500 text-xs mt-1">{errors.province}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.city) setErrors(prev => ({ ...prev, city: "" }));
                      }}
                      required
                      disabled={!formData.province}
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        errors.city ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">
                        {formData.province ? "Select City" : "Select Province First"}
                      </option>
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#073532] text-white rounded-md hover:bg-[#0a4a4a] disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Dependent'}
                  </button>
                </div>
              </form>
            )}

            {/* Divider */}
            <hr className="w-full border-gray-600 mb-6" />

            {/* Dependents List */}
            <div className="space-y-4">
              {dependents.length > 0 ? (
                dependents.map((dependent) => (
                  <div key={dependent.dependant_id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {dependent.firstname} {dependent.lastname}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">{dependent.relationship}</p>
                        {dependent.birth_date && (
                          <p className="text-sm text-gray-600">
                            Birth Date: {new Date(dependent.birth_date).toLocaleDateString()}
                          </p>
                        )}
                        {dependent.email && (
                          <p className="text-sm text-gray-600">Email: {dependent.email}</p>
                        )}
                        {dependent.contact_no && (
                          <p className="text-sm text-gray-600">Contact: {dependent.contact_no}</p>
                        )}
                        {dependent.home_address && (
                          <p className="text-sm text-gray-600">
                            Address: {dependent.home_address}
                            {dependent.city_name && `, ${dependent.city_name}`}
                            {dependent.province_name && `, ${dependent.province_name}`}
                            {dependent.region_name && `, ${dependent.region_name}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditDependant(dependent.dependant_id)}
                          className="px-3 py-1 bg-[#073532] text-white text-sm rounded-md hover:bg-[#0a4a4a] transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveDependent(dependent.dependant_id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No dependents added yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Dependant Modal */}
        <EditDependantModal
          isOpen={isEditDependantModalOpen}
          onClose={() => {
            setIsEditDependantModalOpen(false);
            setSelectedDependantId(null);
          }}
          dependantId={selectedDependantId}
          employeeId={user?.employee_id || null}
          onUpdate={handleDependantUpdate}
        />

        {/* Floating Ticket Button */}
        <FloatingTicketButton />
      </div>
    </div>
  );
}