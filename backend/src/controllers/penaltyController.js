import * as db from '../config/db.js';
import logger from '../utils/logger.js';

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const STATUS_TRANSITIONS = {
  draft: new Set(['pending', 'approved', 'rejected', 'cancelled', 'waived']),
  pending: new Set(['approved', 'rejected', 'cancelled', 'waived']),
  approved: new Set(['settled', 'cancelled', 'waived']),
  rejected: new Set(['pending', 'cancelled']),
  settled: new Set([]),
  cancelled: new Set([]),
  waived: new Set([]),
};

const TERMINAL_STATUSES = new Set(['settled', 'cancelled', 'waived']);

const PAYROLL_ELIGIBLE_MODES = new Set(['full', 'next_payroll', 'installment']);

const normalizeDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return value.slice(0, 10);
};

const parseJson = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const canTransitionStatus = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  const allowed = STATUS_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.has(toStatus);
};

const writePenaltyEvent = async ({ penaltyId, actionType, fromStatus = null, toStatus = null, notes = null, actionByUserId = null }) => {
  await db.transactionInsert('employee_penalty_events', {
    penalty_id: penaltyId,
    action_type: actionType,
    from_status: fromStatus,
    to_status: toStatus,
    notes,
    action_by_user_id: actionByUserId,
  });
};

const writeActivityLog = async ({ userId, action, description }) => {
  try {
    await db.insert('activity_logs', {
      user_id: userId,
      action,
      module: 'penalty',
      description,
      created_by: userId,
    });
  } catch (error) {
    logger.error('Failed to write penalty activity log:', error);
  }
};

const generatePenaltyCode = async () => {
  const year = new Date().getFullYear();
  const row = await db.getOne(
    `SELECT id FROM employee_penalties
     WHERE code LIKE ?
     ORDER BY id DESC
     LIMIT 1`,
    [`PEN-${year}-%`]
  );

  const nextSequence = row?.id ? Number(row.id) + 1 : 1;
  return `PEN-${year}-${String(nextSequence).padStart(5, '0')}`;
};

const hydratePenaltyRecord = (row) => ({
  ...row,
  amount: Number(row.amount) || 0,
  amount_deducted: Number(row.amount_deducted) || 0,
  remaining_amount: Number(row.remaining_amount) || 0,
  metadata: parseJson(row.metadata, {}),
});

const getPenaltyById = async (id) => {
  const row = await db.getOne(
    `SELECT
       p.*,
       e.employee_code,
       e.first_name,
       e.last_name,
       e.status AS employee_status
     FROM employee_penalties p
     LEFT JOIN employees e ON e.employee_id = p.employee_id
     WHERE p.id = ?`,
    [id]
  );

  if (!row) return null;
  return hydratePenaltyRecord(row);
};

const getNowDate = () => new Date().toISOString().slice(0, 10);

