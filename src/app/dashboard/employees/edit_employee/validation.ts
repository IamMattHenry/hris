/* ---------- Interfaces ---------- */
interface ContactEmail {
  email_id?: number;
  id?: string;
  email: string;
  isNew?: boolean;
}

interface ContactNumber {
  contact_id?: number;
  id?: string;
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

interface ValidationErrors {
  [key: string]: string;
}

/* ---------- Validation Functions ---------- */

/**
 * Validates employee basic information
 */
export function validateEmployeeBasicInfo(data: {
  firstName: string;
  lastName: string;
  departmentId: number | null;
  positionId: number | null;
  shift: string;
  homeAddress: string;
  city: string;
  region: string;
  civilStatus: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!data.departmentId) {
    errors.department = "Department is required";
  }

  if (!data.positionId) {
    errors.position = "Position is required";
  }

  if (!data.shift) {
    errors.shift = "Shift is required";
  }

  if (!data.homeAddress.trim()) {
    errors.homeAddress = "Home address is required";
  }

  if (!data.city) {
    errors.city = "City is required";
  }

  if (!data.region) {
    errors.region = "Region is required";
  }

  if (!data.civilStatus) {
    errors.civilStatus = "Civil status is required";
  }

  return errors;
}

/**
 * Validates email addresses
 */
export function validateEmails(emails: ContactEmail[]): ValidationErrors {
  const errors: ValidationErrors = {};

  const validEmails = emails.filter((e) => e.email && e.email.trim());

  if (validEmails.length === 0) {
    errors.emails = "At least one email is required";
    return errors;
  }

  // Validate each email format
  for (const emailItem of validEmails) {
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailItem.email.trim())) {
      errors.emails = "All emails must be valid Gmail addresses";
      break;
    }
  }

  return errors;
}

/**
 * Validates contact numbers
 */
export function validateContactNumbers(
  contactNumbers: ContactNumber[]
): ValidationErrors {
  const errors: ValidationErrors = {};

  const validContacts = contactNumbers.filter(
    (c) => c.contact_number && c.contact_number.trim()
  );

  if (validContacts.length === 0) {
    errors.contactNumbers = "At least one contact number is required";
    return errors;
  }

  if (validContacts.length > 5) {
    errors.contactNumbers = "Maximum of 5 contact numbers allowed";
    return errors;
  }

  // Validate each contact number format
  for (const contactItem of validContacts) {
    const cleanNumber = contactItem.contact_number.replace(/\s/g, "");
    if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
      errors.contactNumbers = "Invalid contact number format";
      break;
    }
  }

  return errors;
}

/**
 * Validates a single dependent
 */
export function validateDependent(data: {
  firstName: string;
  lastName: string;
  relationship: string;
  email: string;
  contactInfo: string;
  relationshipSpecify: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!data.relationship) {
    errors.relationship = "Relationship is required";
  }

  if (data.relationship === "Other" && !data.relationshipSpecify.trim()) {
    errors.relationshipSpecify = "Please specify the relationship";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(data.email.trim())) {
    errors.email = "Must be a valid Gmail address";
  }

  if (data.contactInfo.trim()) {
    const cleanNumber = data.contactInfo.replace(/\s/g, "");
    if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
      errors.contactInfo = "Invalid contact number format";
    }
  }

  return errors;
}

/**
 * Validates dependents array
 */
export function validateDependents(dependents: Dependent[]): ValidationErrors {
  const errors: ValidationErrors = {};

  if (dependents.length === 0) {
    errors.dependents = "At least one dependent is required";
  }

  return errors;
}

/**
 * Validates role and sub-role
 */
