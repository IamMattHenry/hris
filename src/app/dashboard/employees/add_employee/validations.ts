export interface ValidationErrors {
  [key: string]: string;
}

export const validateStep1 = (
  firstName: string,
  lastName: string,
  birthDate: string,
  gender: string,
  civilStatus: string,
  homeAddress: string,
  city: string,
  region: string,
  province: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!firstName.trim()) errors.firstName = "First name is required";
  if (!lastName.trim()) errors.lastName = "Last name is required";
  if (!birthDate) errors.birthDate = "Birth date is required";
  if (!gender) errors.gender = "Gender is required";
  if (!civilStatus) errors.civilStatus = "Civil status is required";
  if (!homeAddress.trim()) errors.homeAddress = "Home address is required";
  if (!city) errors.city = "City is required";
  if (!region) errors.region = "Region is required";
  if (!province) errors.province = "Province is required";

  return errors;
};

/**
 * Validates Step 2 - Job Information
 * Checks: departmentId, positionId, hireDate, shift
 */
export const validateStep2 = (
  departmentId: number | null,
  positionId: number | null,
  hireDate: string,
  shift: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!departmentId) errors.department = "Department is required";
  if (!positionId) errors.position = "Position is required";

  if (!hireDate) {
    errors.hireDate = "Hire date is required";
  } else {
    const [year, month, day] = hireDate.split("-").map(Number);
    const selected = new Date(Date.UTC(year, month - 1, day)); // avoids local offset
    selected.setHours(0, 0, 0, 0);

    // Get today's date in Asia/Manila
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    today.setHours(0, 0, 0, 0);

    // Compare dates
    if (selected > today) {
      errors.hireDate = "Hire date cannot be in the future";
    }
  }

  if (!shift) errors.shift = "Shift is required";

  return errors;
};

export const validateStep3 = (
  email: string,
  contactNumber: string,
  dependents: any[]
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Email validation
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
    errors.email = "Email must be a valid Gmail address";
  }

  // Contact number validation
  if (!contactNumber.trim()) {
    errors.contactNumber = "Contact number is required";
  } else if (!/^(\+639|09)\d{9}$/.test(contactNumber.replace(/\s/g, ""))) {
    errors.contactNumber = "Invalid contact number format";
  }

  // Dependents validation - at least 1 required
  if (dependents.length === 0) {
    errors.dependents =
      "must have at least 1 dependent information is required";
  } else {
    dependents.forEach((dependent, index) => {
      // Validate dependent email if provided
      if (
        dependent.email &&
        !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(dependent.email.trim())
      ) {
        errors[`dependent_${index}_email`] =
          "Dependent email must be a valid Gmail address";
      }

      // Validate dependent contact info if provided
      if (
        dependent.contactInfo &&
        !/^(\+639|09)\d{9}$/.test(dependent.contactInfo.replace(/\s/g, ""))
      ) {
        // Allow other formats for contact info (not just phone)
        if (!/^[0-9\s\-\+\(\)]+$/.test(dependent.contactInfo)) {
          errors[`dependent_${index}_contact`] =
            "Dependent contact info format is invalid";
        }
      }
    });
  }

  return errors;
};

/**
 * Validates Step 4 - Authentication
 * Checks: username, password, confirmPassword, subRole (if admin)
 */
export const validateStep4 = (
  username: string,
  password: string,
  confirmPassword: string,
  grantAdminPrivilege: boolean,
  subRole: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!username.trim()) errors.username = "Username is required";

  // Password validation
  if (!password.trim()) {
    errors.password = "Password is required";
  } else {
    const passwordErrors = [];
    if (password.length < 6) passwordErrors.push("At least 6 characters long");
    if (!/[A-Z]/.test(password))
      passwordErrors.push("At least one uppercase letter");
    if (!/[a-z]/.test(password))
      passwordErrors.push("At least one lowercase letter");
    if (!/\d/.test(password)) passwordErrors.push("At least one number");
    if (!/[@$!%*?&]/.test(password))
      passwordErrors.push(
        "At least one special character (@, $, !, %, *, ?, &)"
      );
    if (passwordErrors.length > 0) errors.password = passwordErrors.join(", ");
  }

  // Confirm password validation
  if (!confirmPassword.trim()) {
    errors.confirmPassword = "Please confirm your password";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  // Sub-role validation for admin
  if (grantAdminPrivilege && !subRole) {
    errors.subRole = "Sub-role is required for admin privilege";
  }

  return errors;
};

/**
 * Validates dependent information when adding a new dependent
 * Checks: firstName, lastName, relationship, email (if provided), contactInfo (if provided)
 * At least one of email or contactInfo must be provided
 */
export const validateDependent = (
  firstName: string,
  lastName: string,
  relationship: string,
  email: string,
  contactInfo: string,
  relationshipSpecify: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Required fields
  if (!firstName.trim()) {
    errors.firstName = "First name is required";
  }
  if (!lastName.trim()) {
    errors.lastName = "Last name is required";
  }
  if (!relationship) {
    errors.relationship = "Relationship is required";
  }

  // At least one of email or contact info must be provided
  if (!email.trim() && !contactInfo.trim()) {
    errors.contactInfo = "Either email or contact number is required";
  }

  // Email validation if provided
  if (email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim())) {
    errors.email = "Must be a valid Gmail address";
  }

  // Contact info validation if provided
  if (
    contactInfo &&
    !/^(\+639|09)\d{9}$/.test(contactInfo.replace(/\s/g, ""))
  ) {
    errors.contactInfo =
      "Invalid format (must be 09XX XXX XXXX or +639XX XXX XXXX)";
  }

  // If relationship is "Other", require the specify field
  if (relationship === "Other" && !relationshipSpecify.trim()) {
    errors.relationshipSpecify = "Please specify the relationship";
  }

  return errors;
};

/**
 * Validates birth date - must be at least 20 years old
 */
export const validateBirthDate = (birthDateString: string): string => {
  const selectedDate = new Date(birthDateString);
  const today = new Date();
  const minAgeDate = new Date(
    today.getFullYear() - 20,
    today.getMonth(),
    today.getDate()
  );

  if (selectedDate > minAgeDate) {
    return "You must be older than 20 years old.";
  }

  return "";
};

/**
 * Validates email format (Gmail only)
 */
export const validateEmail = (email: string): boolean => {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
};

/**
 * Validates contact number format (Philippine format)
 */
export const validateContactNumber = (contactNumber: string): boolean => {
  return /^(\+639|09)\d{9}$/.test(contactNumber.replace(/\s/g, ""));
};

/**
 * Validates password strength
 */
export const validatePasswordStrength = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 6) errors.push("At least 6 characters long");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
  if (!/\d/.test(password)) errors.push("At least one number");
  if (!/[@$!%*?&]/.test(password))
    errors.push("At least one special character (@, $, !, %, *, ?, &)");

  return errors;
};
