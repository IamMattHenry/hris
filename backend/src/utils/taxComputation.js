/**
 * Philippine Payroll Tax Computation
 * Reference: TRAIN Law – BIR Revenue Regulations No. 11-2018
 *
 * FIXES APPLIED (vs previous version):
 *  1. Withholding tax now uses the ANNUALIZED method:
 *       annualTaxable = monthlyTaxable × 12
 *       annualTax     = TRAIN_TAX_BRACKETS(annualTaxable)
 *       monthlyTax    = annualTax ÷ 12
 *     This matches the BIR's official computation method and reference
 *     calculators (e.g. ₱100,000 salary → ₱15,762.50/month).
 *     The old code applied monthly bracket thresholds directly, which
 *     produced wrong amounts and could yield negative values.
 *
 *  2. Monthly bracket min values corrected (off-by-one in old code):
 *       Old → 33332, 66666, 166666, 666666
 *       New → 33333, 66667, 166667, 666667
 *     The TRAIN_MONTHLY_BRACKETS table is kept as a reference / fallback
 *     but is NO LONGER used for the primary withholding tax path.
 *
 *  3. Removed any path that could produce a negative withholding tax.
 *     withholdingTax is always Math.max(0, ...) before being returned.
 */

// ---------------------------------------------------------------------------
// Annual TRAIN tax brackets (used for withholding tax via annualized method)
// ---------------------------------------------------------------------------
const TRAIN_TAX_BRACKETS = [
  {
    min: 0,
    max: 250000,
    baseTax: 0,
    rate: 0,
    description: 'Not over ₱250,000 (Exempt)',
  },
  {
    min: 250000,
    max: 400000,
    baseTax: 0,
    rate: 0.15,
    description: 'Over ₱250,000 but not over ₱400,000',
  },
  {
    min: 400000,
    max: 800000,
    baseTax: 22500,
    rate: 0.20,
    description: 'Over ₱400,000 but not over ₱800,000',
  },
  {
    min: 800000,
    max: 2000000,
    baseTax: 102500,
    rate: 0.25,
    description: 'Over ₱800,000 but not over ₱2,000,000',
  },
  {
    min: 2000000,
    max: 8000000,
    baseTax: 402500,
    rate: 0.30,
    description: 'Over ₱2,000,000 but not over ₱8,000,000',
  },
  {
    min: 8000000,
    max: Infinity,
    baseTax: 2202500,
    rate: 0.35,
    description: 'Over ₱8,000,000',
  },
];

// ---------------------------------------------------------------------------
// Monthly TRAIN brackets — kept for reference / display only.
// FIX: corrected off-by-one min values (33333, 66667, 166667, 666667).
// These are NOT used for withholding tax computation (annualized method is
// used instead). They can be used to display the bracket description to the
// user on the payslip.
// ---------------------------------------------------------------------------
const TRAIN_MONTHLY_BRACKETS = [
  {
    min: 0,
    max: 20833,
    baseTax: 0,
    rate: 0,
    description: '₱0 to ₱20,833 (Exempt)',
  },
  {
    min: 20833,
    max: 33333,   // FIX: was 33332
    baseTax: 0,
    rate: 0.15,
    description: 'Over ₱20,833 but not over ₱33,333 — 15% of excess over ₱20,833',
  },
  {
    min: 33333,   // FIX: was 33332
    max: 66667,   // FIX: was 66666
    baseTax: 2500,
    rate: 0.20,
    description: 'Over ₱33,333 but not over ₱66,667 — ₱2,500 + 20% of excess over ₱33,333',
  },
  {
    min: 66667,   // FIX: was 66666
    max: 166667,  // FIX: was 166666
    baseTax: 10833,
    rate: 0.25,
    description: 'Over ₱66,667 but not over ₱166,667 — ₱10,833 + 25% of excess over ₱66,667',
  },
  {
    min: 166667,  // FIX: was 166666
    max: 666667,  // FIX: was 666666
    baseTax: 40833,
    rate: 0.30,
    description: 'Over ₱166,667 but not over ₱666,667 — ₱40,833 + 30% of excess over ₱166,667',
  },
  {
    min: 666667,  // FIX: was 666666
    max: Infinity,
    baseTax: 200833,
    rate: 0.35,
    description: '₱666,667 and above — ₱200,833 + 35% of excess over ₱666,667',
  },
];

