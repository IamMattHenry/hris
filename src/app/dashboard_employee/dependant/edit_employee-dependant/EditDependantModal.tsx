"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { employeeApi } from "@/lib/api";
import { Dependent } from "@/types/api";
import { toast } from "react-hot-toast";

/* ---------- Interfaces ---------- */
interface EditDependantModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependantId: number | null;
  employeeId: number | null;
  onUpdate: () => void;
}

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
  const [birthDate, setBirthDate] = useState("");
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

  /* ---------- Fetch dependant details ---------- */
  useEffect(() => {
    if (isOpen && dependantId && employeeId) {
      fetchDependant(employeeId, dependantId);
    }
  }, [isOpen, dependantId, employeeId]);

  const fetchDependant = async (empId: number, depId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      if (res.success && res.data) {
        const employee = res.data;
        const dependant = employee.dependents?.find((d: Dependent) => d.dependant_id === depId);
        if (dependant) {
          setDependant(dependant);
          setFirstName(dependant.firstname);
          setLastName(dependant.lastname);
          setRelationship(dependant.relationship);
          setBirthDate(dependant.birth_date);
          setEmail(dependant.email || "");
          setContactNumber(dependant.contact_no || "");
          setHomeAddress(dependant.home_address || "");
          setRegion(dependant.region_name || "");
          setProvince(dependant.province_name || "");
          setCity(dependant.city_name || "");
        }
      }
    } catch (error) {
      console.error("Error fetching dependant:", error);
    }
  };

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
    if (region) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === region);
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
  }, [region, phLocationsData]);

  // Update cities when province changes
  useEffect(() => {
    if (region && province) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === region);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.province === province);
        if (selectedProvince) {
          setCities(selectedProvince.cities);
        } else {
          setCities([]);
        }
      }
    } else {
      setCities([]);
    }
  }, [region, province, phLocationsData]);

  /* ---------- Validation ---------- */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required.";
    if (!lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!relationship) newErrors.relationship = "Relationship is required.";
    if (!birthDate) newErrors.birthDate = "Birth date is required.";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Contact number validation (Philippine format)
    const contactRegex = /^09\d{9}$/;
    if (!contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required.";
    } else if (!contactRegex.test(contactNumber.replace(/\s/g, ""))) {
      newErrors.contactNumber = "Please enter a valid Philippine contact number (09xxxxxxxxx).";
    }

    if (!homeAddress.trim()) newErrors.homeAddress = "Home address is required.";
    if (!region) newErrors.region = "Region is required.";
    if (!province) newErrors.province = "Province is required.";
    if (!city) newErrors.city = "City is required.";

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
      // Get current dependents and update the specific one
      const employeeResult = await employeeApi.getById(employeeId);
      if (!employeeResult.success || !employeeResult.data) {
        toast.error("Failed to fetch current dependents");
        return;
      }

      const currentDependents = employeeResult.data.dependents || [];
      const updatedDependents = currentDependents.map((dep: Dependent) => {
        if (dep.dependant_id === dependantId) {
          return {
            firstName,
            lastName,
            relationship,
            birth_date: birthDate,
            email,
            contactInfo: contactNumber,
            homeAddress,
            region,
            province,
            city,
          };
        }
        return {
          firstName: dep.firstname,
          lastName: dep.lastname,
          relationship: dep.relationship,
          birth_date: dep.birth_date,
          email: dep.email,
          contactInfo: dep.contact_no,
          homeAddress: dep.home_address,
          region: dep.region_name,
          province: dep.province_name,
          city: dep.city_name,
        };
      });

      const result = await employeeApi.update(employeeId, {
        dependents: updatedDependents
      });

      if (result.success) {
        toast.success("Dependant updated successfully!");
        onUpdate();
        onClose();
      } else {
        toast.error(result.message || "Failed to update dependant");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("An error occurred while updating dependant");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  /* ---------- JSX ---------- */
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full max-w-4xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
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
                label="First Name"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors(prev => ({ ...prev, firstName: "" }));
                }}
                error={errors.firstName}
              />
              <FormInput
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors(prev => ({ ...prev, lastName: "" }));
                }}
                error={errors.lastName}
              />
              <FormSelect
                label="Relationship"
                value={relationship}
                onChange={(e) => {
                  setRelationship(e.target.value);
                  if (errors.relationship) setErrors(prev => ({ ...prev, relationship: "" }));
                }}
                options={["Spouse", "Child", "Parent", "Sibling", "Other"]}
                error={errors.relationship}
              />
              <FormInput
                label="Birth Date"
                type="date"
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  if (errors.birthDate) setErrors(prev => ({ ...prev, birthDate: "" }));
                }}
                error={errors.birthDate}
              />
              <FormInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                }}
                error={errors.email}
              />
              <FormInput
                label="Contact Number"
                type="tel"
                value={contactNumber}
                onChange={(e) => {
                  setContactNumber(e.target.value);
                  if (errors.contactNumber) setErrors(prev => ({ ...prev, contactNumber: "" }));
                }}
                error={errors.contactNumber}
              />
              <div className="md:col-span-2">
                <FormInput
                  label="Home Address"
                  type="text"
                  value={homeAddress}
                  onChange={(e) => {
                    setHomeAddress(e.target.value);
                    if (errors.homeAddress) setErrors(prev => ({ ...prev, homeAddress: "" }));
                  }}
                  error={errors.homeAddress}
                />
              </div>
              <FormSelect
                label="Region"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setProvince("");
                  setCity("");
                  if (errors.region) setErrors(prev => ({ ...prev, region: "" }));
                }}
                options={regions}
                error={errors.region}
              />
              <FormSelect
                label="Province"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity("");
                  if (errors.province) setErrors(prev => ({ ...prev, province: "" }));
                }}
                options={region ? provinces : []}
                error={errors.province}
              />
              <FormSelect
                label="City"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (errors.city) setErrors(prev => ({ ...prev, city: "" }));
                }}
                options={province ? cities : []}
                error={errors.city}
              />
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">Loading dependant details...</p>
        )}

        <div className="flex justify-end mt-10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#073532] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}