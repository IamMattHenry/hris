"use client";

import { useState, useEffect } from "react";
import { employeeApi, leaveApi, attendanceApi } from "@/lib/api";
import { Employee, Dependent } from "@/types/api";
import FloatingTicketButton from "@/components/dashboard/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import EditDependantModal from "./edit_employee-dependant/EditDependantModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    relationship: "",
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
      if (!user?.employee_id) return;

      setLoading(true);
      setError(null);

      try {
        const employeeResult = await employeeApi.getById(user.employee_id);

        if (employeeResult.success && employeeResult.data) {
          const employee = employeeResult.data as Employee;
          setCurrentEmployee(employee);
          setDependents(employee.dependents || []);
          console.log("Fetched employee data:", employee);
          console.log("Dependents:", employee.dependents);
        } else {
          setError(employeeResult.message || "Failed to fetch employee data");
        }
      } catch (err) {
        console.error("Error fetching employee data:", err);
        setError("Failed to fetch employee data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Load PH locations
  useEffect(() => {
    async function loadPhLocationsData() {
      try {
        const res = await fetch("/data/ph_locations.json");
        if (!res.ok) throw new Error(`Failed to fetch PH locations: ${res.status}`);
        const rawData = await res.json();

        const processedData = rawData.map((region: any) => {
          const finalProvinces = (region.provinces || []).map((prov: any) => ({
            name: prov.name,
            cities: (prov.cities || []).map((city: any) => ({
              name: city.name,
              barangays: (city.barangays || []).map((b: any) => ({ name: b.name }))
            }))
          }));

          if (region.cities && region.cities.length > 0) {
            const directCities = region.cities.map((city: any) => ({
              name: city.name,
              barangays: (city.barangays || []).map((b: any) => ({ name: b.name }))
            }));

            const dummyProvinceName = region.name === "NCR" ? "Metro Manila" : "Independent Cities";
            finalProvinces.push({ name: dummyProvinceName, cities: directCities });
          }
          return { name: region.name, provinces: finalProvinces };
        });

        setPhLocationsData(processedData);
        setRegions(processedData.map((r: any) => r.name));
      } catch (err) {
        console.error(err);
        setRegions([]);
      }
    }
    loadPhLocationsData();
  }, []);

  // Update provinces on region change
  useEffect(() => {
    if (formData.region) {
      const regionObj = phLocationsData.find((r: any) => r.name === formData.region);
      if (regionObj) {
        setProvinces(regionObj.provinces.map((p: any) => p.name));
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

  // Update cities on province change
  useEffect(() => {
    if (formData.region && formData.province) {
      const regionObj = phLocationsData.find((r: any) => r.name === formData.region);
      if (regionObj) {
        const provinceObj = regionObj.provinces.find((p: any) => p.name === formData.province);
        setCities(provinceObj?.cities ? provinceObj.cities.map((c: any) => (typeof c === 'string' ? c : c.name)) : []);
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

    // Email optional, must be Gmail if provided
    if (formData.email.trim() && !/^[^\s@]+@gmail\.com$/.test(formData.email)) {
      newErrors.email = "Email must be a valid Gmail address.";
    }

    const contact = formData.contact_no.replace(/\s/g, "");
    if (!contact) {
      newErrors.contact_no = "Contact number is required.";
    } else if (!/^09\d{9}$/.test(contact)) {
      newErrors.contact_no = "Please enter a valid Philippine contact number (09xxxxxxxxx).";
    }

    if (!formData.home_address.trim()) newErrors.home_address = "Home address is required.";
    if (!formData.region) newErrors.region = "Region is required.";
    if (!formData.province) newErrors.province = "Province is required.";
    if (!formData.city) newErrors.city = "City is required.";

    return newErrors;
  };

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;

  if (name === "contact_no") {
    // Remove all non-digit characters
    let digits = value.replace(/\D/g, "");

    // Limit to 11 digits (PH mobile number)
    digits = digits.slice(0, 11);

    // Format: 09xx xxx xxxx
    let formatted = digits;
    if (digits.length > 4 && digits.length <= 7) {
      formatted = digits.slice(0, 4) + " " + digits.slice(4);
    } else if (digits.length > 7) {
      formatted = digits.slice(0, 4) + " " + digits.slice(4, 7) + " " + digits.slice(7);
    }

    setFormData(prev => ({ ...prev, [name]: formatted }));
  } else {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
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
          email: "",
          contact_no: "",
          home_address: "",
          region: "",
          province: "",
          city: "",
        });
        setErrors({});
        setShowForm(false);

        const employeeResult = await employeeApi.getById(user.employee_id);
        if (employeeResult.success && employeeResult.data) {
          setDependents(employeeResult.data.dependents || []);
        }
      } else {
        toast.error(result.message || "Failed to add dependent");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add dependent");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDependant = (dependantId: number) => {
    setSelectedDependantId(dependantId);
    setIsEditDependantModalOpen(true);
  };

  const handleRemoveDependent = async (dependantId: number) => {
    if (!user?.employee_id) return;
    if (!window.confirm("Are you sure you want to remove this dependent?")) return;

    try {
      const currentDependents = dependents.filter(d => d.dependant_id !== dependantId);
      const updatedDependents = currentDependents.map(d => ({
        firstName: d.firstname,
        lastName: d.lastname,
        relationship: d.relationship,
        email: d.email,
        contactInfo: d.contact_no,
        homeAddress: d.home_address,
        region: d.region_name,
        province: d.province_name,
        city: d.city_name,
      }));

      const result = await employeeApi.update(user.employee_id, { dependents: updatedDependents });

      if (result.success) {
        toast.success("Dependent removed successfully!");
        setDependents(currentDependents);
      } else {
        toast.error(result.message || "Failed to remove dependent");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove dependent");
    }
  };

  const handleDependantUpdate = async () => {
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
        {currentEmployee && (
          <div className="text-left">
            <h1 className="text-3xl font-semibold text-gray-800 font-poppins">
              Employee Dependent Information
            </h1>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.firstname ? "border-red-500" : ""}`}
                    />
                    {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.lastname ? "border-red-500" : ""}`}
                    />
                    {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                    <select
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.relationship ? "border-red-500" : ""}`}
                    >
                      <option value="">Select Relationship</option>
                      <option value="spouse">Spouse</option>
                      <option value="child">Child</option>
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.relationship && <p className="text-red-500 text-xs mt-1">{errors.relationship}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional, Gmail only)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.email ? "border-red-500" : ""}`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                    <input
                      type="tel"
                      name="contact_no"
                      value={formData.contact_no}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.contact_no ? "border-red-500" : ""}`}
                    />
                    {errors.contact_no && <p className="text-red-500 text-xs mt-1">{errors.contact_no}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Home Address *</label>
                    <input
                      type="text"
                      name="home_address"
                      value={formData.home_address}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.home_address ? "border-red-500" : ""}`}
                    />
                    {errors.home_address && <p className="text-red-500 text-xs mt-1">{errors.home_address}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] ${errors.region ? "border-red-500" : ""}`}
                    >
                      <option value="">Select Region</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      required
                      disabled={!formData.region}
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.province ? "border-red-500" : ""}`}
                    >
                      <option value="">{formData.region ? "Select Province" : "Select Region First"}</option>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      disabled={!formData.province}
                      className={`w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#073532] disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.city ? "border-red-500" : ""}`}
                    >
                      <option value="">{formData.province ? "Select City" : "Select Province First"}</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
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

            <hr className="w-full border-gray-600 mb-6" />

            <div className="space-y-4">
              {dependents.length > 0 ? dependents.map(d => (
                <div key={d.dependant_id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{d.firstname} {d.lastname}</h3>
                    <p className="text-sm text-gray-600 capitalize">{d.relationship}</p>
                    {d.email && <p className="text-sm text-gray-600">Email: {d.email}</p>}
                    {d.contact_no && <p className="text-sm text-gray-600">Contact: {d.contact_no}</p>}
                    {d.home_address && (
                      <p className="text-sm text-gray-600">
                        Address: {d.home_address}{d.city_name && `, ${d.city_name}`}{d.province_name && `, ${d.province_name}`}{d.region_name && `, ${d.region_name}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => handleEditDependant(d.dependant_id)} className="px-3 py-1 bg-[#073532] text-white text-sm rounded-md hover:bg-[#0a4a4a] transition">Edit</button>
                    <button onClick={() => handleRemoveDependent(d.dependant_id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition">Remove</button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No dependents added yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <EditDependantModal
          isOpen={isEditDependantModalOpen}
          onClose={() => { setIsEditDependantModalOpen(false); setSelectedDependantId(null); }}
          dependantId={selectedDependantId}
          employeeId={user?.employee_id || null}
          onUpdate={handleDependantUpdate}
        />

        <FloatingTicketButton />
      </div>
    </div>
  );
}
