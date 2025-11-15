"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { employeeApi, departmentApi, positionApi } from "@/lib/api";
import { Department, Position } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateDependent,
  validateBirthDate,
} from "./validations";
import FingerprintEnrollment from "@/components/FingerprintEnrollment";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function AddEmployeeModal({ isOpen, onClose }: EmployeeModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Fingerprint enrollment
  const [showFingerprintEnrollment, setShowFingerprintEnrollment] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState<number | null>(null);
  const [fingerprintId, setFingerprintId] = useState<number | null>(null);

  // Step data states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");

  // Address fields
  const [homeAddress, setHomeAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [salary, setSalary] = useState("");
  const [leaveCredit, setLeaveCredit] = useState("15");
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [hireDate, setHireDate] = useState("");
  const [payStart, setPayStart] = useState("");
  const [payEnd, setPayEnd] = useState("");
  const [shift, setShift] = useState("");
  const [salaryDisplay, setSalaryDisplay] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [grantAdminPrivilege, setGrantAdminPrivilege] = useState(false);
  const [grantSupervisorPrivilege, setGrantSupervisorPrivilege] = useState(false);
  const [subRole, setSubRole] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [regions, setRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);

  // Dependent information
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
  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [dependentErrors, setDependentErrors] = useState<{ [key: string]: string }>({});
  const today = new Date().toISOString().split("T")[0];

  const [usernameEdited, setUsernameEdited] = useState(false);
  const [passwordEdited, setPasswordEdited] = useState(false);

  // Helper to normalize first name into a safe username
  const makeUsernameFromFirst = (fn: string) =>
  fn.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

useEffect(() => {
  const base = makeUsernameFromFirst(firstName || "");
  
  // --- Username generation ---
  let generatedUsername = base;
  if (generatedUsername.length < 5) {
    // pad with random 3-digit number
    const randomNumber = Math.floor(100 + Math.random() * 900); // 100-999
    generatedUsername += randomNumber.toString();
  } else {
    // still append random 3-digit number
    const randomNumber = Math.floor(100 + Math.random() * 900);
    generatedUsername += randomNumber.toString();
  }

  // --- Password generation ---
  let generatedPassword = firstName ? `@${firstName.trim()}` : "";
  let suffixNumber = 12345; // starting number to append if needed

  // Keep adding numbers until password reaches at least 12 characters
  while (generatedPassword.length < 12) {
    generatedPassword = `${generatedPassword}${suffixNumber}`;
    suffixNumber++;
  }

  if (!usernameEdited) setUsername(generatedUsername);
  if (!passwordEdited) {
    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
  }

}, [firstName, usernameEdited, passwordEdited]);

  useEffect(() => {
    if (hireDate) {
      const start = new Date(hireDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 15); // Add 15 days for example

      // Format to YYYY-MM-DD for input[type="date"]
      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      setPayStart(formatDate(start));
      setPayEnd(formatDate(end));
    } else {
      setPayStart("");
      setPayEnd("");
    }
  }, [hireDate]);

  // Load PH locations data from JSON file
  useEffect(() => {
    async function loadPhLocationsData() {
      try {
        console.log("Fetching ph_locations.json...");
        const res = await fetch("/data/ph_locations.json");
        console.log("Fetch response status:", res.status);

        if (!res.ok) {
          throw new Error(`Failed to fetch PH locations data: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        console.log("PH locations data loaded successfully:", data.length, "regions");

        setPhLocationsData(data);
        // Extract regions
        const regionNames = data.map((r: any) => r.region);
        setRegions(regionNames);
      } catch (error) {
        console.error("Error loading PH locations data:", error);
        // Fallback: set empty regions
        setRegions([]);
      }
    }

    loadPhLocationsData();
  }, []);

  // Update provinces when region changes (for home address)
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

  // Update cities when province changes (for home address)
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

  // Fetch departments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  // Fetch positions when department changes
  useEffect(() => {
    if (departmentId) {
      fetchPositions(departmentId);
      fetchSupervisors(departmentId);
    } else {
      setPositions([]);
      setPositionId(null);
      setSupervisors([]);
      setSupervisorId(null);
    }
  }, [departmentId]);

  // Auto-populate salary when position is selected
  useEffect(() => {
    if (positionId && positions.length > 0) {
      const selectedPosition = positions.find(
        (p) => p.position_id === positionId
      );
      if (selectedPosition && selectedPosition.salary) {
        setSalary(selectedPosition.salary.toString());
      }
    }
  }, [positionId, positions]);

  const fetchDepartments = async () => {
    try {
      const result = await departmentApi.getAll();
      if (result.success && result.data) {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchPositions = async (deptId: number) => {
    try {
      const result = await positionApi.getAll(deptId);
      if (result.success && result.data) {
        setPositions(result.data);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const fetchSupervisors = async (deptId: number) => {
    try {
      const result = await employeeApi.getAll({
        department_id: deptId,
        role: "supervisor",
        status: "active",
      });
      if (result.success && result.data) {
        setSupervisors(result.data);
      }
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
  };

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

  // Get valid sub_roles based on department
  const getValidSubRoles = (deptId: number | null) => {
    if (!deptId) return [];

    const dept = departments.find((d) => d.department_id === deptId);
    const mapped = mapDepartmentToSubRole(dept?.department_name);

    return mapped ? [mapped] : [];
  };

  // Check if department already has a supervisor
  const checkDepartmentSupervisor = async (deptId: number) => {
    try {
      const result = await employeeApi.getAll({
        department_id: deptId,
        role: "supervisor",
      });
      if (result.success && result.data) {
        return result.data.length > 0;
      }
    } catch (error) {
      console.error("Error checking department supervisor:", error);
    }
    return false;
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

  if (!isOpen) return null;

  // handle birth date change with age validation
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const error = validateBirthDate(e.target.value);

    if (error) {
      setErrors((prev) => ({
        ...prev,
        birthDate: error
      }));
    } else {
      setErrors((prev) => ({ ...prev, birthDate: "" }));
      setBirthDate(e.target.value);
    }
  };

  // handle contact number input with formatting
  const handleContactNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 11) input = input.slice(0, 11);

    if (input.length > 4 && input.length <= 7) {
      input = `${input.slice(0, 4)} ${input.slice(4)}`;
    } else if (input.length > 7) {
      input = `${input.slice(0, 4)} ${input.slice(4, 7)} ${input.slice(7)}`;
    }

    setContactNumber(input);
  };

  // handle salary input with comma formatting
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove commas and non-numeric characters
    let input = e.target.value.replace(/,/g, "").replace(/\D/g, "");

    if (input === "") {
      setSalary("");
      setSalaryDisplay("");
      return;
    }

    // Convert to number and cap at 1,000,000
    let numericValue = parseInt(input, 10);
    if (numericValue > 1000000) {
      numericValue = 1000000;
    }

    // Store the raw numeric value
    setSalary(numericValue.toString());

    // Format with commas for display
    const formatted = numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setSalaryDisplay(formatted);
  };

  // handle dependent contact info with formatting (similar to contact number)
  const handleDependentContactInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 11) input = input.slice(0, 11);

    if (input.length > 4 && input.length <= 7) {
      input = `${input.slice(0, 4)} ${input.slice(4)}`;
    } else if (input.length > 7) {
      input = `${input.slice(0, 4)} ${input.slice(4, 7)} ${input.slice(7)}`;
    }

    setDependentContactInfo(input);
  };

  // Handle reset form
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setMiddleName("");
    setExtensionName("");
    setBirthDate("");
    setGender("");
    setCivilStatus("");
    setHomeAddress("");
    setCity("");
    setRegion("");
    setProvince("");
    setDepartmentId(null);
    setPositionId(null);
    setSalary("");
    setLeaveCredit("15");
    setSupervisorId(null);
    setHireDate("");
    setPayStart("");
    setPayEnd("");
    setShift("");
    setSalaryDisplay("");
    setEmail("");
    setContactNumber("");
    setDependents([]);
    setDependentFirstName("");
    setDependentLastName("");
    setDependentEmail("");
    setDependentContactInfo("");
    setDependentRelationship("");
    setDependentRelationshipSpecify("");
    setDependentErrors({});
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setGrantAdminPrivilege(false);
    setGrantSupervisorPrivilege(false);
    setSubRole("");
    setStep(1);
    setErrors({});
    setMessage(null);
    setShowFingerprintEnrollment(false);
    setNewEmployeeId(null);
    setFingerprintId(null);
  };

  // ─── Validation ───────────────────────────────
  const validateStep = async () => {
    let newErrors: { [key: string]: string } = {};

    // Step 1 - Basic Info
    if (step === 1) {
      newErrors = validateStep1(
        firstName,
        lastName,
        birthDate,
        gender,
        civilStatus,
        homeAddress,
        city,
        region,
        province
      );
    }

    // Step 2 - Job Info
    if (step === 2) {
      newErrors = validateStep2(departmentId, positionId, hireDate, shift, salary);
    }

    // Step 3 - Contact Info & Dependents
    if (step === 3) {
      newErrors = validateStep3(email, contactNumber, dependents);
    }

    // Step 4 - Authentication
    if (step === 4) {
      newErrors = validateStep4(username, password, confirmPassword, grantAdminPrivilege || grantSupervisorPrivilege, subRole);

      // Additional validation for supervisor role
      if (grantSupervisorPrivilege && departmentId) {
        const hasSupervisor = await checkDepartmentSupervisor(departmentId);
        if (hasSupervisor) {
          newErrors.supervisor = "This department already has a supervisor. Only one supervisor is allowed per department.";
        }
      }

      // Validate sub_role matches department
      if ((grantAdminPrivilege || grantSupervisorPrivilege) && departmentId && subRole) {
        const validRoles = getValidSubRoles(departmentId);
        const normalizedSubRole = subRole.toLowerCase();
        const isValid = validRoles.some(role => role.toLowerCase() === normalizedSubRole);

        if (!isValid) {
          const deptName = departments.find(d => d.department_id === departmentId)?.department_name;
          const allowed = validRoles[0]?.toLowerCase() || "hr";
          newErrors.subRole = `${deptName ?? "This"} department employees can only have '${allowed}' as sub_role.`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (await validateStep()) setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) setStep((prev) => prev - 1);
    else onClose();
  };

  const handleStepClick = async (newStep: number) => {
    if (newStep <= step || (await validateStep())) setStep(newStep);
  };

  const handleFingerprintScan = () => {
    setMessage({
      type: "success",
      text: "🔒 Fingerprint scanner initialized...",
    });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSubmit = async () => {
    if (!await validateStep()) return;

    setIsSubmitting(true);

    try {

      // Prepare data for API with new schema fields
      const employeeData: any = {
        username,
        password,
        role: grantAdminPrivilege ? "admin" : grantSupervisorPrivilege ? "supervisor" : "employee",
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
        extension_name: extensionName || null,
        birthdate: birthDate,
        gender: gender ? gender.toLowerCase() : null,
        civil_status: civilStatus ? civilStatus.toLowerCase() : null,
        home_address: homeAddress || null,
        city: city || null,
        region: region || null,
        province: province || null,
        position_id: positionId,
        department_id: departmentId,
        salary: salary ? parseFloat(salary) : null,
        leave_credit: leaveCredit ? parseInt(leaveCredit) : 15,
        supervisor_id: supervisorId || null,
        shift: shift ? shift.toLowerCase() : null,
        hire_date: hireDate,
        email: email,
        contact_number: contactNumber ? contactNumber.replace(/\s/g, "") : null,
        status: "active" as const,
        // Audit fields
        created_by: user?.user_id || null,
        // Dependents
        dependents: dependents,
      };

      // Add sub_role if admin or supervisor privilege is granted
      if ((grantAdminPrivilege || grantSupervisorPrivilege) && subRole) {
        employeeData.sub_role = subRole.toLowerCase();
      }

      const result = await employeeApi.create(employeeData);

      if (result.success) {
        setMessage({ type: "success", text: "Employee created successfully!" });

        // Store the new employee ID for fingerprint enrollment
        setNewEmployeeId(result.data.employee_id);
        console.log("newEmployeeId: ", newEmployeeId);
        // Show fingerprint enrollment after 1 second
        setTimeout(() => {
          setMessage(null);
          setShowFingerprintEnrollment(true);
        }, 1000);
      } else {
        setMessage({
          type: "error",
          text: result.message || "Failed to create employee",
        });
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      setMessage({
        type: "error",
        text: "An error occurred while creating the employee",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Reusable name validation function
  const validateNameFormat = (value: string, setValue: (v: string) => void, maxLength: number = 30 ) => {
    if (/^[A-Za-z\s'-]*$/.test(value) && value.length <= maxLength) {
      setValue(value);
    }
  };

  // ─── UI ───────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-[#f9ecd7] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-lg relative flex flex-col"
      >
        <motion.button
          whileHover={{ scale: 1.2, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:text-[#60101C] transition text-2xl"
          aria-label="Close Modal"
        >
          ✕
        </motion.button>

        {/* Message Display */}
        {message && (
          <div className={`mx-8 mt-8 mb-4 p-3 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message.text}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {/* Header */}
          <div className="flex flex-col items-start mb-6 space-y-1">
            <h2 className="text-2xl font-extrabold text-[#3b2b1c]">Add Employee</h2>
            <h3 className="text-lg font-[300] text-[#3b2b1c]">
              {["Basic Information", "Job Information", "Contact Information", "Authentication"][step - 1]}
            </h3>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  {/* Personal Info */}
                  <FormInput
                    label="First Name:"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                     validateNameFormat(e.target.value, setFirstName);
                    }}
                    error={errors.firstName}
                  />
                  <FormInput
                    label="Last Name:"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                     validateNameFormat(e.target.value, setLastName);
                    }}
                    error={errors.lastName}
                  />
                  <FormInput
                    label="Middle Name:"
                    type="text"
                    value={middleName}
                    onChange={(e) => {
                      validateNameFormat(e.target.value, setMiddleName);
                    }}
                    placeholder="(optional)"
                  />
                  <FormInput
                    label="Extension Name:"
                    type="text"
                    value={extensionName}
                    onChange={(e) => {
                      validateNameFormat(e.target.value, setExtensionName, 10);
                    }}
                    placeholder="Jr., Sr., III, etc. (optional)"
                  />
                  <FormInput
                    label="Birth Date:"
                    type="date"
                    value={birthDate}
                    onChange={handleBirthDateChange}
                    error={errors.birthDate}
                  />
                  <FormSelect
                    label="Gender:"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    options={["Male", "Female", "Others"]}
                    error={errors.gender}
                  />
                  <FormSelect
                    label="Civil Status:"
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    options={["Single", "Married", "Widowed", "Divorced"]}
                    error={errors.civilStatus}
                  />

                  {/* Address Section - Grouped Region, Province, City */}
                  <div className="col-span-3 flex items-center gap-3 mt-6 mb-2">
                    <div className="flex-grow border-t border-[#d6bfa3]"></div>
                    <span className="text-[#3b2b1c] font-semibold text-sm uppercase tracking-wide">
                      Address Location
                    </span>
                    <div className="flex-grow border-t border-[#d6bfa3]"></div>
                  </div>

                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <FormInput
                      label="Address:"
                      type="text"
                      value={homeAddress}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 100) {
                          setHomeAddress(value);
                        }
                      }}
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

                </div>

              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  {/* Department Dropdown - Cascading */}
                  <div>
                    <label className="block text-[#3b2b1c] mb-1 font-medium">
                      Department: <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={departmentId || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : null;
                        setDepartmentId(value);
                        setPositionId(null);
                        setSupervisorId(null);
                        setErrors((prev) => ({ ...prev, department: "" }));
                      }}
                      className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14]"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option
                          key={dept.department_id}
                          value={dept.department_id}
                        >
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

                  {/* Position Dropdown - Filtered by Department */}
                  <div>
                    <label className="block text-[#3b2b1c] mb-1 font-medium">
                      Position: <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={positionId || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : null;
                        setPositionId(value);
                        setErrors((prev) => ({ ...prev, position: "" }));
                      }}
                      disabled={!departmentId}
                      className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {departmentId
                          ? "Select Position"
                          : "Select Department First"}
                      </option>
                      {positions.map((pos) => (
                        <option key={pos.position_id} value={pos.position_id}>
                          {pos.position_name}
                        </option>
                      ))}
                    </select>
                    {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position}</p>}
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-3">
                    {/* Profile Initial Circle */}
                    <div className="w-32 h-32 rounded-full bg-[#800000] flex items-center justify-center text-white text-4xl font-bold">
                      {firstName && lastName
                        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                        : "?"}
                    </div>
                  </div>

                  <FormInput label="Hire Date:" type="date" max={today} value={hireDate} onChange={(e) => setHireDate(e.target.value)} error={errors.hireDate} />
                  <FormInput label="Pay Period Start:" type="date" value={payStart} onChange={(e) => setPayStart(e.target.value)} readOnly={true} />

                  <FormSelect label="Shift:" value={shift} onChange={(e) => setShift(e.target.value)} options={["Morning", "Night"]} error={errors.shift} />
                  <FormInput label="Pay Period End:" type="date" value={payEnd} onChange={(e) => setPayEnd(e.target.value)} readOnly={true} />

                  <div>
                    <label className="block text-[#3b2b1c] mb-1">Salary:</label>
                    <div className="flex items-center border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] overflow-hidden">
                      <span className="px-3 py-2 text-[#3b2b1c] font-semibold">₱</span>
                      <input
                        type="text"
                        value={salaryDisplay}
                        onChange={handleSalaryChange}
                        placeholder="0.00"
                        className="flex-1 px-3 py-2 bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14] focus:ring-inset"
                      />
                    </div>
                    {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary}</p>}
                  </div>

                  {/* Supervisor Dropdown - Filtered by Department */}
                  <div>
                    <label className="block text-[#3b2b1c] mb-1 font-medium">
                      Reports To (Supervisor):
                    </label>
                    <select
                      value={supervisorId || ""}
                      onChange={(e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : null;
                        setSupervisorId(value);
                        setErrors((prev) => ({ ...prev, supervisor: "" }));
                      }}
                      disabled={!departmentId}
                      className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {departmentId
                          ? "No Supervisor (Optional)"
                          : "Select Department First"}
                      </option>
                      {supervisors.map((sup) => (
                        <option key={sup.employee_id} value={sup.employee_id}>
                          {sup.employee_code} - {sup.first_name} {sup.last_name}
                        </option>
                      ))}
                    </select>
                    {errors.supervisor && <p className="text-red-500 text-xs mt-1">{errors.supervisor}</p>}
                    <p className="text-xs text-[#6b5344] mt-1">
                      Select who this employee will report to
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  {/* Contact Information Section */}
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <FormInput label="Email:" type="email" value={email} onChange={(e) =>{
                        const value = e.target.value;
                        if(value.length < 100) setEmail(value);
                      }} error={errors.email} placeholder="(use gmail)" />
                      {/*
                      
                      Required to email confirmation 
                      
                      */}
                      <FormInput label="Contact Number:" type="text" value={contactNumber} onChange={handleContactNumberChange} error={errors.contactNumber} />
                    </div>
                  </div>

                  {/* Dependent Information Section */}
                  <div className="border-t-2 border-[#e6d2b5] pt-6">
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
                            validateNameFormat(e.target.value, setDependentFirstName);
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
                            validateNameFormat(e.target.value, setDependentLastName);
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
                              validateNameFormat(e.target.value, setDependentRelationshipSpecify, 30);
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
                          // Validate dependent using the validation function
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

                          // If there are errors, set them and return
                          if (Object.keys(newErrors).length > 0) {
                            setDependentErrors(newErrors);
                            return;
                          }

                          // Clear errors if validation passes
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
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <FormInput
                    label="Username:"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameEdited(true);
                    }}
                    placeholder="auto-generated from first name"
                    error={errors.username}
                  />

                  <div className="relative">
                    <FormInput
                      label="Password:"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordEdited(true);
                      }}
                      error={errors.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-[#3b2b1c] hover:opacity-70"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="relative">
                    <FormInput
                      label="Confirm Password:"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordEdited(true);
                      }}
                      error={errors.confirmPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-8 text-[#3b2b1c] hover:opacity-70"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="block text-[#3b2b1c] mb-1">
                      Register Your Fingerprint
                    </label>
                    <button
                      onClick={handleFingerprintScan}
                      className="bg-[#3b2b1c] text-[#FFF2E0] w-50 cursor-pointer border border-[#e6d2b5] rounded-lg px-3 py-2 shadow-inner hover:bg-[#60101c] transition"
                    >
                      Scan Now
                    </button>
                  </div>

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
                          setErrors((prev) => ({ ...prev, subRole: "" }));
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
                          setErrors((prev) => ({ ...prev, subRole: "" }));
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Section - Progress Bar and Buttons */}
        <div className="border-t border-[#e6d2b5] p-8 mt-4r bg-[#f9ecd7] rounded-b-2xl">
          {/* Progress Bar (Clickable) */}
          <div className="flex justify-between items-center w-3/4 mx-auto mb-6">
            {[
              { id: 1, label: "Basic Information" },
              { id: 2, label: "Job Information" },
              { id: 3, label: "Contact Information" },
              { id: 4, label: "Authentication" },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => handleStepClick(item.id)}
                className="flex flex-col items-center text-center space-y-1 cursor-pointer select-none"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${step >= item.id
                    ? "bg-[#4b0b14] text-white"
                    : "bg-[#e0c9a6] text-[#3b2b1c]"
                    } ${step === item.id
                      ? "scale-110 shadow-md shadow-[#4b0b14]/30"
                      : ""
                    }`}
                >
                  {item.id}
                </div>
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${step >= item.id ? "text-[#4b0b14]" : "text-[#a18256]"
                    }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex justify-between">
            <button onClick={handleBack} className="bg-gray-300 text-gray-700 px-6 py-2 cursor-pointer rounded-lg shadow-md hover:opacity-80">
              {step === 1 ? "Close" : "Back"}
            </button>

            {step < 4 ? (
              <button onClick={handleNext} className="bg-[#3b2b1c] text-white px-6 py-2 cursor-pointer rounded-lg shadow-md hover:opacity-80">
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#4b0b14] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
        {showFingerprintEnrollment && newEmployeeId && (
          <div className="absolute inset-0 bg-white rounded-2xl z-10 p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#3b2b1c] mb-4">
              Enroll Fingerprint (Optional)
            </h2>
            <p className="text-gray-600 mb-6">
              You can enroll a fingerprint for this employee now, or skip and do it later.
            </p>
            <FingerprintEnrollment
              employeeId={newEmployeeId}
              onEnrollmentComplete={(fpId) => {
                setFingerprintId(fpId);
                setShowFingerprintEnrollment(false);

                // Reset and close modal
                setTimeout(() => {
                  resetForm();
                  onClose();
                }, 1500);
              }}
              onSkip={() => {
                setShowFingerprintEnrollment(false);

                // Reset and close modal
                setTimeout(() => {
                  resetForm();
                  onClose();
                }, 500);
              }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
