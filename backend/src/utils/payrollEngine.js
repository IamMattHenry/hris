import { computeMandatoryContributions, toMonthlyEquivalentSalary } from './contributionTables.js';
import { computePayrollWithholdingTax } from './taxComputation.js';
import { formatPayslipSections, formatPayslipForDisplay } from './payslipFormatter.js';
import { validatePayrollBreakdown } from './payrollValidator.js';
import {
  REGULAR_HOLIDAY,
  SPECIAL_HOLIDAY,
  buildHolidayLookup,
  getHolidayForDate,
} from './holidayCalendar.js';

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const toDateString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    if (value.length >= 10) return value.slice(0, 10);
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (start, end) => {
  const result = [];
  const pointer = new Date(`${start}T00:00:00`);
  const until = new Date(`${end}T00:00:00`);

  while (pointer <= until) {
    const year = pointer.getFullYear();
    const month = String(pointer.getMonth() + 1).padStart(2, '0');
    const day = String(pointer.getDate()).padStart(2, '0');
    result.push(`${year}-${month}-${day}`);
    pointer.setDate(pointer.getDate() + 1);
  }

  return result;
};

const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const timeToMinutes = (value) => {
  if (!value || typeof value !== 'string') return null;
  const timePart = value.includes('T')
    ? value.split('T')[1].slice(0, 8)
    : value.includes(' ')
      ? value.split(' ')[1].slice(0, 8)
      : value.slice(0, 8);

  const [hh, mm] = timePart.split(':').map((v) => Number(v));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return (hh * 60) + mm;
};

const minutesToHours = (value) => (Number(value) || 0) / 60;

const overlapMinutes = (startA, endA, startB, endB) => {
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return Math.max(0, end - start);
};

const getNightDiffHours = (timeIn, timeOut) => {
  const start = timeToMinutes(timeIn);
  const end = timeToMinutes(timeOut);
  if (start === null || end === null) return 0;

  const adjustedEnd = end < start ? end + (24 * 60) : end;

  const windows = [
    [22 * 60, 24 * 60],
    [24 * 60, 30 * 60],
  ];

  let totalMinutes = 0;
  for (const [windowStart, windowEnd] of windows) {
    totalMinutes += overlapMinutes(start, adjustedEnd, windowStart, windowEnd);
  }

  return round2(minutesToHours(totalMinutes));
};

const normalizeDayKey = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
};

const isLeavePaid = (leave) => {
  const leaveType = String(leave?.leave_type || '').toLowerCase();
  const remarks = String(leave?.remarks || '').toLowerCase();

  if (leaveType.includes('lwop') || leaveType.includes('unpaid') || leaveType.includes('without_pay')) {
    return false;
  }

  if (remarks.includes('[non-paid]') || remarks.includes('non-paid') || remarks.includes('without pay')) {
    return false;
  }

  return true;
};

const buildLeaveDateMap = (leaves = [], payPeriodStart, payPeriodEnd) => {
  const byDate = new Map();

  for (const leave of leaves) {
    if (String(leave.status || '').toLowerCase() !== 'approved') continue;

    const start = toDateString(leave.start_date);
    const end = toDateString(leave.end_date);
    if (!start || !end) continue;

    const from = start > payPeriodStart ? start : payPeriodStart;
    const to = end < payPeriodEnd ? end : payPeriodEnd;
    if (from > to) continue;

    const dates = getDateRange(from, to);
    for (const date of dates) {
      byDate.set(date, leave);
    }
  }

  return byDate;
};

const buildAttendanceDateMap = (attendanceRecords = []) => {
  const byDate = new Map();
  for (const row of attendanceRecords) {
    const key = toDateString(row.date);
    if (!key || byDate.has(key)) continue;
    byDate.set(key, row);
  }
  return byDate;
};

const getBreakMinutes = (attendance) => {
  if (!attendance) return 0;

  if (attendance.break_minutes != null) {
    return Number(attendance.break_minutes) || 0;
  }

  if (attendance.break_duration_minutes != null) {
    return Number(attendance.break_duration_minutes) || 0;
  }

  const breakStart = timeToMinutes(attendance.break_start);
  const breakEnd = timeToMinutes(attendance.break_end);
  if (breakStart !== null && breakEnd !== null) {
    return Math.max(0, breakEnd - breakStart);
  }

  return 0;
};

