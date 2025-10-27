"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { departmentApi, positionApi, employeeApi } from "@/lib/api";

// FormInput component
const FormInput = ({ label, type, value, onChange, error }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// FormSelect component
const FormSelect = ({ label, value, onChange, options, error }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
    >
      <option value="">Select {label}</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
}

interface EmployeeData {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  home_address: string;
  city: string;
  region: string;
  department_id: number;
  department_name: string;
  position_id: number;
  position_name: string;
  shift: string;
  status: string;
  civil_status?: string;
  emails?: Array<{ email_id: number; email: string }>;
  contact_numbers?: Array<{ contact_number_id: number; contact_number: string }>;
  image_url?: string;
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

type TabType = "profile" | "job" | "beneficiaries" | "authentication";

export default function EditEmployeeModal({ isOpen, onClose, id }: EditEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

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

        if (res.data.emails && Array.isArray(res.data.emails)) {
          setEmails(res.data.emails.map((e: any) => ({ email_id: e.employee_id, email: e.email })));
        } else {
          setEmails([]);
        }

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

    const validEmails = emails.filter(e => e.email && e.email.trim());
    if (validEmails.length === 0) newErrors.emails = "At least one email is required";
    else {
      for (const emailItem of validEmails) {
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailItem.email.trim())) {
          newErrors.emails = "All emails must be valid Gmail addresses";
          break;
        }
      }
    }

    const validContacts = contactNumbers.filter(c => c.contact_number && c.contact_number.trim());
    if (validContacts.length === 0) newErrors.contactNumbers = "At least one contact number is required";
    else {
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
    if (!validate() || !employee) return;

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

      const result = await employeeApi.update(employee.employee_id, updatedData);

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

  const tabs = [
    { id: "profile" as TabType, label: "Profile & Contacts" },
    { id: "job" as TabType, label: "Job Information" },
    { id: "beneficiaries" as TabType, label: "Beneficiaries" },
    { id: "authentication" as TabType, label: "Authentication" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full max-w-6xl rounded-2xl shadow-2xl relative text-[#3b2b1c] overflow-hidden flex max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-[#f4e6cf] p-6 space-y-2 flex-shrink-0 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#e8d4b8] text-[#3b2b1c] shadow-sm"
                  : "text-[#6b5844] hover:bg-[#ede0ca]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70 z-10">
            <X size={26} />
          </button>

          <div className="p-10">
            {employee ? (
              <>
                {/* Page Title */}
                <h1 className="text-3xl font-bold text-[#3b2b1c] mb-6">Edit Employee</h1>

                {/* Header Section */}
                <div className="flex items-start gap-6 mb-8">
                  {employee.image_url ? (
                    <img src={employee.image_url} alt="Employee" className="w-24 h-24 rounded-full object-cover shadow-md flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 bg-[#5a2e2e] rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md flex-shrink-0">
                      {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : "?"}
                    </div>
                  )}

                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-[#3b2b1c] mb-1">
                      {firstName} {lastName}
                    </h2>
                    <p className="text-sm text-[#8b7355] mb-2">{employee.employee_code}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8b7355]">Status:</span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {employee.status?.charAt(0).toUpperCase() + employee.status?.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm text-[#8b7355]">Job Title: <span className="text-[#3b2b1c] font-medium">{employee.position_name}</span></p>
                    <p className="text-sm text-[#8b7355]">Department: <span className="text-[#3b2b1c] font-medium">{employee.department_name}</span></p>
                    <p className="text-sm text-[#8b7355]">Shift: <span className="text-[#3b2b1c] font-medium">{employee.shift}</span></p>
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <FormInput label="First Name" type="text" value={firstName} onChange={(e: any) => setFirstName(e.target.value)} error={errors.firstName} />
                      <FormInput label="Last Name" type="text" value={lastName} onChange={(e: any) => setLastName(e.target.value)} error={errors.lastName} />
                      <FormSelect label="Civil Status" value={civilStatus} onChange={(e: any) => setCivilStatus(e.target.value)} options={["Single", "Married", "Widowed", "Divorced"]} error={errors.civilStatus} />
                    </div>

                    {/* Email Section */}
                    <div className="pt-4 border-t border-[#e6d2b5]">
                      <h3 className="text-sm font-semibold mb-3 text-[#3b2b1c]">Email Addresses</h3>
                      {errors.emails && <p className="text-red-500 text-xs mb-2">{errors.emails}</p>}
                      <div className="space-y-2">
                        {emails.map((emailItem, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="email"
                              value={emailItem.email}
                              onChange={(e) => {
                                const newEmails = [...emails];
                                newEmails[index].email = e.target.value;
                                setEmails(newEmails);
                              }}
                              placeholder="Enter email address"
                              className="flex-1 px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] text-sm"
                            />
                            <button type="button" onClick={() => setEmails(emails.filter((_, i) => i !== index))} className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80 text-sm">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setEmails([...emails, { email: "", isNew: true }])} className="mt-2 px-3 py-1.5 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80 text-sm">
                        + Add Email
                      </button>
                    </div>

                    {/* Contact Numbers Section */}
                    <div className="pt-4 border-t border-[#e6d2b5]">
                      <h3 className="text-sm font-semibold mb-3 text-[#3b2b1c]">Contact Numbers</h3>
                      {errors.contactNumbers && <p className="text-red-500 text-xs mb-2">{errors.contactNumbers}</p>}
                      <div className="space-y-2">
                        {contactNumbers.map((contactItem, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={contactItem.contact_number}
                              onChange={(e) => {
                                const newContacts = [...contactNumbers];
                                newContacts[index].contact_number = e.target.value;
                                setContactNumbers(newContacts);
                              }}
                              placeholder="Enter contact number"
                              className="flex-1 px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] text-sm"
                            />
                            <button type="button" onClick={() => setContactNumbers(contactNumbers.filter((_, i) => i !== index))} className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80 text-sm">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setContactNumbers([...contactNumbers, { contact_number: "", isNew: true }])} className="mt-2 px-3 py-1.5 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80 text-sm">
                        + Add Contact
                      </button>
                    </div>

                    {/* Address Section */}
                    <div className="pt-4 border-t border-[#e6d2b5]">
                      <h3 className="text-sm font-semibold mb-3 text-[#3b2b1c]">Address Information</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormInput label="Home Address" type="text" value={homeAddress} onChange={(e: any) => setHomeAddress(e.target.value)} error={errors.homeAddress} />
                        <FormSelect label="City" value={city} onChange={(e: any) => setCity(e.target.value)} options={cities} error={errors.city} />
                        <FormSelect label="Region" value={region} onChange={(e: any) => setRegion(e.target.value)} options={regions.map((reg) => reg.name)} error={errors.region} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "job" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Department</label>
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
                            <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                          ))}
                        </select>
                        {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Position</label>
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

                      <FormSelect label="Shift" value={shift} onChange={(e: any) => setShift(e.target.value)} options={["Morning", "Night"]} error={errors.shift} />
                    </div>
                  </div>
                )}

                {activeTab === "beneficiaries" && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500">Beneficiaries information will be added here.</p>
                  </div>
                )}

                {activeTab === "authentication" && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500">Authentication settings will be added here.</p>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end mt-8 pt-6 border-t border-[#e6d2b5]">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-[#4b0b14] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-600">Loading employee details...</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}