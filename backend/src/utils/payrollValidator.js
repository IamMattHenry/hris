/**
 * Payroll Validation Engine
 * Implements comprehensive validation rules for Philippine payroll
 * per government regulations and system requirements
 */

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

/**
 * Error class for payroll validation failures
 */
export class PayrollValidationError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'PayrollValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Warning class for non-critical payroll issues
 */
export class PayrollValidationWarning {
  constructor(code, message, details = null) {
    this.code = code;
    this.message = message;
    this.details = details;
  }
}

/**
 * Validates SSS contribution amounts and rules
 */
export const validateSssContribution = (sssData) => {
  const errors = [];
  const warnings = [];

  if (!sssData) {
    return { errors, warnings };
  }

  // MSC must be within mandated range
  const { msc, clampedMonthlyCompensation } = sssData;
  
  if (msc < 5000 || msc > 35000) {
    warnings.push(new PayrollValidationWarning(
      'SSS_MSC_OUT_OF_RANGE',
      `SSS MSC ₱${msc} is outside recommended range (₱5,000-₱35,000). MSC was clamped to ₱${clampedMonthlyCompensation}.`,
      { msc, clampedMSC: clampedMonthlyCompensation }
    ));
  }

  // Employee share must be >= 0
  if (sssData.employeeShareMonthly < 0) {
    errors.push(new PayrollValidationError(
      'SSS_NEGATIVE_EMPLOYEE_SHARE',
      `SSS employee share cannot be negative: ₱${sssData.employeeShareMonthly}`
    ));
  }

  // Employer share must include EC
  if (!sssData.employerCompensationEC || (sssData.employerCompensationEC !== 10 && sssData.employerCompensationEC !== 30)) {
    errors.push(new PayrollValidationError(
      'SSS_EC_INVALID',
      `SSS EC must be ₱10 (below ₱14,750) or ₱30 (₱14,750+). Received: ₱${sssData.employerCompensationEC}`
    ));
  }

  return { errors, warnings };
};

/**
 * Validates PhilHealth contribution amounts and rules
 */
export const validatePhilHealthContribution = (philHealthData) => {
  const errors = [];
  const warnings = [];

  if (!philHealthData) {
    return { errors, warnings };
  }

  const MIN_EE = 250;
  const MAX_EE = 2500;

  const { employeeShareMonthly, employerShareMonthly, salaryBase } = philHealthData;

  // Min contribution check
  if (employeeShareMonthly < MIN_EE && salaryBase >= 10000) {
    errors.push(new PayrollValidationError(
      'PHILHEALTH_BELOW_MINIMUM_EE',
      `PhilHealth employee share ₱${employeeShareMonthly} is below minimum ₱${MIN_EE}`
    ));
  }

  // Max contribution check
  if (employeeShareMonthly > MAX_EE) {
    errors.push(new PayrollValidationError(
      'PHILHEALTH_EXCEEDS_MAXIMUM_EE',
      `PhilHealth employee share ₱${employeeShareMonthly} exceeds maximum ₱${MAX_EE}`
    ));
  }

  if (employerShareMonthly < MIN_EE && salaryBase >= 10000) {
    errors.push(new PayrollValidationError(
      'PHILHEALTH_BELOW_MINIMUM_ER',
      `PhilHealth employer share ₱${employerShareMonthly} is below minimum ₱${MIN_EE}`
    ));
  }

  if (employerShareMonthly > MAX_EE) {
    errors.push(new PayrollValidationError(
      'PHILHEALTH_EXCEEDS_MAXIMUM_ER',
      `PhilHealth employer share ₱${employerShareMonthly} exceeds maximum ₱${MAX_EE}`
    ));
  }

  return { errors, warnings };
};

/**
 * Validates Pag-IBIG contribution amounts and rules
 */
export const validatePagIbigContribution = (pagIbigData) => {
  const errors = [];
  const warnings = [];

  if (!pagIbigData) {
    return { errors, warnings };
  }

  const MAX_EMPLOYEE = 200;
  const MAX_EMPLOYER = 200;
  const MAX_COMBINED = 400;

  const { employeeShareMonthly, employerShareMonthly } = pagIbigData;

  // Max contribution checks
  if (employeeShareMonthly > MAX_EMPLOYEE) {
    errors.push(new PayrollValidationError(
      'PAGIBIG_EXCEEDS_MAXIMUM_EE',
      `Pag-IBIG employee share ₱${employeeShareMonthly} exceeds maximum ₱${MAX_EMPLOYEE}`
    ));
  }

  if (employerShareMonthly > MAX_EMPLOYER) {
    errors.push(new PayrollValidationError(
      'PAGIBIG_EXCEEDS_MAXIMUM_ER',
      `Pag-IBIG employer share ₱${employerShareMonthly} exceeds maximum ₱${MAX_EMPLOYER}`
    ));
  }

  const combined = round2(employeeShareMonthly + employerShareMonthly);
  if (combined > MAX_COMBINED) {
    errors.push(new PayrollValidationError(
      'PAGIBIG_EXCEEDS_MAXIMUM_COMBINED',
      `Pag-IBIG combined contribution ₱${combined} exceeds maximum ₱${MAX_COMBINED}`
    ));
  }

  return { errors, warnings };
};

