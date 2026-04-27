import * as db from '../config/db.js';
import logger from '../utils/logger.js';

const REQUIRED_BUDGET_NAMES = Object.freeze({
  PAYROLL: 'Payroll',
  STAFF_SALARIES: 'Staff Salaries',
});

const HRIS_DEPARTMENT_ID = 1;

const DEFAULT_MONTHLY_WORK_DAYS = 22;
const FULL_DAY_HOURS = 8;

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const formatCurrency = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return '₱0.00';

  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalized);
  } catch {
    return `₱${normalized.toFixed(2)}`;
  }
};

export class BudgetValidationError extends Error {
  constructor({
    code,
    publicMessage,
    technicalMessage,
    statusCode = 400,
    data = null,
  }) {
    super(technicalMessage || publicMessage);
    this.name = 'BudgetValidationError';
    this.code = code;
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
    this.data = data;
  }
}

const normalizeBudgetRow = (row) => {
  if (!row) return null;

  const departmentBudgetId = Number(row.department_budget_id);
  const departmentId = Number(row.department_id);
  const budgetId = Number(row.budget_id);
  const amount = Number(row.allocated_amount);

  return {
    budget_category_id: null,
    department_budget_id: Number.isFinite(departmentBudgetId) ? departmentBudgetId : null,
    department_id: Number.isFinite(departmentId) ? departmentId : null,
    budget_id: Number.isFinite(budgetId) ? budgetId : null,
    budget_name: String(row.budget_name || '').trim(),
    budget_description: row.budget_description || null,
    amount,
  };
};

const fetchLatestBudgetRow = async (budgetName) => {
  try {
    const row = await db.getOne(
      `SELECT
         bd.department_budget_id,
         bd.department_id,
         bd.allocated_amount,
         bd.budget_id,
         b.budget_name,
         b.description AS budget_description
       FROM budget_department bd
       LEFT JOIN budget b ON b.budget_id = bd.budget_id
       WHERE bd.department_id = ?
         AND bd.is_active = 1
       ORDER BY bd.department_budget_id DESC
       LIMIT 1`,
      [HRIS_DEPARTMENT_ID]
    );

    return normalizeBudgetRow(row);
  } catch (error) {
    logger.error(`Finance budget query failed for '${budgetName}':`, error);
    throw new BudgetValidationError({
      code: 'BUDGET_QUERY_FAILED',
      publicMessage: `Unable to validate '${budgetName}' budget right now. Please try again later.`,
      technicalMessage: `Finance budget query failed for '${budgetName}': ${error.message}`,
      statusCode: 503,
    });
  }
};

export const getLatestValidatedBudgetByName = async (budgetName) => {
  const normalizedName = String(budgetName || '').trim();

  if (!normalizedName) {
    throw new BudgetValidationError({
      code: 'BUDGET_NAME_REQUIRED',
      publicMessage: 'Budget name is required for budget validation.',
      technicalMessage: 'Missing budgetName argument',
      statusCode: 500,
    });
  }

  const row = await fetchLatestBudgetRow(normalizedName);

  if (!row) {
    throw new BudgetValidationError({
      code: 'BUDGET_MISSING',
      publicMessage: `No active budget record found in budget_department for HRIS (department_id: ${HRIS_DEPARTMENT_ID}). Please ask Finance to configure it.`,
      technicalMessage: `No active budget_department row found for department_id=${HRIS_DEPARTMENT_ID} while validating '${normalizedName}'`,
      statusCode: 422,
    });
  }

  if (!Number.isFinite(row.amount) || row.amount < 0) {
    throw new BudgetValidationError({
      code: 'BUDGET_INVALID_AMOUNT',
      publicMessage: `HRIS budget has an invalid allocated amount. Please ask Finance to correct budget_department.allocated_amount.`,
      technicalMessage: `Invalid budget amount for '${normalizedName}': ${row.amount}`,
      statusCode: 422,
      data: {
        budget_name: row.budget_name,
        budget_id: row.budget_id,
        department_budget_id: row.department_budget_id,
      },
    });
  }

  return {
    ...row,
    amount: round2(row.amount),
  };
};

export const ensureAmountWithinBudget = async ({
  budgetName,
  amount,
  amountLabel = 'Requested amount',
}) => {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
    throw new BudgetValidationError({
      code: 'REQUESTED_AMOUNT_INVALID',
      publicMessage: `${amountLabel} is invalid. Please provide a non-negative number.`,
      technicalMessage: `Invalid requested amount for '${budgetName}': ${amount}`,
      statusCode: 422,
    });
  }

  const budget = await getLatestValidatedBudgetByName(budgetName);
  const roundedAmount = round2(normalizedAmount);

  if (roundedAmount > budget.amount) {
    throw new BudgetValidationError({
      code: 'BUDGET_EXCEEDED',
      publicMessage: `${amountLabel} (${formatCurrency(roundedAmount)}) exceeds latest '${budgetName}' budget (${formatCurrency(budget.amount)}).`,
      technicalMessage: `Budget exceeded for '${budgetName}'. Requested ${roundedAmount}, allowed ${budget.amount}`,
      statusCode: 400,
      data: {
        budget_name: budget.budget_name,
        budget_id: budget.budget_id,
        budget_amount: budget.amount,
        requested_amount: roundedAmount,
      },
    });
  }

  return {
    budget,
    requested_amount: roundedAmount,
  };
};

export const toMonthlyEquivalentCompensation = ({
  amount,
  salaryUnit,
  monthlyWorkDays = DEFAULT_MONTHLY_WORK_DAYS,
}) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) return null;

  const normalizedUnit = String(salaryUnit || '').trim().toLowerCase() === 'hourly' ? 'hourly' : 'monthly';
  const days = Number(monthlyWorkDays);
  const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_MONTHLY_WORK_DAYS;

  if (normalizedUnit === 'hourly') {
    return round2(numericAmount * FULL_DAY_HOURS * safeDays);
  }

  return round2(numericAmount);
};

export const getCurrentStaffSalaryMonthlyTotal = async ({
  excludeEmployeeId = null,
} = {}) => {
  const params = ['active', 'on-leave'];
  let whereClause = `status IN (?, ?)`;

  if (excludeEmployeeId != null) {
    whereClause += ' AND employee_id <> ?';
    params.push(Number(excludeEmployeeId));
  }

  const rows = await db.transactionQuery(
    `SELECT current_salary, salary_unit
     FROM employees
     WHERE ${whereClause}`,
    params
  );

  const total = (rows || []).reduce((sum, row) => {
    const monthlyEquivalent = toMonthlyEquivalentCompensation({
      amount: row.current_salary,
      salaryUnit: row.salary_unit,
      monthlyWorkDays: DEFAULT_MONTHLY_WORK_DAYS,
    });

    return sum + (monthlyEquivalent || 0);
  }, 0);

  return round2(total);
};

export const getFinanceBudgetsSnapshot = async () => {
  const budget = await getLatestValidatedBudgetByName(REQUIRED_BUDGET_NAMES.PAYROLL);

  return {
    payroll: budget,
    staff_salaries: budget,
  };
};

export const BUDGET_NAMES = REQUIRED_BUDGET_NAMES;
