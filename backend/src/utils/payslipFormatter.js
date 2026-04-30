/**
 * Payslip Formatter
 * Formats payroll computation results into payslip display structure
 * with full agency names and required validations
 */

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

/**
 * Generate formatted payslip sections with proper labels and validations
 */
export const formatPayslipSections = ({
  breakdown,
  net_pay,
  lwop_days,
  settings = {},
}) => {
  if (!breakdown) {
    throw new Error('Breakdown data is required for payslip formatting.');
  }

  const {
    payPeriod,
    employee,
    attendance,
    earnings,
    deductions,
    compliance,
  } = breakdown;

  const companyName = settings?.company_name || 'HRIS Company';

  // Safely extract all values with defaults
  const basePayForPeriod = round2(earnings?.basePayForPeriod || 0);
  const holidayPremiumPay = round2(earnings?.holidayPremiumPay || 0);
  const restDayPay = round2(earnings?.restDayPay || 0);
  const overtimePay = round2(earnings?.overtimePay || 0);
  const nightDifferentialPay = round2(earnings?.nightDifferentialPay || 0);
  const taxableAllowance = round2(earnings?.allowances?.taxable || 0);
  const nonTaxableAllowance = round2(earnings?.allowances?.nonTaxable || 0);
  const thirteenthMonthAccrual = round2(earnings?.thirteenthMonthAccrual || 0);
  const grossPay = round2(earnings?.grossPay || 0);

  // Validate attendance deductions
  const lateDeductionPeso = round2(deductions?.lateDeduction || 0);
  const undertimeDeductionPeso = round2(deductions?.undertimeDeduction || 0);
  const lwopDeductionPeso = round2(deductions?.lwopDeduction || 0);

  // Earnings Section - Flat structure for easy display
  const earningsSection = {
    basic_pay: {
      label: `Basic Pay (${attendance?.scheduledWorkDays || 0} days × 8 hrs)`,
      amount: basePayForPeriod,
      display: basePayForPeriod,
    },
    late_deduction: {
      label: `Late Deduction (${attendance?.lateMinutes || 0} min)`,
      amount: -lateDeductionPeso,
      display: -lateDeductionPeso,
    },
    undertime_deduction: {
      label: `Undertime Deduction (${attendance?.undertimeMinutes || 0} min)`,
      amount: -undertimeDeductionPeso,
      display: -undertimeDeductionPeso,
    },
    lwop_deduction: {
      label: `Leave Without Pay (${lwop_days || 0} days)`,
      amount: -lwopDeductionPeso,
      display: -lwopDeductionPeso,
    },
    adjusted_basic_pay: {
      label: 'Adjusted Basic Pay',
      amount: round2(basePayForPeriod - lateDeductionPeso - undertimeDeductionPeso - lwopDeductionPeso),
      display: round2(basePayForPeriod - lateDeductionPeso - undertimeDeductionPeso - lwopDeductionPeso),
    },
    overtime_pay: {
      label: 'Overtime Pay',
      amount: overtimePay,
      display: overtimePay,
    },
    rest_day_pay: {
      label: 'Rest Day Pay',
      amount: restDayPay,
      display: restDayPay,
    },
    holiday_pay: {
      label: 'Holiday Premium Pay',
      amount: holidayPremiumPay,
      display: holidayPremiumPay,
    },
    night_differential: {
      label: 'Night Differential Pay',
      amount: nightDifferentialPay,
      display: nightDifferentialPay,
    },
    taxable_allowance: {
      label: 'Taxable Allowance',
      amount: taxableAllowance,
      display: taxableAllowance,
    },
    non_taxable_allowance: {
      label: 'Non-Taxable / De Minimis Allowance',
      amount: nonTaxableAllowance,
      display: nonTaxableAllowance,
    },
    thirteenth_month: {
      label: '13th Month Pay Accrual',
      amount: thirteenthMonthAccrual,
      display: thirteenthMonthAccrual,
    },
    gross_pay: {
      label: 'Gross Pay',
      amount: grossPay,
      display: grossPay,
    },
  };


  // Deductions Section - Flat structure for easy display
  const sssDeduction = round2(deductions?.mandatoryContributions?.sss?.employeeShare || 0);
  const philhealthDeduction = round2(deductions?.mandatoryContributions?.philHealth?.employeeShare || 0);
  const pagibigDeduction = round2(deductions?.mandatoryContributions?.pagIbig?.employeeShare || 0);
  const withholdingtax = round2(deductions?.withholding?.withholdingTax || 0);
  const totalDeductionsAmount = round2(deductions?.totalDeductions || 0);
  const taxableIncomeAmount = round2(deductions?.taxableIncome || 0);

  const deductionsSection = {
    sss_ee: {
      label: 'SSS (EE)',
      amount: -sssDeduction,
      display: -sssDeduction,
    },
    philhealth_ee: {
      label: 'PhilHealth (EE)',
      amount: -philhealthDeduction,
      display: -philhealthDeduction,
    },
    pagibig_ee: {
      label: 'Pag-IBIG (EE)',
      amount: -pagibigDeduction,
      display: -pagibigDeduction,
    },
    late_undertime: {
      label: 'Late / Undertime',
      amount: -(lateDeductionPeso + undertimeDeductionPeso),
      display: -(lateDeductionPeso + undertimeDeductionPeso),
    },
    lwop: {
      label: 'LWOP',
      amount: -lwopDeductionPeso,
      display: -lwopDeductionPeso,
    },
    taxable_income: {
      label: 'Taxable Income',
      amount: taxableIncomeAmount,
      display: taxableIncomeAmount,
    },
    withholding_tax: {
      label: 'Withholding Tax',
      amount: -withholdingtax,
      display: -withholdingtax,
    },
    total_deductions: {
      label: 'Total Deductions',
      amount: -totalDeductionsAmount,
      display: -totalDeductionsAmount,
    },
  };

  // Employer Contributions Section - Flat structure
  const sssEmployerShare = round2(deductions?.mandatoryContributions?.sss?.employerShare || 0);
  const philhealthEmployerShare = round2(deductions?.mandatoryContributions?.philHealth?.employerShare || 0);
  const pagibigEmployerShare = round2(deductions?.mandatoryContributions?.pagIbig?.employerShare || 0);
  const sssEc = round2(deductions?.mandatoryContributions?.sss?.employerCompensationEC || 0);

  const employerContributionsSection = {
    sss_er: {
      label: 'SSS (ER)',
      amount: sssEmployerShare,
      display: sssEmployerShare,
      ec: sssEc,
    },
    philhealth_er: {
      label: 'PhilHealth (ER)',
      amount: philhealthEmployerShare,
      display: philhealthEmployerShare,
    },
    pagibig_er: {
      label: 'Pag-IBIG (ER)',
      amount: pagibigEmployerShare,
      display: pagibigEmployerShare,
    },
    total_employer: {
      label: 'Total Employer Cost',
      amount: round2(sssEmployerShare + philhealthEmployerShare + pagibigEmployerShare),
      display: round2(sssEmployerShare + philhealthEmployerShare + pagibigEmployerShare),
    },
  };

  // Summary Section
  const summarySection = {
    gross_pay: grossPay,
    total_deductions: totalDeductionsAmount,
    net_pay: round2(net_pay || 0),
  };


  return {
    company_name: companyName,
    pay_period_start: payPeriod?.start,
    pay_period_end: payPeriod?.end,
    pay_schedule: payPeriod?.paySchedule,
    employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
    employee_code: employee?.employee_code,
    position_id: employee?.position_id,
    employment_type: employee?.employment_type,
    current_salary: employee?.current_salary,
    hire_date: employee?.hire_date,
    
    // Payslip sections
    earnings: earningsSection,
    deductions: deductionsSection,
    employer_contributions: employerContributionsSection,
    summary: summarySection,
    
    // Compliance notes
    compliance: compliance || {},
    
    // Signature block for printing
    signature_block: 'Employee Signature: ______________________   Date: _______________',
  };
};