/**
 * Validates attendance-based deductions
 */
export const validateAttendanceDeductions = (attendance, earnings) => {
  const errors = [];
  const warnings = [];

  if (!attendance || !earnings) {
    return { errors, warnings };
  }

  const {
    lateMinutes = 0,
    undertimeMinutes = 0,
  } = attendance;

  const {
    basePayForPeriod = 0,
    scheduledWorkDays = 22,
  } = attendance;

  // Check if deductions are entered but not computed
  if (lateMinutes > 0) {
    warnings.push(new PayrollValidationWarning(
      'ATTENDANCE_LATE_PRESENT',
      `Late minutes recorded: ${lateMinutes}. Verify late deduction is computed in peso amount.`,
      { lateMinutes }
    ));
  }

  if (undertimeMinutes > 0) {
    warnings.push(new PayrollValidationWarning(
      'ATTENDANCE_UNDERTIME_PRESENT',
      `Undertime minutes recorded: ${undertimeMinutes}. Verify undertime deduction is computed in peso amount.`,
      { undertimeMinutes }
    ));
  }

  return { errors, warnings };
};

/**
 * Validates taxable income calculation and withholding tax order
 */
export const validateTaxableIncomeAndWithholding = (deductions, breakdown) => {
  const errors = [];
  const warnings = [];

  if (!deductions || !breakdown) {
    return { errors, warnings };
  }

  const {
    mandatoryContributions,
    grossTaxableIncomeForPeriod,
    taxableIncome,
    withholding,
  } = deductions;

  if (!mandatoryContributions) {
    return { errors, warnings };
  }

  // Verify deduction order: withholding tax computed after contributions
  const expectedTaxableIncome = round2(
    grossTaxableIncomeForPeriod
    - (mandatoryContributions.totals?.employeeShare || 0)
  );

  if (Math.abs(expectedTaxableIncome - taxableIncome) > 0.01) {
    warnings.push(new PayrollValidationWarning(
      'TAX_CALCULATION_ORDER_MISMATCH',
      `Expected taxable income ₱${expectedTaxableIncome.toFixed(2)}, but received ₱${taxableIncome.toFixed(2)}. Verify SSS, PhilHealth, Pag-IBIG deductions are applied before tax.`,
      { expectedTaxableIncome, actualTaxableIncome: taxableIncome }
    ));
  }

  // Verify exempt employees don't have withholding tax
  if (taxableIncome <= 20833 && withholding?.withholdingTax > 0) {
    errors.push(new PayrollValidationError(
      'TAX_EXEMPTION_VIOLATION',
      `Employee with taxable income ₱${taxableIncome} (≤₱20,833) should be exempt from withholding tax. Withholding deducted: ₱${withholding.withholdingTax}`
    ));
  }

  // Validate withholding tax bracket
  if (withholding?.bracket) {
    const bracketMin = withholding.bracket.min;
    const bracketMax = withholding.bracket.max;
    
    // Check if income is actually in the bracket the code claims
    if (taxableIncome <= bracketMin || taxableIncome > bracketMax) {
      warnings.push(new PayrollValidationWarning(
        'TAX_BRACKET_MISMATCH',
        `Taxable income ₱${taxableIncome} appears outside identified bracket (${bracketMin}-${bracketMax}). Verify bracket selection.`,
        { taxableIncome, bracketMin, bracketMax }
      ));
    }
  }

  return { errors, warnings };
};

/**
 * Validates gross pay doesn't go negative
 */
export const validateGrossPay = (breakdown) => {
  const errors = [];

  if (!breakdown?.earnings?.basePayForPeriod) {
    return { errors };
  }

  const grossPay = breakdown.earnings.grossPay || 0;
  
  if (grossPay < 0) {
    errors.push(new PayrollValidationError(
      'NEGATIVE_GROSS_PAY',
      `Gross pay cannot be negative: ₱${grossPay}`
    ));
  }

  return { errors };
};

