"use client";

import { useState, useEffect } from "react";
import { employeeApi } from "@/lib/api";
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
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
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
    barangay: "",
  });

  const [regions, setRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
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
        } else {
          setError(employeeResult.message || "Failed to fetch employee data");
        }
      } catch (err) {
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
        if (!res.ok) throw new Error(`Failed to fetch PH locations`);
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
        setBarangays([]);
      } else {
        setProvinces([]); setCities([]); setBarangays([]);
      }
    } else {
      setProvinces([]); setCities([]); setBarangays([]);
    }
  }, [formData.region, phLocationsData]);

  // Update cities on province change
  useEffect(() => {
    if (formData.region && formData.province) {
      const regionObj = phLocationsData.find((r: any) => r.name === formData.region);
      if (regionObj) {
        const provinceObj = regionObj.provinces.find((p: any) => p.name === formData.province);
        setCities(provinceObj?.cities ? provinceObj.cities.map((c: any) => (typeof c === 'string' ? c : c.name)) : []);
        setBarangays([]);
      }
    } else {
      setCities([]); setBarangays([]);
    }
  }, [formData.region, formData.province, phLocationsData]);

  // Update barangays on city change
  useEffect(() => {
    if (formData.region && formData.province && formData.city) {
      const regionObj = phLocationsData.find((r: any) => r.name === formData.region);
      if (regionObj) {
        const provinceObj = regionObj.provinces.find((p: any) => p.name === formData.province);
        if (provinceObj) {
          const cityObj = provinceObj.cities.find((c: any) => c.name === formData.city);
          setBarangays(cityObj?.barangays ? cityObj.barangays.map((b: any) => b.name) : []);
        }
      }
    } else {
      setBarangays([]);
    }
  }, [formData.region, formData.province, formData.city, phLocationsData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstname.trim()) newErrors.firstname = "First name is required.";
    if (!formData.lastname.trim()) newErrors.lastname = "Last name is required.";
    if (!formData.relationship) newErrors.relationship = "Relationship is required.";

    if (formData.email.trim() && !/^[^\s@]+@gmail\.com$/.test(formData.email)) {
      newErrors.email = "Email must be a valid Gmail address.";
    }

    const contact = formData.contact_no.replace(/\s/g, "");
    if (!contact) {
      newErrors.contact_no = "Contact number is required.";
    } else if (!/^09\d{9}$/.test(contact)) {
      newErrors.contact_no = "Must be a valid PH mobile number (09xxxxxxxxx).";
    }

    if (!formData.home_address.trim()) newErrors.home_address = "Home address is required.";
    if (!formData.region) newErrors.region = "Region is required.";
    if (!formData.province) newErrors.province = "Province is required.";
    if (!formData.city) newErrors.city = "City is required.";
    if (!formData.barangay) newErrors.barangay = "Barangay is required.";

    return newErrors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "contact_no") {
      let digits = value.replace(/\D/g, "").slice(0, 11);
      let formatted = digits;
      if (digits.length > 4 && digits.length <= 7) {
        formatted = `${digits.slice(0, 4)} ${digits.slice(4)}`;
      } else if (digits.length > 7) {
        formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const resetForm = () => {
    setFormData({
      firstname: "", lastname: "", relationship: "", email: "", contact_no: "",
      home_address: "", region: "", province: "", city: "", barangay: "",
    });
    setErrors({});
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    resetForm();
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
        contactInfo: formData.contact_no.replace(/\s/g, ""),
        homeAddress: formData.home_address,
        region: formData.region,
        province: formData.province,
        city: formData.city,
        barangay: formData.barangay,
      };

      const result = await employeeApi.update(user.employee_id, {
        dependents: [...dependents.map(d => ({
          firstName: d.firstname,
          lastName: d.lastname,
          relationship: d.relationship,
          email: d.email,
          contactInfo: d.contact_no ? d.contact_no.replace(/\s/g, "") : d.contact_no,
          homeAddress: d.home_address,
          region: d.region_name,
          province: d.province_name,
          city: d.city_name,
          barangay: d.barangay_name || "", 
        })), dependentData]
      });

      if (result.success) {
        toast.success("Dependent added successfully!");
        handleCloseAddModal();

        const employeeResult = await employeeApi.getById(user.employee_id);
        if (employeeResult.success && employeeResult.data) {
          setDependents(employeeResult.data.dependents || []);
        }
      } else {
        toast.error(result.message || "Failed to add dependent");
      }
    } catch (err) {
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
        contactInfo: d.contact_no ? d.contact_no.replace(/\s/g, "") : d.contact_no,
        homeAddress: d.home_address,
        region: d.region_name,
        province: d.province_name,
        city: d.city_name,
        barangay: d.barangay_name || "",
      }));

      const result = await employeeApi.update(user.employee_id, { dependents: updatedDependents });

      if (result.success) {
        toast.success("Dependent removed successfully!");
        setDependents(currentDependents);
      } else {
        toast.error(result.message || "Failed to remove dependent");
      }
    } catch (err) {
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

  const getRelationshipColor = (rel: string) => {
    const map: Record<string, string> = {
      spouse: "bg-blue-100 text-blue-800 border-blue-200",
      child: "bg-green-100 text-green-800 border-green-200",
      parent: "bg-purple-100 text-purple-800 border-purple-200",
      sibling: "bg-yellow-100 text-yellow-800 border-yellow-200",
      other: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return map[rel.toLowerCase()] || map.other;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf9f3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#073532] mx-auto mb-4"></div>
          <p className="text-sm font-medium text-gray-600">Loading dependents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf9f3]">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-red-100">
          <p className="text-base text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#073532] text-white px-6 py-2 rounded-lg hover:bg-[#0a4d49] transition font-medium text-sm"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-poppins bg-[#fdf9f3]">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#281b0d] tracking-tight">Family & Dependents</h1>
            <p className="text-sm text-gray-500 mt-1">Manage the profiles of your registered beneficiaries.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#073532] text-white px-5 py-2.5 rounded-lg hover:bg-[#0a4a4a] transition font-medium text-sm shadow-sm shrink-0"
          >
            + Add Dependent
          </button>
        </div>

        {/* Dependent List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.length > 0 ? (
            dependents.map(d => (
              <div key={d.dependant_id} className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hover:shadow-md transition duration-200">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{d.firstname} {d.lastname}</h3>
                      <span className={`inline-block mt-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-full ${getRelationshipColor(d.relationship)}`}>
                        {d.relationship}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 mt-5">
                    {d.contact_no && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        <p className="text-sm font-medium text-gray-700">{d.contact_no}</p>
                      </div>
                    )}
                    {d.email && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <p className="text-sm font-medium text-gray-700 break-all">{d.email}</p>
                      </div>
                    )}
                    {(d.home_address || d.city_name) && (
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-50">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <p className="text-sm text-gray-600 leading-snug">
                          {[d.home_address, d.barangay_name, d.city_name, d.province_name].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-100 flex justify-end gap-3">
                  <button onClick={() => handleEditDependant(d.dependant_id)} className="text-xs font-semibold text-[#073532] hover:text-[#0a4a4a] hover:underline transition">
                    Edit Details
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => handleRemoveDependent(d.dependant_id)} className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition">
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-200 border-dashed p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Dependents Found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">You haven't added any family members or beneficiaries yet. Click the button below to get started.</p>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-[#073532] border border-[#073532]/20 px-5 py-2 rounded-lg hover:bg-gray-50 transition font-medium text-sm shadow-sm">
                Add Your First Dependent
              </button>
            </div>
          )}
        </div>

        {/* Global Modals */}
        <EditDependantModal
          isOpen={isEditDependantModalOpen}
          onClose={() => { setIsEditDependantModalOpen(false); setSelectedDependantId(null); }}
          dependantId={selectedDependantId}
          employeeId={user?.employee_id || null}
          onUpdate={handleDependantUpdate}
        />

        {/* Add Dependent Modal - Fixed Layout to prevent cutoff */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 h-screen backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-gray-900">Add New Dependent</h2>
                <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-700 transition text-2xl leading-none">&times;</button>
              </div>
              
              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form id="add-dependent-form" onSubmit={handleSubmit} className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
                    
                    {/* Personal Info */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">First Name <span className="text-red-500">*</span></label>
                      <input
                        type="text" name="firstname" value={formData.firstname} onChange={handleInputChange} required
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.firstname ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                        placeholder="e.g. Juan"
                      />
                      {errors.firstname && <p className="text-red-500 text-xs mt-1.5">{errors.firstname}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Last Name <span className="text-red-500">*</span></label>
                      <input
                        type="text" name="lastname" value={formData.lastname} onChange={handleInputChange} required
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.lastname ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                        placeholder="e.g. Dela Cruz"
                      />
                      {errors.lastname && <p className="text-red-500 text-xs mt-1.5">{errors.lastname}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Relationship <span className="text-red-500">*</span></label>
                      <select
                        name="relationship" value={formData.relationship} onChange={handleInputChange} required
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.relationship ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                      >
                        <option value="">Select Relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.relationship && <p className="text-red-500 text-xs mt-1.5">{errors.relationship}</p>}
                    </div>

                    {/* Contact Info */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address <span className="text-gray-400 normal-case font-medium tracking-normal">(Gmail only)</span></label>
                      <input
                        type="email" name="email" value={formData.email} onChange={handleInputChange}
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                        placeholder="optional@gmail.com"
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel" name="contact_no" value={formData.contact_no} onChange={handleInputChange} required
                        className={`w-full md:w-1/2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.contact_no ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                        placeholder="09xx xxx xxxx"
                      />
                      {errors.contact_no && <p className="text-red-500 text-xs mt-1.5">{errors.contact_no}</p>}
                    </div>

                    {/* Location Info */}
                    <div className="md:col-span-2 pt-2">
                      <hr className="border-gray-100" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Home Address / Street <span className="text-red-500">*</span></label>
                      <input
                        type="text" name="home_address" value={formData.home_address} onChange={handleInputChange} required
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.home_address ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                        placeholder="Unit/House No., Street Name"
                      />
                      {errors.home_address && <p className="text-red-500 text-xs mt-1.5">{errors.home_address}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Region <span className="text-red-500">*</span></label>
                      <select
                        name="region" value={formData.region} onChange={handleInputChange} required
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors ${errors.region ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                      >
                        <option value="">Select Region</option>
                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {errors.region && <p className="text-red-500 text-xs mt-1.5">{errors.region}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Province <span className="text-red-500">*</span></label>
                      <select
                        name="province" value={formData.province} onChange={handleInputChange} required disabled={!formData.region}
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${errors.province ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                      >
                        <option value="">{formData.region ? "Select Province" : "Select Region First"}</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {errors.province && <p className="text-red-500 text-xs mt-1.5">{errors.province}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">City/Municipality <span className="text-red-500">*</span></label>
                      <select
                        name="city" value={formData.city} onChange={handleInputChange} required disabled={!formData.province}
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${errors.city ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                      >
                        <option value="">{formData.province ? "Select City" : "Select Province First"}</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.city && <p className="text-red-500 text-xs mt-1.5">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Barangay <span className="text-red-500">*</span></label>
                      <select
                        name="barangay" value={formData.barangay} onChange={handleInputChange} required disabled={!formData.city}
                        className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#073532]/20 focus:border-[#073532] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${errors.barangay ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
                      >
                        <option value="">{formData.city ? "Select Barangay" : "Select City First"}</option>
                        {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      {errors.barangay && <p className="text-red-500 text-xs mt-1.5">{errors.barangay}</p>}
                    </div>
                  </div>
                </form>
              </div>

              {/* Sticky Footer Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button" onClick={handleCloseAddModal}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  form="add-dependent-form"
                  type="submit" disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold bg-[#073532] text-white rounded-lg hover:bg-[#0a4a4a] transition disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Dependent'}
                </button>
              </div>

            </div>
          </div>
        )}

        <FloatingTicketButton />
      </div>
    </div>
  );
}