/* ---------- Interfaces ---------- */
export interface ContactEmail {
  email_id?: number;
  id?: string;
  email: string;
  isNew?: boolean;
}

export interface ContactNumber {
  contact_id?: number;
  id?: string;
  contact_number: string;
  isNew?: boolean;
}

export interface Dependent {
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

export interface ValidationErrors {
  [key: string]: string;
}

/* ---------- Validation Functions ---------- */

/**
 * Validates dependent information
 */
export const validateDependent = (
  firstName: string,
  lastName: string,
  relationship: string,
  email: string,
  contactInfo: string,
  relationshipSpecify: string,
  homeAddress: string,
  region: string,
  province: string,
  city: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // --- Basic Info ---
  if (!firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!relationship) {
    errors.relationship = "Relationship is required";
  }

  if (relationship === "Other" && !relationshipSpecify.trim()) {
    errors.relationshipSpecify = "Please specify the relationship";
  }

  // --- Contact Info (NOW REQUIRED) ---
  if (!contactInfo.trim()) {
    errors.contactInfo = "Contact number is required";
  } else {
    const cleanNumber = contactInfo.replace(/\s/g, "");
    if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
      errors.contactInfo = "Invalid contact number format (09XXXXXXXXX or +639XXXXXXXXX)";
    }
  }

  // --- Email (optional but must be valid if filled) ---
  if (email.trim() && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
    errors.email = "Must be a valid Gmail address";
  }

  // --- Address Section (required) ---
  if (!homeAddress.trim()) {
    errors.homeAddress = "Home address is required";
  }

  if (!region.trim()) {
    errors.region = "Region is required";
  }

  if (!province.trim()) {
    errors.province = "Province is required";
  }

  if (!city.trim()) {
    errors.city = "City is required";
  }

  return errors;
};

/**
 * Validates email addresses
 */
export const validateEmails = (emails: ContactEmail[]): string | null => {
  const validEmails = emails.filter((e) => e.email && e.email.trim());

  if (validEmails.length === 0) {
    return "At least one email is required";
  }

  for (const emailItem of validEmails) {
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailItem.email.trim())) {
      return "All emails must be valid Gmail addresses";
    }
  }

  return null;
};

/**
 * Validates contact numbers
 */
export const validateContactNumbers = (
  contactNumbers: ContactNumber[]
): string | null => {
  const validContacts = contactNumbers.filter(
    (c) => c.contact_number && c.contact_number.trim()
  );

  if (validContacts.length === 0) {
    return "At least one contact number is required";
  }

  for (const contactItem of validContacts) {
    const cleanNumber = contactItem.contact_number.replace(/\s/g, "");
    if (!/^(\+639|09)\d{9}$/.test(cleanNumber)) {
      return "Invalid contact number format";
    }
  }

  if (validContacts.length > 5) {
    return "Maximum of 5 contact numbers allowed";
  }

  return null;
};

/**
 * Validates employee form data
 */
export const validateEmployeeForm = (
  firstName: string,
  lastName: string,
  departmentId: number | null,
  positionId: number | null,
  shift: string,
  homeAddress: string,
  city: string,
  region: string,
  province: string,
  civilStatus: string,
  emails: ContactEmail[],
  contactNumbers: ContactNumber[],
  dependents: Dependent[]
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Basic fields validation
  if (!firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  if (!departmentId) {
    errors.department = "Department is required";
  }

  if (!positionId) {
    errors.position = "Position is required";
  }

  if (!shift) {
    errors.shift = "Shift is required";
  }

  if (!homeAddress.trim()) {
    errors.homeAddress = "Home address is required";
  }

  if (!region) {
    errors.region = "Region is required";
  }

  if (!province) {
    errors.province = "Province is required";
  }

  if (!city) {
    errors.city = "City is required";
  }

  if (!civilStatus) {
    errors.civilStatus = "Civil status is required";
  }

  // Email validation
  const emailError = validateEmails(emails);
  if (emailError) {
    errors.emails = emailError;
  }

  // Contact number validation
  const contactError = validateContactNumbers(contactNumbers);
  if (contactError) {
    errors.contactNumbers = contactError;
  }

  // Dependents validation
  if (dependents.length === 0) {
    errors.dependents = "At least one dependent is required";
  }

  return errors;
};

/**
 * Validates role management (admin/supervisor privileges)
 */
export const validateRoleManagement = (
  grantAdminPrivilege: boolean,
  grantSupervisorPrivilege: boolean,
  subRole: string,
  departmentId: number | null,
  validSubRoles: string[],
  departmentName?: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if ((grantAdminPrivilege || grantSupervisorPrivilege) && !subRole) {
    errors.subRole =
      "Sub-role is required when granting admin or supervisor privilege";
    return errors;
  }

  if (
    (grantAdminPrivilege || grantSupervisorPrivilege) &&
    departmentId &&
    subRole
  ) {
    const normalizedSubRole = subRole.toLowerCase();
    const isValid = validSubRoles.some(
      (role) => role.toLowerCase() === normalizedSubRole
    );

    if (!isValid) {
      errors.subRole = `${departmentName} department employees can only have '${validSubRoles[0]?.toLowerCase()}' as sub_role.`;
    }
  }

  return errors;
};

/**
 * Formats Philippine phone numbers
 */
export const formatPhoneNumber = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, "");
  let formatted = digitsOnly;

  if (digitsOnly.startsWith("63")) {
    formatted = `+${digitsOnly.slice(0, 2)} ${digitsOnly.slice(
      2,
      5
    )} ${digitsOnly.slice(5, 8)} ${digitsOnly.slice(8, 12)}`.trim();
  } else if (digitsOnly.startsWith("09")) {
    formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(
      4,
      7
    )} ${digitsOnly.slice(7, 11)}`.trim();
  }

  return formatted;
};

/**
 * Generates unique client-side ID
 */
export const generateClientId = (): string => {
  return `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 100000)
    .toString(36)
    .padStart(2, "0")}`;
};