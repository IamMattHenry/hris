"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";

/* ---------- Interfaces ---------- */
interface EditDependantModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependantId: number | null;
  employeeId: number | null;
  onUpdate: () => void;
}

interface Dependent {
  dependant_id: number;
  firstname: string;
  lastname: string;
  relationship: string;
  birth_date?: string;
  email?: string;
  contact_no?: string;
  home_address?: string;
  region_name?: string;
  province_name?: string;
  city_name?: string;
}

/* ---------- Form Components ---------- */
const FormInput = ({ label, type, value, onChange, error }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className={`px-4 py-2 rounded-lg border ${
        error ? "border-red-500" : "border-gray-300"
      } focus:outline-none focus:ring-2 focus:ring-[#073532]`}
    />
    {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
  </div>
);

const FormSelect = ({ label, value, onChange, options, error }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className={`px-4 py-2 rounded-lg border ${
        error ? "border-red-500" : "border-gray-300"
      } focus:outline-none focus:ring-2 focus:ring-[#073532]`}
    >
      <option value="">Select {label}</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
  </div>
);

/* ---------- Component ---------- */
export default function EditDependantModal({
  isOpen,
  onClose,
  dependantId,
  employeeId,
  onUpdate,
}: EditDependantModalProps) {
  const [dependant, setDependant] = useState<Dependent | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");

  // Location data
  const [regions, setRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---------- Format contact number with spaces ---------- */
  const formatContactNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");
    
    // Format as: 09XX XXX XXXX
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 4)}`;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  };

  /* ---------- Fetch dependant details ---------- */
  useEffect(() => {
    if (isOpen && dependantId && employeeId) {
      // Mock fetch - replace with actual API call
      // fetchDependant(employeeId, dependantId);
      
      // Mock data for demonstration
      const mockDependant: Dependent = {
        dependant_id: dependantId,
        firstname: "Juan",
        lastname: "Dela Cruz",
        relationship: "Child",
        email: "juan@gmail.com",
        contact_no: "09171234567",
        home_address: "123 Main St",
        region_name: "NCR",
        province_name: "Metro Manila",
        city_name: "Quezon City"
      };
      
      setDependant(mockDependant);
      setFirstName(mockDependant.firstname);
      setLastName(mockDependant.lastname);
      setRelationship(mockDependant.relationship);
      setEmail(mockDependant.email || "");
      setContactNumber(formatContactNumber(mockDependant.contact_no || ""));
      setHomeAddress(mockDependant.home_address || "");
      setRegion(mockDependant.region_name || "");
      setProvince(mockDependant.province_name || "");
      setCity(mockDependant.city_name || "");
    }
  }, [isOpen, dependantId, employeeId]);

  // Load Philippine locations data
  useEffect(() => {
    // Mock data for demonstration
    const mockPhData = [
      {
        region: "NCR",
        provinces: [
          {
            province: "Metro Manila",
            cities: ["Quezon City", "Manila", "Makati", "Pasig"]
          }
        ]
      },
      {
        region: "Region III",
        provinces: [
          {
            province: "Bulacan",
            cities: ["Malolos", "Meycauayan", "San Jose del Monte"]
          }
        ]
      }
    ];
    
    setPhLocationsData(mockPhData);
    setRegions(mockPhData.map((r: any) => r.region));
  }, []);

  // Update provinces when region changes
  useEffect(() => {
    if (region) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === region);
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map((p: any) => p.province);
        setProvinces(provinceNames);
        
        // Only clear city if the current province is not in the new list
        if (!provinceNames.includes(province)) {
          setProvince("");
          setCities([]);
        }
      } else {
        setProvinces([]);
        setCities([]);
      }
    } else {
      setProvinces([]);
      setCities([]);
      setProvince("");
      setCity("");
    }
  }, [region, phLocationsData]);

  // Update cities when province changes
  useEffect(() => {
    if (region && province) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === region);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.province === province);
        if (selectedProvince) {
          setCities(selectedProvince.cities);
          
          // Only clear city if it's not in the new list
          if (!selectedProvince.cities.includes(city)) {
            setCity("");
          }
        } else {
          setCities([]);
          setCity("");
        }
      }
    } else {
      setCities([]);
      setCity("");
    }
  }, [region, province, phLocationsData]);

  /* ---------- Validation ---------- */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation - required
    if (!firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }
    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }
    
    if (!relationship) {
      newErrors.relationship = "Relationship is required.";
    }

    // Email validation - optional but must be Gmail format if provided
    if (email.trim()) {
      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
      if (!gmailRegex.test(email.trim())) {
        newErrors.email = "Email must be a valid Gmail address (example@gmail.com).";
      }
    }

    // Contact number validation - required, Philippine format
    const digitsOnly = contactNumber.replace(/\D/g, "");
    if (!contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required.";
    } else if (!digitsOnly.startsWith("09") || digitsOnly.length !== 11) {
      newErrors.contactNumber = "Contact number must be in Philippine format (09XX XXX XXXX).";
    }

    // Address validation - all required
    if (!homeAddress.trim()) {
      newErrors.homeAddress = "Home address is required.";
    }
    if (!region) {
      newErrors.region = "Region is required.";
    }
    if (!province) {
      newErrors.province = "Province is required.";
    }
    if (!city) {
      newErrors.city = "City is required.";
    }

    return newErrors;
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!employeeId || !dependantId) return;

    setIsSubmitting(true);
    try {
      // Mock API call - replace with actual implementation
      console.log("Updating dependant:", {
        employeeId,
        dependantId,
        firstName,
        lastName,
        relationship,
        email: email.trim() || null,
        contactNumber: contactNumber.replace(/\D/g, ""),
        homeAddress,
        region,
        province,
        city
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert("Dependant updated successfully!");
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Update error:", err);
      alert("An error occurred while updating dependant");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Handle contact number change ---------- */
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatContactNumber(e.target.value);
    setContactNumber(formatted);
    if (errors.contactNumber) {
      setErrors(prev => ({ ...prev, contactNumber: "" }));
    }
  };

  if (!isOpen) return null;

  /* ---------- JSX ---------- */
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 min-h-screen"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full max-w-4xl p-8 md:p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >2
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70 transition-opacity"
          aria-label="Close modal"
        >
          <X size={26} />
        </button>

        <h2 className="text-2xl font-semibold mb-1">Edit Dependant</h2>
        <p className="text-sm text-gray-600 mb-6">
          Update dependant information
        </p>

        {dependant ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="First Name *"
                type="text"
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors(prev => ({ ...prev, firstName: "" }));
                }}
                error={errors.firstName}
              />
              <FormInput
                label="Last Name *"
                type="text"
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors(prev => ({ ...prev, lastName: "" }));
                }}
                error={errors.lastName}
              />
              <FormSelect
                label="Relationship *"
                value={relationship}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setRelationship(e.target.value);
                  if (errors.relationship) setErrors(prev => ({ ...prev, relationship: "" }));
                }}
                options={["Spouse", "Child", "Parent", "Sibling", "Other"]}
                error={errors.relationship}
              />
              <FormInput
                label="Email (Optional)"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                }}
                error={errors.email}
              />
              <FormInput
                label="Contact Number *"
                type="tel"
                value={contactNumber}
                onChange={handleContactChange}
                error={errors.contactNumber}
              />
              <div className="md:col-span-2">
                <FormInput
                  label="Home Address *"
                  type="text"
                  value={homeAddress}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setHomeAddress(e.target.value);
                    if (errors.homeAddress) setErrors(prev => ({ ...prev, homeAddress: "" }));
                  }}
                  error={errors.homeAddress}
                />
              </div>
              <FormSelect
                label="Region *"
                value={region}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setRegion(e.target.value);
                  if (errors.region) setErrors(prev => ({ ...prev, region: "" }));
                }}
                options={regions}
                error={errors.region}
              />
              <FormSelect
                label="Province *"
                value={province}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setProvince(e.target.value);
                  if (errors.province) setErrors(prev => ({ ...prev, province: "" }));
                }}
                options={region ? provinces : []}
                error={errors.province}
              />
              <FormSelect
                label="City *"
                value={city}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setCity(e.target.value);
                  if (errors.city) setErrors(prev => ({ ...prev, city: "" }));
                }}
                options={province ? cities : []}
                error={errors.city}
              />
            </div>
            
            <p className="text-xs text-gray-500 mt-4">* Required fields</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading dependant details...</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-10">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !dependant}
            className="bg-[#073532] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}