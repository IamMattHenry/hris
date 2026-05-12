const SSS_CONFIG = {
  minMSC: 5000,
  maxMSC: 35000,
  step: 500,

  employeeRate: 0.05,
  employerRate: 0.10,

  mpfThreshold: 20000,

  ecThreshold: 14750,
  ecLow: 10,
  ecHigh: 30,
};

const PHILHEALTH_CONFIG = {
  totalRate: 0.05,
  employeeRate: 0.025,  
  employerRate: 0.025,  
  minMonthlySalary: 10000,
  maxMonthlySalary: 100000,
  minEmployeeContribution: 250,
  maxEmployeeContribution: 2500,
  minEmployerContribution: 250,
  maxEmployerContribution: 2500,
};

/**
 * Pag-IBIG (HDMF) Configuration - Circular No. 460
 * Max fund salary: ₱10,000
 * Employee/Employer Max Combined: ₱400/month (₱200 each)
 * 
 * Salary Brackets:
 *  - ₱1,500 and below: 1% EE / 2% ER (3% total)
 *  - Over ₱1,500 to ₱10,000: 2% EE / 2% ER (4% total)
 *  - Over ₱10,000: 2% (max ₱200) EE / 2% (max ₱200) ER (capped at ₱400 total)
 */
const PAGIBIG_CONFIG = {
  maxFundSalary: 10000,
  threshold1: 1500,
  threshold2: 10000,
  
  // Contribution rates by salary bracket
  rate1: { employee: 0.01, employer: 0.02 },           // ≤ ₱1,500
  rate2: { employee: 0.02, employer: 0.02 },           // > ₱1,500 to ₱10,000
  rate3: { employee: 0.02, employer: 0.02 },           // > ₱10,000 (capped)
  
  // Maximum contributions
  maxEmployeeShare: 200,
  maxEmployerShare: 200,
  maxCombinedShare: 400,
};

const PERIOD_DIVISORS = {
  monthly: 1,
  'semi-monthly': 2,
  weekly: 4.3333333333,
};

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizePaySchedule = (value = 'semi-monthly') => {
  const schedule = String(value || '').trim().toLowerCase();
  if (schedule === 'monthly') return 'monthly';
  if (schedule === 'semi-monthly' || schedule === 'semi monthly' || schedule === 'semimonthly') {
    return 'semi-monthly';
  }
  if (schedule === 'weekly') return 'weekly';
  return 'semi-monthly';
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return new Date(value);
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
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

const buildSssContributionTable = () => {
  const rows = [];

  for (let msc = SSS_CONFIG.minMSC; msc <= SSS_CONFIG.maxMSC; msc += SSS_CONFIG.step) {
    const rangeMin = msc === SSS_CONFIG.minMSC ? 0 : msc - 250;
    const rangeMax = msc === SSS_CONFIG.maxMSC ? Infinity : msc + 249;

    rows.push({
      msc,
      rangeMin,
      rangeMax,
      rangeLabel: `${rangeMin === 0 ? '< ₱5,000' : `₱${rangeMin.toLocaleString('en-PH')}`} - ${rangeMax === Infinity ? 'and above' : `₱${rangeMax.toLocaleString('en-PH')}`}`,
    });
  }

  return rows;
};

const SSS_CONTRIBUTION_TABLE_2025 = buildSssContributionTable();

const findSssBracket = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  const clampedMonthly = clamp(monthly, SSS_CONFIG.minMSC, SSS_CONFIG.maxMSC);
  const bracket = SSS_CONTRIBUTION_TABLE_2025.find((row) => monthly <= row.rangeMax && monthly >= row.rangeMin)
    || SSS_CONTRIBUTION_TABLE_2025[SSS_CONTRIBUTION_TABLE_2025.length - 1];

  return {
    monthly,
    clampedMonthly,
    bracket,
  };
};