const computeWorkedHours = (attendance) => {
  if (!attendance) return 0;

  const start = timeToMinutes(attendance.time_in);
  const end = timeToMinutes(attendance.time_out);

  if (start === null || end === null) return 0;

  const adjustedEnd = end < start ? end + (24 * 60) : end;
  const totalMinutes = Math.max(0, adjustedEnd - start - getBreakMinutes(attendance));

  return round2(minutesToHours(totalMinutes));
};

const getPayPeriodsPerMonth = (paySchedule = 'semi-monthly') => {
  if (paySchedule === 'monthly') return 1;
  if (paySchedule === 'weekly') return 4.3333333333;
  return 2;
};

const getBaseRates = ({ employee, settings, paySchedule }) => {
  const currentSalaryRaw = Number(employee.current_salary);
  const useFallback = !currentSalaryRaw;
  const currentSalary = useFallback ? (Number(employee.default_salary) || 0) : currentSalaryRaw;

  const rawUnit = useFallback ? (employee.position_salary_unit || 'monthly') : (employee.salary_unit || 'monthly');
  const salaryUnit = String(rawUnit).toLowerCase() === 'hourly' ? 'hourly' : 'monthly';

  const monthlyWorkDays = Number(settings?.monthly_work_days) > 0
    ? Number(settings.monthly_work_days)
    : 22;

  if (salaryUnit === 'hourly') {
    return {
      salaryUnit,
      hourlyRate: round2(currentSalary),
      dailyRate: round2(currentSalary * 8),
      basePayForPeriod: null,
      monthlyEquivalent: round2(currentSalary * 8 * monthlyWorkDays),
    };
  }

  const hourlyRate = round2(currentSalary / (monthlyWorkDays * 8));
  const payPeriodsPerMonth = getPayPeriodsPerMonth(paySchedule);
  const basePayForPeriod = round2(currentSalary / payPeriodsPerMonth);

  return {
    salaryUnit,
    hourlyRate,
    dailyRate: round2(hourlyRate * 8),
    basePayForPeriod,
    monthlyEquivalent: round2(currentSalary),
  };
};

const computeAllowances = ({ settings, paySchedule }) => {
  const allowancesConfig = safeJsonParse(settings?.allowances_config, {}) || {};
  const deMinimisConfig = safeJsonParse(settings?.de_minimis_config, {}) || {};

  const factor = paySchedule === 'monthly'
    ? 1
    : paySchedule === 'weekly'
      ? (1 / 4.3333333333)
      : 0.5;

  const rice = round2((Number(allowancesConfig.rice_subsidy_monthly) || 0) * factor);
  const clothing = round2(((Number(allowancesConfig.clothing_annual) || 0) / 12) * factor);

  const custom = Array.isArray(allowancesConfig.custom)
    ? allowancesConfig.custom.map((item) => {
      const amount = Number(item?.amount) || 0;
      const frequency = String(item?.frequency || 'per_period').toLowerCase();
      let computed = amount;

      if (frequency === 'monthly') computed = amount * factor;
      if (frequency === 'annual' || frequency === 'yearly') computed = (amount / 12) * factor;

      return {
        name: item?.name || 'Custom Allowance',
        amount: round2(computed),
        taxable: Boolean(item?.taxable),
      };
    })
    : [];

  const totalCustom = custom.reduce((sum, item) => sum + item.amount, 0);
  const grossAllowances = round2(rice + clothing + totalCustom);

  const riceCapValue = Number(deMinimisConfig?.rice_subsidy_monthly_cap);
  const clothingCapValue = Number(deMinimisConfig?.clothing_annual_cap);

  const riceCap = Number.isFinite(riceCapValue)
    ? round2(Math.max(0, riceCapValue) * factor)
    : 0;

  const clothingCap = Number.isFinite(clothingCapValue)
    ? round2((Math.max(0, clothingCapValue) / 12) * factor)
    : 0;
  const customNonTaxable = custom
    .filter((item) => !item.taxable)
    .reduce((sum, item) => sum + item.amount, 0);

  const nonTaxable = round2(
    Math.min(rice, riceCap)
    + Math.min(clothing, clothingCap)
    + customNonTaxable
  );

  // Monthly-equivalent de minimis cap for payslip display.
  // Normalise back from the period factor so the payslip always shows
  // the monthly cap regardless of pay schedule.
  const deMinimisMonthlyCapTotal = factor > 0
    ? round2((riceCap + clothingCap) / factor)
    : 0;

  return {
    rice,
    clothing,
    custom,
    grossAllowances,
    nonTaxable,
    taxable: round2(grossAllowances - nonTaxable),
    // caps forwarded for payslip display
    deMinimisMonthlyCapTotal,
    riceCap,
    clothingCap,
  };
};

