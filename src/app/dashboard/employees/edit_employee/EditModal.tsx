"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { departmentApi, positionApi, employeeApi } from "@/lib/api";

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
}

interface EmployeeData {
  employee_id: number;
  first_name: string;
  last_name: string;
  home_address: string;
  city: string;
  region: string;
  department_id: number;
  position_id: number;
  shift: string;
  email: string;
}

export default function EditEmployeeModal({ isOpen, onClose, id }: EditEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [shift, setShift] = useState("");
  const [email, setEmail] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employee details
  useEffect(() => {
    if (isOpen && id) fetchEmployee(id);
  }, [isOpen, id]);

  const fetchEmployee = async (empId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      if (res.success && res.data) {
        setEmployee(res.data);
        setFirstName(res.data.first_name);
        setLastName(res.data.last_name);
        setDepartmentId(res.data.department_id);
        setPositionId(res.data.position_id);
        setShift(res.data.shift || "");
        setEmail(res.data.email || "");
        setHomeAddress(res.data.home_address || "");
        setCity(res.data.city || "");
        setRegion(res.data.region || "");
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    }
  };

  // Fetch departments & positions
  useEffect(() => { if (isOpen) fetchDepartments(); }, [isOpen]);
  useEffect(() => { if (departmentId) fetchPositions(departmentId); else setPositions([]); }, [departmentId]);

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      if (res.success && res.data) setDepartments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPositions = async (deptId: number) => {
    try {
      const res = await positionApi.getAll(deptId);
      if (res.success && res.data) setPositions(res.data);
    } catch (err) { console.error(err); }
  };

  // Fetch cities & regions
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch("https://psgc.gitlab.io/api/cities/");
        const data = await res.json();
        setCities(data.map((city: any) => city.name));
      } catch (err) { console.error(err); }
    }
    async function loadRegions() {
      try {
        const res = await fetch("https://psgc.gitlab.io/api/regions/");
        const data = await res.json();
        setRegions(data);
      } catch (err) { console.error(err); }
    }
    loadCities();
    loadRegions();
  }, []);

  // Validation
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!departmentId) newErrors.department = "Department is required";
    if (!positionId) newErrors.position = "Position is required";
    if (!shift) newErrors.shift = "Shift is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim()))
      newErrors.email = "Email must be a valid Gmail address";
    if (!homeAddress.trim()) newErrors.homeAddress = "Home address is required";
    if (!city) newErrors.city = "City is required";
    if (!region) newErrors.region = "Region is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !employee) return;

    setIsSubmitting(true);
    try {
      const updatedData = {
        first_name: firstName,
        last_name: lastName,
        department_id: departmentId,
        position_id: positionId,
        shift,
        email,
        home_address: homeAddress,
        city,
        region,
      };
      const result = await employeeApi.update(employee.employee_id, updatedData);
      if (result.success) {
        alert("Employee updated successfully!");
        onClose();
      } else {
        alert(result.message || "Failed to update employee");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while updating employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full max-w-5xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70">
          <X size={26} />
        </button>

        <h2 className="text-2xl font-semibold mb-1">Edit Employee</h2>
        <p className="text-sm text-gray-600 mb-6">{firstName} {lastName}</p>

        {employee ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormInput label="First Name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} />
            <FormInput label="Last Name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} />
            <div>
              <label className="block text-[#3b2b1c] mb-1">Department</label>
              <select
                value={departmentId || ""}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null;
                  setDepartmentId(value);
                  setPositionId(null);
                  setErrors((prev) => ({ ...prev, department: "" }));
                }}
                className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
              {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
            </div>

            <div>
              <label className="block text-[#3b2b1c] mb-1">Position</label>
              <select
                value={positionId || ""}
                onChange={(e) => setPositionId(Number(e.target.value))}
                disabled={!departmentId}
                className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] disabled:opacity-50"
              >
                <option value="">{departmentId ? "Select Position" : "Select Department First"}</option>
                {positions.map((pos) => (
                  <option key={pos.position_id} value={pos.position_id}>{pos.position_name}</option>
                ))}
              </select>
              {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
            </div>

            <FormSelect label="Shift" value={shift} onChange={(e) => setShift(e.target.value)} options={["Morning", "Night"]} error={errors.shift} />
            <FormInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            <FormInput label="Home Address" type="text" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} error={errors.homeAddress} />
            <FormSelect label="City" value={city} onChange={(e) => setCity(e.target.value)} options={cities} error={errors.city} />
            <FormSelect label="Region" value={region} onChange={(e) => setRegion(e.target.value)} options={regions.map((reg) => reg.name)} error={errors.region} />
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