const resolveContributionPeriod = ({ paySchedule = 'semi-monthly', payPeriodStart, payPeriodEnd } = {}) => {
  const schedule = normalizePaySchedule(paySchedule);

  if (schedule === 'monthly') {
    return {
      schedule,
      appliesThisPeriod: true,
      appliesTaxThisPeriod: true,
      periodType: 'monthly-full',
      expected: payPeriodStart && payPeriodEnd ? {
        start: startOfMonth(payPeriodStart),
        end: endOfMonth(payPeriodStart),
      } : null,
    };
  }

  if (schedule === 'semi-monthly') {
    const start = formatDate(payPeriodStart);
    const end = formatDate(payPeriodEnd);
    if (!start || !end) {
      return {
        schedule,
        appliesThisPeriod: false,
        appliesTaxThisPeriod: false,
        periodType: 'invalid',
        expected: null,
      };
    }

    const startDay = Number(start.slice(8, 10));
    const endDay = Number(end.slice(8, 10));
    const monthStart = startOfMonth(start);
    const monthEnd = endOfMonth(start);
    const isFirstHalf = startDay === 1 && endDay === 15;
    const isSecondHalf = startDay === 16 && end === monthEnd;

    if (isFirstHalf) {
      return {
        schedule,
        appliesThisPeriod: false,
        appliesTaxThisPeriod: false,
        periodType: 'semi-monthly-first-half',
        expected: {
          start: monthStart,
          end: `${start.slice(0, 8)}15`,
        },
      };
    }

    if (isSecondHalf) {
      return {
        schedule,
        appliesThisPeriod: true,
        appliesTaxThisPeriod: true,
        periodType: 'semi-monthly-second-half',
        expected: {
          start: `${start.slice(0, 8)}16`,
          end: monthEnd,
        },
      };
    }

    return {
      schedule,
      appliesThisPeriod: false,
      appliesTaxThisPeriod: false,
      periodType: 'invalid',
      expected: startDay <= 15
        ? { start: monthStart, end: `${start.slice(0, 8)}15` }
        : { start: `${start.slice(0, 8)}16`, end: monthEnd },
    };
  }

  return {
    schedule,
    appliesThisPeriod: true,
    appliesTaxThisPeriod: true,
    periodType: schedule || 'unknown',
    expected: null,
  };
};

const resolvePeriodAmount = ({ monthlyAmount = 0, paySchedule = 'semi-monthly', payPeriodStart, payPeriodEnd } = {}) => {
  const monthly = Number(monthlyAmount) || 0;
  const period = resolveContributionPeriod({ paySchedule, payPeriodStart, payPeriodEnd });

  if (!period.appliesThisPeriod) {
    return {
      ...period,
      periodAmount: 0,
    };
  }

  if (period.schedule === 'monthly') {
    return {
      ...period,
      periodAmount: round2(monthly),
    };
  }

  if (period.periodType === 'semi-monthly-second-half') {
    return {
      ...period,
      periodAmount: round2(monthly),
    };
  }

  if (period.schedule === 'weekly') {
    const divisor = PERIOD_DIVISORS.weekly;
    return {
      ...period,
      periodAmount: round2(monthly / divisor),
    };
  }

  return {
    ...period,
    periodAmount: round2(monthly),
  };
};

export const toMonthlyEquivalentSalary = ({
  basicPayPerPeriod = 0,
  paySchedule = 'semi-monthly',
}) => {
  const divisor = PERIOD_DIVISORS[normalizePaySchedule(paySchedule)] || PERIOD_DIVISORS['semi-monthly'];
  return round2((Number(basicPayPerPeriod) || 0) * divisor);
};

export const getSssContribution = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  const { clampedMonthly, bracket } = findSssBracket(monthly);
  const msc = bracket.msc;
  
  // EC determination based on MSC
  const employerCompensationEC = msc >= SSS_CONFIG.ecThreshold
    ? SSS_CONFIG.ecHigh
    : SSS_CONFIG.ecLow;

  // New simplified SSS config uses a single employee/employer rate.
  // MPF is retained as a compatibility field, but the current config does not
  // apply a separate MPF rate.
  const regularMsc = Math.min(msc, SSS_CONFIG.mpfThreshold);
  const mpfMsc = Math.max(0, msc - SSS_CONFIG.mpfThreshold);

  const employeeShareMonthly = round2(msc * SSS_CONFIG.employeeRate);
  const employerShareMonthly = round2(msc * SSS_CONFIG.employerRate);

  const employeeRegularShare = employeeShareMonthly;
  const employeeMpfShare = 0;
  const employerRegularShare = employerShareMonthly;
  const employerMpfShare = 0;

  return {
    msc,
    clampedMonthlyCompensation: clampedMonthly,
    salaryRange: {
      min: bracket.rangeMin,
      max: bracket.rangeMax,
      label: bracket.rangeLabel,
    },
    regularMsc,
    mpfMsc,
    employeeRegularShare,
    employeeMpfShare,
    employeeShareMonthly,
    employerRegularShare,
    employerMpfShare,
    employerCompensationEC,
    employerShareMonthly: round2(employerShareMonthly + employerCompensationEC),
    totalMonthlyPremium: round2(employeeShareMonthly + employerShareMonthly + employerCompensationEC),
  };
};