const computeEmployeePayroll = ({
  employee,
  attendanceRecords,
  leaveRecords,
  payPeriodStart,
  payPeriodEnd,
  paySchedule,
  settings,
  holidayLookup,
  negativeNetPayCarryover = 0,
}) => {
  const attendanceByDate = buildAttendanceDateMap(attendanceRecords);
  const leaveByDate = buildLeaveDateMap(leaveRecords, payPeriodStart, payPeriodEnd);

  const scheduledDays = safeJsonParse(employee.scheduled_days, ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const scheduledDaySet = new Set((Array.isArray(scheduledDays) ? scheduledDays : []).map((day) => String(day).toLowerCase()));

  const rates = getBaseRates({ employee, settings, paySchedule });
  const allowanceBreakdown = computeAllowances({ settings, paySchedule });
  const allDates = getDateRange(payPeriodStart, payPeriodEnd);

  let scheduledWorkDays = 0;
  let workedHours = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let absences = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let nightDiffHours = 0;

  let regularOtHours = 0;
  let restDayOtHours = 0;
  let specialHolidayOtHours = 0;
  let regularHolidayOtHours = 0;
  let restDayRegularHours = 0;

  let holidayPremiumPay = 0;
  let specialHolidayNoWorkHours = 0;

  const rawDailyInputs = [];

  for (const date of allDates) {
    const dayKey = normalizeDayKey(date);
    const isScheduledDay = scheduledDaySet.has(dayKey);
    const holiday = getHolidayForDate(date, holidayLookup);
    const attendance = attendanceByDate.get(date);
    const leave = leaveByDate.get(date);
    const leavePaid = leave ? isLeavePaid(leave) : false;

    if (isScheduledDay) scheduledWorkDays += 1;

    const dailyWorkedHours = computeWorkedHours(attendance);
    const regularHoursForDay = Math.min(8, dailyWorkedHours);
    const overtimeHoursByClock = Math.max(0, dailyWorkedHours - 8);
    const overtimeHoursByField = Number(attendance?.overtime_hours) || 0;
    const overtimeHours = round2(Math.max(overtimeHoursByClock, overtimeHoursByField));

    const shiftLateMinutes = (() => {
      if (!isScheduledDay || !attendance?.time_in || !employee?.scheduled_start_time) return 0;
      const actual = timeToMinutes(attendance.time_in);
      const scheduledStart = timeToMinutes(employee.scheduled_start_time);
      if (actual === null || scheduledStart === null) return 0;
      return Math.max(0, actual - scheduledStart);
    })();

    const shiftUndertimeMinutes = (() => {
      if (!isScheduledDay || !attendance?.time_out) return 0;
      return Math.max(0, Math.round((8 - regularHoursForDay) * 60));
    })();

    lateMinutes += shiftLateMinutes;
    undertimeMinutes += shiftUndertimeMinutes;
    nightDiffHours += getNightDiffHours(attendance?.time_in, attendance?.time_out);

    if (isScheduledDay) {
      if (leave) {
        if (leavePaid) {
          paidLeaveDays += 1;
        } else {
          unpaidLeaveDays += 1;
        }
      } else if (!attendance) {
        if (holiday?.type === REGULAR_HOLIDAY) {
          // Regular holiday unworked pay requires presence (or paid leave) the day before
          const prevDateObj = new Date(`${date}T00:00:00`);
          prevDateObj.setDate(prevDateObj.getDate() - 1);
          const prevDate = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, '0')}-${String(prevDateObj.getDate()).padStart(2, '0')}`;
          const prevAttendance = attendanceByDate.get(prevDate);
          const prevLeave = leaveByDate.get(prevDate);
          const prevLeavePaid = prevLeave ? isLeavePaid(prevLeave) : false;

          if (prevAttendance || prevLeavePaid) {
            holidayPremiumPay += rates.dailyRate;
          } else {
            // forfeited due to absence the day before
          }
        } else if (holiday?.type === SPECIAL_HOLIDAY) {
          specialHolidayNoWorkHours += 8;
        } else {
          absences += 1;
        }
      }
    }

    if (!isScheduledDay && dailyWorkedHours > 0) {
      restDayRegularHours += regularHoursForDay;
    }

    if (holiday?.type === REGULAR_HOLIDAY && dailyWorkedHours > 0) {
      holidayPremiumPay += rates.dailyRate;
    }

    if (holiday?.type === SPECIAL_HOLIDAY && dailyWorkedHours > 0) {
      holidayPremiumPay += rates.dailyRate * 0.3;
    }

    if (overtimeHours > 0) {
      if (holiday?.type === REGULAR_HOLIDAY) {
        regularHolidayOtHours += overtimeHours;
      } else if (holiday?.type === SPECIAL_HOLIDAY) {
        specialHolidayOtHours += overtimeHours;
      } else if (!isScheduledDay) {
        restDayOtHours += overtimeHours;
      } else {
        regularOtHours += overtimeHours;
      }
    }

    workedHours += dailyWorkedHours;

    rawDailyInputs.push({
      date,
      scheduled: isScheduledDay,
      holiday,
      attendance: attendance || null,
      leave: leave || null,
      leavePaid,
      dailyWorkedHours: round2(dailyWorkedHours),
      lateMinutes: shiftLateMinutes,
      undertimeMinutes: shiftUndertimeMinutes,
      overtimeHours,
      nightDiffHours: getNightDiffHours(attendance?.time_in, attendance?.time_out),
    });
  }

  const expectedScheduledHours = scheduledWorkDays * 8;
  
  // Track leaves and absences separately for clarity
  const unpaidLeaveHours = unpaidLeaveDays * 8;
  // Absences: Expected hours - Worked hours - (Paid Leave + Unpaid Leave hours) - Special Holiday no work
  const absenceHours = round2(Math.max(0, expectedScheduledHours - workedHours - (paidLeaveDays * 8) - unpaidLeaveHours - specialHolidayNoWorkHours));

  const basePayForPeriod = rates.basePayForPeriod != null
    ? rates.basePayForPeriod
    : round2(expectedScheduledHours * rates.hourlyRate);

  // Compute attendance deductions separately
  const lateDeduction = round2((lateMinutes / 60) * rates.hourlyRate);
  const undertimeDeduction = round2((undertimeMinutes / 60) * rates.hourlyRate);
  const lateUndertimeDeduction = round2(lateDeduction + undertimeDeduction);
  const absenceDeduction = round2(absenceHours * rates.hourlyRate);
  const unpaidLeaveDeduction = round2(unpaidLeaveHours * rates.hourlyRate);

  const restDayPay = round2(restDayRegularHours * rates.hourlyRate * 1.3);
  const overtimePay = round2(
    (regularOtHours * rates.hourlyRate * 1.25)
    + (restDayOtHours * rates.hourlyRate * 1.69)
    + (specialHolidayOtHours * rates.hourlyRate * 1.69)
    + (regularHolidayOtHours * rates.hourlyRate * 2.6)
  );
  // Night Differential: 10% for private company employees (Labor Code Art. 87(b))
  const nightDifferentialPay = round2(nightDiffHours * rates.hourlyRate * 0.1);

  const basicEarnedAfterAttendanceDeductions = round2(Math.max(0, basePayForPeriod - lateUndertimeDeduction - absenceDeduction - unpaidLeaveDeduction));

  // 13th month accrual is computed on the contracted base pay for the period
  // (not the post-deduction amount). LWOP and absences reduce take-home pay
  // directly via deductions; the 13th month is reconciled at year-end based
  // on total days/months actually worked. Using post-deduction here caused
  // near-zero accruals whenever attendance records were missing for the period.
  const thirteenthMonthAccrual = round2(basePayForPeriod / 12);

  // Gross Pay: Basic (after attendance deductions) + Premium pays + Taxable allowances
  //           (Non-taxable allowances are added AFTER tax for net pay)
  const grossPay = round2(
    basePayForPeriod
    - lateUndertimeDeduction
    - absenceDeduction
    - unpaidLeaveDeduction
    + holidayPremiumPay
    + restDayPay
    + overtimePay
    + nightDifferentialPay
    + allowanceBreakdown.taxable  // Only taxable allowances in gross
  );

  const nonTaxableIncome = round2(
    allowanceBreakdown.nonTaxable
  );

  const monthlyEquivalentCompensation = toMonthlyEquivalentSalary({
    basicPayPerPeriod: basicEarnedAfterAttendanceDeductions,
    paySchedule,
  }) || rates.monthlyEquivalent;

  const contributions = computeMandatoryContributions({
    monthlyCompensation: monthlyEquivalentCompensation,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
  });

  // Only contributions in pre-tax deductions (attendance deductions already in grossPay)
  const preTaxDeductions = round2(
    contributions.totals.employeeShare
  );

  const grossTaxableIncomeForPeriod = round2(
    basePayForPeriod
    - lateUndertimeDeduction
    - absenceDeduction
    - unpaidLeaveDeduction
    + holidayPremiumPay
    + restDayPay
    + overtimePay
    + nightDifferentialPay
    + allowanceBreakdown.taxable
  );

  const taxableIncomeBeforeWithholding = round2(Math.max(0, grossTaxableIncomeForPeriod - contributions.totals.employeeShare));

  const withholding = computePayrollWithholdingTax({
    taxableIncomeForPeriod: taxableIncomeBeforeWithholding,
    paySchedule,
    payPeriodStart,
    payPeriodEnd,
    grossTaxableIncomeForPeriod,
    mandatoryEmployeeContributions: contributions.totals.employeeShare,
    nonTaxableIncomeForPeriod: nonTaxableIncome,
  });

  const taxableIncome = withholding.appliesTax
    ? taxableIncomeBeforeWithholding
    : 0;

  const totalDeductionsBeforeCarryover = round2(preTaxDeductions + withholding.withholdingTax);
  // Net Pay = Gross Pay (already includes attendance deductions subtracted)
  //           - Contributions and Withholding Tax
  //           + Non-taxable allowances (de minimis)
  const rawNetPay = round2(grossPay - totalDeductionsBeforeCarryover + nonTaxableIncome);
  const carryoverBalance = round2(Math.max(0, Number(negativeNetPayCarryover) || 0));
  const carryoverDeduction = round2(Math.min(carryoverBalance, Math.max(0, rawNetPay)));
  const netPay = round2(rawNetPay - carryoverDeduction);
  const totalDeductions = round2(totalDeductionsBeforeCarryover + carryoverDeduction);
  const remainingCarryover = round2(
    Math.max(0, carryoverBalance - Math.max(0, rawNetPay))
    + Math.max(0, -rawNetPay)
  );
  const negativeNetPayNote = rawNetPay < 0 || carryoverBalance > 0
    ? (netPay < 0
      ? `Net pay is negative by ₱${Math.abs(netPay).toFixed(2)}. This balance will be deducted in the next payroll.`
      : carryoverBalance > 0
        ? `A carryover deduction of ₱${carryoverDeduction.toFixed(2)} was applied from a previous negative net pay balance.`
        : null)
    : null;

  const breakdown = {
    payPeriod: {
      start: payPeriodStart,
      end: payPeriodEnd,
      paySchedule,
    },
    employee: {
      employee_id: employee.employee_id,
      employee_code: employee.employee_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      employment_type: employee.employment_type,
      position_id: employee.position_id,
      salary_unit: (!Number(employee.current_salary) ? employee.position_salary_unit : employee.salary_unit) || 'monthly',
      current_salary: !Number(employee.current_salary) ? (Number(employee.default_salary) || 0) : (Number(employee.current_salary) || 0),
      hire_date: employee.hire_date,
      civil_status: employee.civil_status,
    },
    attendance: {
      scheduledWorkDays,
      expectedScheduledHours,
      workedHours: round2(workedHours),
      paidLeaveDays,
      unpaidLeaveDays,
      absences,
      absenceHours: round2(absenceHours),
      lateMinutes,
      undertimeMinutes,
      nightDiffHours: round2(nightDiffHours),
      rawDailyInputs,
    },
    earnings: {
      basePayForPeriod,
      holidayPremiumPay: round2(holidayPremiumPay),
      restDayPay,
      overtimePay,
      nightDifferentialPay,
      allowances: allowanceBreakdown,
      thirteenthMonthAccrual,
      grossPay,
      // de minimis cap for payslip display (monthly equivalent)
      deMinimisMonthlyCapTotal: allowanceBreakdown.deMinimisMonthlyCapTotal,
    },
    deductions: {
      mandatoryContributions: contributions,
      carryoverDeduction,
      attendance: {
        lateMinutes,
        undertimeMinutes,
        lateDeduction,
        undertimeDeduction,
        absenceHours: round2(absenceHours),
        absenceDeduction,
        unpaidLeaveHours: round2(unpaidLeaveHours),
        unpaidLeaveDeduction,
      },
      preTaxDeductions,
      grossTaxableIncomeForPeriod,
      taxableIncome,
      withholding,
      totalDeductions,
    },
    rawNetPay,
    carryoverBalance,
    carryoverDeduction,
    remainingCarryover,
    netPay,
    compliance: {
      governmentMandatedDeductions: true,
      deductionOrderValidated: true,
      warnings: withholding.warnings || [],
      notes: negativeNetPayNote ? [negativeNetPayNote] : [],
    },
  };

  // Validate the payroll breakdown
  const validationResult = validatePayrollBreakdown(breakdown, netPay);

  // Format payslip data
  const formattedPayslip = formatPayslipSections({
    breakdown,
    net_pay: netPay,
    raw_net_pay: rawNetPay,
    carryover_deduction: carryoverDeduction,
    carryover_balance: remainingCarryover,
    negative_net_pay_note: negativeNetPayNote,
    leave_without_pay_days: unpaidLeaveDays,
    settings,
  });

  const displayPayslip = formatPayslipForDisplay(formattedPayslip);

  return {
    employee_id: employee.employee_id,
    gross_pay: grossPay,
    total_deductions: totalDeductions,
    withholding_tax: withholding.withholdingTax,
    raw_net_pay: rawNetPay,
    carryover_deduction: carryoverDeduction,
    carryover_balance: remainingCarryover,
    net_pay: netPay,
    contributions: {
      sss_ee: contributions.sss.employeeShare,
      sss_er: contributions.sss.employerShare,
      philhealth_ee: contributions.philHealth.employeeShare,
      philhealth_er: contributions.philHealth.employerShare,
      pagibig_ee: contributions.pagIbig.employeeShare,
      pagibig_er: contributions.pagIbig.employerShare,
      bir_withholding: withholding.withholdingTax,
    },
    breakdown,
    payslipData: displayPayslip,
    validation: {
      errors: validationResult.errors.map(e => ({
        code: e.code,
        message: e.message,
        details: e.details,
      })),
      warnings: validationResult.warnings.map(w => ({
        code: w.code,
        message: w.message,
        details: w.details,
      })),
    },
  };
};

export const computePayrollRun = ({
  employees = [],
  attendanceRows = [],
  leaveRows = [],
  payPeriodStart,
  payPeriodEnd,
  paySchedule = 'semi-monthly',
  settings = {},
  negativeNetPayCarryovers = {},
}) => {
  const attendanceByEmployee = attendanceRows.reduce((acc, row) => {
    const key = Number(row.employee_id);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

  const leaveByEmployee = leaveRows.reduce((acc, row) => {
    const key = Number(row.employee_id);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

  const holidayOverrides = safeJsonParse(settings?.holiday_overrides, []);
  const holidayLookup = buildHolidayLookup({
    startDate: payPeriodStart,
    endDate: payPeriodEnd,
    overrides: Array.isArray(holidayOverrides) ? holidayOverrides : [],
  });

  const records = employees.map((employee) => {
    const employeeAttendance = attendanceByEmployee.get(Number(employee.employee_id)) || [];
    const employeeLeaves = leaveByEmployee.get(Number(employee.employee_id)) || [];
    const carryoverBalance = Number(negativeNetPayCarryovers?.[Number(employee.employee_id)]) || 0;

    return computeEmployeePayroll({
      employee,
      attendanceRecords: employeeAttendance,
      leaveRecords: employeeLeaves,
      payPeriodStart,
      payPeriodEnd,
      paySchedule,
      settings,
      holidayLookup,
      negativeNetPayCarryover: carryoverBalance,
    });
  });

  const summary = records.reduce((acc, item) => {
    acc.gross_pay += item.gross_pay;
    acc.total_deductions += item.total_deductions;
    acc.withholding_tax += item.withholding_tax;
    acc.net_pay += item.net_pay;
    return acc;
  }, {
    gross_pay: 0,
    total_deductions: 0,
    withholding_tax: 0,
    net_pay: 0,
  });

  return {
    records,
    summary: {
      gross_pay: round2(summary.gross_pay),
      total_deductions: round2(summary.total_deductions),
      withholding_tax: round2(summary.withholding_tax),
      net_pay: round2(summary.net_pay),
      employee_count: records.length,
    },
  };
};

export default {
  computePayrollRun,
};