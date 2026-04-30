/**
 * Payroll Implementation Test Suite
 * Verifies all government contributions, taxes, and payslip formatting
 * 
 * Run with: npm test -- payrollImplementationTest.js
 */

import {
  getSssContribution,
  getPhilHealthContribution,
  getPagIbigContribution,
  computeMandatoryContributions,
} from './src/utils/contributionTables.js';

import {
  computeMonthlyTaxTRAIN,
  computePayrollWithholdingTax,
} from './src/utils/taxComputation.js';

import {
  formatPayslipSections,
  formatPayslipForDisplay,
} from './src/utils/payslipFormatter.js';

import {
  validatePayrollBreakdown,
  validateSssContribution,
  validatePhilHealthContribution,
  validatePagIbigContribution,
} from './src/utils/payrollValidator.js';

describe('SSS Contribution', () => {
  test('Should calculate 5% employee and 10% employer for ₱30,000 salary', () => {
    const sss = getSssContribution(30000);
    
    // Employee: (20,000 × 0.045) + (10,000 × 0.005) = 950
    // Employer: (20,000 × 0.095) + (10,000 × 0.005) + 30 = 1,980
    expect(sss.employeeShareMonthly).toBeCloseTo(950, 2);
    expect(sss.employerShareMonthly).toBeCloseTo(1980, 2);
    expect(sss.msc).toBe(30000);
  });

  test('Should clamp MSC to ₱35,000 maximum', () => {
    const sss = getSssContribution(50000);
    expect(sss.msc).toBe(35000);
  });

  test('Should apply EC correctly based on MSC threshold', () => {
    const low = getSssContribution(10000);  // < 14,750
    const high = getSssContribution(20000); // >= 14,750
    
    expect(low.employerCompensationEC).toBe(10);
    expect(high.employerCompensationEC).toBe(30);
  });
});

describe('PhilHealth Contribution', () => {
  test('Should calculate 2.5% for ₱30,000 salary', () => {
    const ph = getPhilHealthContribution(30000);
    expect(ph.employeeShareMonthly).toBeCloseTo(750, 2);
    expect(ph.employerShareMonthly).toBeCloseTo(750, 2);
  });

  test('Should apply minimum base of ₱10,000', () => {
    const ph = getPhilHealthContribution(5000);
    expect(ph.salaryBase).toBe(10000);
    expect(ph.employeeShareMonthly).toBeCloseTo(250, 2);
  });

  test('Should cap at ₱100,000 base salary', () => {
    const ph = getPhilHealthContribution(150000);
    expect(ph.salaryBase).toBe(100000);
    expect(ph.employeeShareMonthly).toBeCloseTo(2500, 2);
  });
});

describe('Pag-IBIG Contribution', () => {
  test('Should apply 1% for salary ≤ ₱1,500', () => {
    const pagibig = getPagIbigContribution(1500);
    expect(pagibig.employeeShareMonthly).toBeCloseTo(15, 2);
    expect(pagibig.employerShareMonthly).toBeCloseTo(30, 2);
  });

  test('Should apply 2% for salary ₱1,500-₱10,000', () => {
    const pagibig = getPagIbigContribution(5000);
    expect(pagibig.employeeShareMonthly).toBeCloseTo(100, 2);
    expect(pagibig.employerShareMonthly).toBeCloseTo(100, 2);
  });

  test('Should cap at ₱200 per employee for salary > ₱10,000', () => {
    const pagibig = getPagIbigContribution(30000);
    expect(pagibig.employeeShareMonthly).toBeCloseTo(200, 2);
    expect(pagibig.employerShareMonthly).toBeCloseTo(200, 2);
    expect(pagibig.fundSalary).toBe(10000);
  });
});