export function validateRole(data: {
  grantAdminPrivilege: boolean;
  grantSupervisorPrivilege: boolean;
  subRole: string;
  departmentId: number | null;
  validSubRoles: string[];
  departmentName?: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  // Check if sub-role is required
  if ((data.grantAdminPrivilege || data.grantSupervisorPrivilege) && !data.subRole) {
    errors.subRole =
      "Sub-role is required when granting admin or supervisor privilege";
    return errors;
  }

  // Validate sub-role against valid roles for department
  if (
    (data.grantAdminPrivilege || data.grantSupervisorPrivilege) &&
    data.departmentId &&
    data.subRole
  ) {
    const normalizedSubRole = data.subRole.toLowerCase();
    const isValid = data.validSubRoles.some(
      (role) => role.toLowerCase() === normalizedSubRole
    );

    if (!isValid) {
      errors.subRole = `${data.departmentName} department employees can only have '${data.validSubRoles[0]?.toLowerCase()}' as sub_role.`;
    }
  }

  return errors;
}

/**
 * Checks if department already has a supervisor
 */
export async function validateDepartmentSupervisor(
  departmentId: number,
  currentEmployeeId: number | null,
  checkSupervisorFn: (deptId: number) => Promise<boolean>
): Promise<ValidationErrors> {
  const errors: ValidationErrors = {};

  const hasSupervisor = await checkSupervisorFn(departmentId);
  if (hasSupervisor) {
    errors.supervisor =
      "This department already has a supervisor. Only one supervisor is allowed per department.";
  }

  return errors;
}

/**
 * Main validation function that combines all validations
 */
export function validateEmployeeUpdate(data: {
  firstName: string;
  lastName: string;
  departmentId: number | null;
  positionId: number | null;
  shift: string;
  homeAddress: string;
  city: string;
  region: string;
  civilStatus: string;
  emails: ContactEmail[];
  contactNumbers: ContactNumber[];
  dependents: Dependent[];
}): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate basic info
  Object.assign(errors, validateEmployeeBasicInfo(data));

  // Validate emails
  Object.assign(errors, validateEmails(data.emails));

  // Validate contact numbers
  Object.assign(errors, validateContactNumbers(data.contactNumbers));

  // Validate dependents
  Object.assign(errors, validateDependents(data.dependents));

  return errors;
}

/**
 * Formats contact number input (for frontend usage)
 */
export function formatContactNumber(input: string): string {
  let cleaned = input.replace(/\D/g, "");

  if (!cleaned.startsWith("09")) {
    cleaned = "";
  }

  if (cleaned.length > 11) {
    cleaned = cleaned.slice(0, 11);
  }

  let formatted = cleaned;
  if (cleaned.length > 4 && cleaned.length <= 7) {
    formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  } else if (cleaned.length > 7) {
    formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  return formatted;
}

/**
 * Formats dependent contact info (supports +63 and 09 formats)
 */
export function formatDependentContactInfo(input: string): string {
  let cleaned = input.replace(/\D/g, "");

  if (cleaned.length > 11) {
    cleaned = cleaned.slice(0, 11);
  }

  let formatted = cleaned;

  if (cleaned.startsWith("63")) {
    formatted = `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(
      5,
      8
    )} ${cleaned.slice(8, 12)}`.trim();
  } else if (cleaned.startsWith("09")) {
    formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(
      7,
      11
    )}`.trim();
  } else if (cleaned.startsWith("0") || cleaned.startsWith("6")) {
    // Allow typing "0" or "6" at the start
    formatted = cleaned;
  } else if (cleaned.length > 0) {
    // If they start typing something else, clear it
    formatted = "";
  }

  return formatted;
}

/**
 * Generates a unique client-side ID
 */
export function generateClientId(): string {
  return `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 100000)
    .toString(36)
    .padStart(2, "0")}`;
}

/**
 * Gets valid sub-roles for a department
 */
export function getValidSubRoles(
  departmentId: number | null,
  departments: Array<{ department_id: number; department_name: string }>
): string[] {
  if (!departmentId) return [];

  const dept = departments.find((d) => d.department_id === departmentId);
  if (!dept) return [];

  if (dept.department_name === "IT") {
    return ["IT"];
  } else if (dept.department_name === "Human Resources") {
    return ["HR"];
  } else if (dept.department_name === "Front Desk") {
    return ["Front Desk"];
  }

  return [];
}