/**
 * Validates net pay is reasonable
 */
export const validateNetPay = (breakdown, net_pay) => {
  const errors = [];
  const warnings = [];

  if (net_pay === null || net_pay === undefined) {
    return { errors, warnings };
  }

  if (net_pay < 0) {
    warnings.push(new PayrollValidationWarning(
      'NEGATIVE_NET_PAY',
      `Net pay is negative: ₱${net_pay}. The outstanding amount should be carried over to the next payroll.`
    ));
  }

  const grossPay = breakdown?.earnings?.grossPay || 0;
  if (net_pay > grossPay) {
    errors.push(new PayrollValidationError(
      'NET_EXCEEDS_GROSS',
      `Net pay ₱${net_pay} cannot exceed gross pay ₱${grossPay}`
    ));
  }

  return { errors, warnings };
};

/**
 * Validates pay frequency rules
 */
export const validatePayFrequency = (paySchedule, payPeriodStart, payPeriodEnd, breakdown) => {
  const errors = [];
  const warnings = [];

  const normalizedSchedule = String(paySchedule || 'semi-monthly').toLowerCase().trim();

  if (normalizedSchedule === 'semi-monthly') {
    const { periodContext } = breakdown?.deductions?.mandatoryContributions || {};

    if (periodContext?.periodType === 'semi-monthly-first-half') {
      // First half: no contributions should be deducted
      const sssDeducted = breakdown?.deductions?.mandatoryContributions?.sss?.employeeShare > 0;
      const philHealthDeducted = breakdown?.deductions?.mandatoryContributions?.philHealth?.employeeShare > 0;
      const pagIbigDeducted = breakdown?.deductions?.mandatoryContributions?.pagIbig?.employeeShare > 0;

      if (sssDeducted || philHealthDeducted || pagIbigDeducted) {
        errors.push(new PayrollValidationError(
          'SEMI_MONTHLY_FIRST_HALF_DEDUCTIONS',
          'First half of semi-monthly run (1-15) should have NO SSS, PhilHealth, or Pag-IBIG deductions. Deductions only apply on 2nd half.'
        ));
      }
    }

    if (periodContext?.periodType === 'semi-monthly-second-half') {
      // Second half: full contributions and withholding should apply
      if (!breakdown?.deductions?.withholding?.appliesTax) {
        warnings.push(new PayrollValidationWarning(
          'SEMI_MONTHLY_SECOND_HALF_NO_TAX',
          'Second half of semi-monthly run (16-end) should have withholding tax. Verify tax is applicable.'
        ));
      }
    }
  }

  return { errors, warnings };
};

/**
 * Comprehensive payroll validation
 */
export const validatePayrollBreakdown = (breakdown, net_pay) => {
  const allErrors = [];
  const allWarnings = [];

  if (!breakdown) {
    allErrors.push(new PayrollValidationError(
      'EMPTY_BREAKDOWN',
      'Payroll breakdown data is required for validation'
    ));
    return { errors: allErrors, warnings: allWarnings };
  }

  // Run all validation checks
  const checks = [
    validateGrossPay(breakdown),
    validateNetPay(breakdown, net_pay),
    validateSssContribution(breakdown.deductions?.mandatoryContributions?.sss),
    validatePhilHealthContribution(breakdown.deductions?.mandatoryContributions?.philHealth),
    validatePagIbigContribution(breakdown.deductions?.mandatoryContributions?.pagIbig),
    validateAttendanceDeductions(breakdown.attendance, breakdown.earnings),
    validateTaxableIncomeAndWithholding(breakdown.deductions, breakdown),
    validatePayFrequency(
      breakdown.payPeriod?.paySchedule,
      breakdown.payPeriod?.start,
      breakdown.payPeriod?.end,
      breakdown
    ),
  ];

  // Aggregate all errors and warnings
  for (const check of checks) {
    if (check.errors) allErrors.push(...check.errors);
    if (check.warnings) allWarnings.push(...check.warnings);
  }

  return { errors: allErrors, warnings: allWarnings };
};

export default {
  PayrollValidationError,
  PayrollValidationWarning,
  validatePayrollBreakdown,
  validateSssContribution,
  validatePhilHealthContribution,
  validatePagIbigContribution,
  validateAttendanceDeductions,
  validateTaxableIncomeAndWithholding,
  validateGrossPay,
  validateNetPay,
  validatePayFrequency,
};