describe('TRAIN Withholding Tax', () => {
  test('Should be exempt for ₱20,833 and below', () => {
    const tax = computeMonthlyTaxTRAIN(20833);
    expect(tax.monthlyTax).toBe(0);
  });

  test('Should apply 15% for ₱20,834-₱33,332', () => {
    const tax = computeMonthlyTaxTRAIN(30050);
    // (30,050 - 20,833) × 15% = 9,217 × 15% = 1,382.55
    expect(tax.monthlyTax).toBeCloseTo(1382.55, 2);
  });

  test('Should apply 20% for ₱33,333-₱66,666', () => {
    const tax = computeMonthlyTaxTRAIN(40000);
    // 2,500 + (40,000 - 33,333) × 20% = 2,500 + 1,333.40 = 3,833.40
    expect(tax.monthlyTax).toBeCloseTo(3833.40, 2);
  });

  test('Should apply 25% for ₱66,667-₱166,666', () => {
    const tax = computeMonthlyTaxTRAIN(100000);
    // 10,833 + (100,000 - 66,667) × 25% = 10,833 + 8,333.25 = 19,166.25
    expect(tax.monthlyTax).toBeCloseTo(19166.25, 2);
  });
});

describe('Contributions by Pay Frequency', () => {
  test('Should apply full contributions for monthly run', () => {
    const contributions = computeMandatoryContributions({
      monthlyCompensation: 30000,
      paySchedule: 'monthly',
      payPeriodStart: '2025-05-01',
      payPeriodEnd: '2025-05-31',
    });
    
    // Should use full monthly amounts
    expect(contributions.sss.employeeShare).toBeGreaterThan(0);
    expect(contributions.philHealth.employeeShare).toBeGreaterThan(0);
    expect(contributions.pagIbig.employeeShare).toBeGreaterThan(0);
  });

  test('Should NOT apply contributions for semi-monthly first run (1-15)', () => {
    const contributions = computeMandatoryContributions({
      monthlyCompensation: 30000,
      paySchedule: 'semi-monthly',
      payPeriodStart: '2025-05-01',
      payPeriodEnd: '2025-05-15',
    });
    
    // First half should have NO contributions
    expect(contributions.sss.employeeShare).toBe(0);
    expect(contributions.philHealth.employeeShare).toBe(0);
    expect(contributions.pagIbig.employeeShare).toBe(0);
  });

  test('Should apply FULL contributions for semi-monthly second run (16-31)', () => {
    const contributions = computeMandatoryContributions({
      monthlyCompensation: 30000,
      paySchedule: 'semi-monthly',
      payPeriodStart: '2025-05-16',
      payPeriodEnd: '2025-05-31',
    });
    
    // Second half should have full monthly contributions
    const fullContributions = computeMandatoryContributions({
      monthlyCompensation: 30000,
      paySchedule: 'monthly',
    });
    
    expect(contributions.sss.employeeShare).toBe(fullContributions.sss.employeeShareMonthly);
    expect(contributions.philHealth.employeeShare).toBe(fullContributions.philHealth.employeeShareMonthly);
    expect(contributions.pagIbig.employeeShare).toBe(fullContributions.pagIbig.employeeShareMonthly);
  });
});

