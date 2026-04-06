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

const PERIODS_PER_YEAR = {
  weekly: 52,
  'semi-monthly': 24,
  monthly: 12,
};

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

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

export const computeWithholdingTax = ({
  taxableIncomeForPeriod = 0,
  paySchedule = 'semi-monthly',
}) => {
  const periods = PERIODS_PER_YEAR[paySchedule] || PERIODS_PER_YEAR['semi-monthly'];
  const periodTaxable = Math.max(0, Number(taxableIncomeForPeriod) || 0);
  const annualizedTaxableIncome = periodTaxable * periods;

  const { annualTax, bracket } = computeAnnualTaxTRAIN(annualizedTaxableIncome);
  const withholdingTax = round2(annualTax / periods);

  return {
    taxableIncomeForPeriod: round2(periodTaxable),
    annualizedTaxableIncome: round2(annualizedTaxableIncome),
    annualTax: round2(annualTax),
    withholdingTax,
    bracketDescription: bracket.description,
    bracket,
  };
};

export default {
  computeAnnualTaxTRAIN,
  computeWithholdingTax,
};
