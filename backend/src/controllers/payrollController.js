import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { computePayrollRun } from '../utils/payrollEngine.js';
import { applyPenaltyDeductionsForPayrollRecord } from './penaltyController.js';
import {
  BUDGET_NAMES,
  BudgetValidationError,
  ensureAmountWithinBudget,
  getFinanceBudgetsSnapshot,
} from '../services/financeBudgetService.js';

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const parseJson = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const ensureDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return value.slice(0, 10);
};

const getTodayDateInManila = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date())
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  const { year, month, day } = parts;
  return `${year}-${month}-${day}`;
};

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
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

const addDays = (value, days) => {
  const date = toDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + (Number(days) || 0));
  return formatDate(date);
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

const startOfWeekMonday = (value) => {
  const date = toDate(value);
  if (!date) return null;

  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return formatDate(date);
};

const derivePayPeriodFromSchedule = ({ referenceDate, paySchedule }) => {
  const ref = ensureDate(referenceDate);
  if (!ref) return null;

  if (paySchedule === 'monthly') {
    return {
      start: startOfMonth(ref),
      end: endOfMonth(ref),
    };
  }

  if (paySchedule === 'weekly') {
    const start = startOfWeekMonday(ref);
    return {
      start,
      end: addDays(start, 6),
    };
  }

  const refDate = toDate(ref);
  if (!refDate) return null;

  const dayOfMonth = refDate.getDate();
  if (dayOfMonth <= 15) {
    return {
      start: startOfMonth(ref),
      end: `${ref.slice(0, 8)}15`,
    };
  }

  return {
    start: `${ref.slice(0, 8)}16`,
    end: endOfMonth(ref),
  };
};

const validatePayPeriodStructure = ({ payPeriodStart, payPeriodEnd, paySchedule }) => {
  const expected = derivePayPeriodFromSchedule({
    referenceDate: payPeriodStart,
    paySchedule,
  });

  if (!expected?.start || !expected?.end) {
    return {
      valid: false,
      message: 'Unable to derive pay period from the provided schedule.',
    };
  }

  if (expected.start !== payPeriodStart || expected.end !== payPeriodEnd) {
    return {
      valid: false,
      message: `Invalid pay period for ${paySchedule}. Expected ${expected.start} to ${expected.end}.`,
      expected,
    };
  }

  return {
    valid: true,
    expected,
  };
};

const normalizeScopeFilters = (scope = {}) => {
  const scopeInput = Array.isArray(scope)
    ? { employee_ids: scope }
    : (scope || {});

  const normalizedEmployeeIds = Array.isArray(scopeInput.employee_ids)
    ? Array.from(new Set(scopeInput.employee_ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id))))
      .sort((a, b) => a - b)
    : [];

  const normalizedDepartmentId = scopeInput.department_id != null
    ? Number(scopeInput.department_id)
    : null;

  const normalizedEmploymentType = scopeInput.employment_type
    ? String(scopeInput.employment_type).trim().toLowerCase()
    : null;

  return {
    employee_ids: normalizedEmployeeIds.length ? normalizedEmployeeIds : null,
    department_id: Number.isInteger(normalizedDepartmentId) ? normalizedDepartmentId : null,
    employment_type: normalizedEmploymentType || null,
  };
};

const buildScopeKey = (scope = {}) => JSON.stringify(normalizeScopeFilters(scope));

const validatePayPeriodContinuity = async ({
  payPeriodStart,
  payPeriodEnd,
  scopeFilters,
}) => {
  const runs = await db.getAll(
    `SELECT id, pay_period_start, pay_period_end, employee_scope
     FROM payroll_runs
     ORDER BY pay_period_start ASC, id ASC`
  );

  const scopeKey = buildScopeKey(scopeFilters);

  const scopedRuns = runs
    .map((run) => ({
      ...run,
      normalized_scope: normalizeScopeFilters(parseJson(run.employee_scope, {})),
    }))
    .filter((run) => buildScopeKey(run.normalized_scope) === scopeKey);

  const overlap = scopedRuns.find((run) => (
    payPeriodStart <= run.pay_period_end && payPeriodEnd >= run.pay_period_start
  ));

  if (overlap) {
    return {
      valid: false,
      message: `Pay period overlaps existing payroll run #${overlap.id} (${overlap.pay_period_start} to ${overlap.pay_period_end}) for the same scope.`,
    };
  }

  const previous = scopedRuns
    .filter((run) => run.pay_period_end < payPeriodStart)
    .sort((a, b) => b.pay_period_end.localeCompare(a.pay_period_end))[0] || null;

  if (previous) {
    const expectedStart = addDays(previous.pay_period_end, 1);
    if (expectedStart !== payPeriodStart) {
      return {
        valid: false,
        message: `Gap detected after payroll run #${previous.id}. Expected next period to start on ${expectedStart}.`,
      };
    }
  }

  const next = scopedRuns
    .filter((run) => run.pay_period_start > payPeriodEnd)
    .sort((a, b) => a.pay_period_start.localeCompare(b.pay_period_start))[0] || null;

  if (next) {
    const expectedEnd = addDays(next.pay_period_start, -1);
    if (expectedEnd !== payPeriodEnd) {
      return {
        valid: false,
        message: `Gap detected before payroll run #${next.id}. Expected previous period to end on ${expectedEnd}.`,
      };
    }
  }

  return { valid: true };
};

