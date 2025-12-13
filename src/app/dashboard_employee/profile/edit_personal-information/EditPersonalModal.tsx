"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { departmentApi, positionApi, employeeApi } from "@/lib/api";
type ValidationErrors = Record<string, string>;
import { toast } from "react-hot-toast";

/* ---------- Interfaces ---------- */
interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
}

interface EmployeeData {
  employee_id: number;
  home_address?: string;
  city?: string;
  region?: string;
  province?: string;
  civil_status?: string;
  user_id?: number;
}

const formatCivilStatusForDisplay = (value?: string | null) => {
  if (!value) return "";
  const v = value.toLowerCase();
  const map: Record<string, string> = {
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
  };
  return map[v] || value;
};


/* ---------- Component ---------- */
export default function EditEmployeeModal({
  isOpen,
  onClose,
  id,
}: EditEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  // Editable fields
  const [homeAddress, setHomeAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);

  // PH locations data for address fields
  const [barangay, setBarangay] = useState("");
  const [barangays, setBarangays] = useState<string[]>([]);
  useEffect(() => {
    async function loadPhLocationsData() {
      try {
        console.log("Fetching ph_locations.json...");
        // 1. FETCH THE RAW JSON
        const res = await fetch("/data/ph_locations.json");
        
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }

        const rawData = await res.json();

        // 2. NORMALIZE THE DATA (The Critical Step)
        const processedData = rawData.map((region: any) => {
          
          // A. Process standard provinces (if any)
          let finalProvinces = region.provinces.map((prov: any) => ({
            name: prov.name,
            cities: prov.cities.map((city: any) => ({
              name: city.name,
              barangays: city.barangays.map((b: any) => ({ name: b.name }))
            }))
          }));

          // B. Process direct cities (Like NCR in your snippet)
          // If the region has cities directly attached, we move them to a dummy province.
          if (region.cities && region.cities.length > 0) {
            const directCities = region.cities.map((city: any) => ({
              name: city.name,
              barangays: city.barangays.map((b: any) => ({ name: b.name }))
            }));

            // Create a "Metro Manila" province for NCR, or "Independent Cities" for others
            const dummyProvinceName = region.name === "NCR" ? "Metro Manila" : "Independent Cities";

            finalProvinces.push({
              name: dummyProvinceName,
              cities: directCities
            });
          }

          // Return the unified structure
          return {
            name: region.name,
            provinces: finalProvinces
          };
        });

        console.log("Data processed successfully");
        setPhLocationsData(processedData);
        
        // 3. SET INITIAL REGIONS LIST
        setRegions(processedData.map((r: any) => r.name));

      } catch (error) {
        console.error("Error loading PH locations:", error);
        setRegions([]);
      }
    }

    loadPhLocationsData();
  }, []);

  // 2. Update provinces when region changes (Home)
  useEffect(() => {
    if (region) {
      // Match by 'name'
      const selectedRegion = phLocationsData.find((r: any) => r.name === region);
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map((p: any) => p.name);
        setProvinces(provinceNames);
        setCities([]); 
        setBarangays([]); // Reset lower levels
      }
    } else {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  }, [region, phLocationsData]);

  // 3. Update cities when province changes (Home)
  useEffect(() => {
    if (region && province) {
      const selectedRegion = phLocationsData.find((r: any) => r.name === region);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.name === province);
        if (selectedProvince) {
          // Map city names (API uses 'name')
          setCities(selectedProvince.cities.map((c: any) => c.name));
          setBarangays([]); 
        }
      }
    } else {
      setCities([]);
      setBarangays([]);
    }
  }, [region, province, phLocationsData]);

  // 4. Load Barangays (Home)
  useEffect(() => {
    if (region && province && city && phLocationsData.length > 0) {
      const r = phLocationsData.find((x: any) => x.name === region);
      const p = r?.provinces.find((x: any) => x.name === province);
      const c = p?.cities.find((x: any) => x.name === city);
      
      if (c && c.barangays) {
        setBarangays(c.barangays.map((b: any) => b.name));
      } else {
        setBarangays([]);
      }
    } else {
      setBarangays([]);
    }
  }, [region, province, city, phLocationsData]);


  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---------- Fetch employee details ---------- */
  useEffect(() => {
    if (isOpen && id) fetchEmployee(id);
  }, [isOpen, id]);

  const fetchEmployee = async (empId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      if (res.success && res.data) {
        setEmployee(res.data);
        setHomeAddress(res.data.home_address || "");
        setCity(res.data.city || "");
        setRegion(res.data.region || "");
        setProvince(res.data.province || "");
        setBarangay(res.data.barangay || "");
        setCivilStatus(formatCivilStatusForDisplay(res.data.civil_status));
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    }
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async () => {
    console.log("Save Changes clicked");

    // Simple validation for required fields
    const formErrors: ValidationErrors = {};
    if (!homeAddress.trim()) formErrors.homeAddress = "Home address is required.";
    if (!region) formErrors.region = "Region is required.";




    if (!province) formErrors.province = "Province is required.";
    if (!city) formErrors.city = "City is required.";
    if (!civilStatus) formErrors.civilStatus = "Civil status is required.";

    if (Object.keys(formErrors).length > 0 || !employee) {
      setErrors(formErrors);
      console.log("Validation failed or no employee");

      const uniqueErrors = Array.from(new Set(Object.values(formErrors)));
      toast.error(
        <div>
          <p className="font-bold">Please fix the following errors:</p>
          <ul className="list-disc pl-4 mt-1 text-sm">
            {uniqueErrors.map((err: any, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedData: any = {
        home_address: homeAddress,
        barangay: barangay || null,
        city: city,
        region: region,
        province: province,
        civil_status: civilStatus ? civilStatus.toLowerCase() : null,
      };

      console.log("Submitting update:", updatedData);
      const result = await employeeApi.update(employee.employee_id, updatedData);
      console.log("Update result:", result);

      if (result.success) {
        toast.success("Personal information updated successfully!");
        onClose();
      } else {
        toast.error(result.message || "Failed to update personal information");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("An error occurred while updating personal information");
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
        className="bg-[#fdf3e2] w-full max-w-5xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
        >
          <X size={26} />
        </button>

        <h2 className="text-2xl font-semibold mb-1">Edit Personal Information</h2>
        <p className="text-sm text-gray-600 mb-6">
          Update your address and civil status
        </p>

        {employee ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Home Address"
                type="text"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                error={errors.homeAddress}
              />
              <FormSelect
                label="Region"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setProvince("");
                  setCity("");
                  setBarangay("");
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
                  setBarangay("");
                }}
                options={region ? provinces : []}
                error={errors.province}
              />
              <FormSelect
                label="City"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setBarangay("");
                }}
                options={province ? cities : []}
                error={errors.city}
              />
              <FormSelect
                label="Barangay"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                options={city ? barangays : []}
                error={errors.barangay}
              />

              <FormSelect
                label="Civil Status"
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value)}
                options={["Single", "Married", "Widowed", "Divorced"]}
                error={errors.civilStatus}
              />
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">Loading employee details...</p>
        )}

        <div className="flex justify-end mt-10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#4b0b14] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}