/**
 * Format payslip for display/printing with currency formatting
 */
export const formatPayslipForDisplay = (payslipData) => {
  if (!payslipData) return null;

  const formatted = JSON.parse(JSON.stringify(payslipData)); // Deep clone

  // Format amounts with currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₱0.00';
    const num = round2(amount);
    return `₱${Math.abs(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format all sections - add display_amount for each item
  ['earnings', 'deductions', 'employer_contributions'].forEach((section) => {
    if (formatted[section] && typeof formatted[section] === 'object') {
      Object.keys(formatted[section]).forEach((key) => {
        const item = formatted[section][key];
        if (item && typeof item === 'object') {
          // Add display amount for main amount field
          if (item.amount !== undefined) {
            item.display_amount = formatCurrency(item.amount);
          }
          // Format any other amount-like fields
          ['display', 'total', 'monthlyTotal', 'regularShare', 'mpfShare', 'ecAmount', 'ec', 'monthlyAmount'].forEach((field) => {
            if (item[field] !== undefined && field !== 'display') {
              item[`display_${field}`] = formatCurrency(item[field]);
            }
          });
        }
      });
    }
  });

  // Format summary section
  if (formatted.summary) {
    formatted.summary.display_gross_pay = formatCurrency(formatted.summary.gross_pay);
    formatted.summary.display_total_deductions = formatCurrency(formatted.summary.total_deductions);
    formatted.summary.display_net_pay = formatCurrency(formatted.summary.net_pay);
  }

  return formatted;
};

export default {
  formatPayslipSections,
  formatPayslipForDisplay,
};