const sqlIn = (values = []) => values.map(() => '?').join(', ');

const toCsv = (rows = []) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);

  const escape = (value) => {
    if (value == null) return '';
    const asText = String(value);
    if (asText.includes(',') || asText.includes('"') || asText.includes('\n')) {
      return `"${asText.replace(/"/g, '""')}"`;
    }
    return asText;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(','));
  }
  return lines.join('\n');
};

const getLatestPayrollSettings = async () => {
  const settings = await db.getOne(
    `SELECT *
     FROM payroll_settings
     WHERE is_active = 1
     ORDER BY effective_date DESC, id DESC
     LIMIT 1`
  );

  if (!settings) {
    return {
      pay_schedule: 'semi-monthly',
      allowances_config: {
        rice_subsidy_monthly: 2000,
        clothing_annual: 6000,
        custom: [],
      },
      holiday_overrides: [],
      de_minimis_config: {
        rice_subsidy_monthly_cap: 2000,
        clothing_annual_cap: 6000,
      },
      company_name: 'HRIS Company',
      monthly_work_days: 22,
    };
  }

  return {
    ...settings,
    allowances_config: parseJson(settings.allowances_config, {
      rice_subsidy_monthly: 2000,
      clothing_annual: 6000,
      custom: [],
    }),
    holiday_overrides: parseJson(settings.holiday_overrides, []),
    de_minimis_config: parseJson(settings.de_minimis_config, {
      rice_subsidy_monthly_cap: 2000,
      clothing_annual_cap: 6000,
    }),
  };
};

const serializeJson = (value) => JSON.stringify(value ?? null);

const writeActivityLog = async ({ userId, action, description }) => {
  try {
    await db.insert('activity_logs', {
      user_id: userId,
      action,
      module: 'payroll',
      description,
      created_by: userId,
    });
  } catch (error) {
    logger.error('Failed to write payroll activity log:', error);
  }
};

export const getPayrollRuns = async (req, res, next) => {
  try {
    const { department_id, employment_type } = req.query;

    const runs = await db.getAll(
      `SELECT
         pr.id,
         pr.pay_period_start,
         pr.pay_period_end,
         pr.pay_schedule,
         pr.status,
         pr.employee_scope,
         pr.created_by,
         pr.finalized_by,
         pr.finalized_at,
         pr.created_at,
         COALESCE(SUM(rec.gross_pay), 0) AS gross_pay,
         COALESCE(SUM(rec.total_deductions), 0) AS total_deductions,
         COALESCE(SUM(rec.net_pay), 0) AS net_pay,
         COUNT(rec.id) AS employee_count
       FROM payroll_runs pr
       LEFT JOIN payroll_records rec ON rec.run_id = pr.id
       GROUP BY pr.id
       ORDER BY pr.created_at DESC`
    );

    let normalizedRuns = runs.map((run) => ({
      ...run,
      scope_filters: normalizeScopeFilters(parseJson(run.employee_scope, {})),
    }));

    // Filter by department_id or employment_type if provided
    if (department_id != null || employment_type) {
      const deptIdFilter = department_id != null ? Number(department_id) : null;
      const typeFilter = employment_type ? String(employment_type).toLowerCase() : null;

      normalizedRuns = normalizedRuns.filter((run) => {
        const filters = run.scope_filters;
        
        if (deptIdFilter != null && filters.department_id !== deptIdFilter) {
          return false;
        }
        
        if (typeFilter && (!filters.employment_type || String(filters.employment_type).toLowerCase() !== typeFilter)) {
          return false;
        }
        
        return true;
      });
    }

    res.json({
      success: true,
      data: normalizedRuns,
      count: normalizedRuns.length,
      message: 'Payroll runs fetched successfully',
    });
  } catch (error) {
    logger.error('Get payroll runs error:', error);
    next(error);
  }
};

