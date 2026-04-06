const SSS_CONFIG_2024 = {
  minMSC: 4000,
  maxMSC: 30000,
  step: 500,
  employeeRate: 0.045,
  employerRate: 0.095,
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

export const toMonthlyEquivalentSalary = ({
  basicPayPerPeriod = 0,
  paySchedule = 'semi-monthly',
}) => {
  const divisor = PERIOD_DIVISORS[paySchedule] || PERIOD_DIVISORS['semi-monthly'];
  return round2((Number(basicPayPerPeriod) || 0) * divisor);
};

export const getSssContribution = (monthlyCompensation = 0) => {
  const monthly = Number(monthlyCompensation) || 0;
  const boundedMSC = clamp(monthly, SSS_CONFIG_2024.minMSC, SSS_CONFIG_2024.maxMSC);
  const msc = Math.ceil(boundedMSC / SSS_CONFIG_2024.step) * SSS_CONFIG_2024.step;

  const employeeShareMonthly = round2(msc * SSS_CONFIG_2024.employeeRate);
  const employerShareMonthly = round2(msc * SSS_CONFIG_2024.employerRate);

  return {
    msc,
    employeeShareMonthly,
    employerShareMonthly,
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
    employeeShareMonthly,
    employerShareMonthly,
  };
};

export const prorateContributionBySchedule = (monthlyAmount = 0, paySchedule = 'semi-monthly') => {
  const divisor = PERIOD_DIVISORS[paySchedule] || PERIOD_DIVISORS['semi-monthly'];
  return round2((Number(monthlyAmount) || 0) / divisor);
};

export const computeMandatoryContributions = ({
  monthlyCompensation = 0,
  paySchedule = 'semi-monthly',
}) => {
  const sss = getSssContribution(monthlyCompensation);
  const philHealth = getPhilHealthContribution(monthlyCompensation);
  const pagIbig = getPagIbigContribution(monthlyCompensation);

  const sssEE = prorateContributionBySchedule(sss.employeeShareMonthly, paySchedule);
  const sssER = prorateContributionBySchedule(sss.employerShareMonthly, paySchedule);
  const philHealthEE = prorateContributionBySchedule(philHealth.employeeShareMonthly, paySchedule);
  const philHealthER = prorateContributionBySchedule(philHealth.employerShareMonthly, paySchedule);
  const pagIbigEE = prorateContributionBySchedule(pagIbig.employeeShareMonthly, paySchedule);
  const pagIbigER = prorateContributionBySchedule(pagIbig.employerShareMonthly, paySchedule);

  return {
    sss: {
      msc: sss.msc,
      employeeShare: sssEE,
      employerShare: sssER,
      employeeShareMonthly: sss.employeeShareMonthly,
      employerShareMonthly: sss.employerShareMonthly,
    },
    philHealth: {
      premiumBase: philHealth.premiumBase,
      employeeShare: philHealthEE,
      employerShare: philHealthER,
      employeeShareMonthly: philHealth.employeeShareMonthly,
      employerShareMonthly: philHealth.employerShareMonthly,
    },
    pagIbig: {
      premiumBase: pagIbig.premiumBase,
      employeeShare: pagIbigEE,
      employerShare: pagIbigER,
      employeeShareMonthly: pagIbig.employeeShareMonthly,
      employerShareMonthly: pagIbig.employerShareMonthly,
    },
    totals: {
      employeeShare: round2(sssEE + philHealthEE + pagIbigEE),
      employerShare: round2(sssER + philHealthER + pagIbigER),
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
