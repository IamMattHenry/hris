"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { departmentApi, positionApi, employeeApi, fingerprintApi, rbacApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  validateEmployeeForm,
  validateDependent,
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

  if (normalized === "on leave") {
    return "on-leave";
  }

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

interface EmployeeDocuments {
  document_id?: number;
  employee_id: number;
  sss: boolean;
  pagIbig: boolean;
  tin: boolean;
  philhealth: boolean;
  cedula: boolean;
  birthCert: boolean;
  policeClearance: boolean;
  barangayClearance: boolean;
  medicalCert: boolean;
  others: boolean;
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
  documents?: EmployeeDocuments;
  role?: string;
  user_id?: number;
  department_name?: string;
  position_name?: string;
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
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const canAssignRoles = can("roles.assign");
  const [employee, setEmployee] = useState<EmployeeData | null>(null);

  const [employeeRbacRoles, setEmployeeRbacRoles] = useState<string[]>([]);
  const [rbacTogglingRoles, setRbacTogglingRoles] = useState<Set<string>>(new Set());

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [supervisorId, setSupervisorId] = useState<number | null>(null);
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [salaryDisplay, setSalaryDisplay] = useState<string>("");
  const [workType, setWorkType] = useState<string>("");
  const [scheduledDays, setScheduledDays] = useState<string[]>([]);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>("");
  const [scheduledEndTime, setScheduledEndTime] = useState<string>("");
  const [homeAddress, setHomeAddress] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [originalBarangay, setOriginalBarangay] = useState<string>("");
  const [civilStatus, setCivilStatus] = useState("");
  const [barangays, setBarangays] = useState<string[]>([]);
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [emails, setEmails] = useState<ContactEmail[]>([]);
  const [contactNumbers, setContactNumbers] = useState<ContactNumber[]>([]);

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

  // Documents state
  const DOCUMENTS = [
    { key: "sss", label: "SSS" },
    { key: "pagIbig", label: "PAG-IBIG" },
    { key: "tin", label: "TIN ID" },
    { key: "philhealth", label: "PHILHEALTH" },
    { key: "cedula", label: "CEDULA" },
    { key: "birthCert", label: "BIRTH CERTIFICATE" },
    { key: "policeClearance", label: "POLICE CLEARANCE" },
    { key: "barangayClearance", label: "BARANGAY CLEARANCE" },
    { key: "medicalCert", label: "MEDICAL CERTIFICATE" },
    { key: "others", label: "OTHERS" }
  ] as const;

  const [documents, setDocuments] = useState<Record<string, boolean>>(
    Object.fromEntries(DOCUMENTS.map(doc => [doc.key, false]))
  );