export const createPayrollRun = async (req, res, next) => {
  try {
    const {
      pay_period_start,
      pay_period_end,
      pay_schedule,
      employee_ids,
      department_id,
      employment_type,
      notes,
    } = req.body || {};

    const periodStart = ensureDate(pay_period_start);
    const periodEnd = ensureDate(pay_period_end);

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Valid pay_period_start and pay_period_end are required (YYYY-MM-DD).',
      });
    }

    if (periodStart > periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'pay_period_start must not be later than pay_period_end.',
      });
    }

    const todayDate = getTodayDateInManila();
    if (periodEnd >= todayDate) {
      return res.status(400).json({
        success: false,
        message: `Payroll period must be fully completed. pay_period_end must be before today (${todayDate}).`,
      });
    }

    const settings = await getLatestPayrollSettings();
    const resolvedPaySchedule = ['weekly', 'semi-monthly', 'monthly'].includes(pay_schedule)
      ? pay_schedule
      : settings.pay_schedule || 'semi-monthly';

    const employeeScope = Array.isArray(employee_ids)
      ? employee_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [];

    const scopeFilters = normalizeScopeFilters({
      employee_ids: employeeScope,
      department_id,
      employment_type,
    });

    const structureValidation = validatePayPeriodStructure({
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      paySchedule: resolvedPaySchedule,
    });

    if (!structureValidation.valid) {
      return res.status(400).json({
        success: false,
        message: structureValidation.message,
        expected_period: structureValidation.expected || null,
      });
    }

    const continuityValidation = await validatePayPeriodContinuity({
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      scopeFilters,
    });

    if (!continuityValidation.valid) {
      return res.status(409).json({
        success: false,
        message: continuityValidation.message,
      });
    }

    const employeeWhere = ['e.status IN (?, ?)'];
    const employeeParams = ['active', 'on-leave'];

    if (employeeScope.length) {
      employeeWhere.push(`e.employee_id IN (${sqlIn(employeeScope)})`);
      employeeParams.push(...employeeScope);
    }

    if (department_id != null) {
      const deptId = Number(department_id);
      if (!Number.isNaN(deptId)) {
        employeeWhere.push('e.department_id = ?');
        employeeParams.push(deptId);
      }
    }

    if (scopeFilters.employment_type) {
      const typeStr = String(scopeFilters.employment_type).trim();
      if (typeStr) {
        employeeWhere.push('LOWER(e.employment_type) = LOWER(?)');
        employeeParams.push(typeStr);
      }
    }

    const employees = await db.getAll(
      `SELECT
         e.employee_id,
         e.employee_code,
         e.first_name,
         e.last_name,
         e.position_id,
         e.employment_type,
         e.hire_date,
         e.civil_status,
         e.current_salary,
         e.salary_unit,
         e.scheduled_days,
         e.scheduled_start_time,
         e.scheduled_end_time
       FROM employees e
       WHERE ${employeeWhere.join(' AND ')}
       ORDER BY e.employee_id ASC`,
      employeeParams
    );

    if (!employees.length) {
      return res.status(404).json({
        success: false,
        message: 'No employees found for the selected payroll scope.',
      });
    }

    const employeeIds = employees.map((row) => Number(row.employee_id));

    const attendanceRows = await db.getAll(
      `SELECT *
       FROM attendance
       WHERE date BETWEEN ? AND ?
         AND employee_id IN (${sqlIn(employeeIds)})`,
      [periodStart, periodEnd, ...employeeIds]
    );

    const leaveRows = await db.getAll(
      `SELECT *
       FROM leaves
       WHERE employee_id IN (${sqlIn(employeeIds)})
         AND status = 'approved'
         AND start_date <= ?
         AND end_date >= ?`,
      [...employeeIds, periodEnd, periodStart]
    );

    const computed = computePayrollRun({
      employees,
      attendanceRows,
      leaveRows,
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      paySchedule: resolvedPaySchedule,
      settings,
    });

    let payrollBudgetValidation = null;
    try {
      payrollBudgetValidation = await ensureAmountWithinBudget({
        budgetName: BUDGET_NAMES.PAYROLL,
        amount: Number(computed.summary?.gross_pay) || 0,
        amountLabel: 'Computed payroll total gross pay',
      });
    } catch (budgetError) {
      if (budgetError instanceof BudgetValidationError) {
        logger.error('Payroll budget validation failed during payroll run creation:', budgetError);
        return res.status(budgetError.statusCode).json({
          success: false,
          message: budgetError.publicMessage,
          data: budgetError.data || undefined,
        });
      }
      throw budgetError;
    }

    await db.beginTransaction();
    try {
      const runId = await db.transactionInsert('payroll_runs', {
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        pay_schedule: resolvedPaySchedule,
        status: 'draft',
        employee_scope: serializeJson(scopeFilters),
        notes: notes || null,
        created_by: req.user?.user_id || null,
      });

      for (const item of computed.records) {
        const recordId = await db.transactionInsert('payroll_records', {
          run_id: runId,
          employee_id: item.employee_id,
          gross_pay: item.gross_pay,
          total_deductions: item.total_deductions,
          withholding_tax: item.withholding_tax,
          net_pay: item.net_pay,
          json_breakdown: serializeJson(item.breakdown),
          payslip_data: serializeJson(item.payslipData),
          raw_inputs: serializeJson(item.breakdown?.attendance?.rawDailyInputs || []),
        });

        await db.transactionInsert('payroll_contributions', {
          record_id: recordId,
          employee_id: item.employee_id,
          sss_ee: item.contributions.sss_ee,
          sss_er: item.contributions.sss_er,
          philhealth_ee: item.contributions.philhealth_ee,
          philhealth_er: item.contributions.philhealth_er,
          pagibig_ee: item.contributions.pagibig_ee,
          pagibig_er: item.contributions.pagibig_er,
          bir_withholding: item.contributions.bir_withholding,
          period_start: periodStart,
          period_end: periodEnd,
        });

        const appliedPenalty = await applyPenaltyDeductionsForPayrollRecord({
          runId,
          recordId,
          employeeId: item.employee_id,
          periodEnd,
          userId: req.user?.user_id || null,
        });

        if (appliedPenalty.totalDeducted > 0) {
          const updatedTotalDeductions = round2((Number(item.total_deductions) || 0) + appliedPenalty.totalDeducted);
          const updatedNetPay = round2((Number(item.gross_pay) || 0) - updatedTotalDeductions);

          const updatedBreakdown = {
            ...(item.breakdown || {}),
            deductions: {
              ...(item.breakdown?.deductions || {}),
              penaltyDeductions: {
                total: appliedPenalty.totalDeducted,
                items: appliedPenalty.appliedDeductions,
              },
              totalDeductions: updatedTotalDeductions,
            },
            netPay: updatedNetPay,
          };

          const updatedPayslipData = {
            ...(item.payslipData || {}),
            deductions: updatedBreakdown.deductions,
            penalty_deductions: {
              total: appliedPenalty.totalDeducted,
              items: appliedPenalty.appliedDeductions,
            },
            net_pay: updatedNetPay,
          };

          await db.transactionUpdate('payroll_records', {
            total_deductions: updatedTotalDeductions,
            net_pay: updatedNetPay,
            json_breakdown: serializeJson(updatedBreakdown),
            payslip_data: serializeJson(updatedPayslipData),
          }, 'id = ?', [recordId]);

          item.total_deductions = updatedTotalDeductions;
          item.net_pay = updatedNetPay;
          item.breakdown = updatedBreakdown;
          item.payslipData = updatedPayslipData;
        }
      }

      await db.commit();

      const scopeDesc = [];
      if (scopeFilters?.department_id) scopeDesc.push(`Department: ${scopeFilters.department_id}`);
      if (scopeFilters?.employment_type) scopeDesc.push(`Employment Type: ${scopeFilters.employment_type}`);
      const scopeStr = scopeDesc.length ? ` [${scopeDesc.join(', ')}]` : '';

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'CREATE',
        description: `Created payroll run #${runId} (${periodStart} to ${periodEnd}, ${computed.records.length} employees)${scopeStr}`,
      });

      return res.status(201).json({
        success: true,
        message: 'Payroll run created successfully',
        data: {
          id: runId,
          status: 'draft',
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
          pay_schedule: resolvedPaySchedule,
          scope_filters: scopeFilters,
          summary: computed.summary,
          budget: payrollBudgetValidation?.budget || null,
        },
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Create payroll run error:', error);
    next(error);
  }
};