export const getPenaltyList = async (req, res, next) => {
  try {
    const {
      search = '',
      employee_id,
      status,
      penalty_type,
      from_date,
      to_date,
      page = '1',
      limit = '10',
      sort_by = 'created_at',
      sort_dir = 'desc',
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
    const offset = (pageNumber - 1) * limitNumber;

    const allowedSortColumns = new Set([
      'created_at',
      'issued_date',
      'incident_date',
      'amount',
      'remaining_amount',
      'status',
      'employee_id',
      'code',
    ]);

    const sortColumn = allowedSortColumns.has(String(sort_by)) ? String(sort_by) : 'created_at';
    const sortDirection = String(sort_dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const where = ['1=1'];
    const params = [];

    if (employee_id != null && String(employee_id).trim() !== '') {
      where.push('p.employee_id = ?');
      params.push(Number(employee_id));
    }

    if (status) {
      where.push('p.status = ?');
      params.push(status);
    }

    if (penalty_type) {
      where.push('LOWER(p.penalty_type) = LOWER(?)');
      params.push(String(penalty_type).trim());
    }

    if (search && String(search).trim()) {
      const keyword = `%${String(search).trim()}%`;
      where.push(`(
        p.code LIKE ? OR
        p.title LIKE ? OR
        p.description LIKE ? OR
        p.penalty_type LIKE ? OR
        e.first_name LIKE ? OR
        e.last_name LIKE ? OR
        e.employee_code LIKE ?
      )`);
      params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const normalizedFromDate = normalizeDate(String(from_date || ''));
    if (normalizedFromDate) {
      where.push('p.issued_date >= ?');
      params.push(normalizedFromDate);
    }

    const normalizedToDate = normalizeDate(String(to_date || ''));
    if (normalizedToDate) {
      where.push('p.issued_date <= ?');
      params.push(normalizedToDate);
    }

    const whereSql = where.join(' AND ');

    const rows = await db.getAll(
      `SELECT
         p.*,
         e.employee_code,
         e.first_name,
         e.last_name,
         e.status AS employee_status
       FROM employee_penalties p
       LEFT JOIN employees e ON e.employee_id = p.employee_id
       WHERE ${whereSql}
       ORDER BY p.${sortColumn} ${sortDirection}
       LIMIT ${limitNumber} OFFSET ${offset}`,
      params
    );

    const totalRow = await db.getOne(
      `SELECT COUNT(*) AS count
       FROM employee_penalties p
       LEFT JOIN employees e ON e.employee_id = p.employee_id
       WHERE ${whereSql}`,
      params
    );

    const stats = await db.getOne(
      `SELECT
         SUM(CASE WHEN p.status IN ('pending', 'approved') THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN p.status = 'settled'
           AND YEAR(COALESCE(p.settled_at, p.updated_at)) = YEAR(CURRENT_DATE)
           AND MONTH(COALESCE(p.settled_at, p.updated_at)) = MONTH(CURRENT_DATE)
           THEN 1 ELSE 0 END) AS settled_this_month,
         COALESCE(SUM(CASE WHEN p.status IN ('pending', 'approved') THEN p.remaining_amount ELSE 0 END), 0) AS total_amount_pending
       FROM employee_penalties p`
    );

    const data = rows.map(hydratePenaltyRecord);
    const total = Number(totalRow?.count) || 0;

    return res.json({
      success: true,
      data,
      count: total,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        total_pages: Math.ceil(total / limitNumber),
      },
      summary: {
        pending_count: Number(stats?.pending_count) || 0,
        settled_this_month: Number(stats?.settled_this_month) || 0,
        total_amount_pending: round2(Number(stats?.total_amount_pending) || 0),
      },
      message: 'Penalties fetched successfully',
    });
  } catch (error) {
    logger.error('Get penalty list error:', error);
    next(error);
  }
};

export const getPenaltyDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const penalty = await getPenaltyById(id);

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: 'Penalty not found',
      });
    }

    const events = await db.getAll(
      `SELECT
         ev.*,
         u.username,
         e.first_name,
         e.last_name
       FROM employee_penalty_events ev
       LEFT JOIN users u ON u.user_id = ev.action_by_user_id
       LEFT JOIN employees e ON e.user_id = ev.action_by_user_id
       WHERE ev.penalty_id = ?
       ORDER BY ev.created_at DESC`,
      [id]
    );

    const deductions = await db.getAll(
      `SELECT
         d.*,
         pr.pay_period_start,
         pr.pay_period_end,
         rec.net_pay
       FROM payroll_penalty_deductions d
       LEFT JOIN payroll_runs pr ON pr.id = d.payroll_run_id
       LEFT JOIN payroll_records rec ON rec.id = d.payroll_record_id
       WHERE d.penalty_id = ?
       ORDER BY d.created_at DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...penalty,
        events,
        deductions: deductions.map((row) => ({
          ...row,
          deducted_amount: Number(row.deducted_amount) || 0,
          net_pay: Number(row.net_pay) || 0,
        })),
      },
      message: 'Penalty detail fetched successfully',
    });
  } catch (error) {
    logger.error('Get penalty detail error:', error);
    next(error);
  }
};

export const createPenalty = async (req, res, next) => {
  try {
    const {
      employee_id,
      penalty_type,
      title,
      description,
      amount,
      currency = 'PHP',
      incident_date,
      issued_date,
      due_date,
      status = 'pending',
      payroll_deduction_mode = 'none',
      installment_count,
      installment_frequency,
      metadata,
    } = req.body;

    const employee = await db.getOne(
      `SELECT employee_id, status
       FROM employees
       WHERE employee_id = ?`,
      [employee_id]
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (employee.status && String(employee.status).toLowerCase() !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Penalty can only be issued to active employees',
      });
    }

    const normalizedAmount = round2(amount);
    if (normalizedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Penalty amount must be non-negative',
      });
    }

    if (!canTransitionStatus('draft', status) && status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Invalid initial status '${status}'`,
      });
    }

    const penaltyCode = await generatePenaltyCode();
    const issueDate = normalizeDate(issued_date) || getNowDate();
    const incidentDate = normalizeDate(incident_date) || issueDate;

    await db.beginTransaction();
    try {
      const penaltyId = await db.transactionInsert('employee_penalties', {
        employee_id: Number(employee_id),
        issued_by_user_id: req.user?.user_id || null,
        code: penaltyCode,
        penalty_type,
        title,
        description,
        amount: normalizedAmount,
        amount_deducted: 0,
        remaining_amount: normalizedAmount,
        currency: String(currency || 'PHP').trim().toUpperCase() || 'PHP',
        incident_date: incidentDate,
        issued_date: issueDate,
        due_date: normalizeDate(due_date),
        status,
        payroll_deduction_mode,
        installment_count: installment_count != null ? Number(installment_count) : null,
        installment_frequency: installment_frequency || null,
        metadata: JSON.stringify(metadata || {}),
      });

      await writePenaltyEvent({
        penaltyId,
        actionType: 'CREATE',
        fromStatus: null,
        toStatus: status,
        notes: `Penalty ${penaltyCode} created`,
        actionByUserId: req.user?.user_id || null,
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'CREATE',
        description: `Created penalty ${penaltyCode} for employee #${employee_id}`,
      });

      const created = await getPenaltyById(penaltyId);

      return res.status(201).json({
        success: true,
        data: created,
        message: 'Penalty created successfully',
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Create penalty error:', error);
    next(error);
  }
};

export const updatePenalty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const current = await getPenaltyById(id);
    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Penalty not found',
      });
    }

    if (TERMINAL_STATUSES.has(current.status)) {
      return res.status(400).json({
        success: false,
        message: `Penalty is already in terminal status '${current.status}' and can no longer be edited`,
      });
    }

    const {
      penalty_type,
      title,
      description,
      amount,
      currency,
      incident_date,
      issued_date,
      due_date,
      payroll_deduction_mode,
      installment_count,
      installment_frequency,
      metadata,
    } = req.body;

    const updatePayload = {};

    if (penalty_type != null) updatePayload.penalty_type = penalty_type;
    if (title != null) updatePayload.title = title;
    if (description != null) updatePayload.description = description;
    if (currency != null) updatePayload.currency = String(currency).trim().toUpperCase();
    if (incident_date != null) updatePayload.incident_date = normalizeDate(incident_date);
    if (issued_date != null) updatePayload.issued_date = normalizeDate(issued_date);
    if (due_date !== undefined) updatePayload.due_date = normalizeDate(due_date);
    if (payroll_deduction_mode != null) updatePayload.payroll_deduction_mode = payroll_deduction_mode;
    if (installment_count !== undefined) updatePayload.installment_count = installment_count != null ? Number(installment_count) : null;
    if (installment_frequency !== undefined) updatePayload.installment_frequency = installment_frequency || null;
    if (metadata !== undefined) updatePayload.metadata = JSON.stringify(metadata || {});

    if (amount != null) {
      const normalizedAmount = round2(amount);
      if (normalizedAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Penalty amount must be non-negative',
        });
      }
      if (normalizedAmount < current.amount_deducted) {
        return res.status(400).json({
          success: false,
          message: 'Amount cannot be lower than already deducted amount',
        });
      }
      updatePayload.amount = normalizedAmount;
      updatePayload.remaining_amount = round2(normalizedAmount - current.amount_deducted);
    }

    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    await db.beginTransaction();
    try {
      await db.transactionUpdate('employee_penalties', updatePayload, 'id = ?', [id]);

      await writePenaltyEvent({
        penaltyId: Number(id),
        actionType: 'UPDATE',
        fromStatus: current.status,
        toStatus: current.status,
        notes: 'Penalty details updated',
        actionByUserId: req.user?.user_id || null,
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'UPDATE',
        description: `Updated penalty ${current.code}`,
      });

      const updated = await getPenaltyById(id);

      return res.json({
        success: true,
        data: updated,
        message: 'Penalty updated successfully',
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Update penalty error:', error);
    next(error);
  }
};

export const updatePenaltyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const current = await getPenaltyById(id);
    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Penalty not found',
      });
    }

    if (!canTransitionStatus(current.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${current.status}' to '${status}'`,
      });
    }

    const updatePayload = {
      status,
    };

    if (status === 'cancelled') {
      updatePayload.cancelled_at = new Date();
      updatePayload.cancellation_reason = notes || null;
    }

    if (status === 'settled') {
      updatePayload.settled_at = new Date();
      updatePayload.remaining_amount = 0;
      updatePayload.amount_deducted = current.amount;
    }

    await db.beginTransaction();
    try {
      await db.transactionUpdate('employee_penalties', updatePayload, 'id = ?', [id]);

      await writePenaltyEvent({
        penaltyId: Number(id),
        actionType: 'STATUS_CHANGE',
        fromStatus: current.status,
        toStatus: status,
        notes: notes || null,
        actionByUserId: req.user?.user_id || null,
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'UPDATE',
        description: `Changed penalty ${current.code} status from ${current.status} to ${status}`,
      });

      const updated = await getPenaltyById(id);

      return res.json({
        success: true,
        data: updated,
        message: 'Penalty status updated successfully',
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Update penalty status error:', error);
    next(error);
  }
};

export const settlePenalty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { settled_amount, notes, payment_ref } = req.body;

    const current = await getPenaltyById(id);
    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Penalty not found',
      });
    }

    if (current.status === 'settled') {
      return res.status(400).json({
        success: false,
        message: 'Penalty is already settled',
      });
    }

    if (current.status === 'cancelled' || current.status === 'waived') {
      return res.status(400).json({
        success: false,
        message: `Penalty in '${current.status}' status cannot be settled`,
      });
    }

    const settledAmount = settled_amount != null
      ? round2(Math.max(0, Number(settled_amount)))
      : current.remaining_amount;

    if (settledAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'settled_amount must be greater than 0',
      });
    }

    const newAmountDeducted = round2(current.amount_deducted + settledAmount);
    const remainingAmount = round2(Math.max(0, current.amount - newAmountDeducted));

    const updatePayload = {
      amount_deducted: Math.min(newAmountDeducted, current.amount),
      remaining_amount: remainingAmount,
      status: remainingAmount <= 0 ? 'settled' : 'approved',
      settled_at: remainingAmount <= 0 ? new Date() : null,
      metadata: JSON.stringify({
        ...(current.metadata || {}),
        latest_settlement: {
          amount: settledAmount,
          payment_ref: payment_ref || null,
          notes: notes || null,
          settled_by: req.user?.user_id || null,
          settled_at: new Date().toISOString(),
        },
      }),
    };

    await db.beginTransaction();
    try {
      await db.transactionUpdate('employee_penalties', updatePayload, 'id = ?', [id]);

      await writePenaltyEvent({
        penaltyId: Number(id),
        actionType: 'SETTLE',
        fromStatus: current.status,
        toStatus: updatePayload.status,
        notes: notes || `Settled amount ${settledAmount}`,
        actionByUserId: req.user?.user_id || null,
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'UPDATE',
        description: `Settled penalty ${current.code} by ${settledAmount}`,
      });

      const updated = await getPenaltyById(id);

      return res.json({
        success: true,
        data: updated,
        message: remainingAmount <= 0
          ? 'Penalty settled successfully'
          : 'Partial penalty settlement recorded successfully',
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Settle penalty error:', error);
    next(error);
  }
};

export const cancelPenalty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const current = await getPenaltyById(id);
    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Penalty not found',
      });
    }

    if (current.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Penalty is already cancelled',
      });
    }

    if (current.status === 'settled') {
      return res.status(400).json({
        success: false,
        message: 'Settled penalty cannot be cancelled',
      });
    }

    await db.beginTransaction();
    try {
      await db.transactionUpdate('employee_penalties', {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: String(reason).trim(),
      }, 'id = ?', [id]);

      await writePenaltyEvent({
        penaltyId: Number(id),
        actionType: 'CANCEL',
        fromStatus: current.status,
        toStatus: 'cancelled',
        notes: String(reason).trim(),
        actionByUserId: req.user?.user_id || null,
      });

      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'UPDATE',
        description: `Cancelled penalty ${current.code}`,
      });

      const updated = await getPenaltyById(id);

      return res.json({
        success: true,
        data: updated,
        message: 'Penalty cancelled successfully',
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Cancel penalty error:', error);
    next(error);
  }
};

