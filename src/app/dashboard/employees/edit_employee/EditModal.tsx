"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { departmentApi, positionApi, employeeApi, fingerprintApi } from "@/lib/api";
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
import FingerprintEnrollment from "@/components/FingerprintEnrollment";

const STATUS_OPTIONS = ["Active", "On Leave", "Resigned", "Terminated"] as const;

const formatStatusForDisplay = (status?: string | null) => {
  if (!status) return "";
  const normalized = status.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  switch (normalized) {
    case "active":
      return "Active";
    case "on_leave":
    case "on-leave":
      return "On Leave";
    case "resigned":
      return "Resigned";
    case "terminated":
      return "Terminated";
    default:
      return status;
  }
};

const normalizeStatusForPayload = (status: string) => {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();

  // Database expects 'on-leave' with hyphen, not underscore
  if (normalized === "on leave") {
    return "on-leave";
  }

  // For other statuses (active, resigned, terminated), just return lowercase
  return normalized;
};


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

const formatShiftForDisplay = (value?: string | null) => {
  if (!value) return "";
  const v = value.toLowerCase();
  const map: Record<string, string> = {
    morning: "Morning",
    night: "Night",
  };
  return map[v] || value;
};

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/city of /g, "")
    .replace(/city /g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- Interfaces ---------- */
interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: number | null;
}

interface EmployeeData {
  employee_id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  extension_name?: string;
  home_address: string;
  barangay: string;
  city: string;
  region: string;
  department_id: number;
  position_id: number;
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
  status?: string;
  fingerprint_id?: number | null;
}

interface CityData {
  city: string;
  barangays: string[];
}

interface ProvinceData {
  province: string;
  cities: CityData[];
}

interface RegionData {
  region: string;
  provinces: ProvinceData[];
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
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  // shift removed - field no longer exists
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [salaryDisplay, setSalaryDisplay] = useState<string>("");
  const [homeAddress, setHomeAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
 // const [barangay, setBarangay] = useState("");
  const [barangays, setBarangays] = useState<string[]>([]);
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [contactNumbers, setContactNumbers] = useState<ContactNumber[]>([]);

  // Role management state
  const [grantAdminPrivilege, setGrantAdminPrivilege] = useState(false);
  const [grantSupervisorPrivilege, setGrantSupervisorPrivilege] = useState(false);
  const [subRole, setSubRole] = useState("");

  // Dependents state
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [salary, setSalary] = useState("");
  const [dependentFirstName, setDependentFirstName] = useState("");
  const [dependentLastName, setDependentLastName] = useState("");
  const [dependentEmail, setDependentEmail] = useState("");
  const [dependentContactInfo, setDependentContactInfo] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState("");
  const [dependentRelationshipSpecify, setDependentRelationshipSpecify] = useState("");
  const [dependentHomeAddress, setDependentHomeAddress] = useState("");
  const [dependentBarangay, setDependentBarangay] = useState("");
  const [dependentRegion, setDependentRegion] = useState("");
  const [dependentProvince, setDependentProvince] = useState("");
  const [dependentCity, setDependentCity] = useState("");
  const [dependentErrors, setDependentErrors] = useState<ValidationErrors>({});


  // Dropdown options
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);            // objects (PSGC)
  const [provinces, setProvinces] = useState<any[]>([]);        // objects
  const [cities, setCities] = useState<any[]>([]);              // objects
  ///const [barangays, setBarangays] = useState<any[]>([]);        // objects

  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependantBarangays, setDependantBarangays] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fingerprint enrollment state
  const [showFingerprintEnrollment, setShowFingerprintEnrollment] = useState(false);
  const [currentFingerprintId, setCurrentFingerprintId] = useState<number | null>(null);

  // psgc contexts
  const [regionCode, setRegionCode] = useState("");
