import * as db from '../config/db.js';

const TABLE_NAME = 'payroll_negative_net_pay_balances';

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const toEmployeeIdList = (employeeIds = []) => Array.from(new Set(
  (Array.isArray(employeeIds) ? employeeIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id))
));

export const getOutstandingNegativeNetPayBalances = async (employeeIds = []) => {
  const ids = toEmployeeIdList(employeeIds);
  if (!ids.length) return new Map();

  const rows = await db.getAll(
    `SELECT employee_id, outstanding_amount
     FROM ${TABLE_NAME}
     WHERE employee_id IN (${ids.map(() => '?').join(', ')})`,
    ids
  );

  return new Map((rows || []).map((row) => [
    Number(row.employee_id),
    round2(row.outstanding_amount),
  ]));
};

export const syncNegativeNetPayBalancesForRun = async ({
  runId,
  records = [],
}) => {
  const normalizedRunId = Number(runId);

  for (const record of records || []) {
    const employeeId = Number(record.employee_id);
    if (!Number.isInteger(employeeId)) continue;

    const breakdown = record?.breakdown || {};
    const summary = breakdown?.summary || {};
    const carryoverBalance = round2(summary.carryover_balance || 0);

    if (carryoverBalance > 0) {
      await db.transactionQuery(
        `INSERT INTO ${TABLE_NAME} (employee_id, run_id, record_id, outstanding_amount)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           run_id = VALUES(run_id),
           record_id = VALUES(record_id),
           outstanding_amount = VALUES(outstanding_amount),
           updated_at = CURRENT_TIMESTAMP`,
        [employeeId, normalizedRunId, Number(record.id || 0), carryoverBalance]
      );
      continue;
    }

    await db.transactionQuery(
      `DELETE FROM ${TABLE_NAME}
       WHERE employee_id = ?`,
      [employeeId]
    );
  }
};

export default {
  getOutstandingNegativeNetPayBalances,
  syncNegativeNetPayBalancesForRun,
};