  // Dropdown options
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependantBarangays, setDependantBarangays] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fingerprint enrollment state
  const [showFingerprintEnrollment, setShowFingerprintEnrollment] = useState(false);
  const [currentFingerprintId, setCurrentFingerprintId] = useState<number | null>(null);

  // psgc contexts (unused but kept for compatibility)
  const [regionCode, setRegionCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState("personal");

  const loadEmployeeRbacRoles = async (userId: number) => {
    try {
      const rbacRes = await rbacApi.getUserRoles(userId);
      if (rbacRes.success && Array.isArray(rbacRes.data)) {
        setEmployeeRbacRoles(rbacRes.data.map((r: any) => r.role_key));
      } else {
        setEmployeeRbacRoles([]);
      }
    } catch {
      setEmployeeRbacRoles([]);
    }
  };

  const updateEmployeeRole = async (roleKey: string, assign: boolean) => {
    if (!employee?.user_id) return;

    setRbacTogglingRoles((prev) => new Set(prev).add(roleKey));
    try {
      const result = assign
        ? await rbacApi.assignRole(employee.user_id, roleKey)
        : await rbacApi.revokeRole(employee.user_id, roleKey);

      if (result.success) {
        setEmployeeRbacRoles((prev) => {
          if (assign) {
            if (prev.includes(roleKey)) return prev;
            return [...prev, roleKey];
          }
          return prev.filter((k) => k !== roleKey);
        });
        const action = assign ? "assigned" : "revoked";
        toast.success(`Role "${ROLE_LABELS[roleKey] || roleKey}" ${action}`);
      } else {
        toast.error(result.message || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setRbacTogglingRoles((prev) => {
        const next = new Set(prev);
        next.delete(roleKey);
        return next;
      });
    }
  };

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

        const empType = (res.data.employment_type) ? res.data.employment_type : (res.data.monthly_salary ? 'regular' : (res.data.hourly_rate ? 'probationary' : null));
        setEmploymentType(empType);

        const cs = res.data.current_salary ?? res.data.monthly_salary ?? res.data.hourly_rate ?? res.data.salary;
        setSalary(cs !== undefined && cs !== null ? String(cs) : "");
        const unit = res.data.salary_unit || (empType === 'regular' ? 'monthly' : 'hourly');
        setSalaryDisplay(cs ? `${cs} / ${unit === 'monthly' ? 'month' : 'hr'}` : "");

        const wt = (res.data.work_type || 'full-time').toLowerCase();
        setWorkType(wt === 'part-time' ? 'Part-time' : 'Full-time');

        try {
          let days: any = res.data.scheduled_days;
          if (typeof days === 'string') days = JSON.parse(days);
          const dd = Array.isArray(days) ? days.map((d: any) => String(d).toLowerCase()) : [];
          setScheduledDays(dd);
        } catch {
          setScheduledDays([]);
        }
        const normTime = (t?: string | null) => (t && t.length >= 5 ? t.slice(0,5) : "");
        setScheduledStartTime(normTime(res.data.scheduled_start_time));
        setScheduledEndTime(normTime(res.data.scheduled_end_time));

        setHomeAddress(res.data.home_address || "");
        setCity(res.data.city || "");
        setRegion(res.data.region || "");
        setProvince(res.data.province || "");
        setOriginalBarangay(res.data.barangay || "");
        setCivilStatus(formatCivilStatusForDisplay(res.data.civil_status));
        setEmploymentStatus(formatStatusForDisplay(res.data.status));

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

        if (res.data.contact_numbers && Array.isArray(res.data.contact_numbers)) {
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

        if (res.data.documents) {
          setDocuments({
            sss: res.data.documents.sss || false,
            pagIbig: res.data.documents.pagIbig || false,
            tin: res.data.documents.tin || false,
            philhealth: res.data.documents.philhealth || false,
            cedula: res.data.documents.cedula || false,
            birthCert: res.data.documents.birthCert || false,
            policeClearance: res.data.documents.policeClearance || false,
            barangayClearance: res.data.documents.barangayClearance || false,
            medicalCert: res.data.documents.medicalCert || false,
            others: res.data.documents.others || false,
          });
        } else {
          setDocuments(Object.fromEntries(DOCUMENTS.map(doc => [doc.key, false])));
        }

        setCurrentFingerprintId(res.data.fingerprint_id || null);

        if (res.data.user_id && canAssignRoles) {
          await loadEmployeeRbacRoles(res.data.user_id);
        } else {
          setEmployeeRbacRoles([]);
        }
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

  useEffect(() => {
    if (!isOpen || !canAssignRoles || !employee?.user_id) return;
    loadEmployeeRbacRoles(employee.user_id);
  }, [isOpen, canAssignRoles, employee?.user_id]);

  // Default schedule based on work type
  useEffect(() => {
    const wt = (workType || '').toLowerCase();
    if (wt === 'full-time' && scheduledDays.length === 0) {
      setScheduledDays(['monday','tuesday','wednesday','thursday','friday']);
    } else if (wt === 'part-time' && scheduledDays.length === 0) {
      setScheduledDays([]);
    }
  }, [workType]);

  // Auto-calc end time for full-time
  useEffect(() => {
    const wt = (workType || '').toLowerCase();
    if (wt !== 'full-time') return;
    if (!scheduledStartTime) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const calcEnd = (start: string) => {
      const [hh, mm] = start.split(':').map((x) => parseInt(x || '0', 10));
      const totalMin = (hh * 60 + mm + 9 * 60) % (24 * 60);
      const nh = Math.floor(totalMin / 60);
      const nm = totalMin % 60;
      return `${pad(nh)}:${pad(nm)}`;
    };
    setScheduledEndTime(calcEnd(scheduledStartTime));
  }, [workType, scheduledStartTime]);

  // Auto-populate salary when position changes
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

  /* ---------- Philippine Locations ---------- */
  useEffect(() => {
    async function loadPhLocationsData() {
      try {
        const res = await fetch("/data/ph_locations.json");
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

        const rawData = await res.json();

        const processedData = rawData.map((region: any) => {
          let finalProvinces = region.provinces.map((prov: any) => ({
            name: prov.name,
            cities: prov.cities.map((city: any) => ({
              name: city.name,
              barangays: city.barangays.map((b: any) => ({ name: b.name }))
            }))
          }));

          if (region.cities && region.cities.length > 0) {
            const directCities = region.cities.map((city: any) => ({
              name: city.name,
              barangays: city.barangays.map((b: any) => ({ name: b.name }))
            }));

            const dummyProvinceName = region.name === "NCR" ? "Metro Manila" : "Independent Cities";
            finalProvinces.push({ name: dummyProvinceName, cities: directCities });
          }

          return { name: region.name, provinces: finalProvinces };
        });

        setPhLocationsData(processedData);
        setRegions(processedData.map((r: any) => r.name));
      } catch (error) {
        console.error("Error loading PH locations:", error);
        setRegions([]);
      }
    }
    loadPhLocationsData();
  }, []);

  // Update provinces when region changes (Home)
  useEffect(() => {
    if (region) {
      const selectedRegion = phLocationsData.find((r: any) => r.name === region);
      if (selectedRegion) {
        const provinceNames = selectedRegion.provinces.map((p: any) => p.name);
        setProvinces(provinceNames);
        setCities([]);
        setBarangays([]);
      }
    } else {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  }, [region, phLocationsData]);

  // Update cities when province changes (Home)
  useEffect(() => {
    if (region && province) {
      const selectedRegion = phLocationsData.find((r: any) => r.name === region);
      if (selectedRegion) {
        const selectedProvince = selectedRegion.provinces.find((p: any) => p.name === province);
        if (selectedProvince) {
          setCities(selectedProvince.cities.map((c: any) => c.name));
          setBarangays([]);
        }
      }
    } else {
      setCities([]);
      setBarangays([]);
    }
  }, [region, province, phLocationsData]);

  // Load Barangays (Home)
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

  // Sync original barangay
  useEffect(() => {
    if (originalBarangay && barangays.length > 0) {
      if (barangays.includes(originalBarangay)) {
        setBarangay(originalBarangay);
        setOriginalBarangay("");
        return;
      }
      const lowerOrig = originalBarangay.trim().toLowerCase();
      const match = barangays.find(b => b.trim().toLowerCase() === lowerOrig);
      if (match) {
        setBarangay(match);
        setOriginalBarangay("");
      }
    }
  }, [barangays, originalBarangay]);

  // Dependent address logic (identical structure)
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

  /* ---------- Helpers ---------- */
  const handleDependentContactInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    let value = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (value.length > 0 && !value.startsWith("09")) value = "09" + value.slice(2);
    if (value.length > 7) value = value.replace(/^(\d{4})(\d{3})(\d{0,4}).*/, "$1 $2 $3");
    else if (value.length > 4) value = value.replace(/^(\d{4})(\d{0,3}).*/, "$1 $2");

    const updated = [...contactNumbers];
    updated[index].contact_number = value;
    setContactNumbers(updated);
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async () => {
    console.log("Save Changes clicked");

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
      dependents,
      workType,
      scheduledDays,
      scheduledStartTime,
      scheduledEndTime
    );

    const allErrors = { ...formErrors };

    if (Object.keys(allErrors).length > 0 || !employee) {
      setErrors(allErrors);
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
        documents: documents,
        work_type: workType ? workType.toLowerCase() : undefined,
        scheduled_days: scheduledDays,
        scheduled_start_time: scheduledStartTime || undefined,
        scheduled_end_time: scheduledEndTime || undefined,
      };

      let numericSalary: number | null = null;
      if (salary !== undefined && salary !== null && String(salary).trim() !== "") {
        numericSalary = Number(String(salary).replace(/,/g, ""));
        if (!Number.isNaN(numericSalary)) {
          updatedData.current_salary = numericSalary;
        }
      }

      if (employmentType) {
        updatedData.employment_type = employmentType.toLowerCase();
      }

      if (numericSalary != null) {
        if ((workType || '').toLowerCase() === 'part-time') {
          updatedData.hourly_rate = numericSalary;
          updatedData.salary_unit = 'hourly';
        } else {
          updatedData.monthly_salary = numericSalary;
          updatedData.salary_unit = 'monthly';
        }
      }

      const normalizedStatus = normalizeStatusForPayload(employmentStatus);
      if (normalizedStatus) updatedData.status = normalizedStatus;

      console.log("Submitting update:", updatedData);
      const result = await employeeApi.update(employee.employee_id, updatedData);

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

  const validateName = (value: string, setValue: (v: string) => void, maxLength: number = 50) => {
    if (/^[A-Za-z\s'-]*$/.test(value) && value.length <= maxLength) {
      setValue(value);
    }
  };

  const validateExtension = (value: string, setValue: (v: string) => void, maxLength: number = 10) => {
    if (/^[A-Za-z0-9\s.'-]*$/.test(value) && value.length <= maxLength) {
      setValue(value);
    }
  };

  const selectedPositionName =
    positions.find((p) => p.position_id === positionId)?.position_name ||
    employee?.position_name ||
    "";

  const expectedHrRole = POSITION_TO_HR_ROLE[selectedPositionName.trim().toLowerCase()];
  const hasExpectedHrRole = expectedHrRole
    ? employeeRbacRoles.includes(expectedHrRole.key)
    : false;
  const hasSuperadminRole = employeeRbacRoles.includes("superadmin");
  const isCurrentUserSuperadmin =
    currentUser?.role === "superadmin" ||
    !!currentUser?.rbac_roles?.includes("superadmin");
  const isHrDepartment =
    !!employee?.department_name &&
    ["human resource", "human resources", "hr"].includes(
      employee.department_name.toLowerCase()
    );

  if (!isOpen) return null;

  /* ---------- JSX (Fully Responsive) ---------- */
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-[#fdf3e2] w-full max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-7xl p-6 sm:p-8 md:p-10 rounded-2xl shadow-lg relative text-[#3b2b1c] overflow-y-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#3b2b1c] hover:opacity-70"
        >
          <X size={26} />
        </button>

        <h2 className="text-2xl font-semibold mb-1">Edit Employee</h2>
        <p className="text-sm text-gray-600 mb-6 truncate">
          {firstName} {middleName} {lastName}
        </p>

        {/* Responsive Tabs – horizontal scroll on mobile */}
        <div className="flex overflow-x-auto border-b border-gray-300 mb-6 gap-2 pb-3 -mx-1 scrollbar-hide">
          {[
            { id: "personal", label: "Personal Information" },
            { id: "job", label: "Job Information" },
            { id: "address", label: "Address Information" },
            { id: "contact", label: "Contact Information" },
            { id: "dependent", label: "Dependent Information" },
            { id: "documents", label: "Documents" },
            { id: "fingerprint", label: "Fingerprint Registration" },
            ...(canAssignRoles && isHrDepartment ? [{ id: "hr-roles", label: "HR Roles" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-all flex-shrink-0
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
          <div className="space-y-10">

            {/* ========================== PERSONAL INFORMATION ========================== */}
            {activeTab === "personal" && (
              <section>
                <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">Job Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <label className="block text-[#3b2b1c] mb-1 font-medium">Reports To (Supervisor)</label>
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
                  </div>

                  {salaryDisplay && (
                    <div className="sm:col-span-2 lg:col-span-3 mt-2">
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

                  <FormSelect
                    label="Work Type"
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    options={["Full-time", "Part-time"]}
                  />

                  <div>
                    <FormInput
                      label={workType?.toLowerCase() === 'part-time' ? "Salary (Hourly Rate)" : "Salary (Monthly)"}
                      type="text"
                      value={salary}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9,]*\.?[0-9]{0,2}$/.test(val) || val === "") {
                          setSalary(val);
                        }
                      }}
                      placeholder={workType?.toLowerCase() === 'part-time' ? "Enter hourly rate" : "Enter monthly salary"}
                      error={errors.salary}
                    />
                  </div>

                  {/* Schedule Days – full width */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-[#3b2b1c] mb-1 font-medium">Scheduled Days <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-3">
                      {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day) => {
                        const key = day.toLowerCase();
                        const checked = scheduledDays.includes(key);
                        return (
                          <label key={day} className="inline-flex items-center gap-2 text-sm text-[#3b2b1c]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setScheduledDays((prev) => {
                                  if (e.target.checked) return Array.from(new Set([...prev, key]));
                                  return prev.filter((d) => d !== key);
                                });
                              }}
                            />
                            {day}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule Times */}
                  <FormInput
                    label="Scheduled Start Time"
                    type="time"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                  />
                  <FormInput
                    label="Scheduled End Time"
                    type="time"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    disabled={(workType || '').toLowerCase() === 'full-time'}
                  />
                </div>
              </section>
            )}

            {/* ========================== ADDRESS INFORMATION ========================== */}
            {activeTab === "address" && (
              <section>
                <h2 className="text-lg font-semibold text-[#3b2b1c] mb-4">Address Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormInput
                    label="Home Address"
                    type="text"
                    value={homeAddress}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 100) setHomeAddress(value);
                    }}
                    error={errors.homeAddress}
                    className="sm:col-span-2 lg:col-span-3"
                  />

                  <FormSelect
                    label="Region"
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
                    label="Province"
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      setCity("");
                    }}
                    options={provinces}
                    error={errors.province}
                  />

                  <FormSelect
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    options={cities}
                    error={errors.city}
                  />

                  <FormSelect
                    label="Barangay"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    options={barangays}
                    error={errors.barangay}
                  />
                </div>
              </section>
            )}

            {/* ========================== CONTACT INFORMATION ========================== */}
            {activeTab === "contact" && (
              <div className="space-y-10">
                {/* Emails */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">Email Addresses</h3>
                  {errors.emails && <p className="text-red-500 text-sm mb-3">{errors.emails}</p>}
                  <div className="space-y-3">
                    {emails.map((emailItem, index) => (
                      <div key={emailItem.id ?? `email-${index}`} className="flex gap-2 items-end">
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
                    onClick={() => setEmails((prev) => [...prev, { id: generateClientId(), email: "" }])}
                    className="mt-3 px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80 text-sm"
                  >
                    + Add Another Email
                  </button>
                </div>

                {/* Contact Numbers */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#3b2b1c]">Contact Numbers</h3>
                  {errors.contactNumbers && <p className="text-red-500 text-sm mb-3">{errors.contactNumbers}</p>}
                  <div className="space-y-3">
                    {contactNumbers.map((contactItem, index) => (
                      <div key={contactItem.id ?? `contact-${index}`} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={contactItem.contact_number}
                            onChange={(e) => handleContactNumberChange(e, index, contactNumbers, setContactNumbers)}
                            placeholder="Enter contact number"
                            className="w-full px-3 py-2 border border-[#e6d2b5] rounded-lg bg-[#FFF2E0] text-[#3b2b1c]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setContactNumbers((prev) => prev.filter((_, i) => i !== index))}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:opacity-80"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setContactNumbers((prev) => [...prev, { id: generateClientId(), contact_number: "" }])}
                    className="mt-3 px-4 py-2 bg-[#3b2b1c] text-white rounded-lg hover:opacity-80 text-sm"
                  >
                    + Add Another Contact Number
                  </button>
                </div>
              </div>
            )}

            {/* ========================== DEPENDENT INFORMATION ========================== */}
            {activeTab === "dependent" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#3b2b1c] font-semibold">Employee Dependent Information <span className="text-red-500">*</span></h3>
                  <span className="text-xs text-[#6b5344]">({dependents.length} added)</span>
                </div>
                {errors.dependents && <p className="text-red-500 text-xs mb-4">{errors.dependents}</p>}

                {/* Add Dependent Form */}
                <div className="bg-[#FFF2E0] p-4 sm:p-6 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <FormInput label="First Name" type="text" value={dependentFirstName} onChange={(e) => setDependentFirstName(e.target.value)} error={dependentErrors.firstName} />
                    <FormInput label="Last Name" type="text" value={dependentLastName} onChange={(e) => setDependentLastName(e.target.value)} error={dependentErrors.lastName} />
                    <FormInput label="Email" type="email" value={dependentEmail} onChange={(e) => setDependentEmail(e.target.value)} error={dependentErrors.email} />
                    <FormInput label="Contact Info" type="text" value={dependentContactInfo} onChange={handleDependentContactInfoChange} error={dependentErrors.contactInfo} />
                    <FormSelect label="Relationship" value={dependentRelationship} onChange={(e) => setDependentRelationship(e.target.value)} options={["Spouse", "Child", "Parent", "Sibling", "Other"]} error={dependentErrors.relationship} />
                    {dependentRelationship === "Other" && (
                      <FormInput label="Specify Relationship" type="text" value={dependentRelationshipSpecify} onChange={(e) => setDependentRelationshipSpecify(e.target.value)} error={dependentErrors.relationshipSpecify} />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm py-4">
                    <div className="md:col-span-2">
                      <FormInput label="Home Address" type="text" value={dependentHomeAddress} onChange={(e) => setDependentHomeAddress(e.target.value)} error={dependentErrors.homeAddress} />
                    </div>
                    <FormSelect label="Region" value={dependentRegion} onChange={(e) => setDependentRegion(e.target.value)} options={regions} error={dependentErrors.region} />
                    <FormSelect label="Province" value={dependentProvince} onChange={(e) => setDependentProvince(e.target.value)} options={dependentProvinces} error={dependentErrors.province} />
                    <FormSelect label="City" value={dependentCity} onChange={(e) => setDependentCity(e.target.value)} options={dependentCities} error={dependentErrors.city} />
                    <FormSelect label="Barangay" value={dependentBarangay} onChange={(e) => setDependentBarangay(e.target.value)} options={dependantBarangays} error={dependentErrors.barangay} />
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
                        toast.error(
                          <div>
                            <p className="font-bold">Please fix the following errors:</p>
                            <ul className="list-disc pl-4 mt-1 text-sm">
                              {Array.from(new Set(Object.values(newErrors))).map((err: any, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
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
                        relationshipSpecify: dependentRelationshipSpecify || undefined,
                        homeAddress: dependentHomeAddress,
                        region: dependentRegion,
                        province: dependentProvince,
                        city: dependentCity,
                      };
                      setDependents([...dependents, newDependent]);
                      // Clear form
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
                    className="w-full px-4 py-3 bg-[#4b0b14] text-white rounded-lg hover:bg-[#6b0b1f] transition-colors font-semibold text-sm"
                  >
                    Add Dependent
                  </button>
                </div>

                {/* Added Dependents List */}
                {dependents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[#3b2b1c] font-semibold">Added Dependents:</h4>
                    {dependents.map((dependent) => (
                      <div key={dependent.id} className="bg-[#f5e6d3] p-4 rounded-lg border border-[#e6d2b5]">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-[#3b2b1c]">
                              {dependent.firstName} {dependent.lastName}
                            </p>
                            <p className="text-xs text-[#6b5344]">
                              Relationship: {dependent.relationship}
                              {dependent.relationshipSpecify && ` (${dependent.relationshipSpecify})`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDependents(dependents.filter((d) => d.id !== dependent.id))}
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
            )}

            {/* ========================== DOCUMENTS ========================== */}
            {activeTab === "documents" && (
              <div>
                <h3 className="text-[#3b2b1c] font-semibold mb-4">Document Checklist</h3>
                <p className="text-sm text-[#6b5344] mb-6">Check the documents that have been submitted by the employee.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DOCUMENTS.map((doc) => (
                    <div
                      key={doc.key}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        documents[doc.key] ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-300"
                      }`}
                      onClick={() => setDocuments({ ...documents, [doc.key]: !documents[doc.key] })}
                    >
                      <input
                        type="checkbox"
                        id={`doc-${doc.key}`}
                        checked={documents[doc.key]}
                        onChange={(e) => {
                          e.stopPropagation();
                          setDocuments({ ...documents, [doc.key]: e.target.checked });
                        }}
                        className="w-5 h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
                      />
                      <label
                        htmlFor={`doc-${doc.key}`}
                        className={`font-medium cursor-pointer select-none flex-1 ${documents[doc.key] ? "text-green-700" : "text-gray-600"}`}
                      >
                        {doc.label}
                      </label>
                      {documents[doc.key] && (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Note:</span> These checkboxes indicate which documents have been submitted by the employee.
                  </p>
                </div>
              </div>
            )}

            {/* ========================== HR ROLES ========================== */}
            {activeTab === "hr-roles" && canAssignRoles && isHrDepartment && (
              <div>
                <h3 className="text-[#3b2b1c] font-semibold mb-1">HR Portal Role Assignment</h3>
                <p className="text-sm text-[#6b5344] mb-6">Role suggestion is based on the employee&apos;s current position.</p>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-[#d9c2a8] bg-[#fff9f2]">
                    <p className="text-sm text-[#6b5344] mb-1">Detected Position</p>
                    <p className="font-semibold text-[#3b2b1c]">{selectedPositionName || "No position selected"}</p>
                  </div>

                  <div className={`p-4 rounded-lg border-2 ${expectedHrRole ? (hasExpectedHrRole ? "bg-green-50 border-green-300" : "bg-amber-50 border-amber-300") : "bg-gray-50 border-gray-200"}`}>
                    {expectedHrRole ? (
                      <>
                        <p className="font-semibold text-[#3b2b1c]">Expected Role: {expectedHrRole.label}</p>
                        <p className={`text-sm mt-1 ${hasExpectedHrRole ? "text-green-700" : "text-amber-700"}`}>
                          {hasExpectedHrRole ? "This employee is already assigned to the expected role." : "This employee is not yet assigned to the expected role."}
                        </p>
                        {!hasExpectedHrRole && (
                          <button
                            type="button"
                            disabled={rbacTogglingRoles.has(expectedHrRole.key)}
                            onClick={() => updateEmployeeRole(expectedHrRole.key, true)}
                            className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold bg-[#4b0b14] text-white hover:bg-[#6b0b1f] disabled:opacity-50"
                          >
                            {rbacTogglingRoles.has(expectedHrRole.key) ? "Assigning..." : "Assign Expected Role"}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-[#6b5344]">No mapped HR role for this position.</p>
                    )}
                  </div>

                  {isCurrentUserSuperadmin && ["hr manager", "hr supervisor"].includes(selectedPositionName.trim().toLowerCase()) && (
                    <div className={`p-4 rounded-lg border-2 ${hasSuperadminRole ? "bg-purple-50 border-purple-300" : "bg-gray-50 border-gray-200"}`}>
                      <p className="font-semibold text-[#3b2b1c]">Superadmin Access</p>
                      <button
                        type="button"
                        disabled={rbacTogglingRoles.has("superadmin")}
                        onClick={() => updateEmployeeRole("superadmin", !hasSuperadminRole)}
                        className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${hasSuperadminRole ? "bg-red-100 text-red-700" : "bg-[#4b0b14] text-white"}`}
                      >
                        {rbacTogglingRoles.has("superadmin")
                          ? "Updating..."
                          : hasSuperadminRole
                          ? "Revoke Superadmin"
                          : "Assign Superadmin"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================== FINGERPRINT ========================== */}
            {activeTab === "fingerprint" && (
              <div>
                <h3 className="text-[#3b2b1c] font-semibold mb-4">Fingerprint Registration</h3>
                {currentFingerprintId ? (
                  <div className="bg-[#FFF2E0] p-4 rounded-lg border border-[#e6d2b5]">
                    <p className="text-sm text-[#3b2b1c]">
                      <span className="font-semibold">Current Fingerprint ID:</span> {currentFingerprintId}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-yellow-800 font-semibold">No fingerprint registered</p>
                        <p className="text-xs text-yellow-700 mt-1">Register one to enable fingerprint attendance.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFingerprintEnrollment(true)}
                        className="px-4 py-2 bg-[#8b7355] text-white rounded-lg hover:bg-[#6d5a43] whitespace-nowrap"
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
          <p className="text-center text-gray-600 py-12">Loading employee details...</p>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#4b0b14] text-white px-8 py-3 rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Fingerprint Overlay */}
        {showFingerprintEnrollment && employee && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999] p-4"
            onClick={() => setShowFingerprintEnrollment(false)}
          >
            <div
              className="bg-white w-full max-w-xl p-6 sm:p-8 rounded-2xl shadow-xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-[#3b2b1c] mb-4">Register Fingerprint</h2>
              <p className="text-gray-600 mb-6">Register a fingerprint for attendance tracking.</p>

              <FingerprintEnrollment
                employeeId={employee.employee_id}
                onEnrollmentComplete={(fpId) => {
                  setCurrentFingerprintId(fpId);
                  setShowFingerprintEnrollment(false);
                  toast.success("Fingerprint registered successfully!");
                  setTimeout(() => id && fetchEmployee(id), 500);
                }}
                onSkip={() => setShowFingerprintEnrollment(false)}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const POSITION_TO_HR_ROLE: Record<string, { key: string; label: string }> = {
  "hr manager": { key: "hr_manager", label: "HR Manager" },
  "hr supervisor": { key: "hr_supervisor", label: "HR Supervisor" },
  "leave & attendance officer": { key: "leave_attendance_officer", label: "Leave & Attendance Officer" },
  "recruitment officer": { key: "recruitment_officer", label: "Recruitment Officer" },
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  hr_manager: "HR Manager",
  hr_supervisor: "HR Supervisor",
  leave_attendance_officer: "Leave & Attendance Officer",
  recruitment_officer: "Recruitment Officer",
};