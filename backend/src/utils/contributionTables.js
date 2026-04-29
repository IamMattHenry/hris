const SSS_CONFIG_2025 = {
  minMSC: 5000,
  maxRegularMSC: 20000,
  maxMSC: 35000,
  step: 500,
  employeeRate: 0.045,
  employerRate: 0.095,
  ecMonthly: 10,
};

const PHILHEALTH_CONFIG_2024 = {
  rate: 0.05,
  minMonthlySalary: 10000,
  maxMonthlySalary: 100000,
};

const PAGIBIG_CONFIG = {
  threshold: 1500,
  lowerRate: 0.01,
  upperRate: 0.02,
  maxMonthlyCompensation: 5000,
  maxEmployeeShare: 100,
  maxEmployerShare: 100,
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

  for (let msc = SSS_CONFIG_2025.minMSC; msc <= SSS_CONFIG_2025.maxMSC; msc += SSS_CONFIG_2025.step) {
    const rangeMin = msc === SSS_CONFIG_2025.minMSC ? 0 : msc - 250;
    const rangeMax = msc === SSS_CONFIG_2025.maxMSC ? Infinity : msc + 249;

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
  const clampedMonthly = clamp(monthly, SSS_CONFIG_2025.minMSC, SSS_CONFIG_2025.maxMSC);
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
  const regularMsc = Math.min(msc, SSS_CONFIG_2025.maxRegularMSC);
  const mpfMsc = Math.max(0, msc - SSS_CONFIG_2025.maxRegularMSC);

  const employeeRegularShareMonthly = round2(regularMsc * SSS_CONFIG_2025.employeeRate);
  const employerRegularShareMonthly = round2(regularMsc * SSS_CONFIG_2025.employerRate);
  const employeeMpfShareMonthly = round2(mpfMsc * SSS_CONFIG_2025.employeeRate);
  const employerMpfShareMonthly = round2(mpfMsc * SSS_CONFIG_2025.employerRate);

  const employeeShareMonthly = round2(employeeRegularShareMonthly + employeeMpfShareMonthly);
  const employerShareMonthly = round2(employerRegularShareMonthly + employerMpfShareMonthly + SSS_CONFIG_2025.ecMonthly);

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
    employeeRegularShareMonthly,
    employerRegularShareMonthly,
    employeeMpfShareMonthly,
    employerMpfShareMonthly,
    ecMonthly: SSS_CONFIG_2025.ecMonthly,
    employeeShareMonthly,
    employerShareMonthly,
    totalMonthlyPremium: round2(employeeShareMonthly + employerShareMonthly),
  };
};

export const getPhilHealthContribution = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  const premiumBase = clamp(
    monthly,
    PHILHEALTH_CONFIG_2024.minMonthlySalary,
    PHILHEALTH_CONFIG_2024.maxMonthlySalary
  );

  const totalMonthlyPremium = round2(premiumBase * PHILHEALTH_CONFIG_2024.rate);
  const employeeShareMonthly = round2(totalMonthlyPremium / 2);
  const employerShareMonthly = round2(totalMonthlyPremium / 2);

  return {
    premiumBase,
    totalMonthlyPremium,
    employeeShareMonthly,
    employerShareMonthly,
  };
};

export const getPagIbigContribution = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  const rate = monthly <= PAGIBIG_CONFIG.threshold ? PAGIBIG_CONFIG.lowerRate : PAGIBIG_CONFIG.upperRate;
  const premiumBase = Math.min(monthly, PAGIBIG_CONFIG.maxMonthlyCompensation);

  const employeeShareMonthly = round2(
    Math.min(premiumBase * rate, PAGIBIG_CONFIG.maxEmployeeShare)
  );
  const employerShareMonthly = round2(
    Math.min(premiumBase * rate, PAGIBIG_CONFIG.maxEmployerShare)
  );

  return {
    premiumBase,
    rate,
    employeeShareMonthly,
    employerShareMonthly,
    totalMonthlyPremium: round2(employeeShareMonthly + employerShareMonthly),
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
      employeeRegularShareMonthly: sss.employeeRegularShareMonthly,
      employerRegularShareMonthly: sss.employerRegularShareMonthly,
      employeeMpfShareMonthly: sss.employeeMpfShareMonthly,
      employerMpfShareMonthly: sss.employerMpfShareMonthly,
      ecMonthly: sss.ecMonthly,
      employeeShare: sssEE,
      employerShare: sssER,
      employeeShareMonthly: sss.employeeShareMonthly,
      employerShareMonthly: sss.employerShareMonthly,
      totalMonthlyPremium: sss.totalMonthlyPremium,
    },
    philHealth: {
      premiumBase: philHealth.premiumBase,
      rate: PHILHEALTH_CONFIG_2024.rate,
      employeeShare: philHealthEE,
      employerShare: philHealthER,
      employeeShareMonthly: philHealth.employeeShareMonthly,
      employerShareMonthly: philHealth.employerShareMonthly,
      totalMonthlyPremium: philHealth.totalMonthlyPremium,
    },
    pagIbig: {
      premiumBase: pagIbig.premiumBase,
      rate: pagIbig.rate,
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