export const getPayrollRunDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const run = await db.getOne('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Payroll run not found',
      });
    }

    const records = await db.getAll(
      `SELECT
         rec.*,
         e.employee_code,
         e.first_name,
         e.last_name,
         c.sss_ee,
         c.sss_er,
         c.philhealth_ee,
         c.philhealth_er,
         c.pagibig_ee,
         c.pagibig_er,
         c.bir_withholding
       FROM payroll_records rec
       LEFT JOIN employees e ON e.employee_id = rec.employee_id
       LEFT JOIN payroll_contributions c ON c.record_id = rec.id
       WHERE rec.run_id = ?
       ORDER BY e.last_name ASC, e.first_name ASC`,
      [id]
    );

    const normalizedRecords = records.map((row) => ({
      ...row,
      json_breakdown: parseJson(row.json_breakdown, {}),
      payslip_data: parseJson(row.payslip_data, {}),
      raw_inputs: parseJson(row.raw_inputs, []),
      override_meta: parseJson(row.override_meta, null),
    }));

    const summary = normalizedRecords.reduce((acc, row) => {
      acc.gross_pay += Number(row.gross_pay) || 0;
      acc.total_deductions += Number(row.total_deductions) || 0;
      acc.withholding_tax += Number(row.withholding_tax) || 0;
      acc.net_pay += Number(row.net_pay) || 0;
      return acc;
    }, {
      gross_pay: 0,
      total_deductions: 0,
      withholding_tax: 0,
      net_pay: 0,
    });

    res.json({
      success: true,
      message: 'Payroll run detail fetched successfully',
      data: {
        ...run,
        scope_filters: normalizeScopeFilters(parseJson(run.employee_scope, {})),
        records: normalizedRecords,
        summary: {
          gross_pay: round2(summary.gross_pay),
          total_deductions: round2(summary.total_deductions),
          withholding_tax: round2(summary.withholding_tax),
          net_pay: round2(summary.net_pay),
          employee_count: normalizedRecords.length,
        },
      },
    });
  } catch (error) {
    logger.error('Get payroll run detail error:', error);
    next(error);
  }
};

