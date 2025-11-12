"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { departmentApi, positionApi, employeeApi } from "@/lib/api";
import {
  validateEmployeeForm,
  validateDependent,
  validateRoleManagement,
  formatPhoneNumber,
  generateClientId,
  type ContactEmail,
  type ContactNumber,
  type Dependent,
  type ValidationErrors,
} from "./validation";
import { toast } from "react-hot-toast";

/* ---------- Interfaces ---------- */
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
  supervisor_id?: number;
  province?: string;
  emails?: Array<{ email_id: number; email: string }>;
  contact_numbers?: Array<{ contact_id: number; contact_number: string }>;
  dependents?: Array<any>;
  role?: string;
  sub_role?: string;
  user_id?: number;
}

/* ---------- Component ---------- */
export default function EditEmployeeModal({
  isOpen,
  onClose,
  id,
}: EditEmployeeModalProps) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [shift, setShift] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [contactNumbers, setContactNumbers] = useState<ContactNumber[]>([]);

  // Role management state
  const [grantAdminPrivilege, setGrantAdminPrivilege] = useState(false);
  const [grantSupervisorPrivilege, setGrantSupervisorPrivilege] =
    useState(false);
  const [subRole, setSubRole] = useState("");

  // Dependents state
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [dependentFirstName, setDependentFirstName] = useState("");
  const [dependentLastName, setDependentLastName] = useState("");
  const [dependentEmail, setDependentEmail] = useState("");
  const [dependentContactInfo, setDependentContactInfo] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState("");
  const [dependentRelationshipSpecify, setDependentRelationshipSpecify] =
    useState("");
  const [dependentHomeAddress, setDependentHomeAddress] = useState("");
  const [dependentRegion, setDependentRegion] = useState("");
  const [dependentProvince, setDependentProvince] = useState("");
  const [dependentCity, setDependentCity] = useState("");
  const [dependentErrors, setDependentErrors] = useState<ValidationErrors>({});

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
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
        setFirstName(res.data.first_name);
        setLastName(res.data.last_name);
        setDepartmentId(res.data.department_id);
        setPositionId(res.data.position_id);
        setSupervisorId(res.data.supervisor_id || null);
        setShift(res.data.shift || "");
        setHomeAddress(res.data.home_address || "");
        setCity(res.data.city || "");
        setRegion(res.data.region || "");
        setProvince(res.data.province || "");
        setCivilStatus(res.data.civil_status || "");

        // Set emails from the fetched data - normalize to include client id if missing
        if (res.data.emails && Array.isArray(res.data.emails)) {
          setEmails(
            res.data.emails.map((e: any) => ({
              email_id: e.email_id ?? e.employee_id,
              id: generateClientId(),
              email: e.email,
            }))
          );
        } else {
          setEmails([]);
        }

        // Set contact numbers from the fetched data - normalize
        if (
          res.data.contact_numbers &&
          Array.isArray(res.data.contact_numbers)
        ) {
          setContactNumbers(
            res.data.contact_numbers.map((c: any) => ({
              contact_id: c.contact_id ?? c.employee_id,
              id: generateClientId(),
              contact_number: c.contact_number,
            }))
          );
        } else {
          setContactNumbers([]);
        }

        // Set dependents from the fetched data
        if (res.data.dependents && Array.isArray(res.data.dependents)) {
          const dMapped = res.data.dependents.map((d: any) => ({
            id: d.dependant_id ? `d-${d.dependant_id}` : generateClientId(),
            firstName: d.firstname || "",
            lastName: d.lastname || "",
            email: d.email || "",
            contactInfo: d.contact_no || "",
            relationship: d.relationship || "",
            relationshipSpecify: undefined,
            homeAddress: d.home_address || "",
            region: d.region_name || "",
            province: d.province_name || "",
            city: d.city_name || "",
          }));
          setDependents(dMapped);
        } else {
          setDependents([]);
        }

        // Set role management state
        if (res.data.role === "admin") {
          setGrantAdminPrivilege(true);
          setGrantSupervisorPrivilege(false);
        } else if (res.data.role === "supervisor") {
          setGrantAdminPrivilege(false);
          setGrantSupervisorPrivilege(true);
        } else {
          setGrantAdminPrivilege(false);
          setGrantSupervisorPrivilege(false);
        }
        setSubRole(res.data.sub_role || "");
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    }
  };

  /* ---------- Departments & positions ---------- */
  useEffect(() => {
    if (isOpen) fetchDepartments();
  }, [isOpen]);
  useEffect(() => {
    if (departmentId) {
      fetchPositions(departmentId);
      fetchSupervisors(departmentId);
    } else {
      setPositions([]);
      setSupervisors([]);
    }
  }, [departmentId]);

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      if (res.success && res.data) setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPositions = async (deptId: number) => {
    try {
      const res = await positionApi.getAll(deptId);
      if (res.success && res.data) setPositions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSupervisors = async (deptId: number) => {
    try {
      const result = await employeeApi.getAll();
      if (result.success && result.data) {
        const deptSupervisors = result.data.filter(
          (emp: any) =>
            emp.department_id === deptId &&
            emp.status === "active" &&
            emp.role === "supervisor" &&
            emp.employee_id !== id
        );
        setSupervisors(deptSupervisors);
      }
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
  };

  /* ---------- Valid sub roles ---------- */
  const mapDepartmentToSubRole = (departmentName?: string | null) => {
    if (!departmentName) return null;

    const normalized = departmentName.toLowerCase();

    if (
      normalized === "it" ||
      normalized.includes("information technology") ||
      normalized.includes("i.t.")
    ) {
      return "it";
    }

    if (
      normalized === "hr" ||
      normalized.includes("human resource") ||
      normalized.includes("human-resource")
    ) {
      return "hr";
    }

    return null;
  };

  const getValidSubRoles = (deptId: number | null) => {
    if (!deptId) return [];

    const dept = departments.find((d) => d.department_id === deptId);
    const mapped = mapDepartmentToSubRole(dept?.department_name);

    return mapped ? [mapped] : [];
  };

  useEffect(() => {
    if (!(grantAdminPrivilege || grantSupervisorPrivilege)) {
      if (subRole !== "") setSubRole("");
      return;
    }

    if (!departmentId) {
      if (subRole !== "") setSubRole("");
      return;
    }

    const dept = departments.find((d) => d.department_id === departmentId);
    const mapped = mapDepartmentToSubRole(dept?.department_name);

    if (mapped) {
      if (subRole !== mapped) setSubRole(mapped);
    } else if (subRole !== "") {
      setSubRole("");
    }
  }, [departmentId, departments, grantAdminPrivilege, grantSupervisorPrivilege]);

  const checkDepartmentSupervisor = async (
    deptId: number
  ): Promise<boolean> => {
    try {
      const res = await employeeApi.getAll();
      if (res.success && res.data) {
        const supervisors = res.data.filter(
          (emp: any) =>
            emp.department_id === deptId &&
            emp.role === "supervisor" &&
            emp.employee_id !== id
        );
        return supervisors.length > 0;
      }
      return false;
    } catch (error) {
      console.error("Error checking department supervisor:", error);
      return false;
    }
  };

  /* ---------- PH locations JSON ---------- */
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

  useEffect(() => {
    if (dependentRegion) {
      const selectedRegion = phLocationsData.find(
        (r: any) => r.region === dependentRegion
      );
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map(
          (p: any) => p.province
        );
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

  useEffect(() => {
    if (dependentRegion && dependentProvince) {
      const selectedRegion = phLocationsData.find(
        (r: any) => r.region === dependentRegion
      );
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find(
          (p: any) => p.province === dependentProvince
        );
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

  /* ---------- Dependent formatting ---------- */
  const handleDependentContactInfoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 11) input = input.slice(0, 11);
    const formatted = formatPhoneNumber(e.target.value);
    setDependentContactInfo(formatted);
  };

  const handleContactNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    contactNumbers: any[],
    setContactNumbers: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    let value = e.target.value;

    // keep digits only
    value = value.replace(/\D/g, "");

    // max 11 digits (09xxxxxxxxx)
    value = value.slice(0, 11);

    // auto prefix "09"
    if (value.length > 0 && !value.startsWith("09")) {
      value = "09" + value.slice(2);
    }

    // apply spacing: 09XX XXX XXXX
    if (value.length > 7) {
      value = value.replace(/^(\d{4})(\d{3})(\d{0,4}).*/, "$1 $2 $3");
    } else if (value.length > 4) {
      value = value.replace(/^(\d{4})(\d{0,3}).*/, "$1 $2");
    }

    const updated = [...contactNumbers];
    updated[index].contact_number = value;
    setContactNumbers(updated);
  };



  /* ---------- Submit ---------- */
  const handleSubmit = async () => {
    console.log("Save Changes clicked");

    // Validate role management
    const roleErrors = validateRoleManagement(
      grantAdminPrivilege,
      grantSupervisorPrivilege,
      subRole,
      departmentId,
      getValidSubRoles(departmentId),
      departments.find((d) => d.department_id === departmentId)?.department_name
    );

    // Check if department already has supervisor
    if (grantSupervisorPrivilege && departmentId) {
      const hasSupervisor = await checkDepartmentSupervisor(departmentId);
      if (hasSupervisor) {
        roleErrors.supervisor =
          "This department already has a supervisor. Only one supervisor is allowed per department.";
      }
    }

    if (Object.keys(roleErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...roleErrors }));
      return;
    }


    // Validate employee form - NOW INCLUDING PROVINCE
    const formErrors = validateEmployeeForm(
      firstName,
      lastName,
      departmentId,
      positionId,
      shift,
      homeAddress,
      city,
      region,
      province,
      civilStatus,
      emails,
      contactNumbers,
      dependents
    );

    console.log("Validation result:", Object.keys(formErrors).length === 0);
    console.log("Current errors:", formErrors);

    if (Object.keys(formErrors).length > 0 || !employee) {
      setErrors(formErrors);
      console.log("Validation failed or no employee");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedData: any = {
        first_name: firstName,
        last_name: lastName,
        department_id: departmentId,
        position_id: positionId,
        supervisor_id: supervisorId || null,
        shift: shift ? shift.toLowerCase() : null,
        home_address: homeAddress,
        city: city,
        region: region,
        province: province,
        civil_status: civilStatus ? civilStatus.toLowerCase() : null,
        emails: emails.map((e) => e.email).filter((e) => e && e.trim()),
        contact_numbers: contactNumbers
          .map((c) => c.contact_number.replace(/\s/g, ""))
          .filter((c) => c && c.trim()),
        dependents: dependents,
      };

      // Only include role and sub_role if employee has a user account
      if (employee.user_id) {
        updatedData.role = grantAdminPrivilege
          ? "admin"
          : grantSupervisorPrivilege
            ? "supervisor"
            : "employee";

        if ((grantAdminPrivilege || grantSupervisorPrivilege) && subRole) {
          updatedData.sub_role = subRole.toLowerCase();
        }
      }

      console.log("Submitting update:", updatedData);
      const result = await employeeApi.update(employee.employee_id, updatedData);
      console.log("Update result:", result);

      if (result.success) {
        toast.success("Employee updated successfully!");
        onClose();
        setTimeout(() => window.location.reload(), 3000);
      } else {
        toast.error(result.message || "Failed to update employee");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("An error occurred while updating employee");
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

        <h2 className="text-2xl font-semibold mb-1">Edit Employee</h2>
        <p className="text-sm text-gray-600 mb-6">
          {firstName} {lastName}
        </p>

        {employee ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormInput
                label="First Name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.firstName}
              />
              <FormInput
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
              />
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
                {errors.department && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.department}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#3b2b1c] mb-1">Position</label>
                <select
                  value={positionId || ""}
                  onChange={(e) => setPositionId(Number(e.target.value))}
                  disabled={!departmentId}
                  className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] disabled:opacity-50"
                >
                  <option value="">
                    {departmentId ? "Select Position" : "Select Department First"}
                  </option>
                  {positions.map((pos) => (
                    <option key={pos.position_id} value={pos.position_id}>
                      {pos.position_name}
                    </option>
                  ))}
                </select>
                {errors.position && (
                  <p className="text-red-500 text-xs mt-1">{errors.position}</p>
                )}
              </div>

              {/* Supervisor Dropdown */}
              <div>
                <label className="block text-[#3b2b1c] mb-1 font-medium">
                  Reports To (Supervisor):
                </label>
                <select
                  value={supervisorId || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null;
                    setSupervisorId(value);
                    setErrors((prev) => ({ ...prev, supervisor: "" }));
                  }}
                  disabled={!departmentId}
                  className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {departmentId ? "No Supervisor (Optional)" : "Select Department First"}
                  </option>
                  {supervisors.map((sup) => (
                    <option key={sup.employee_id} value={sup.employee_id}>
                      {sup.employee_code} - {sup.first_name} {sup.last_name}
                    </option>
                  ))}
                </select>
                {errors.supervisor && (
                  <p className="text-red-500 text-xs mt-1">{errors.supervisor}</p>
                )}
                <p className="text-xs text-[#6b5344] mt-1">
                  Select who this employee reports to
                </p>
              </div>

              <FormSelect
                label="Shift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                options={["Morning", "Night"]}
                error={errors.shift}
              />
              <FormSelect
                label="Civil Status"
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value)}
                options={["Single", "Married", "Widowed", "Divorced"]}
                error={errors.civilStatus}
              />
              <FormInput
                label="Home Address"
                type="text"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                error={errors.homeAddress}
              />
              <FormSelect
                label="Region:"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setProvince("");
                  setCity("");
                }}
                options={regions}
                error={errors.region}
              />

              <FormSelect
                label="Province:"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity("");
                }}
                options={region ? provinces : []}
                error={errors.province}
              />

              <FormSelect
                label="City:"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                options={province ? cities : []}
                error={errors.city}
              />
            </div>

            {/* Email Addresses Section */}
            <div className="mt-8 pt-6 border-t border-[#e6d2b5]">
              <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">
                Email Addresses
              </h3>
              {errors.emails && (
                <p className="text-red-500 text-sm mb-3">{errors.emails}</p>
              )}
              <div className="space-y-3">
                {emails.map((emailItem, index) => (
                  <div
                    key={emailItem.email_id ?? emailItem.id ?? `email-${index}`}
                    className="flex gap-2 items-end"
                  >
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
                      onClick={() => setEmails((prev) => prev.filter((_, i) => i !== index))}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setEmails((prev) => [...prev, { id: generateClientId(), email: "", isNew: true }])
                }
                className="mt-3 px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80"
              >
                + Add Another Email
              </button>
            </div>

            {/* Contact Numbers Section */}
            <div className="mt-8 pt-6 border-t border-[#e6d2b5]">
              <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">Contact Numbers</h3>

              {errors.contactNumbers && (
                <p className="text-red-500 text-sm mb-3">{errors.contactNumbers}</p>
              )}

              <div className="space-y-3">
                {contactNumbers.map((contactItem, index) => (
                  <div
                    key={contactItem.contact_id ?? contactItem.id ?? `contact-${index}`}
                    className="flex gap-2 items-end"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={contactItem.contact_number}
                        onChange={(e) => {
                          handleContactNumberChange(e, index, contactNumbers, setContactNumbers);
                        }}
                        placeholder="Enter contact number"
                        className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setContactNumbers((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setContactNumbers((prev) => [
                    ...prev,
                    { id: generateClientId(), contact_number: "", isNew: true },
                  ])
                }
                className="mt-3 px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80"
              >
                + Add Another Contact Number
              </button>
            </div>


            {/* Dependents Section */}
            <div className="border-t-2 border-[#e6d2b5] pt-6 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#3b2b1c] font-semibold">
                  Employee Dependent Information{" "}
                  <span className="text-red-500">*</span>
                </h3>
                <span className="text-xs text-[#6b5344]">({dependents.length} added)</span>
              </div>
              {errors.dependents && (
                <p className="text-red-500 text-xs mb-4">{errors.dependents}</p>
              )}

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
                      dependentRelationshipSpecify,
                      dependentHomeAddress,
                      dependentRegion,
                      dependentProvince,
                      dependentCity
                    );

                    if (Object.keys(newErrors).length > 0) {
                      setDependentErrors(newErrors);
                      return;
                    }

                    setDependentErrors({});

                    const newDependent: Dependent = {
                      id: generateClientId(),
                      firstName: dependentFirstName,
                      lastName: dependentLastName,
                      email: dependentEmail,
                      contactInfo: dependentContactInfo,
                      relationship: dependentRelationship,
                      relationshipSpecify:
                        dependentRelationshipSpecify || undefined,
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
                    <div
                      key={dependent.id}
                      className="bg-[#f5e6d3] p-4 rounded-lg border border-[#e6d2b5]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-[#3b2b1c]">
                            {dependent.firstName} {dependent.lastName}
                          </p>
                          <p className="text-xs text-[#6b5344]">
                            Relationship: {dependent.relationship}
                            {dependent.relationshipSpecify &&
                              ` (${dependent.relationshipSpecify})`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setDependents(dependents.filter((d) => d.id !== dependent.id))
                          }
                          className="text-red-500 hover:text-red-700 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      {dependent.email && (
                        <p className="text-xs text-[#6b5344]">Email: {dependent.email}</p>
                      )}
                      {dependent.contactInfo && (
                        <p className="text-xs text-[#6b5344]">Contact: {dependent.contactInfo}</p>
                      )}
                      {dependent.homeAddress && (
                        <p className="text-xs text-[#6b5344]">Address: {dependent.homeAddress}</p>
                      )}
                      {(dependent.city || dependent.province || dependent.region) && (
                        <p className="text-xs text-[#6b5344]">
                          Location:{" "}
                          {[dependent.city, dependent.province, dependent.region]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role Management Section */}
            <div className="border-t-2 border-[#e6d2b5] pt-6 mt-8">
              <h3 className="text-[#3b2b1c] font-semibold mb-4">Role Management</h3>

              {/* Admin Privilege Checkbox */}
              <div className="col-span-2 flex items-center gap-3 mt-4 p-4 bg-[#FFF2E0] rounded-lg border border-[#e6d2b5]">
                <input
                  type="checkbox"
                  id="grantAdminPrivilege"
                  checked={grantAdminPrivilege}
                  onChange={(e) => {
                    setGrantAdminPrivilege(e.target.checked);
                    if (e.target.checked) {
                      setGrantSupervisorPrivilege(false);
                    }
                    if (!e.target.checked) {
                      setSubRole("");
                      setErrors((prev) => ({
                        ...prev,
                        subRole: "",
                        supervisor: "",
                      }));
                    }
                  }}
                  className="w-5 h-5 text-[#4b0b14] bg-white border-[#3b2b1c] rounded focus:ring-[#4b0b14] focus:ring-2 cursor-pointer"
                />
                <label
                  htmlFor="grantAdminPrivilege"
                  className="text-[#3b2b1c] font-semibold cursor-pointer select-none"
                >
                  Grant Admin Privilege
                </label>
              </div>

              {/* Supervisor Privilege Checkbox */}
              <div className="col-span-2 flex items-center gap-3 mt-2 p-4 bg-[#E8F5E9] rounded-lg border border-[#c8e6c9]">
                <input
                  type="checkbox"
                  id="grantSupervisorPrivilege"
                  checked={grantSupervisorPrivilege}
                  onChange={(e) => {
                    setGrantSupervisorPrivilege(e.target.checked);
                    if (e.target.checked) {
                      setGrantAdminPrivilege(false);
                    }
                    if (!e.target.checked) {
                      setSubRole("");
                      setErrors((prev) => ({
                        ...prev,
                        subRole: "",
                        supervisor: "",
                      }));
                    }
                  }}
                  className="w-5 h-5 text-[#2e7d32] bg-white border-[#1b5e20] rounded focus:ring-[#2e7d32] focus:ring-2 cursor-pointer"
                />
                <label
                  htmlFor="grantSupervisorPrivilege"
                  className="text-[#1b5e20] font-semibold cursor-pointer select-none"
                >
                  Grant Supervisor Privilege
                </label>
              </div>

              {(grantAdminPrivilege || grantSupervisorPrivilege) && (
                <div className="col-span-2">
                  {!departmentId ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Please select a department first to choose the sub-role
                      </p>
                    </div>
                  ) : subRole ? (
                    <div className="p-3 bg-[#FFF2E0] border border-[#e6d2b5] rounded-lg">
                      <p className="text-sm text-[#3b2b1c]">
                        Auto-assigned sub-role: <span className="font-semibold uppercase">{subRole}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        ⚠️ The selected department does not have an associated HR/IT sub-role. Choose another department or disable the privilege.
                      </p>
                    </div>
                  )}
                  {errors.subRole && (
                    <p className="text-red-500 text-xs mt-2">{errors.subRole}</p>
                  )}
                </div>
              )}

              {errors.supervisor && (
                <p className="text-red-500 text-xs mt-2">{errors.supervisor}</p>
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