export const deletePenalty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const current = await getPenaltyById(id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Penalty not found',
      });
    }

    if (current.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft penalties can be deleted',
      });
    }

    await db.beginTransaction();
    try {
      await writePenaltyEvent({
        penaltyId: Number(id),
        actionType: 'DELETE',
        fromStatus: current.status,
        toStatus: null,
        notes: 'Draft penalty deleted',
        actionByUserId: req.user?.user_id || null,
      });

      await db.transactionQuery('DELETE FROM employee_penalties WHERE id = ?', [id]);
      await db.commit();

      await writeActivityLog({
        userId: req.user?.user_id || null,
        action: 'DELETE',
        description: `Deleted draft penalty ${current.code}`,
      });

      return res.json({
        success: true,
        message: 'Penalty deleted successfully',
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Delete penalty error:', error);
    next(error);
  }
};

const computeInstallmentDeduction = (penalty) => {
  const count = Number(penalty.installment_count) || 0;
  if (count <= 1) return round2(penalty.remaining_amount);
  const base = round2((Number(penalty.amount) || 0) / count);
  return round2(Math.min(Number(penalty.remaining_amount) || 0, base));
};

export const applyPenaltyDeductionsForPayrollRecord = async ({
  runId,
  recordId,
  employeeId,
  periodEnd,
  userId,
}) => {
  const penalties = await db.transactionQuery(
    `SELECT *
     FROM employee_penalties p
     WHERE p.employee_id = ?
       AND p.status IN ('approved', 'pending')
       AND p.remaining_amount > 0
       AND p.payroll_deduction_mode IN ('full', 'next_payroll', 'installment')
       AND p.issued_date <= ?
       AND NOT EXISTS (
         SELECT 1
         FROM payroll_penalty_deductions d
         WHERE d.penalty_id = p.id
           AND d.payroll_run_id = ?
       )
     ORDER BY p.issued_date ASC, p.id ASC`,
    [employeeId, periodEnd, runId]
  );

  if (!penalties.length) {
    return {
      totalDeducted: 0,
      appliedDeductions: [],
    };
  }

  const appliedDeductions = [];
  let totalDeducted = 0;

  for (const penalty of penalties) {
    const mode = String(penalty.payroll_deduction_mode);
    if (!PAYROLL_ELIGIBLE_MODES.has(mode)) continue;

    let deductionAmount = 0;

    if (mode === 'full' || mode === 'next_payroll') {
      deductionAmount = round2(penalty.remaining_amount);
    } else if (mode === 'installment') {
      deductionAmount = computeInstallmentDeduction(penalty);
    }

    if (deductionAmount <= 0) continue;

    const nextAmountDeducted = round2((Number(penalty.amount_deducted) || 0) + deductionAmount);
    const nextRemaining = round2(Math.max(0, (Number(penalty.amount) || 0) - nextAmountDeducted));
    const nextStatus = nextRemaining <= 0 ? 'settled' : 'approved';

    await db.transactionInsert('payroll_penalty_deductions', {
      penalty_id: penalty.id,
      payroll_run_id: runId,
      payroll_record_id: recordId,
      employee_id: employeeId,
      deducted_amount: deductionAmount,
      deduction_date: periodEnd,
    });

    await db.transactionUpdate('employee_penalties', {
      amount_deducted: nextAmountDeducted,
      remaining_amount: nextRemaining,
      status: nextStatus,
      settled_at: nextRemaining <= 0 ? new Date() : null,
    }, 'id = ?', [penalty.id]);

    await writePenaltyEvent({
      penaltyId: penalty.id,
      actionType: 'PAYROLL_DEDUCTED',
      fromStatus: penalty.status,
      toStatus: nextStatus,
      notes: `Payroll run #${runId} deducted ${deductionAmount}`,
      actionByUserId: userId || null,
    });

    appliedDeductions.push({
      penalty_id: penalty.id,
      code: penalty.code,
      mode,
      deducted_amount: deductionAmount,
      from_status: penalty.status,
      to_status: nextStatus,
      remaining_amount: nextRemaining,
    });

    totalDeducted = round2(totalDeducted + deductionAmount);
  }

  return {
    totalDeducted,
    appliedDeductions,
  };
};

export const __testables = {
  canTransitionStatus,
  computeInstallmentDeduction,
};