export const deletePayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;

    const run = await db.getOne('SELECT id, pay_period_start, pay_period_end, status FROM payroll_runs WHERE id = ?', [id]);
    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Payroll run not found',
      });
    }

    if (run.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Finalized payroll runs are immutable and cannot be deleted.',
      });
    }

    await db.beginTransaction();
    try {
      await db.transactionQuery('DELETE FROM payroll_runs WHERE id = ?', [id]);
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }

    await writeActivityLog({
      userId: req.user?.user_id || null,
      action: 'DELETE',
      description: `Deleted payroll run #${id} (${run.pay_period_start} to ${run.pay_period_end})`,
    });

    res.json({
      success: true,
      message: 'Payroll run deleted successfully',
      data: {
        id: Number(id),
        status: 'deleted',
      },
    });
  } catch (error) {
    logger.error('Delete payroll run error:', error);
    next(error);
  }
};

export const finalizePayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;

    const run = await db.getOne('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Payroll run not found',
      });
    }

    if (run.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Payroll run is already finalized and immutable.',
      });
    }

    await db.update('payroll_runs', {
      status: 'finalized',
      finalized_by: req.user?.user_id || null,
      finalized_at: new Date(),
    }, 'id = ?', [id]);

    await writeActivityLog({
      userId: req.user?.user_id || null,
      action: 'UPDATE',
      description: `Finalized payroll run #${id}`,
    });

    res.json({
      success: true,
      message: 'Payroll run finalized successfully. The run is now immutable.',
      data: {
        id: Number(id),
        status: 'finalized',
      },
    });
  } catch (error) {
    logger.error('Finalize payroll run error:', error);
    next(error);
  }
};

