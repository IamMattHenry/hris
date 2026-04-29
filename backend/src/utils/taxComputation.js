const TRAIN_TAX_BRACKETS = [
  {
    min: 0,
    max: 250000,
    baseTax: 0,
    rate: 0,
    description: 'Not over ₱250,000',
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
    rate: 0.2,
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
    rate: 0.3,
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
    max: 33332,
    baseTax: 0,
    rate: 0.2,
    description: 'Over ₱20,833 but not over ₱33,332',
  },
  {
    min: 33332,
    max: 66666,
    baseTax: 2500,
    rate: 0.25,
    description: 'Over ₱33,332 but not over ₱66,666',
  },
  {
    min: 66666,
    max: 166666,
    baseTax: 10833,
    rate: 0.3,
    description: 'Over ₱66,666 but not over ₱166,666',
  },
  {
    min: 166666,
    max: 666666,
    baseTax: 40833,
    rate: 0.32,
    description: 'Over ₱166,666 but not over ₱666,666',
  },
  {
    min: 666666,
    max: Infinity,
    baseTax: 200833,
    rate: 0.35,
    description: '₱666,667 and above',
  },
];

const PERIODS_PER_YEAR = {
  weekly: 52,
  'semi-monthly': 24,
  monthly: 12,
};

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

const roundTax = (value) => Number((Number(value) || 0).toFixed(2));

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

const buildPayrollPeriodValidation = ({ payPeriodStart, payPeriodEnd, paySchedule }) => {
  const normalizedSchedule = String(paySchedule || 'semi-monthly').trim().toLowerCase();
  const start = formatDate(payPeriodStart);
  const end = formatDate(payPeriodEnd);

  if (!start || !end) {
    return {
      valid: false,
      message: 'Valid pay period dates are required.',
    };
  }

  if (start > end) {
    return {
      valid: false,
      message: 'pay_period_start must not be later than pay_period_end.',
    };
  }

  if (normalizedSchedule === 'monthly') {
    const expected = {
      start: startOfMonth(start),
      end: endOfMonth(start),
    };

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
    const monthStart = startOfMonth(start);
    const monthEnd = endOfMonth(start);
    const startDay = Number(String(start).slice(8, 10));
    const endDay = Number(String(end).slice(8, 10));
    const isFirstHalf = startDay === 1 && endDay === 15;
    const isSecondHalf = startDay === 16 && end === monthEnd;

    if (!isFirstHalf && !isSecondHalf) {
      const expected = startDay <= 15
        ? { start: monthStart, end: `${String(start).slice(0, 8)}15` }
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
        start: isFirstHalf ? monthStart : `${String(start).slice(0, 8)}16`,
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

export const computeAnnualTaxTRAIN = (annualTaxableIncome = 0) => {
  const taxable = Math.max(0, Number(annualTaxableIncome) || 0);

  const bracket = TRAIN_TAX_BRACKETS.find((item) => taxable > item.min && taxable <= item.max)
    || TRAIN_TAX_BRACKETS[0];

  if (!bracket || bracket.rate === 0) {
    return {
      annualTax: 0,
      bracket: TRAIN_TAX_BRACKETS[0],
    };
  }

  const annualTax = bracket.baseTax + ((taxable - bracket.min) * bracket.rate);
  return {
    annualTax: round2(annualTax),
    bracket,
  };
};

export const computeMonthlyTaxTRAIN = (monthlyTaxableIncome = 0) => {
  const taxable = Math.max(0, Number(monthlyTaxableIncome) || 0);

  const bracket = TRAIN_MONTHLY_BRACKETS.find((item) => taxable > item.min && taxable <= item.max)
    || TRAIN_MONTHLY_BRACKETS[0];

  if (!bracket || bracket.rate === 0) {
    return {
      monthlyTax: 0,
      bracket: TRAIN_MONTHLY_BRACKETS[0],
    };
  }

  const monthlyTax = bracket.baseTax + ((taxable - bracket.min) * bracket.rate);
  return {
    monthlyTax: roundTax(monthlyTax),
    bracket,
  };
};

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

  if (enforceDeductionOrder && taxBase == null) {
    const error = new Error('Gross taxable income is required to validate withholding tax order.');
    error.code = 'PAYROLL_TAX_ORDER_REQUIRED';
    throw error;
  }

  if (enforceDeductionOrder && deductionsTotal == null) {
    const error = new Error('Mandatory employee contributions are required before withholding tax can be computed.');
    error.code = 'PAYROLL_TAX_DEDUCTIONS_REQUIRED';
    throw error;
  }

  if (enforceDeductionOrder && taxBase != null && deductionsTotal != null) {
    const expectedTaxableIncome = roundTax(Math.max(0, taxBase - deductionsTotal));
    if (Math.abs(expectedTaxableIncome - periodTaxable) > 0.01) {
      const error = new Error(
        `Withholding tax must be computed after SSS, PhilHealth, and Pag-IBIG deductions. Expected taxable income ₱${expectedTaxableIncome.toFixed(2)}, received ₱${periodTaxable.toFixed(2)}.`
      );
      error.code = 'PAYROLL_TAX_ORDER_VIOLATION';
      error.expectedTaxableIncome = expectedTaxableIncome;
      error.receivedTaxableIncome = periodTaxable;
      throw error;
    }
  }

  const warnings = [];
  if (enforceDeductionOrder && taxBase != null && deductionsTotal != null) {
    const deductionGap = roundTax(Math.max(0, taxBase - periodTaxable));
    if (deductionGap <= 0 && taxBase > 20833) {
      warnings.push('Taxable income may be overstated because mandatory deductions do not appear to be applied.');
    }
    if (nonTaxable > 0 && periodTaxable > taxBase) {
      warnings.push('Non-taxable compensation appears to be excluded incorrectly; review the taxable income breakdown.');
    }
  }

  const { monthlyTax: withholdingTax, bracket } = computeMonthlyTaxTRAIN(periodTaxable);

  if (periodTaxable <= 20833 && withholdingTax > 0) {
    const error = new Error('Employees with taxable income at or below ₱20,833 per month are exempt from withholding tax.');
    error.code = 'PAYROLL_TAX_EXEMPTION_VIOLATION';
    error.taxableIncome = periodTaxable;
    error.withholdingTax = withholdingTax;
    throw error;
  }

  return {
    taxableIncomeForPeriod: round2(periodTaxable),
    annualizedTaxableIncome: round2(periodTaxable * 12),
    annualTax: round2(withholdingTax * 12),
    withholdingTax,
    bracketDescription: bracket.description,
    bracket,
    warnings,
  };
};

export const resolvePayrollTaxPeriod = (options = {}) => buildPayrollPeriodValidation(options);

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

  if (!periodValidation.appliesTax) {
    return {
      taxableIncomeForPeriod: round2(taxableIncomeForPeriod),
      annualizedTaxableIncome: 0,
      annualTax: 0,
      withholdingTax: 0,
      bracketDescription: 'No withholding tax for first semi-monthly run',
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
};