export const getPhilHealthContribution = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  
  // Clamp salary to min/max limits for calculation
  const salaryBase = clamp(
    monthly,
    PHILHEALTH_CONFIG.minMonthlySalary,
    PHILHEALTH_CONFIG.maxMonthlySalary
  );

  // Calculate individual shares (2.5% each)
  const employeeShareMonthly = round2(salaryBase * PHILHEALTH_CONFIG.employeeRate);
  const employerShareMonthly = round2(salaryBase * PHILHEALTH_CONFIG.employerRate);

  // Ensure contributions stay within min/max bounds
  const employeeShare = clamp(
    employeeShareMonthly,
    PHILHEALTH_CONFIG.minEmployeeContribution,
    PHILHEALTH_CONFIG.maxEmployeeContribution
  );
  const employerShare = clamp(
    employerShareMonthly,
    PHILHEALTH_CONFIG.minEmployerContribution,
    PHILHEALTH_CONFIG.maxEmployerContribution
  );

  return {
    salaryBase,
    rate: PHILHEALTH_CONFIG.totalRate,
    employeeRate: PHILHEALTH_CONFIG.employeeRate,
    employerRate: PHILHEALTH_CONFIG.employerRate,
    employeeShareMonthly: employeeShare,
    employerShareMonthly: employerShare,
    totalMonthlyPremium: round2(employeeShare + employerShare),
  };
};

export const getPagIbigContribution = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  
  // Cap salary at ₱10,000 for Pag-IBIG computation
  const fundSalary = Math.min(monthly, PAGIBIG_CONFIG.maxFundSalary);

  // Determine contribution rates based on salary bracket
  let employeeRate = PAGIBIG_CONFIG.rate2.employee;
  let employerRate = PAGIBIG_CONFIG.rate2.employer;

  if (fundSalary <= PAGIBIG_CONFIG.threshold1) {
    employeeRate = PAGIBIG_CONFIG.rate1.employee;
    employerRate = PAGIBIG_CONFIG.rate1.employer;
  } else if (fundSalary > PAGIBIG_CONFIG.threshold2) {
    employeeRate = PAGIBIG_CONFIG.rate3.employee;
    employerRate = PAGIBIG_CONFIG.rate3.employer;
  }

  // Calculate contributions
  let employeeShare = round2(fundSalary * employeeRate);
  let employerShare = round2(fundSalary * employerRate);

  // Apply maximum caps
  employeeShare = Math.min(employeeShare, PAGIBIG_CONFIG.maxEmployeeShare);
  employerShare = Math.min(employerShare, PAGIBIG_CONFIG.maxEmployerShare);

  // Ensure combined doesn't exceed max
  const combined = round2(employeeShare + employerShare);
  if (combined > PAGIBIG_CONFIG.maxCombinedShare) {
    // Proportional reduction if needed (rare case)
    const factor = PAGIBIG_CONFIG.maxCombinedShare / combined;
    employeeShare = round2(employeeShare * factor);
    employerShare = round2(employerShare * factor);
  }

  return {
    fundSalary,
    employeeSalaryBracket: fundSalary <= PAGIBIG_CONFIG.threshold1 
      ? 'Up to ₱1,500'
      : fundSalary <= PAGIBIG_CONFIG.threshold2
        ? '₱1,500.01 to ₱10,000'
        : 'Over ₱10,000',
    employeeRate,
    employerRate,
    employeeShareMonthly: employeeShare,
    employerShareMonthly: employerShare,
    totalMonthlyPremium: round2(employeeShare + employerShare),
  };
};