export const getPayrollPayslip = async (req, res, next) => {
  try {
    const { id, employeeId } = req.params;

    const run = await db.getOne('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    const record = await db.getOne(
      `SELECT
         rec.*,
         e.employee_code,
         e.first_name,
         e.last_name,
         e.position_id,
         e.employment_type,
         c.sss_ee,
         c.sss_er,
         c.philhealth_ee,
         c.philhealth_er,
         c.pagibig_ee,
         c.pagibig_er,
         c.bir_withholding
       FROM payroll_records rec
       LEFT JOIN employees e ON e.employee_id = rec.employee_id
       LEFT JOIN payroll_contributions c ON c.record_id = rec.id
       WHERE rec.run_id = ? AND rec.employee_id = ?
       LIMIT 1`,
      [id, employeeId]
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Payslip record not found for employee in this run',
      });
    }

    const payslipData = parseJson(record.payslip_data, {});
    const breakdown = parseJson(record.json_breakdown, {});

    res.json({
      success: true,
      message: 'Payslip fetched successfully',
      data: {
        run: {
          id: run.id,
          pay_period_start: run.pay_period_start,
          pay_period_end: run.pay_period_end,
          pay_schedule: run.pay_schedule,
          status: run.status,
        },
        record: {
          id: record.id,
          employee_id: record.employee_id,
          employee_code: record.employee_code,
          employee_name: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
          gross_pay: Number(record.gross_pay) || 0,
          total_deductions: Number(record.total_deductions) || 0,
          withholding_tax: Number(record.withholding_tax) || 0,
          net_pay: Number(record.net_pay) || 0,
          contributions: {
            sss_ee: Number(record.sss_ee) || 0,
            sss_er: Number(record.sss_er) || 0,
            philhealth_ee: Number(record.philhealth_ee) || 0,
            philhealth_er: Number(record.philhealth_er) || 0,
            pagibig_ee: Number(record.pagibig_ee) || 0,
            pagibig_er: Number(record.pagibig_er) || 0,
            bir_withholding: Number(record.bir_withholding) || 0,
          },
          payslip_data: payslipData,
          breakdown,
        },
      },
    });
  } catch (error) {
    logger.error('Get payroll payslip error:', error);
    next(error);
  }
};

export const getPayrollContributions = async (req, res, next) => {
  try {
    const { start_date, end_date, run_id } = req.query;

    const clauses = [];
    const params = [];

    if (start_date) {
      clauses.push('c.period_start >= ?');
      params.push(start_date);
    }
    if (end_date) {
      clauses.push('c.period_end <= ?');
      params.push(end_date);
    }
    if (run_id) {
      clauses.push('r.id = ?');
      params.push(run_id);
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await db.getAll(
      `SELECT
         c.*, r.id AS run_id,
         r.pay_period_start,
         r.pay_period_end,
         e.employee_code,
         e.first_name,
         e.last_name
       FROM payroll_contributions c
       JOIN payroll_records rec ON rec.id = c.record_id
       JOIN payroll_runs r ON r.id = rec.run_id
       LEFT JOIN employees e ON e.employee_id = c.employee_id
       ${whereSql}
       ORDER BY c.period_start DESC, e.last_name ASC`,
      params
    );

    const totals = rows.reduce((acc, row) => {
      acc.sss_ee += Number(row.sss_ee) || 0;
      acc.sss_er += Number(row.sss_er) || 0;
      acc.philhealth_ee += Number(row.philhealth_ee) || 0;
      acc.philhealth_er += Number(row.philhealth_er) || 0;
      acc.pagibig_ee += Number(row.pagibig_ee) || 0;
      acc.pagibig_er += Number(row.pagibig_er) || 0;
      acc.bir_withholding += Number(row.bir_withholding) || 0;
      return acc;
    }, {
      sss_ee: 0,
      sss_er: 0,
      philhealth_ee: 0,
      philhealth_er: 0,
      pagibig_ee: 0,
      pagibig_er: 0,
      bir_withholding: 0,
    });

    res.json({
      success: true,
      message: 'Payroll contributions fetched successfully',
      data: {
        rows,
        totals: {
          sss_ee: round2(totals.sss_ee),
          sss_er: round2(totals.sss_er),
          philhealth_ee: round2(totals.philhealth_ee),
          philhealth_er: round2(totals.philhealth_er),
          pagibig_ee: round2(totals.pagibig_ee),
          pagibig_er: round2(totals.pagibig_er),
          bir_withholding: round2(totals.bir_withholding),
        },
      },
    });
  } catch (error) {
    logger.error('Get payroll contributions error:', error);
    next(error);
  }
};

export const exportPayrollContributions = async (req, res, next) => {
  try {
    const { type } = req.params;
    const allowed = new Set(['sss', 'philhealth', 'pagibig', 'bir']);

    if (!allowed.has(type)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported export type. Use sss, philhealth, pagibig, or bir.',
      });
    }

    const rows = await db.getAll(
      `SELECT
         c.*, r.id AS run_id, r.pay_period_start, r.pay_period_end,
         e.employee_code, e.first_name, e.last_name
       FROM payroll_contributions c
       JOIN payroll_records rec ON rec.id = c.record_id
       JOIN payroll_runs r ON r.id = rec.run_id
       LEFT JOIN employees e ON e.employee_id = c.employee_id
       ORDER BY c.period_start DESC, e.last_name ASC`
    );

    let shaped = [];
    let filename = '';

    if (type === 'sss') {
      filename = `sss_r3_export_${Date.now()}.csv`;
      shaped = rows.map((row) => ({
        period_start: row.period_start,
        period_end: row.period_end,
        employee_code: row.employee_code,
        employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        sss_employee_share: Number(row.sss_ee) || 0,
        sss_employer_share: Number(row.sss_er) || 0,
      }));
    }

    if (type === 'philhealth') {
      filename = `philhealth_rf1_export_${Date.now()}.csv`;
      shaped = rows.map((row) => ({
        period_start: row.period_start,
        period_end: row.period_end,
        employee_code: row.employee_code,
        employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        philhealth_employee_share: Number(row.philhealth_ee) || 0,
        philhealth_employer_share: Number(row.philhealth_er) || 0,
      }));
    }

    if (type === 'pagibig') {
      filename = `pagibig_mcrf_export_${Date.now()}.csv`;
      shaped = rows.map((row) => ({
        period_start: row.period_start,
        period_end: row.period_end,
        employee_code: row.employee_code,
        employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        pagibig_employee_share: Number(row.pagibig_ee) || 0,
        pagibig_employer_share: Number(row.pagibig_er) || 0,
      }));
    }

    if (type === 'bir') {
      filename = `bir_1601c_export_${Date.now()}.csv`;
      shaped = rows.map((row) => ({
        period_start: row.period_start,
        period_end: row.period_end,
        employee_code: row.employee_code,
        employee_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        withholding_tax: Number(row.bir_withholding) || 0,
      }));
    }

    const csv = toCsv(shaped);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Export payroll contributions error:', error);
    next(error);
  }
};

