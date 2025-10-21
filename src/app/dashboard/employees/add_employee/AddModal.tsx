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

export default function AddEmployeeModal({ isOpen, onClose }: EmployeeModalProps) {
  const [step, setStep] = useState(1);

  // Step data states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [hireDate, setHireDate] = useState("");
  const [payStart, setPayStart] = useState("");
  const [payEnd, setPayEnd] = useState("");
  const [shift, setShift] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [socialMedia, setSocialMedia] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [grantAdminPrivilege, setGrantAdminPrivilege] = useState(false);
  const [subRole, setSubRole] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [cities, setCities] = useState<string[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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


  //to fetch cities and regions
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch("https://psgc.gitlab.io/api/cities/");
        if (!res.ok) throw new Error("Failed to fetch cities");
        const data = await res.json();

        // Extract city names
        const cityList = data.map((city: any) => `${city.name}`);
        setCities(cityList);
      } catch (error) {
        console.error("Error loading cities:", error);
      }
    }

    loadCities();
  }, []);

  useEffect(() => {
    async function loadRegions() {
      const res = await fetch("https://psgc.gitlab.io/api/regions/");
      const data = await res.json();
      setRegions(data);
    }
    loadRegions();
  }, []);

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
    } else {
      setPositions([]);
      setPositionId(null);
    }
  }, [departmentId]);

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

  if (!isOpen) return null;


  // handle birth date change with age validation
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());

    if (selectedDate > minAgeDate) {
      setErrors((prev) => ({
        ...prev,
        birthDate: "You must be older than 20 years old."
      }));
    } else {
      setErrors((prev) => ({ ...prev, birthDate: "" }));
      setBirthDate(e.target.value);
    }
  };

  // handle contact number input with formatting
  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!homeAddress.trim()) newErrors.homeAddress = "Home address is required";
      if (!city) newErrors.city = "City is required";
      if (!region) newErrors.region = "Region is required";
    }

    // Step 2 - Job Info
    if (step === 2) {
      if (!departmentId) newErrors.department = "Department is required";
      if (!positionId) newErrors.position = "Position is required";
      if (!hireDate) newErrors.hireDate = "Hire date is required";
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
        if (password.length < 6) passwordErrors.push("At least 6 characters long");
        if (!/[A-Z]/.test(password)) passwordErrors.push("At least one uppercase letter");
        if (!/[a-z]/.test(password)) passwordErrors.push("At least one lowercase letter");
        if (!/\d/.test(password)) passwordErrors.push("At least one number");
        if (!/[@$!%*?&]/.test(password))
          passwordErrors.push("At least one special character (@, $, !, %, *, ?, &)");
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
    alert("🔒 Fingerprint scanner initialized...");
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);

    try {
      // Prepare data for API - filter out empty strings and convert to null
      const employeeData: any = {
        username,
        password,
        role: grantAdminPrivilege ? 'admin' : 'employee',
        first_name: firstName,
        last_name: lastName,
        birthdate: birthDate,
        gender: gender ? gender.toLowerCase() : null,
        civil_status: civilStatus ? civilStatus.toLowerCase() : null,
        home_address: homeAddress,
        city: city,
        region: region,
        position_id: positionId, // ✅ Include position_id
        hire_date: hireDate,
        email: email,
        contact_number: contactNumber ? contactNumber.replace(/\s/g, '') : null,
        status: 'active' as const,
      };

      // Add sub_role if admin privilege is granted
      if (grantAdminPrivilege && subRole) {
        employeeData.sub_role = subRole.toLowerCase();
      }

      const result = await employeeApi.create(employeeData);

      if (result.success) {
        alert("Employee created successfully!");

        // Reset everything
        setFirstName("");
        setLastName("");
        setBirthDate("");
        setGender("");
        setCivilStatus("");
        setHomeAddress("");
        setCity("");
        setRegion("");
        setDepartmentId(null);
        setPositionId(null);
        setHireDate("");
        setPayStart("");
        setPayEnd("");
        setShift("");
        setEmail("");
        setContactNumber("");
        setSocialMedia("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setGrantAdminPrivilege(false);
        setSubRole("");
        setStep(1);
        setErrors({});

        onClose();
      } else {
        alert(result.message || "Failed to create employee");
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      alert("An error occurred while creating the employee");
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

        {/* Header */}
        <h2 className="text-lg font-bold text-[#3b2b1c] mb-6 text-center">
          {["Basic Information", "Job Information", "Contact Information", "Authentication"][step - 1]}
        </h2>



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
                <FormInput label="First Name:" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} />
                <FormInput label="Last Name:" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} />
                <FormInput label="Birth Date:" type="date" value={birthDate} onChange={handleBirthDateChange} error={errors.birthDate} />
                <FormSelect label="Gender:" value={gender} onChange={(e) => setGender(e.target.value)} options={["Male", "Female", "Other"]} error={errors.gender} />
                <FormSelect label="Civil Status:" value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)} options={["Single", "Married", "Widowed", "Divorced"]} error={errors.civilStatus} />
                <FormInput label="Home Address:" type="text" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} error={errors.homeAddress} />
                <FormSelect label="City" value={city} onChange={(e) => setCity(e.target.value)} options={cities} error={errors.city} />
                <FormSelect label="Region" value={region} onChange={(e) => setRegion(e.target.value)} options={regions.map((reg) => reg.name)} error={errors.region} />
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
                  <label className="block text-[#3b2b1c] mb-1">Department: <span className="text-red-500">*</span></label>
                  <select
                    value={departmentId || ""}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setDepartmentId(value);
                      setPositionId(null);
                      setErrors((prev) => ({ ...prev, department: "" }));
                    }}
                    className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14]"
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

                {/* Position Dropdown - Filtered by Department */}
                <div>
                  <label className="block text-[#3b2b1c] mb-1">Position: <span className="text-red-500">*</span></label>
                  <select
                    value={positionId || ""}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setPositionId(value);
                      setErrors((prev) => ({ ...prev, position: "" }));
                    }}
                    disabled={!departmentId}
                    className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:outline-none focus:ring-2 focus:ring-[#4b0b14] disabled:opacity-50 disabled:cursor-not-allowed"
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


                <FormInput label="Hire Date:" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} error={errors.hireDate} />
                <FormInput label="Pay Period Start:" type="date" value={payStart} onChange={(e) => setPayStart(e.target.value)} readOnly={true} />
                <FormSelect label="Shift:" value={shift} onChange={(e) => setShift(e.target.value)} options={["Morning", "Night"]} error={errors.shift} />
                <FormInput label="Pay Period End:" type="date" value={payEnd} onChange={(e) => setPayEnd(e.target.value)} readOnly={true} />
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
                <FormInput label="Email:" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="(use gmail)" />
                <FormInput label="Contact Number:" type="text" value={contactNumber} onChange={handleContactNumberChange} error={errors.contactNumber} />
                <FormInput label="Social Media Link:" type="text" value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)} placeholder="(Optional)" />
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
                <FormInput label="Username:" type="text" value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} />

                <div className="relative">
                  <FormInput label="Password:" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-[#3b2b1c] hover:opacity-70">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <FormInput label="Confirm Password:" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-8 text-[#3b2b1c] hover:opacity-70">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="block text-[#3b2b1c] mb-1">Register Your Fingerprint</label>
                  <button onClick={handleFingerprintScan} className="bg-[#3b2b1c] text-[#FFF2E0] w-50 cursor-pointer border border-[#e6d2b5] rounded-lg px-3 py-2 shadow-inner hover:bg-[#60101c] transition">
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
                  <label htmlFor="grantAdminPrivilege" className="text-[#3b2b1c] font-semibold cursor-pointer select-none">
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
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${step >= item.id ? "bg-[#4b0b14] text-white" : "bg-[#e0c9a6] text-[#3b2b1c]"
                  } ${step === item.id ? "scale-110 shadow-md shadow-[#4b0b14]/30" : ""}`}
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
        <div className="flex justify-between mt-10">
          <button onClick={handleBack} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg shadow-md hover:opacity-80">
            {step === 1 ? "Close" : "Back"}
          </button>

          {step < 4 ? (
            <button onClick={handleNext} className="bg-[#3b2b1c] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-80">
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