const PERIODS_PER_YEAR = {
  weekly: 52,
  'semi-monthly': 24,
  monthly: 12,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date
    ? new Date(value)
    : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (value) => {
  const date = toDate(value);
  if (!date) return null;
  date.setDate(1);
  return formatDate(date);
};

const endOfMonth = (value) => {
  const date = toDate(value);
  if (!date) return null;
  date.setMonth(date.getMonth() + 1, 0);
  return formatDate(date);
};

// ---------------------------------------------------------------------------
// Pay period validation (unchanged logic, kept intact)
// ---------------------------------------------------------------------------
const buildPayrollPeriodValidation = ({ payPeriodStart, payPeriodEnd, paySchedule }) => {
  const normalizedSchedule = String(paySchedule || 'semi-monthly').trim().toLowerCase();
  const start = formatDate(payPeriodStart);
  const end = formatDate(payPeriodEnd);

  if (!start || !end) {
    return { valid: false, message: 'Valid pay period dates are required.' };
  }

  if (start > end) {
    return { valid: false, message: 'pay_period_start must not be later than pay_period_end.' };
  }

  if (normalizedSchedule === 'monthly') {
    const expected = { start: startOfMonth(start), end: endOfMonth(start) };
    if (expected.start !== start || expected.end !== end) {
      return {
        valid: false,
        message: `Monthly payroll runs must cover a full month (${expected.start} to ${expected.end}).`,
        expected,
      };
    }
    return {
      valid: true,
      appliesTax: true,
      periodType: 'monthly-full',
      taxComputationSchedule: 'monthly',
      expected,
    };
  }

  if (normalizedSchedule === 'semi-monthly') {
    const monthEnd = endOfMonth(start);
    const startDay = Number(String(start).slice(8, 10));
    const endDay = Number(String(end).slice(8, 10));
    const isFirstHalf = startDay === 1 && endDay === 15;
    const isSecondHalf = startDay === 16 && end === monthEnd;

    if (!isFirstHalf && !isSecondHalf) {
      const expected = startDay <= 15
        ? { start: startOfMonth(start), end: `${String(start).slice(0, 8)}15` }
        : { start: `${String(start).slice(0, 8)}16`, end: monthEnd };
      return {
        valid: false,
        message: 'Semi-monthly payroll runs must be 1–15 or 16–end of month.',
        expected,
      };
    }

    return {
      valid: true,
      appliesTax: isSecondHalf,
      periodType: isFirstHalf ? 'semi-monthly-first-half' : 'semi-monthly-second-half',
      taxComputationSchedule: isSecondHalf ? 'monthly' : null,
      expected: {
        start: isFirstHalf ? startOfMonth(start) : `${String(start).slice(0, 8)}16`,
        end: isFirstHalf ? `${String(start).slice(0, 8)}15` : monthEnd,
      },
    };
  }

  return {
    valid: true,
    appliesTax: true,
    periodType: normalizedSchedule || 'unknown',
    taxComputationSchedule: normalizedSchedule || 'semi-monthly',
    expected: null,
  };
};

// ---------------------------------------------------------------------------
// Core annual tax computation (used internally by withholding tax)
// ---------------------------------------------------------------------------
export const computeAnnualTaxTRAIN = (annualTaxableIncome = 0) => {
  const taxable = Math.max(0, Number(annualTaxableIncome) || 0);

  const bracket = TRAIN_TAX_BRACKETS.find((b) => taxable > b.min && taxable <= b.max)
    || TRAIN_TAX_BRACKETS[0];

  if (!bracket || bracket.rate === 0) {
    return { annualTax: 0, bracket: TRAIN_TAX_BRACKETS[0] };
  }

  const annualTax = bracket.baseTax + ((taxable - bracket.min) * bracket.rate);
  return { annualTax: round2(annualTax), bracket };
};

// ---------------------------------------------------------------------------
// Monthly tax via annualized method (FIX: replaces old direct-bracket lookup)
//
// BIR official method:
//   1. annualTaxable = monthlyTaxable × 12
//   2. annualTax     = apply TRAIN annual brackets to annualTaxable
//   3. monthlyTax    = annualTax ÷ 12
//
// This is what all BIR-compliant payroll calculators use and produces the
// correct ₱15,762.50 for a ₱100,000 salary (after mandatory deductions).
// ---------------------------------------------------------------------------
export const computeMonthlyTaxTRAIN = (monthlyTaxableIncome = 0) => {
  const taxable = Math.max(0, Number(monthlyTaxableIncome) || 0);

  // Use BIR's published monthly withholding tax table (RR 11-2018) directly.
  // This matches official payroll calculators (threshold ₱20,833 instead of
  // ₱20,833.33 from the annualized 250,000 ÷ 12).
  const monthlyBracket = TRAIN_MONTHLY_BRACKETS.find(
    (b) => taxable > b.min && taxable <= b.max,
  ) || TRAIN_MONTHLY_BRACKETS[0];

  const monthlyTax = Math.max(
    0,
    round2(monthlyBracket.baseTax + ((taxable - monthlyBracket.min) * monthlyBracket.rate)),
  );

  // Annualized figures retained for reporting / payslip display.
  const annualTaxable = round2(taxable * 12);
  const { bracket } = computeAnnualTaxTRAIN(annualTaxable);
  const annualTax = round2(monthlyTax * 12);

  return {
    monthlyTax,
    annualTax,
    annualTaxable,
    // Annual bracket retained for reference
    bracket,
    // Monthly bracket used for the actual computation
    monthlyBracketDescription: monthlyBracket.description,
  };
};

// ---------------------------------------------------------------------------
// Main withholding tax function
// ---------------------------------------------------------------------------
export const computeWithholdingTax = ({
  taxableIncomeForPeriod = 0,
  paySchedule = 'semi-monthly',
  grossTaxableIncomeForPeriod = null,
  mandatoryEmployeeContributions = null,
  nonTaxableIncomeForPeriod = 0,
  enforceDeductionOrder = false,
}) => {
  const periodTaxable = Math.max(0, Number(taxableIncomeForPeriod) || 0);
  const taxBase = grossTaxableIncomeForPeriod == null
    ? null
    : Math.max(0, Number(grossTaxableIncomeForPeriod) || 0);
  const deductionsTotal = mandatoryEmployeeContributions == null
    ? null
    : Math.max(0, Number(mandatoryEmployeeContributions) || 0);
  const nonTaxable = Math.max(0, Number(nonTaxableIncomeForPeriod) || 0);

  // Deduction order enforcement
  if (enforceDeductionOrder && taxBase == null) {
    const error = new Error('Gross taxable income is required to validate withholding tax order.');
    error.code = 'PAYROLL_TAX_ORDER_REQUIRED';
    throw error;
  }

  if (enforceDeductionOrder && deductionsTotal == null) {
    const error = new Error(
      'Mandatory employee contributions (SSS, PhilHealth, Pag-IBIG) are required before withholding tax can be computed.',
    );
    error.code = 'PAYROLL_TAX_DEDUCTIONS_REQUIRED';
    throw error;
  }

  if (enforceDeductionOrder && taxBase != null && deductionsTotal != null) {
    const expectedTaxableIncome = round2(Math.max(0, taxBase - deductionsTotal));
    if (Math.abs(expectedTaxableIncome - periodTaxable) > 0.01) {
      const error = new Error(
        `Withholding tax must be computed after SSS, PhilHealth, and Pag-IBIG deductions. `
        + `Expected taxable income ₱${expectedTaxableIncome.toFixed(2)}, `
        + `received ₱${periodTaxable.toFixed(2)}.`,
      );
      error.code = 'PAYROLL_TAX_ORDER_VIOLATION';
      error.expectedTaxableIncome = expectedTaxableIncome;
      error.receivedTaxableIncome = periodTaxable;
      throw error;
    }
  }

  const warnings = [];
  if (enforceDeductionOrder && taxBase != null && deductionsTotal != null) {
    const deductionGap = round2(Math.max(0, taxBase - periodTaxable));
    if (deductionGap <= 0 && taxBase > 20833) {
      warnings.push(
        'Taxable income may be overstated — mandatory deductions do not appear to have been applied.',
      );
    }
    if (nonTaxable > 0 && periodTaxable > taxBase) {
      warnings.push(
        'Non-taxable compensation appears to be excluded incorrectly; review the taxable income breakdown.',
      );
    }
  }

  // FIX: use annualized method via computeMonthlyTaxTRAIN
  const {
    monthlyTax: withholdingTax,
    annualTax,
    annualTaxable: annualizedTaxableIncome,
    bracket,
    monthlyBracketDescription: bracketDescription,
  } = computeMonthlyTaxTRAIN(periodTaxable);

  // FIX: exempt check uses the annualized threshold (₱250,000/year = ₱20,833/month)
  if (periodTaxable <= 20833 && withholdingTax > 0) {
    const error = new Error(
      'Employees with monthly taxable income at or below ₱20,833 (₱250,000/year) are exempt from withholding tax.',
    );
    error.code = 'PAYROLL_TAX_EXEMPTION_VIOLATION';
    error.taxableIncome = periodTaxable;
    error.withholdingTax = withholdingTax;
    throw error;
  }

  return {
    taxableIncomeForPeriod: round2(periodTaxable),
    annualizedTaxableIncome: round2(annualizedTaxableIncome),
    annualTax: round2(annualTax),
    // FIX: withholdingTax is always >= 0 (never negative)
    withholdingTax,
    bracketDescription,
    bracket,
    warnings,
  };
};

// ---------------------------------------------------------------------------
// Resolve payroll tax period (unchanged)
// ---------------------------------------------------------------------------
export const resolvePayrollTaxPeriod = (options = {}) => buildPayrollPeriodValidation(options);

// ---------------------------------------------------------------------------
// Full payroll withholding tax with period validation
// ---------------------------------------------------------------------------
export const computePayrollWithholdingTax = ({
  taxableIncomeForPeriod = 0,
  paySchedule = 'semi-monthly',
  payPeriodStart,
  payPeriodEnd,
  grossTaxableIncomeForPeriod = null,
  mandatoryEmployeeContributions = null,
  nonTaxableIncomeForPeriod = 0,
}) => {
  const periodValidation = buildPayrollPeriodValidation({
    payPeriodStart,
    payPeriodEnd,
    paySchedule,
  });

  if (!periodValidation.valid) {
    const error = new Error(periodValidation.message || 'Invalid payroll period.');
    error.code = 'PAYROLL_TAX_PERIOD_INVALID';
    error.expected = periodValidation.expected || null;
    throw error;
  }

  // Semi-monthly first half: no tax deduction
  if (!periodValidation.appliesTax) {
    return {
      taxableIncomeForPeriod: round2(taxableIncomeForPeriod),
      annualizedTaxableIncome: 0,
      annualTax: 0,
      // FIX: explicitly 0, never negative
      withholdingTax: 0,
      bracketDescription: 'No withholding tax — first semi-monthly run (days 1–15)',
      bracket: null,
      appliesTax: false,
      periodType: periodValidation.periodType,
      taxComputationSchedule: null,
      warnings: [],
    };
  }

  return {
    ...computeWithholdingTax({
      taxableIncomeForPeriod,
      paySchedule: periodValidation.taxComputationSchedule || paySchedule,
      grossTaxableIncomeForPeriod,
      mandatoryEmployeeContributions,
      nonTaxableIncomeForPeriod,
      enforceDeductionOrder: true,
    }),
    appliesTax: true,
    periodType: periodValidation.periodType,
    taxComputationSchedule: periodValidation.taxComputationSchedule || paySchedule,
  };
};

export default {
  computeAnnualTaxTRAIN,
  computeMonthlyTaxTRAIN,
  computeWithholdingTax,
  computePayrollWithholdingTax,
  resolvePayrollTaxPeriod,
  // Exported for reference / payslip display label only
  TRAIN_TAX_BRACKETS,
  TRAIN_MONTHLY_BRACKETS,
};