export const getPayrollSettings = async (req, res, next) => {
  try {
    const current = await getLatestPayrollSettings();
    const history = await db.getAll(
      `SELECT id, pay_schedule, company_name, monthly_work_days, effective_date, is_active, created_by, created_at
       FROM payroll_settings
       ORDER BY effective_date DESC, id DESC
       LIMIT 20`
    );

    let budgets = null;
    try {
      budgets = await getFinanceBudgetsSnapshot();
    } catch (budgetError) {
      if (budgetError instanceof BudgetValidationError) {
        logger.error('Finance budget fetch failed while loading payroll settings:', budgetError);
        return res.status(budgetError.statusCode).json({
          success: false,
          message: budgetError.publicMessage,
          data: budgetError.data || undefined,
        });
      }
      throw budgetError;
    }

    res.json({
      success: true,
      message: 'Payroll settings fetched successfully',
      data: {
        current,
        history,
        budgets,
      },
    });
  } catch (error) {
    logger.error('Get payroll settings error:', error);
    next(error);
  }
};

export const updatePayrollSettings = async (req, res, next) => {
  try {
    const {
      pay_schedule,
      allowances_config,
      holiday_overrides,
      de_minimis_config,
      company_name,
      monthly_work_days,
      effective_date,
    } = req.body || {};

    const schedule = ['weekly', 'semi-monthly', 'monthly'].includes(pay_schedule)
      ? pay_schedule
      : null;

    if (!schedule) {
      return res.status(400).json({
        success: false,
        message: 'pay_schedule must be one of weekly, semi-monthly, or monthly',
      });
    }

    await db.beginTransaction();
    try {
      await db.transactionQuery('UPDATE payroll_settings SET is_active = 0 WHERE is_active = 1');

      const settingId = await db.transactionInsert('payroll_settings', {
        pay_schedule: schedule,
        allowances_config: serializeJson(allowances_config || {}),
        holiday_overrides: serializeJson(Array.isArray(holiday_overrides) ? holiday_overrides : []),
        de_minimis_config: serializeJson(de_minimis_config || {}),
        company_name: company_name || 'HRIS Company',
        monthly_work_days: Number(monthly_work_days) > 0 ? Number(monthly_work_days) : 22,
        effective_date: ensureDate(effective_date) || new Date().toISOString().slice(0, 10),
        is_active: 1,
        created_by: req.user?.user_id || null,
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'UPDATE',
        description: `Updated payroll settings (#${settingId})`,
      });

      return res.json({
        success: true,
        message: 'Payroll settings updated successfully',
        data: {
          id: settingId,
        },
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Update payroll settings error:', error);
    next(error);
  }
};

export const overridePayrollRecord = async (req, res, next) => {
  try {
    const { id, employeeId } = req.params;
    const {
      gross_pay,
      total_deductions,
      withholding_tax,
      net_pay,
      reason,
    } = req.body || {};

    const run = await db.getOne('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (run.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a finalized payroll run. This run is immutable.',
      });
    }

    const record = await db.getOne(
      'SELECT * FROM payroll_records WHERE run_id = ? AND employee_id = ? LIMIT 1',
      [id, employeeId]
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found for employee in this run',
      });
    }

    const previousValues = {
      gross_pay: Number(record.gross_pay) || 0,
      total_deductions: Number(record.total_deductions) || 0,
      withholding_tax: Number(record.withholding_tax) || 0,
      net_pay: Number(record.net_pay) || 0,
    };

    const updatedValues = {
      gross_pay: gross_pay != null ? Number(gross_pay) : previousValues.gross_pay,
      total_deductions: total_deductions != null ? Number(total_deductions) : previousValues.total_deductions,
      withholding_tax: withholding_tax != null ? Number(withholding_tax) : previousValues.withholding_tax,
      net_pay: net_pay != null
        ? Number(net_pay)
        : round2(
          (gross_pay != null ? Number(gross_pay) : previousValues.gross_pay)
          - (total_deductions != null ? Number(total_deductions) : previousValues.total_deductions)
          - (withholding_tax != null ? Number(withholding_tax) : previousValues.withholding_tax)
        ),
    };

    const runGross = await db.getOne(
      `SELECT COALESCE(SUM(gross_pay), 0) AS total_gross_pay
       FROM payroll_records
       WHERE run_id = ?`,
      [id]
    );

    const currentRunGross = Number(runGross?.total_gross_pay) || 0;
    const projectedRunGross = round2(
      currentRunGross
      - (Number(record.gross_pay) || 0)
      + (Number(updatedValues.gross_pay) || 0)
    );

    try {
      await ensureAmountWithinBudget({
        budgetName: BUDGET_NAMES.PAYROLL,
        amount: projectedRunGross,
        amountLabel: 'Projected payroll run gross total after override',
      });
    } catch (budgetError) {
      if (budgetError instanceof BudgetValidationError) {
        logger.error('Payroll budget validation failed during override:', budgetError);
        return res.status(budgetError.statusCode).json({
          success: false,
          message: budgetError.publicMessage,
          data: budgetError.data || undefined,
        });
      }
      throw budgetError;
    }

    await db.beginTransaction();
    try {
      await db.transactionUpdate('payroll_records', {
        gross_pay: round2(updatedValues.gross_pay),
        total_deductions: round2(updatedValues.total_deductions),
        withholding_tax: round2(updatedValues.withholding_tax),
        net_pay: round2(updatedValues.net_pay),
        override_meta: serializeJson({
          overridden_by: req.user?.user_id || null,
          reason: reason || 'Manual adjustment',
          overridden_at: new Date().toISOString(),
        }),
      }, 'id = ?', [record.id]);

      await db.transactionInsert('payroll_override_logs', {
        run_id: Number(id),
        record_id: Number(record.id),
        employee_id: Number(employeeId),
        changed_by: req.user?.user_id || 0,
        reason: reason || 'Manual adjustment',
        previous_values: serializeJson(previousValues),
        new_values: serializeJson(updatedValues),
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'UPDATE',
        description: `Manual payroll override on run #${id}, employee #${employeeId}`,
      });

      return res.json({
        success: true,
        message: 'Payroll record overridden successfully',
        data: {
          run_id: Number(id),
          employee_id: Number(employeeId),
          previous: previousValues,
          updated: {
            gross_pay: round2(updatedValues.gross_pay),
            total_deductions: round2(updatedValues.total_deductions),
            withholding_tax: round2(updatedValues.withholding_tax),
            net_pay: round2(updatedValues.net_pay),
          },
        },
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Override payroll record error:', error);
    next(error);
  }
};
