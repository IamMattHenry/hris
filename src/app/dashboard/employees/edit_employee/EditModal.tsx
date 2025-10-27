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
  dependents?: Array<Dependent>;
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

interface Dependent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactInfo: string;
  relationship: string;
  relationshipSpecify?: string;
  homeAddress: string;
  region: string;
  province: string;
  city: string;
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

  // Dependents state
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [dependentFirstName, setDependentFirstName] = useState("");
  const [dependentLastName, setDependentLastName] = useState("");
  const [dependentEmail, setDependentEmail] = useState("");
  const [dependentContactInfo, setDependentContactInfo] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState("");
  const [dependentRelationshipSpecify, setDependentRelationshipSpecify] = useState("");
  const [dependentHomeAddress, setDependentHomeAddress] = useState("");
  const [dependentRegion, setDependentRegion] = useState("");
  const [dependentProvince, setDependentProvince] = useState("");
  const [dependentCity, setDependentCity] = useState("");
  const [dependentErrors, setDependentErrors] = useState<{ [key: string]: string }>({});

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
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

        // Set dependents from the fetched data
        if (res.data.dependents && Array.isArray(res.data.dependents)) {
          setDependents(res.data.dependents);
        } else {
          setDependents([]);
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

  // Load PH locations data from JSON file
  useEffect(() => {
    async function loadPhLocationsData() {
      try {
        const res = await fetch("/data/json/ph_locations.json");
        if (!res.ok) {
          throw new Error(`Failed to fetch PH locations data: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setPhLocationsData(data);
        // Extract regions
        const regionNames = data.map((r: any) => r.region);
        setRegions(regionNames);
      } catch (error) {
        console.error("Error loading PH locations data:", error);
        setRegions([]);
      }
    }
    loadPhLocationsData();
  }, []);

  // Update provinces when region changes (for employee home address)
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

  // Update dependent provinces when dependent region changes
  useEffect(() => {
    if (dependentRegion) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === dependentRegion);
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map((p: any) => p.province);
        setDependentProvinces(provinceNames);
        setDependentCities([]);
      } else {
        setDependentProvinces([]);
        setDependentCities([]);
      }
    } else {
      setDependentProvinces([]);
      setDependentCities([]);
    }
  }, [dependentRegion, phLocationsData]);

  // Update dependent cities when dependent province changes
  useEffect(() => {
    if (dependentRegion && dependentProvince) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === dependentRegion);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.province === dependentProvince);
        if (selectedProvince) {
          setDependentCities(selectedProvince.cities);
        } else {
          setDependentCities([]);
        }
      }
    } else {
      setDependentCities([]);
    }
  }, [dependentRegion, dependentProvince, phLocationsData]);

  // Handle dependent contact info change with formatting
  const handleDependentContactInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    let formatted = value;
    if (value.startsWith("63")) {
      formatted = `+${value.slice(0, 2)} ${value.slice(2, 5)} ${value.slice(5, 8)} ${value.slice(8, 12)}`.trim();
    } else if (value.startsWith("09")) {
      formatted = `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7, 11)}`.trim();
    }
    setDependentContactInfo(formatted);
  };

  // Validate dependent
  const validateDependent = (
    firstName: string,
    lastName: string,
    relationship: string,
    email: string,
    contactInfo: string,
    relationshipSpecify: string
  ) => {
    const newErrors: { [key: string]: string } = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!relationship) newErrors.relationship = "Relationship is required";
    if (relationship === "Other" && !relationshipSpecify.trim()) {
      newErrors.relationshipSpecify = "Please specify the relationship";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
      newErrors.email = "Must be a valid Gmail address";
    }
    if (contactInfo.trim()) {
      const cleanNumber = contactInfo.replace(/\s/g, "");
      if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
        newErrors.contactInfo = "Invalid contact number format";
      }
    }

    return newErrors;
  };

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
      for (const contactItem of validContacts) {
        const cleanNumber = contactItem.contact_number.replace(/\s/g, "");
        if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
          newErrors.contactNumbers = "Invalid contact number format";
          break;
        }
      }
    }
    if (validContacts.length > 5) newErrors.contactNumbers = "Maximum of 5 contact numbers allowed";

    // Validate dependents
    if (dependents.length === 0) {
      newErrors.dependents = "At least one dependent is required";
    }

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
        dependents: dependents,
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

            {/* Dependents Section */}
            <div className="border-t-2 border-[#e6d2b5] pt-6 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#3b2b1c] font-semibold">Employee Dependent Information <span className="text-red-500">*</span></h3>
                <span className="text-xs text-[#6b5344]">({dependents.length} added)</span>
              </div>
              {errors.dependents && <p className="text-red-500 text-xs mb-4">{errors.dependents}</p>}

              {/* Add Dependent Form */}
              <div className="bg-[#FFF2E0] p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <FormInput
                    label="First Name:"
                    type="text"
                    value={dependentFirstName}
                    onChange={(e) => {
                      setDependentFirstName(e.target.value);
                      if (dependentErrors.firstName) {
                        setDependentErrors((prev) => ({ ...prev, firstName: "" }));
                      }
                    }}
                    placeholder="Enter first name"
                    error={dependentErrors.firstName}
                  />
                  <FormInput
                    label="Last Name:"
                    type="text"
                    value={dependentLastName}
                    onChange={(e) => {
                      setDependentLastName(e.target.value);
                      if (dependentErrors.lastName) {
                        setDependentErrors((prev) => ({ ...prev, lastName: "" }));
                      }
                    }}
                    placeholder="Enter last name"
                    error={dependentErrors.lastName}
                  />
                  <FormInput
                    label="Email:"
                    type="email"
                    value={dependentEmail}
                    onChange={(e) => {
                      setDependentEmail(e.target.value);
                      if (dependentErrors.email) {
                        setDependentErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    placeholder="(use gmail)"
                    error={dependentErrors.email}
                  />
                  <FormInput
                    label="Contact Info:"
                    type="text"
                    value={dependentContactInfo}
                    onChange={(e) => {
                      handleDependentContactInfoChange(e);
                      if (dependentErrors.contactInfo) {
                        setDependentErrors((prev) => ({ ...prev, contactInfo: "" }));
                      }
                    }}
                    placeholder="Phone number (optional)"
                    error={dependentErrors.contactInfo}
                  />
                  <FormSelect
                    label="Relationship:"
                    value={dependentRelationship}
                    onChange={(e) => {
                      setDependentRelationship(e.target.value);
                      if (e.target.value !== "Other") {
                        setDependentRelationshipSpecify("");
                      }
                      if (dependentErrors.relationship) {
                        setDependentErrors((prev) => ({ ...prev, relationship: "" }));
                      }
                    }}
                    options={["Spouse", "Child", "Parent", "Sibling", "Other"]}
                    error={dependentErrors.relationship}
                  />
                  {dependentRelationship === "Other" && (
                    <FormInput
                      label="Specify Relationship:"
                      type="text"
                      value={dependentRelationshipSpecify}
                      onChange={(e) => {
                        setDependentRelationshipSpecify(e.target.value);
                        if (dependentErrors.relationshipSpecify) {
                          setDependentErrors((prev) => ({ ...prev, relationshipSpecify: "" }));
                        }
                      }}
                      placeholder="Please specify the relationship"
                      error={dependentErrors.relationshipSpecify}
                    />
                  )}
                </div>

                {/* Home Address Section with Y-axis padding */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm py-4">
                  <div className="md:col-span-2">
                    <FormInput
                      label="Home Address:"
                      type="text"
                      value={dependentHomeAddress}
                      onChange={(e) => {
                        setDependentHomeAddress(e.target.value);
                        if (dependentErrors.homeAddress) {
                          setDependentErrors((prev) => ({ ...prev, homeAddress: "" }));
                        }
                      }}
                      placeholder="Enter home address"
                      error={dependentErrors.homeAddress}
                    />
                  </div>
                  <FormSelect
                    label="Region:"
                    value={dependentRegion}
                    onChange={(e) => {
                      setDependentRegion(e.target.value);
                      setDependentProvince("");
                      setDependentCity("");
                      if (dependentErrors.region) {
                        setDependentErrors((prev) => ({ ...prev, region: "" }));
                      }
                    }}
                    options={regions}
                    error={dependentErrors.region}
                  />
                  <FormSelect
                    label="Province:"
                    value={dependentProvince}
                    onChange={(e) => {
                      setDependentProvince(e.target.value);
                      setDependentCity("");
                      if (dependentErrors.province) {
                        setDependentErrors((prev) => ({ ...prev, province: "" }));
                      }
                    }}
                    options={dependentRegion ? dependentProvinces : []}
                    error={dependentErrors.province}
                  />
                  <FormSelect
                    label="City:"
                    value={dependentCity}
                    onChange={(e) => {
                      setDependentCity(e.target.value);
                      if (dependentErrors.city) {
                        setDependentErrors((prev) => ({ ...prev, city: "" }));
                      }
                    }}
                    options={dependentProvince ? dependentCities : []}
                    error={dependentErrors.city}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newErrors = validateDependent(
                      dependentFirstName,
                      dependentLastName,
                      dependentRelationship,
                      dependentEmail,
                      dependentContactInfo,
                      dependentRelationshipSpecify
                    );

                    if (Object.keys(newErrors).length > 0) {
                      setDependentErrors(newErrors);
                      return;
                    }

                    setDependentErrors({});

                    const newDependent = {
                      id: Date.now().toString(),
                      firstName: dependentFirstName,
                      lastName: dependentLastName,
                      email: dependentEmail,
                      contactInfo: dependentContactInfo,
                      relationship: dependentRelationship,
                      relationshipSpecify: dependentRelationshipSpecify || undefined,
                      homeAddress: dependentHomeAddress,
                      region: dependentRegion,
                      province: dependentProvince,
                      city: dependentCity,
                    };
                    setDependents([...dependents, newDependent]);
                    setDependentFirstName("");
                    setDependentLastName("");
                    setDependentEmail("");
                    setDependentContactInfo("");
                    setDependentRelationship("");
                    setDependentRelationshipSpecify("");
                    setDependentHomeAddress("");
                    setDependentRegion("");
                    setDependentProvince("");
                    setDependentCity("");
                  }}
                  className="w-full px-4 py-2 bg-[#4b0b14] text-white rounded-lg hover:bg-[#6b0b1f] transition-colors font-semibold"
                >
                  Add Dependent
                </button>
              </div>

              {/* Dependents List */}
              {dependents.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[#3b2b1c] font-semibold">Added Dependents:</h4>
                  {dependents.map((dependent) => (
                    <div key={dependent.id} className="bg-[#f5e6d3] p-4 rounded-lg border border-[#e6d2b5]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-[#3b2b1c]">{dependent.firstName} {dependent.lastName}</p>
                          <p className="text-xs text-[#6b5344]">
                            Relationship: {dependent.relationship}
                            {dependent.relationshipSpecify && ` (${dependent.relationshipSpecify})`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDependents(dependents.filter(d => d.id !== dependent.id))}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      {dependent.email && <p className="text-xs text-[#6b5344]">Email: {dependent.email}</p>}
                      {dependent.contactInfo && <p className="text-xs text-[#6b5344]">Contact: {dependent.contactInfo}</p>}
                      {dependent.homeAddress && <p className="text-xs text-[#6b5344]">Address: {dependent.homeAddress}</p>}
                      {(dependent.city || dependent.province || dependent.region) && (
                        <p className="text-xs text-[#6b5344]">
                          Location: {[dependent.city, dependent.province, dependent.region].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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