describe('Validation', () => {
  test('Should validate SSS contribution', () => {
    const sss = getSssContribution(30000);
    const validation = validateSssContribution(sss);
    
    expect(validation.errors.length).toBe(0);
  });

  test('Should validate PhilHealth contribution', () => {
    const ph = getPhilHealthContribution(30000);
    const validation = validatePhilHealthContribution(ph);
    
    expect(validation.errors.length).toBe(0);
  });

  test('Should validate Pag-IBIG contribution', () => {
    const pagibig = getPagIbigContribution(30000);
    const validation = validatePagIbigContribution(pagibig);
    
    expect(validation.errors.length).toBe(0);
  });

  test('Should catch PhilHealth above maximum', () => {
    const ph = { employeeShareMonthly: 3000, employerShareMonthly: 3000, salaryBase: 150000 };
    const validation = validatePhilHealthContribution(ph);
    
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors[0].code).toBe('PHILHEALTH_EXCEEDS_MAXIMUM_EE');
  });

  test('Should catch Pag-IBIG above maximum', () => {
    const pagibig = { employeeShareMonthly: 250, employerShareMonthly: 250, totalMonthlyPremium: 500 };
    const validation = validatePagIbigContribution(pagibig);
    
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe('Payslip Formatting', () => {
  test('Should format complete payslip with all sections', () => {
    const breakdown = {
      payPeriod: {
        start: '2025-05-16',
        end: '2025-05-31',
        paySchedule: 'semi-monthly',
      },
      employee: {
        employee_id: 1,
        employee_code: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        employment_type: 'Regular',
        position_id: 1,
      },
      attendance: {
        scheduledWorkDays: 11,
        lateMinutes: 30,
        undertimeMinutes: 0,
      },
      earnings: {
        basePayForPeriod: 15000,
        overtimePay: 500,
        holidayPremiumPay: 0,
        restDayPay: 0,
        nightDifferentialPay: 100,
        allowances: { taxable: 500, nonTaxable: 250 },
        thirteenthMonthAccrual: 1250,
        grossPay: 17600,
      },
      deductions: {
        lateDeduction: 97.73,
        undertimeDeduction: 0,
        lwopDeduction: 0,
        mandatoryContributions: {
          sss: { employeeShare: 950 },
          philHealth: { employeeShare: 750 },
          pagIbig: { employeeShare: 200 },
          totals: { employeeShare: 1900 },
        },
        totalDeductions: 2900,
        withholding: { withholdingTax: 150 },
        taxableIncome: 14800,
      },
    };

    const formatted = formatPayslipSections({
      breakdown,
      net_pay: 14700,
      lwop_days: 0,
      settings: { company_name: 'Test Corp' },
    });

    expect(formatted.company_name).toBe('Test Corp');
    expect(formatted.earnings).toBeDefined();
    expect(formatted.earnings['Basic Pay']).toBeDefined();
    expect(formatted.deductions['SSS Contribution']).toBeDefined();
    expect(formatted.employer_contributions).toBeDefined();
    expect(formatted.summary).toBeDefined();
    expect(formatted.summary.net_pay).toBe(14700);
  });

  test('Should format payslip for display with currency', () => {
    const payslipData = {
      company_name: 'Test Corp',
      summary: {
        gross_pay: 17600,
        total_deductions: 2900,
        net_pay: 14700,
      },
    };

    const displayed = formatPayslipForDisplay(payslipData);
    
    expect(displayed.summary.display_gross_pay).toContain('₱');
    expect(displayed.summary.display_net_pay).toContain('₱');
  });
});

describe('Comprehensive Payroll Example', () => {
  test('Should calculate complete payroll for ₱30,000 salary', () => {
    // Employee: John Doe, ₱30,000 monthly, semi-monthly run (2nd half)
    const monthlyCompensation = 30000;
    const paySchedule = 'semi-monthly';
    
    const sss = getSssContribution(monthlyCompensation);
    const ph = getPhilHealthContribution(monthlyCompensation);
    const pagibig = getPagIbigContribution(monthlyCompensation);
    
    expect(sss.employeeShareMonthly).toBeCloseTo(950, 2);
    expect(ph.employeeShareMonthly).toBeCloseTo(750, 2);
    expect(pagibig.employeeShareMonthly).toBeCloseTo(200, 2);
    
    const totalDeductions = 950 + 750 + 200; // = 1,900
    
    const taxableIncome = 30000 - totalDeductions; // = 28,100
    const tax = computeMonthlyTaxTRAIN(taxableIncome);
    
    // 28,100 is in bracket 20,834-33,332
    // (28,100 - 20,833) × 15% = 7,267 × 15% = 1,090.05
    expect(tax.monthlyTax).toBeCloseTo(1090.05, 2);
    
    const netPay = monthlyCompensation - totalDeductions - tax.monthlyTax;
    expect(netPay).toBeCloseTo(26959.95, 2);
  });
});

export default {
  getSssContribution,
  getPhilHealthContribution,
  getPagIbigContribution,
  computeMonthlyTaxTRAIN,
  formatPayslipSections,
  validatePayrollBreakdown,
};
