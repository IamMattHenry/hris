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
  civil_status?: string;
  emails?: Array<{ email_id: number; email: string }>;
  contact_numbers?: Array<{ contact_number_id: number; contact_number: string }>;
}

interface ContactEmail {
  email_id?: number;
  email: string;
  isNew?: boolean;
}

interface ContactNumber {
  contact_number_id?: number;
  contact_number: string;
  isNew?: boolean;
}

export default function EditEmployeeModal({ isOpen, onClose, id }: EditEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [shift, setShift] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [contactNumbers, setContactNumbers] = useState<ContactNumber[]>([]);

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
        setHomeAddress(res.data.home_address || "");
        setCity(res.data.city || "");
        setRegion(res.data.region || "");
        setCivilStatus(res.data.civil_status || "");

        // Set emails from the fetched data
        if (res.data.emails && Array.isArray(res.data.emails)) {
          setEmails(res.data.emails.map((e: any) => ({ email_id: e.employee_id, email: e.email })));
        } else {
          setEmails([]);
        }

        // Set contact numbers from the fetched data
        if (res.data.contact_numbers && Array.isArray(res.data.contact_numbers)) {
          setContactNumbers(res.data.contact_numbers.map((c: any) => ({ contact_number_id: c.employee_id, contact_number: c.contact_number })));
        } else {
          setContactNumbers([]);
        }
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
    if (!homeAddress.trim()) newErrors.homeAddress = "Home address is required";
    if (!city) newErrors.city = "City is required";
    if (!region) newErrors.region = "Region is required";
    if (!civilStatus) newErrors.civilStatus = "Civil status is required";

    // Validate at least one email exists
    const validEmails = emails.filter(e => e.email && e.email.trim());
    if (validEmails.length === 0) newErrors.emails = "At least one email is required";
    else {
      // Validate each email format
      for (const emailItem of validEmails) {
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailItem.email.trim())) {
          newErrors.emails = "All emails must be valid Gmail addresses";
          break;
        }
      }
    }

    // Validate at least one contact number exists
    const validContacts = contactNumbers.filter(c => c.contact_number && c.contact_number.trim());
    if (validContacts.length === 0) newErrors.contactNumbers = "At least one contact number is required";
    else {
      // Validate each contact number format
      for (const contactItem of validContacts) {
        const cleanNumber = contactItem.contact_number.replace(/\s/g, "");
        if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
          newErrors.contactNumbers = "Invalid contact number format";
          break;
        }
      }
    }
    if (validContacts.length > 5) newErrors.contactNumbers = "Maximum of 5 contact numbers allowed";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log("Save Changes clicked");
    const isValid = validate();
    console.log("Validation result:", isValid);
    console.log("Current errors:", errors);

    if (!isValid || !employee) {
      console.log("Validation failed or no employee");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedData = {
        first_name: firstName,
        last_name: lastName,
        position_id: positionId,
        shift: shift ? shift.toLowerCase() : null,
        home_address: homeAddress,
        city: city,
        region: region,
        civil_status: civilStatus ? civilStatus.toLowerCase() : null,
        emails: emails.map(e => e.email).filter(e => e && e.trim()),
        contact_numbers: contactNumbers.map(c => c.contact_number.replace(/\s/g, "")).filter(c => c && c.trim()),
      };

      console.log("Submitting update:", updatedData);
      const result = await employeeApi.update(employee.employee_id, updatedData);
      console.log("Update result:", result);

      if (result.success) {
        alert("Employee updated successfully!");
        onClose();
      } else {
        alert(result.message || "Failed to update employee");
      }
    } catch (err) {
      console.error("Update error:", err);
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
          <div>
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
              <FormSelect label="Civil Status" value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)} options={["Single", "Married", "Widowed", "Divorced"]} error={errors.civilStatus} />
              <FormInput label="Home Address" type="text" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} error={errors.homeAddress} />
              <FormSelect label="City" value={city} onChange={(e) => setCity(e.target.value)} options={cities} error={errors.city} />
              <FormSelect label="Region" value={region} onChange={(e) => setRegion(e.target.value)} options={regions.map((reg) => reg.name)} error={errors.region} />
              </div>

            {/* Email Addresses Section */}
            <div className="mt-8 pt-6 border-t border-[#e6d2b5]">
              <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">Email Addresses</h3>
              {errors.emails && <p className="text-red-500 text-sm mb-3">{errors.emails}</p>}
              <div className="space-y-3">
                {emails.map((emailItem, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={emailItem.email}
                        onChange={(e) => {
                          const newEmails = [...emails];
                          newEmails[index].email = e.target.value;
                          setEmails(newEmails);
                        }}
                        placeholder="Enter email address"
                        className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmails(emails.filter((_, i) => i !== index))}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEmails([...emails, { email: "", isNew: true }])}
                className="mt-3 px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80"
              >
                + Add Another Email
              </button>
            </div>

            {/* Contact Numbers Section */}
            <div className="mt-8 pt-6 border-t border-[#e6d2b5]">
              <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">Contact Numbers</h3>
              {errors.contactNumbers && <p className="text-red-500 text-sm mb-3">{errors.contactNumbers}</p>}
              <div className="space-y-3">
                {contactNumbers.map((contactItem, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={contactItem.contact_number}
                        onChange={(e) => {
                          const newContacts = [...contactNumbers];
                          newContacts[index].contact_number = e.target.value;
                          setContactNumbers(newContacts);
                        }}
                        placeholder="Enter contact number"
                        className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setContactNumbers(contactNumbers.filter((_, i) => i !== index))}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setContactNumbers([...contactNumbers, { contact_number: "", isNew: true }])}
                className="mt-3 px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80"
              >
                + Add Another Contact Number
              </button>
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
