"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { employeeApi, departmentApi, positionApi } from "@/lib/api";
import { Department, Position } from "@/types/api";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddEmployeeModal({
  isOpen,
  onClose,
}: EmployeeModalProps) {
  const [step, setStep] = useState(1);

  // Step data states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");

  // Address fields (new structured format)
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [homeAddress, setHomeAddress] = useState("");

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [salary, setSalary] = useState("");
  const [leaveCredit, setLeaveCredit] = useState("15");
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [hireDate, setHireDate] = useState("");
  const [payStart, setPayStart] = useState("");
  const [payEnd, setPayEnd] = useState("");
  const [shift, setShift] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [grantAdminPrivilege, setGrantAdminPrivilege] = useState(false);
  const [subRole, setSubRole] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Location data
  const [locationData, setLocationData] = useState<any[]>([]);
  const [availableProvinces, setAvailableProvinces] = useState<any[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // set the pay end date based on pay start date
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

  // Load Philippine location data
  useEffect(() => {
    async function loadLocations() {
      try {
        // Fetch from relative path
        const res = await fetch("/data/ph_locations.json");
        if (!res.ok) throw new Error("Failed to fetch location data");
        const data = await res.json();

        // Sort regions alphabetically
        const sortedData = data.sort((a: any, b: any) =>
          a.region.localeCompare(b.region)
        );

        setLocationData(sortedData);
      } catch (error) {
        console.error("Error loading locations:", error);
        setMessage({ type: "error", text: "Failed to load location data" });
      }
    }

    loadLocations();
  }, []);

  // Handle region selection - populate provinces
  useEffect(() => {
    if (selectedRegion && locationData.length > 0) {
      const region = locationData.find((r: any) => r.region === selectedRegion);
      if (region) {
        // Sort provinces alphabetically
        const sortedProvinces = [...region.provinces].sort((a: any, b: any) =>
          a.province.localeCompare(b.province)
        );
        setAvailableProvinces(sortedProvinces);
      }
    } else {
      setAvailableProvinces([]);
      setSelectedProvince("");
      setAvailableCities([]);
      setSelectedCity("");
    }
  }, [selectedRegion, locationData]);

  // Handle province selection - populate cities
  useEffect(() => {
    if (selectedProvince && availableProvinces.length > 0) {
      const province = availableProvinces.find(
        (p: any) => p.province === selectedProvince
      );
      if (province) {
        // Sort cities alphabetically
        const sortedCities = [...province.cities].sort((a: string, b: string) =>
          a.localeCompare(b)
        );
        setAvailableCities(sortedCities);
      }
    } else {
      setAvailableCities([]);
      setSelectedCity("");
    }
  }, [selectedProvince, availableProvinces]);

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
      const result = await employeeApi.getAll();
      if (result.success && result.data) {
        // Filter employees by department and active status
        const deptEmployees = result.data.filter(
          (emp: any) => emp.department_id === deptId && emp.status === "active"
        );
        setSupervisors(deptEmployees);
      }
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
  };

  if (!isOpen) return null;

  // handle birth date change with age validation
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const today = new Date();
    const minAgeDate = new Date(
      today.getFullYear() - 20,
      today.getMonth(),
      today.getDate()
    );

    if (selectedDate > minAgeDate) {
      setErrors((prev) => ({
        ...prev,
        birthDate: "You must be older than 20 years old.",
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

  // ─── Validation ───────────────────────────────
  const validateStep = () => {
    const newErrors: { [key: string]: string } = {};

    // Step 1 - Basic Info
    if (step === 1) {
      if (!firstName.trim()) newErrors.firstName = "First name is required";
      if (!lastName.trim()) newErrors.lastName = "Last name is required";
      if (!birthDate) newErrors.birthDate = "Birth date is required";
      if (!gender) newErrors.gender = "Gender is required";
      if (!civilStatus) newErrors.civilStatus = "Civil status is required";
      // Address validation (optional but recommended)
      if (!selectedRegion) newErrors.region = "Region is required";
      if (!selectedProvince) newErrors.province = "Province is required";
      if (!selectedCity) newErrors.city = "City is required";
      if (!homeAddress) newErrors.homeAddress = "Home Address is required";
    }

    // Step 2 - Job Info
    if (step === 2) {
      if (!departmentId) newErrors.department = "Department is required";
      if (!positionId) newErrors.position = "Position is required";
      if (!hireDate) {
        newErrors.hireDate = "Hire date is required";
      } else {
        // Parse the hireDate safely as a Manila date (YYYY-MM-DD input)
        const [year, month, day] = hireDate.split("-").map(Number);
        const selected = new Date(Date.UTC(year, month - 1, day)); // avoids local offset
        selected.setHours(0, 0, 0, 0);

        // Get today's date in Asia/Manila
        const today = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
        );
        today.setHours(0, 0, 0, 0);

        if (selected > today) {
          newErrors.hireDate = "Hire date cannot be in the future";
        }
      }
      if (!shift) newErrors.shift = "Shift is required";
    }

    // Step 3 - Contact Info
    if (step === 3) {
      if (!email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
        newErrors.email = "Email must be a valid Gmail address";
      }

      if (!contactNumber.trim()) {
        newErrors.contactNumber = "Contact number is required";
      } else if (!/^(\+639|09)\d{9}$/.test(contactNumber.replace(/\s/g, ""))) {
        newErrors.contactNumber = "Invalid contact number format";
      }
    }

    // Step 4 - Authentication
    if (step === 4) {
      if (!username.trim()) newErrors.username = "Username is required";

      if (!password.trim()) {
        newErrors.password = "Password is required";
      } else {
        const passwordErrors = [];
        if (password.length < 6)
          passwordErrors.push("At least 6 characters long");
        if (!/[A-Z]/.test(password))
          passwordErrors.push("At least one uppercase letter");
        if (!/[a-z]/.test(password))
          passwordErrors.push("At least one lowercase letter");
        if (!/\d/.test(password)) passwordErrors.push("At least one number");
        if (!/[@$!%*?&]/.test(password))
          passwordErrors.push(
            "At least one special character (@, $, !, %, *, ?, &)"
          );
        if (passwordErrors.length > 0)
          newErrors.password = passwordErrors.join(", ");
      }

      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (grantAdminPrivilege && !subRole) {
        newErrors.subRole = "Sub-role is required for admin privilege";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) setStep((prev) => prev - 1);
    else onClose();
  };

  const handleStepClick = (newStep: number) => {
    if (newStep <= step || validateStep()) setStep(newStep);
  };

  const handleFingerprintScan = () => {
    setMessage({
      type: "success",
      text: "🔒 Fingerprint scanner initialized...",
    });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);

    try {
      // Prepare data for API with new schema fields
      const employeeData: any = {
        username,
        password,
        role: grantAdminPrivilege ? "admin" : "employee",
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
        extension_name: extensionName || null,
        birthdate: birthDate,
        gender: gender ? gender.toLowerCase() : null,
        civil_status: civilStatus ? civilStatus.toLowerCase() : null,

        // New structured address fields
        region_name: selectedRegion || null,
        province_name: selectedProvince || null,
        city_name: selectedCity || null,
        home_address: homeAddress || null,

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
      };

      // Add sub_role if admin privilege is granted
      if (grantAdminPrivilege && subRole) {
        employeeData.sub_role = subRole.toLowerCase();
      }

      const result = await employeeApi.create(employeeData);

      if (result.success) {
        setMessage({ type: "success", text: "Employee created successfully!" });

        // Reset everything after 2 seconds
        setTimeout(() => {
          setFirstName("");
          setLastName("");
          setMiddleName("");
          setExtensionName("");
          setBirthDate("");
          setGender("");
          setCivilStatus("");
          setSelectedRegion("");
          setSelectedProvince("");
          setSelectedCity("");
          setHomeAddress("");
          setDepartmentId(null);
          setPositionId(null);
          setSalary("");
          setLeaveCredit("15");
          setSupervisorId(null);
          setHireDate("");
          setPayStart("");
          setPayEnd("");
          setShift("");
          setEmail("");
          setContactNumber("");
          setUsername("");
          setPassword("");
          setConfirmPassword("");
          setGrantAdminPrivilege(false);
          setSubRole("");
          setStep(1);
          setErrors({});
          setMessage(null);

          onClose();
        }, 2000);
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

  // ─── UI ───────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-[#f9ecd7] w-full max-w-4xl p-8 rounded-2xl shadow-lg relative"
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
          <div
            className={`mb-4 p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col items-start mb-6 space-y-1">
          <h2 className="text-2xl font-extrabold text-[#3b2b1c]">
            Add Employee
          </h2>
          <h3 className="text-lg font-[300] text-[#3b2b1c]">
            {
              [
                "Basic Information",
                "Job Information",
                "Contact Information",
                "Authentication",
              ][step - 1]
            }
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
                {/* Name Fields */}
                <FormInput
                  label="First Name:"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  error={errors.firstName}
                />
                <FormInput
                  label="Last Name:"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  error={errors.lastName}
                />
                <FormInput
                  label="Middle Name (Optional):"
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
                <FormInput
                  label="Extension (Jr., Sr., III):"
                  type="text"
                  value={extensionName}
                  onChange={(e) => setExtensionName(e.target.value)}
                  placeholder="e.g., Jr., Sr., III"
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
                  options={["Male", "Female", "Other"]}
                  error={errors.gender}
                />
                <FormSelect
                  label="Civil Status:"
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value)}
                  options={["Single", "Married", "Widowed", "Divorced"]}
                  error={errors.civilStatus}
                />

                {/* Address Section Header */}
                <div className="col-span-3 mt-4 mb-2">
                  <h3 className="text-lg font-semibold text-[#3b2b1c] border-b border-[#e6d2b5] pb-2">
                    Address Information
                  </h3>
                </div>

                {/* Cascading Address Dropdowns */}
                <div>
                  <label className="block text-[#3b2b1c] mb-1 font-medium">
                    Region: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setSelectedProvince("");
                      setSelectedCity("");
                      setErrors((prev) => ({ ...prev, region: "" }));
                    }}
                    className={`w-full bg-[#fdf4e3] border ${
                      errors.region ? "border-red-500" : "border-[#e6d2b5]"
                    } rounded-lg px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d4a056]`}
                  >
                    <option value="">-- Select Region --</option>
                    {locationData.map((region: any, index: number) => (
                      <option key={index} value={region.region}>
                        {region.region}
                      </option>
                    ))}
                  </select>
                  {errors.region && (
                    <span className="text-red-500 text-xs mt-1">
                      {errors.region}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[#3b2b1c] mb-1 font-medium">
                    Province: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      setSelectedCity("");
                      setErrors((prev) => ({ ...prev, province: "" }));
                    }}
                    disabled={!selectedRegion}
                    className={`w-full bg-[#fdf4e3] border ${
                      errors.province ? "border-red-500" : "border-[#e6d2b5]"
                    } rounded-lg px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d4a056] disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">
                      {selectedRegion
                        ? "-- Select Province --"
                        : "Select Region First"}
                    </option>
                    {availableProvinces.map((province: any, index: number) => (
                      <option key={index} value={province.province}>
                        {province.province}
                      </option>
                    ))}
                  </select>
                  {errors.province && (
                    <span className="text-red-500 text-xs mt-1">
                      {errors.province}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[#3b2b1c] mb-1 font-medium">
                    City/Municipality: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setErrors((prev) => ({ ...prev, city: "" }));
                    }}
                    disabled={!selectedProvince}
                    className={`w-full bg-[#fdf4e3] border ${
                      errors.city ? "border-red-500" : "border-[#e6d2b5]"
                    } rounded-lg px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d4a056] disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">
                      {selectedProvince
                        ? "-- Select City/Municipality --"
                        : "Select Province First"}
                    </option>
                    {availableCities.map((city: string, index: number) => (
                      <option key={index} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {errors.city && (
                    <span className="text-red-500 text-xs mt-1">
                      {errors.city}
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <FormInput
                    label="Home Address"
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="House/Unit No., Street Name"
                    error={errors.homeAddress}
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
                  {errors.position && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.position}
                    </p>
                  )}
                </div>

                {/* Supervisor Dropdown - Filtered by Department */}
                <div>
                  <label className="block text-[#3b2b1c] mb-1 font-medium">
                    Supervisor (Optional):
                  </label>
                  <select
                    value={supervisorId || ""}
                    onChange={(e) => {
                      const value = e.target.value
                        ? Number(e.target.value)
                        : null;
                      setSupervisorId(value);
                    }}
                    disabled={!departmentId}
                    className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {departmentId
                        ? "-- No Supervisor --"
                        : "Select Department First"}
                    </option>
                    {supervisors.map((emp: any) => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.first_name} {emp.last_name} -{" "}
                        {emp.position_name || "N/A"}
                      </option>
                    ))}
                  </select>
                </div>

                <FormInput
                  label="Salary:"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="Auto-filled from position"
                  readOnly={true}
                />
                <FormInput
                  label="Leave Credit (Days):"
                  type="number"
                  value={leaveCredit}
                  onChange={(e) => setLeaveCredit(e.target.value)}
                  placeholder="Amount of Leave Requests per Year"
                  readOnly={true}
                />
                <FormSelect
                  label="Shift:"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  options={["Morning", "Night"]}
                  error={errors.shift}
                />

                <FormInput
                  label="Hire Date:"
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  error={errors.hireDate}
                />
                <FormInput
                  label="Pay Period Start:"
                  type="date"
                  value={payStart}
                  onChange={(e) => setPayStart(e.target.value)}
                  readOnly={true}
                />
                <FormInput
                  label="Pay Period End:"
                  type="date"
                  value={payEnd}
                  onChange={(e) => setPayEnd(e.target.value)}
                  readOnly={true}
                />

                {/* Profile Initial Circle */}
                <div className="col-span-3 flex justify-center mt-4">
                  <div className="w-32 h-32 rounded-full bg-[#800000] flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {firstName && lastName
                      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                      : "?"}
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <FormInput
                  label="Email:"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  placeholder="(use gmail)"
                />
                <FormInput
                  label="Contact Number:"
                  type="text"
                  value={contactNumber}
                  onChange={handleContactNumberChange}
                  error={errors.contactNumber}
                />
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
                  onChange={(e) => setUsername(e.target.value)}
                  error={errors.username}
                />

                <div className="relative">
                  <FormInput
                    label="Password:"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-[#3b2b1c] hover:opacity-70"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
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

                {/* Sub-role dropdown - only show if admin privilege is granted */}
                {grantAdminPrivilege && (
                  <div className="col-span-2">
                    <FormSelect
                      label="Admin Sub-Role:"
                      value={subRole}
                      onChange={(e) => setSubRole(e.target.value)}
                      options={["HR", "Manager", "Finance", "IT"]}
                      error={errors.subRole}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar (Clickable) */}
        <div className="flex justify-between items-center w-3/4 mx-auto mt-10">
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
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  step >= item.id
                    ? "bg-[#4b0b14] text-white"
                    : "bg-[#e0c9a6] text-[#3b2b1c]"
                } ${
                  step === item.id
                    ? "scale-110 shadow-md shadow-[#4b0b14]/30"
                    : ""
                }`}
              >
                {item.id}
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  step >= item.id ? "text-[#4b0b14]" : "text-[#a18256]"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-between mt-10">
          <button
            onClick={handleBack}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg shadow-md hover:opacity-80"
          >
            {step === 1 ? "Close" : "Back"}
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="bg-[#3b2b1c] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80"
            >
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
      </motion.div>
    </div>
  );
}
