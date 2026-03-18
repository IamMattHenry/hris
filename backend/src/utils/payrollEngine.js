import { computeMandatoryContributions, toMonthlyEquivalentSalary } from './contributionTables.js';
import { computeWithholdingTax } from './taxComputation.js';
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
  const salaryUnit = String(employee.salary_unit || '').toLowerCase() === 'hourly' ? 'hourly' : 'monthly';
  const currentSalary = Number(employee.current_salary) || 0;
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

  const riceCap = Number(deMinimisConfig.rice_subsidy_monthly_cap ?? 2000) * factor;
  const clothingCap = Number(deMinimisConfig.clothing_annual_cap ?? 6000) / 12 * factor;
  const customNonTaxable = custom
    .filter((item) => !item.taxable)
    .reduce((sum, item) => sum + item.amount, 0);

  const nonTaxable = round2(
    Math.min(rice, riceCap)
    + Math.min(clothing, clothingCap)
    + customNonTaxable
  );

  return {
    rice,
    clothing,
    custom,
    grossAllowances,
    nonTaxable,
    taxable: round2(grossAllowances - nonTaxable),
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
          holidayPremiumPay += rates.dailyRate;
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
  const lwopHours = (unpaidLeaveDays * 8) + (absences * 8) + specialHolidayNoWorkHours;

  const basePayForPeriod = rates.basePayForPeriod != null
    ? rates.basePayForPeriod
    : round2(expectedScheduledHours * rates.hourlyRate);

  const lateUndertimeDeduction = round2(minutesToHours(lateMinutes + undertimeMinutes) * rates.hourlyRate);
  const lwopDeduction = round2(lwopHours * rates.hourlyRate);

  const restDayPay = round2(restDayRegularHours * rates.hourlyRate * 1.3);
  const overtimePay = round2(
    (regularOtHours * rates.hourlyRate * 1.25)
    + (restDayOtHours * rates.hourlyRate * 1.69)
    + (specialHolidayOtHours * rates.hourlyRate * 1.69)
    + (regularHolidayOtHours * rates.hourlyRate * 2.6)
  );
  const nightDifferentialPay = round2(nightDiffHours * rates.hourlyRate * 0.1);

  const basicEarnedAfterAttendanceDeductions = round2(Math.max(0, basePayForPeriod - lateUndertimeDeduction - lwopDeduction));
  const thirteenthMonthAccrual = round2(basicEarnedAfterAttendanceDeductions / 12);

  const grossPay = round2(
    basePayForPeriod
    + holidayPremiumPay
    + restDayPay
    + overtimePay
    + nightDifferentialPay
    + allowanceBreakdown.grossAllowances
    + thirteenthMonthAccrual
  );

  const monthlyEquivalentCompensation = toMonthlyEquivalentSalary({
    basicPayPerPeriod: basicEarnedAfterAttendanceDeductions,
    paySchedule,
  }) || rates.monthlyEquivalent;

  const contributions = computeMandatoryContributions({
    monthlyCompensation: monthlyEquivalentCompensation,
    paySchedule,
  });

  const preTaxDeductions = round2(
    contributions.totals.employeeShare
    + lateUndertimeDeduction
    + lwopDeduction
  );

  const taxableIncome = round2(
    Math.max(0, grossPay - allowanceBreakdown.nonTaxable - contributions.totals.employeeShare)
  );

  const withholding = computeWithholdingTax({
    taxableIncomeForPeriod: taxableIncome,
    paySchedule,
  });

  const totalDeductions = round2(preTaxDeductions + withholding.withholdingTax);
  const netPay = round2(grossPay - totalDeductions);

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
      salary_unit: employee.salary_unit,
      current_salary: Number(employee.current_salary) || 0,
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
    },
    deductions: {
      mandatoryContributions: contributions,
      lateUndertimeDeduction,
      lwopDeduction,
      preTaxDeductions,
      taxableIncome,
      withholding,
      totalDeductions,
    },
    netPay,
  };

  return {
    employee_id: employee.employee_id,
    gross_pay: grossPay,
    total_deductions: totalDeductions,
    withholding_tax: withholding.withholdingTax,
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
    payslipData: {
      company_name: settings?.company_name || 'HRIS Company',
      employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      employee_code: employee.employee_code || null,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      earnings: breakdown.earnings,
      deductions: breakdown.deductions,
      government_contributions: breakdown.deductions.mandatoryContributions,
      net_pay: netPay,
      signature_block: 'Employee Signature: ______________________',
      lwop_days: unpaidLeaveDays,
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

    return computeEmployeePayroll({
      employee,
      attendanceRecords: employeeAttendance,
      leaveRecords: employeeLeaves,
      payPeriodStart,
      payPeriodEnd,
      paySchedule,
      settings,
      holidayLookup,
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