const [provinceCode, setProvinceCode] = useState("");
const [cityCode, setCityCode] = useState("");

  //active tab
  const [activeTab, setActiveTab] = useState("personal");

  /* ---------- Fetch employee details ---------- */
  useEffect(() => {
    if (isOpen && id) fetchEmployee(id);
    setActiveTab("personal");
  }, [isOpen, id]);

  const fetchEmployee = async (empId: number) => {
    try {
      const res = await employeeApi.getById(empId);
      if (res.success && res.data) {
        setEmployee(res.data);
        setFirstName(res.data.first_name);
        setMiddleName(res.data.middle_name || "");
        setLastName(res.data.last_name);
        setExtensionName(res.data.extension_name || "");
        setDepartmentId(res.data.department_id);
        setPositionId(res.data.position_id);
          setSupervisorId(res.data.supervisor_id || null);
          // shift removed - keep existing state untouched

          // Salary and employment type: prefer canonical fields if present
          const empType = (res.data.employment_type) ? res.data.employment_type : (res.data.monthly_salary ? 'regular' : (res.data.hourly_rate ? 'probationary' : null));
          setEmploymentType(empType);

          const cs = res.data.current_salary ?? res.data.monthly_salary ?? res.data.hourly_rate ?? res.data.salary;
          setSalary(cs !== undefined && cs !== null ? String(cs) : "");
          const unit = res.data.salary_unit || (empType === 'regular' ? 'monthly' : 'hourly');
          setSalaryDisplay(cs ? `${cs} / ${unit === 'monthly' ? 'month' : 'hr'}` : "");
        setHomeAddress(res.data.home_address || "");
        setBarangay(res.data.barangay || ""); 
        setCity(res.data.city || "");
        setRegion(res.data.region || "");
        setProvince(res.data.province || "");
        setBarangay(res.data.barangay || "");
        setCivilStatus(formatCivilStatusForDisplay(res.data.civil_status));
        setEmploymentStatus(formatStatusForDisplay(res.data.status));

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

        // Set fingerprint ID
        setCurrentFingerprintId(res.data.fingerprint_id || null);
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

  // Auto-populate salary and employment type when position changes
  useEffect(() => {
    if (positionId && positions.length > 0) {
      const selected = positions.find((p) => p.position_id === positionId);
      if (selected) {
        const def = (selected as any).default_salary;
        const unit = (selected as any).salary_unit || (((selected as any).employment_type === 'regular') ? 'monthly' : 'hourly');
        const empType = (selected as any).employment_type || (unit === 'monthly' ? 'regular' : 'probationary');
        if (def != null) {
          setSalary(String(def));
          setSalaryDisplay(`${def} / ${unit === 'monthly' ? 'month' : 'hr'}`);
        }
        setEmploymentType(empType);
      }
    }
  }, [positionId, positions]);

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
      const result = await employeeApi.getAll({
        department_id: deptId,
        role: "supervisor",
        status: "active",
        exclude_employee_id: id || "",
      });
      if (result.success && result.data) {
        setSupervisors(result.data);
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

  const checkDepartmentSupervisor = async (
    deptId: number
  ): Promise<boolean> => {
    try {
      const res = await employeeApi.getAll({
        department_id: deptId,
        role: "supervisor",
        exclude_employee_id: id || "",
      });
      if (res.success && res.data) {
        return res.data.length > 0;
      }
      return false;
    } catch (error) {
      console.error("Error checking department supervisor:", error);
      return false;
    }
  };


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
        console.log(processedData);

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

  // --- DEPENDENT ADDRESS LOGIC (Repeat of above structure) ---

  // 5. Update dependent provinces
  useEffect(() => {
    if (dependentRegion) {
      const selectedRegion = phLocationsData.find((r: any) => r.name === dependentRegion);
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map((p: any) => p.name);
        setDependentProvinces(provinceNames);
        setDependentCities([]);
        setDependantBarangays([]);
      }
    } else {
      setDependentProvinces([]);
      setDependentCities([]);
      setDependantBarangays([]);
    }
  }, [dependentRegion, phLocationsData]);

  // 6. Update dependent cities
  useEffect(() => {
    if (dependentRegion && dependentProvince) {
      const selectedRegion = phLocationsData.find((r: any) => r.name === dependentRegion);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.name === dependentProvince);
        if (selectedProvince) {
          setDependentCities(selectedProvince.cities.map((c: any) => c.name));
          setDependantBarangays([]);
        }
      }
    } else {
      setDependentCities([]);
      setDependantBarangays([]);
    }
  }, [dependentRegion, dependentProvince, phLocationsData]);

  // 7. Load Dependent Barangays
  useEffect(() => {
    if (dependentRegion && dependentProvince && dependentCity && phLocationsData.length > 0) {
      const r = phLocationsData.find((x: any) => x.name === dependentRegion);
      const p = r?.provinces.find((x: any) => x.name === dependentProvince);
      const c = p?.cities.find((x: any) => x.name === dependentCity);
      
      if (c && c.barangays) {
        setDependantBarangays(c.barangays.map((b: any) => b.name));
      } else {
        setDependantBarangays([]);
      }
    } else {
      setDependantBarangays([]);
    }
  }, [dependentRegion, dependentProvince, dependentCity, phLocationsData]);





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

    // Validate employee form - NOW INCLUDING PROVINCE
    const formErrors = validateEmployeeForm(
      firstName,
      middleName,
      lastName,
      extensionName,
      departmentId,
      positionId,
      employmentStatus,
      homeAddress,
      barangay,
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

    const allErrors = { ...roleErrors, ...formErrors };

    if (Object.keys(allErrors).length > 0 || !employee) {
      setErrors(allErrors);
      console.log("Validation failed or no employee");

      const uniqueErrors = Array.from(new Set(Object.values(allErrors)));
      toast.error(
        <div>
          <p className="font-bold">Employee Form Errors:</p>
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
        first_name: firstName,
        middle_name: middleName.trim() || null,
        last_name: lastName,
        extension_name: extensionName.trim() || null,
        department_id: departmentId,
        position_id: positionId,
        supervisor_id: supervisorId || null,
        // shift removed intentionally
        home_address: homeAddress,
        barangay: barangay,
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

      // Include salary and employment type if provided
      let numericSalary: number | null = null;
      if (salary !== undefined && salary !== null && String(salary).trim() !== "") {
        numericSalary = Number(String(salary).replace(/,/g, ""));
        if (!Number.isNaN(numericSalary)) {
          updatedData.current_salary = numericSalary;
        } else {
          numericSalary = null;
        }
      }

      if (employmentType) {
        updatedData.employment_type = employmentType.toLowerCase();
        if (numericSalary != null) {
          if (employmentType.toLowerCase() === 'regular') {
            updatedData.monthly_salary = numericSalary;
            updatedData.salary_unit = 'monthly';
          } else {
            updatedData.hourly_rate = numericSalary;
            updatedData.salary_unit = 'hourly';
          }
        }
      }

      const normalizedStatus = normalizeStatusForPayload(employmentStatus);
      if (normalizedStatus) {
        updatedData.status = normalizedStatus;
      }

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

  // Reusable validation function
  const validateName = (
    value: string,
    setValue: (v: string) => void,
    maxLength: number = 50 // default limit = 50
  ) => {
    // Allow only letters, spaces, apostrophes, and hyphens, and limit to maxLength
    if (/^[A-Za-z\s'-]*$/.test(value) && value.length <= maxLength) {
      setValue(value);
    }
  };

  const validateExtension = (
    value: string,
    setValue: (v: string) => void,
    maxLength: number = 10
  ) => {
    if (/^[A-Za-z0-9\s.'-]*$/.test(value) && value.length <= maxLength) {
      setValue(value);
    }
  };

  // salary is used directly as the editable "salary" value (treated as per-hour here)

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
        className="bg-[#fdf3e2] w-full max-w-7xl p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[90vh]"
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
          {firstName} {middleName} {lastName}
        </p>

        {/* INSERT TABS HERE */}
        <div className="flex flex-wrap gap-2 border-b border-gray-300 mb-6 ">
          {[
            { id: "personal", label: "Personal Information" },
            { id: "job", label: "Job Information" },
            { id: "address", label: "Address Information" },
            { id: "contact", label: "Contact Information" },
            { id: "dependent", label: "Dependent Information" },
            { id: "roles", label: "User Roles" },
            { id: "fingerprint", label: "Fingerprint Registration" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer transition-all whitespace-nowrap
          ${activeTab === tab.id
                  ? "border-[#4b0b14] text-[#4b0b14]"
                  : "border-transparent text-gray-500 hover:text-[#4b0b14]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {employee ? (
          <div>
            <div className="space-y-10">

              {/* ========================== PERSONAL INFORMATION ========================== */}
              {activeTab === "personal" && (
                <section>
                  <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">
                    Personal Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormInput
                      label="First Name"
                      type="text"
                      value={firstName}
                      onChange={(e) => validateName(e.target.value, setFirstName)}
                      error={errors.firstName}
                    />

                    <FormInput
                      label="Middle Name"
                      type="text"
                      value={middleName}
                      onChange={(e) => validateName(e.target.value, setMiddleName)}
                      placeholder="(optional)"
                    />

                    <FormInput
                      label="Last Name"
                      type="text"
                      value={lastName}
                      onChange={(e) => validateName(e.target.value, setLastName)}
                      error={errors.lastName}
                    />

                    <FormInput
                      label="Extension Name"
                      type="text"
                      value={extensionName}
                      onChange={(e) => validateExtension(e.target.value, setExtensionName)}
                      placeholder="JR., SR., II, etc. (optional)"
                    />

                    <FormSelect
                      label="Civil Status"
                      value={civilStatus}
                      onChange={(e) => setCivilStatus(e.target.value)}
                      options={["Single", "Married", "Widowed", "Divorced"]}
                      error={errors.civilStatus}
                    />
                  </div>
                </section>
              )}

              {/* ========================== JOB INFORMATION ========================== */}
              {activeTab === "job" && (
                <section>
                  <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">
                    Job Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Department */}
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
                        <p className="text-red-500 text-xs mt-1">{errors.department}</p>
                      )}
                    </div>

                    {/* Position */}
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

                    {/* Supervisor */}
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
                        className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c] focus:ring-2 focus:ring-[#4b0b14] disabled:opacity-50"
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

                    {/* Shift input removed per request */}

                    {salaryDisplay && (
                      <div className="md:col-span-3 mt-2">
                        <div className="text-sm text-[#3b2b1c]">Salary Preview:</div>
                        <div className="mt-1 inline-block px-3 py-2 bg-white border rounded-lg text-[#3b2b1c] font-semibold">
                          {salaryDisplay}
                        </div>
                      </div>
                    )}

                    <FormSelect
                      label="Employment Status"
                      value={employmentStatus}
                      onChange={(e) => {
                        setEmploymentStatus(e.target.value);
                        setErrors((prev) => ({ ...prev, employmentStatus: "" }));
                      }}
                      options={[...STATUS_OPTIONS]}
                      error={errors.employmentStatus}
                    />

                    {/* Salary (per hour) - fetched as-is and editable */}
                    <div>
                      <FormInput
                        label="Salary (per hour)"
                        type="text"
                        value={salary}
                        onChange={(e) => {
                          const val = e.target.value;
                          // allow digits, commas and dot (no conversion requested)
                          if (/^[0-9,]*\.?[0-9]{0,2}$/.test(val) || val === "") {
                            setSalary(val);
                          }
                        }}
                        placeholder="Enter hourly salary as stored"
                        error={errors.salary}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* ========================== ADDRESS INFORMATION ========================== */}
              {activeTab === "address" && (
                <section>
                  <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">
                    Address Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    <FormInput
                      label="Home Address"
                      type="text"
                      value={homeAddress}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 100) setHomeAddress(value);
                      }}
                      error={errors.homeAddress}
                    />

                    <FormSelect
                      label="Region"
                      value={region}       // region = CODE only ("010000000")
                      onChange={(e) => {
                        setRegion(e.target.value);
                        setProvince("");
                        setCity("");
                      }}
                      options={regions}    // [{code, name}, ...]
                      error={errors.region}
                    />

                    <FormSelect
                      label="Province"
                      value={province}     // province = CODE only
                      onChange={(e) => {
                        setProvince(e.target.value);
                        setCity("");
                      }}
                      options={provinces}  // [{code, name}, ...]
                      error={errors.province}
                    />
                    
                    <FormSelect
                      label="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      options={cities}     // [{code, name}, ...]
                      error={errors.city}
                    />
                    <FormSelect
                      label="Barangay"
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      options={barangays}  // [{code, name}]
                      error={errors.barangay}
                    />


                  </div>
                </section>
              )}
            </div>

            {/*============ Contact Tab ============== */}
            {activeTab === "contact" && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">
                  Contact Information
                </h2>

                {/* Email Addresses Section */}
                <div className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">
                    Email Addresses
                  </h3>
                  {errors.emails && (
                    <p className="text-red-500 text-sm mb-3">{errors.emails}</p>
                  )}
                  <div className="space-y-3">
                    {emails.map((emailItem, index) => (
                      <div
                        key={emailItem.id ?? `email-${index}`}
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
                          onClick={() =>
                            setEmails((prev) => prev.filter((_, i) => i !== index))
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
                        key={contactItem.id ?? `contact-${index}`}
                        className="flex gap-2 items-end"
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            value={contactItem.contact_number}
                            onChange={(e) =>
                              handleContactNumberChange(e, index, contactNumbers, setContactNumbers)
                            }
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
              </div>
            )}

            {/* ============= Dependents Section ============= */}
            {activeTab === "dependent" && (
              <div className="pt-6 mt-8">
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
                      placeholder="Phone number (required)"
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

                    <FormSelect
                      label="Barangay:"
                      value={dependentBarangay}
                      onChange={(e) => {
                        setDependentBarangay(e.target.value);
                        if (dependentErrors.barangay) {
                          setDependentErrors((prev) => ({ ...prev, barangay: "" }));
                        }
                      }}
                      options={dependantBarangays}
                      error={dependentErrors.barangay}
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
                        dependentBarangay,
                        dependentRegion,
                        dependentProvince,
                        dependentCity
                      );

                      if (Object.keys(newErrors).length > 0) {
                        setDependentErrors(newErrors);
                        const uniqueErrors = Array.from(new Set(Object.values(newErrors)));
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
            )}

            {/*================= Role Management Section ================= */}
            {activeTab === "roles" && (
              <div className="pt-6 mt-8">
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
                  <div className="mt-4">
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
                      // No sub-role configured: allow granting privileges without blocking the user.
                      <></>
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
            )}

            {/*================ Fingerprint Registration Section ================*/}
            {activeTab === "fingerprint" && (
              <div className="pt-6 mt-8">
                <h3 className="text-[#3b2b1c] font-semibold mb-4">Fingerprint Registration</h3>

                {currentFingerprintId ? (
                  <div className="bg-[#FFF2E0] p-4 rounded-lg border border-[#e6d2b5]">
                    <p className="text-sm text-[#3b2b1c]">
                      <span className="font-semibold">Current Fingerprint ID:</span> {currentFingerprintId}
                    </p>
                    <p className="text-xs text-[#6b5344] mt-1">
                      This employee has a registered fingerprint for attendance tracking.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-800 font-semibold">
                          No fingerprint registered
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          This employee doesn't have a fingerprint registered yet. Register one to enable fingerprint attendance.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFingerprintEnrollment(true)}
                        className="px-4 py-2 bg-[#8b7355] text-white rounded-lg hover:bg-[#6d5a43] transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        Register Fingerprint
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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

        {/* Fingerprint Enrollment Overlay */}

      </motion.div>


      {showFingerprintEnrollment && employee && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]"
          onClick={() => setShowFingerprintEnrollment(false)}
        >
          <div
            className="bg-white w-full max-w-xl p-8 rounded-2xl shadow-xl relative max-h-[90vh] overflow-y-auto animate-[fadeIn_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-[#3b2b1c] mb-4">
              Register Fingerprint
            </h2>

            <p className="text-gray-600 mb-6">
              Register a fingerprint for this employee to enable fingerprint-based attendance tracking.
            </p>

            <FingerprintEnrollment
              employeeId={employee.employee_id}
              onEnrollmentComplete={(fpId) => {
                setCurrentFingerprintId(fpId);
                setShowFingerprintEnrollment(false);
                toast.success("Fingerprint registered successfully!");

                setTimeout(() => {
                  if (id) fetchEmployee(id);
                }, 500);
              }}
              onSkip={() => {
                setShowFingerprintEnrollment(false);
              }}
            />
          </div>
        </div>
      )}


    </div>
  );
}