export const prorateContributionBySchedule = (monthlyAmount = 0, paySchedule = 'semi-monthly', payPeriodStart, payPeriodEnd) => {
  return resolvePeriodAmount({
    monthlyAmount,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;
};

export const computeMandatoryContributions = ({
  monthlyCompensation = 0,
  paySchedule = 'semi-monthly',
  payPeriodStart = null,
  payPeriodEnd = null,
}) => {
  const sss = getSssContribution(monthlyCompensation);
  const philHealth = getPhilHealthContribution(monthlyCompensation);
  const pagIbig = getPagIbigContribution(monthlyCompensation);

  const periodContext = resolveContributionPeriod({
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  });

  const sssEE = resolvePeriodAmount({
    monthlyAmount: sss.employeeShareMonthly,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;
  const sssER = resolvePeriodAmount({
    monthlyAmount: sss.employerShareMonthly,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;
  const philHealthEE = resolvePeriodAmount({
    monthlyAmount: philHealth.employeeShareMonthly,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;
  const philHealthER = resolvePeriodAmount({
    monthlyAmount: philHealth.employerShareMonthly,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;
  const pagIbigEE = resolvePeriodAmount({
    monthlyAmount: pagIbig.employeeShareMonthly,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;
  const pagIbigER = resolvePeriodAmount({
    monthlyAmount: pagIbig.employerShareMonthly,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  }).periodAmount;

  return {
    periodContext,
    sss: {
      msc: sss.msc,
      salaryRange: sss.salaryRange,
      regularMsc: sss.regularMsc,
      mpfMsc: sss.mpfMsc,
      employeeRegularShare: sss.employeeRegularShare,
      employerRegularShare: sss.employerRegularShare,
      employeeMpfShare: sss.employeeMpfShare,
      employerMpfShare: sss.employerMpfShare,
      employerCompensationEC: sss.employerCompensationEC,
      employeeShare: sssEE,
      employerShare: sssER,
      employeeShareMonthly: sss.employeeShareMonthly,
      employerShareMonthly: sss.employerShareMonthly,
      totalMonthlyPremium: sss.totalMonthlyPremium,
    },
    philHealth: {
      salaryBase: philHealth.salaryBase,
      rate: PHILHEALTH_CONFIG.totalRate,
      employeeRate: PHILHEALTH_CONFIG.employeeRate,
      employerRate: PHILHEALTH_CONFIG.employerRate,
      employeeShare: philHealthEE,
      employerShare: philHealthER,
      employeeShareMonthly: philHealth.employeeShareMonthly,
      employerShareMonthly: philHealth.employerShareMonthly,
      totalMonthlyPremium: philHealth.totalMonthlyPremium,
    },
    pagIbig: {
      fundSalary: pagIbig.fundSalary,
      employeeSalaryBracket: pagIbig.employeeSalaryBracket,
      employeeRate: pagIbig.employeeRate,
      employerRate: pagIbig.employerRate,
      employeeShare: pagIbigEE,
      employerShare: pagIbigER,
      employeeShareMonthly: pagIbig.employeeShareMonthly,
      employerShareMonthly: pagIbig.employerShareMonthly,
      totalMonthlyPremium: pagIbig.totalMonthlyPremium,
    },
    totals: {
      employeeShareMonthly: round2(sss.employeeShareMonthly + philHealth.employeeShareMonthly + pagIbig.employeeShareMonthly),
      employerShareMonthly: round2(sss.employerShareMonthly + philHealth.employerShareMonthly + pagIbig.employerShareMonthly),
      employeeShare: round2(sssEE + philHealthEE + pagIbigEE),
      employerShare: round2(sssER + philHealthER + pagIbigER),
      totalMonthlyPremium: round2(sss.totalMonthlyPremium + philHealth.totalMonthlyPremium + pagIbig.totalMonthlyPremium),
    },
  };
};

export default {
  getSssContribution,
  getPhilHealthContribution,
  getPagIbigContribution,
  toMonthlyEquivalentSalary,
  computeMandatoryContributions,
};
