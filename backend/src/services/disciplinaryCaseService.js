import * as db from '../config/db.js';
import { sendGenericEmail } from '../utils/emailService.js';
import {
  notifyEmployeeByEmployeeId,
  notifyHrPortalUsers,
  notifyLeaveAttendanceOfficers,
} from './notificationService.js';
import { logDueProcessAudit } from './dueProcessAuditService.js';
import {
  loadDueProcessPolicy,
  renderTemplate,
  formatViolationDates,
} from '../utils/dueProcessPolicy.js';

const ACTIVE_CASE_STATUSES = new Set([
  'draft',
  'nte_issued',
  'awaiting_explanation',
  'under_investigation',
  'hearing_scheduled',
  'decision_pending',
]);

const formatDateTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const generateCaseNumber = () => {
  const now = new Date();
  const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomTag = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DP-${dateTag}-${randomTag}`;
};

const getEmployeeContact = async (employeeId) => {
  const row = await db.getOne(
    `SELECT e.employee_id, e.first_name, e.last_name, e.email,
            u.user_id,
            (SELECT email FROM employee_emails WHERE employee_id = e.employee_id ORDER BY email_id LIMIT 1) AS alt_email
     FROM employees e
     LEFT JOIN users u ON e.user_id = u.user_id
     WHERE e.employee_id = ?`,
    [employeeId]
  );

  if (!row) return null;
  return {
    ...row,
    email: row.email || row.alt_email || null,
  };
};

export const listDisciplinaryCases = async ({
  status,
  employeeId,
  limit = 20,
  page = 1,
}) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const offset = (normalizedPage - 1) * normalizedLimit;

  const params = [];
  const where = [];

  if (status) {
    where.push('dc.status = ?');
    params.push(status);
  }

  if (employeeId) {
    where.push('dc.employee_id = ?');
    params.push(Number(employeeId));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const data = await db.getAll(
    `SELECT dc.*, e.first_name, e.last_name, e.employee_code
     FROM disciplinary_cases dc
     LEFT JOIN employees e ON dc.employee_id = e.employee_id
     ${whereSql}
     ORDER BY dc.created_at DESC
     LIMIT ${normalizedLimit} OFFSET ${offset}`,
    params
  );

  const countRow = await db.getOne(
    `SELECT COUNT(*) AS total
     FROM disciplinary_cases dc
     ${whereSql}`,
    params
  );

  return {
    data,
    count: Number(countRow?.total || 0),
  };
};

export const getDisciplinaryCaseById = async (caseId) => {
  const caseRow = await db.getOne(
    `SELECT dc.*, e.first_name, e.last_name, e.employee_code
     FROM disciplinary_cases dc
     LEFT JOIN employees e ON dc.employee_id = e.employee_id
     WHERE dc.id = ?`,
    [caseId]
  );

  if (!caseRow) return null;

  const [violations, notices, explanations, hearings, decision, auditLogs] = await Promise.all([
    db.getAll(
      `SELECT av.*
       FROM case_violations cv
       JOIN attendance_violations av ON cv.violation_id = av.id
       WHERE cv.case_id = ?
       ORDER BY av.violation_date DESC`,
      [caseId]
    ),
    db.getAll(
      `SELECT cn.*
       FROM case_notices cn
       WHERE cn.case_id = ?
       ORDER BY cn.created_at DESC`,
      [caseId]
    ),
    db.getAll(
      `SELECT ce.*
       FROM case_explanations ce
       WHERE ce.case_id = ?
       ORDER BY ce.submitted_at DESC`,
      [caseId]
    ),
    db.getAll(
      `SELECT ch.*
       FROM case_hearings ch
       WHERE ch.case_id = ?
       ORDER BY ch.hearing_datetime DESC`,
      [caseId]
    ),
    db.getOne(
      `SELECT cd.*
       FROM case_decisions cd
       WHERE cd.case_id = ?`,
      [caseId]
    ),
    db.getAll(
      `SELECT * FROM audit_logs WHERE entity_type = 'disciplinary_case' AND entity_id = ? ORDER BY timestamp DESC`,
      [String(caseId)]
    ),
  ]);

  return {
    ...caseRow,
    violations,
    notices,
    explanations,
    hearings,
    decision,
    audit_logs: auditLogs,
  };
};

export const createDisciplinaryCase = async ({
  employeeId,
  caseType = 'attendance',
  severity = null,
  assignedHrId = null,
  assignedManagerId = null,
  createdBy = null,
}) => {
  const caseNumber = generateCaseNumber();

  const caseId = await db.insert('disciplinary_cases', {
    employee_id: employeeId,
    case_number: caseNumber,
    case_type: caseType,
    status: 'draft',
    severity,
    assigned_hr_id: assignedHrId,
    assigned_manager_id: assignedManagerId,
    opened_at: new Date(),
    created_by: createdBy,
    updated_by: createdBy,
  });

  await logDueProcessAudit({
    userId: createdBy,
    entityType: 'disciplinary_case',
    entityId: caseId,
    action: 'create_case',
    newValues: { case_number: caseNumber, case_type: caseType },
  });

  return { caseId, caseNumber };
};

export const attachViolationsToCase = async ({ caseId, violationIds = [], updatedBy = null }) => {
  if (!caseId || !Array.isArray(violationIds) || violationIds.length === 0) {
    return { attached: 0 };
  }

  let attached = 0;
  for (const violationId of violationIds) {
    try {
      await db.insert('case_violations', {
        case_id: caseId,
        violation_id: violationId,
      });
      attached += 1;
    } catch (error) {
      // ignore duplicates
    }
  }

  if (attached > 0) {
    await logDueProcessAudit({
      userId: updatedBy,
      entityType: 'disciplinary_case',
      entityId: caseId,
      action: 'attach_violations',
      newValues: { attached },
    });
  }

  return { attached };
};

export const updateCase = async ({ caseId, updates, updatedBy = null, ipAddress = null }) => {
  const existing = await db.getOne('SELECT * FROM disciplinary_cases WHERE id = ?', [caseId]);
  if (!existing) return null;

  await db.update('disciplinary_cases', {
    ...updates,
    updated_by: updatedBy,
  }, 'id = ?', [caseId]);

  await logDueProcessAudit({
    userId: updatedBy,
    entityType: 'disciplinary_case',
    entityId: caseId,
    action: 'update_case',
    oldValues: existing,
    newValues: updates,
    ipAddress,
  });

  return true;
};

export const createCaseNotice = async ({
  caseId,
  noticeType,
  subject,
  content,
  recipientEmployeeId,
  sentVia = 'internal',
  dueDate = null,
  createdBy = null,
  autoGenerated = false,
  sendNow = false,
}) => {
  const noticeId = await db.insert('case_notices', {
    case_id: caseId,
    notice_type: noticeType,
    subject,
    content,
    recipient_employee_id: recipientEmployeeId,
    sent_via: sentVia,
    due_date: dueDate ? new Date(dueDate) : null,
    created_by: createdBy,
    auto_generated: autoGenerated ? 1 : 0,
  });

  await logDueProcessAudit({
    userId: createdBy,
    entityType: 'case_notice',
    entityId: noticeId,
    action: 'create_notice',
    newValues: { notice_type: noticeType },
  });

  if (sendNow) {
    await sendCaseNotice({
      noticeId,
      caseId,
      sentVia,
      sentBy: createdBy,
    });
  }

  return noticeId;
};

export const sendCaseNotice = async ({ noticeId, caseId, sentVia = null, sentBy = null }) => {
  const notice = await db.getOne(
    `SELECT cn.*, dc.case_number, dc.employee_id
     FROM case_notices cn
     JOIN disciplinary_cases dc ON cn.case_id = dc.id
     WHERE cn.id = ?`,
    [noticeId]
  );

  if (!notice) return null;

  const caseIdToUpdate = caseId || notice.case_id;
  const channel = sentVia || notice.sent_via || 'internal';

  const employee = await getEmployeeContact(notice.employee_id);
  const title = notice.subject;
  const message = notice.content;

  if (channel === 'email' || channel === 'both') {
    if (employee?.email) {
      await sendGenericEmail({
        to: employee.email,
        subject: title,
        text: message,
        html: `<pre style="font-family:Arial, sans-serif; white-space:pre-wrap;">${message}</pre>`,
      });
    }
  }

  if (channel === 'internal' || channel === 'both') {
    await notifyEmployeeByEmployeeId({
      employeeId: notice.employee_id,
      actorUserId: sentBy,
      title,
      message,
      category: 'due_process_notice',
      referenceModule: 'due_process',
      referenceId: `notice:${noticeId}`,
    });
  }

  await db.update('case_notices', {
    sent_at: new Date(),
    status: 'sent',
  }, 'id = ?', [noticeId]);

  const statusUpdates = {};
  if (notice.notice_type === 'NTE') {
    statusUpdates.status = 'nte_issued';
  } else if (notice.notice_type === 'hearing_notice') {
    statusUpdates.status = 'hearing_scheduled';
  } else if (notice.notice_type === 'decision_notice') {
    statusUpdates.status = 'resolved';
    statusUpdates.closed_at = new Date();
  }

  if (Object.keys(statusUpdates).length > 0 && caseIdToUpdate) {
    await db.update('disciplinary_cases', statusUpdates, 'id = ?', [caseIdToUpdate]);
  }

  await logDueProcessAudit({
    userId: sentBy,
    entityType: 'case_notice',
    entityId: noticeId,
    action: 'send_notice',
  });

  return true;
};

export const acknowledgeNotice = async ({ noticeId, employeeId }) => {
  await db.update('case_notices', {
    acknowledged_at: new Date(),
    status: 'acknowledged',
  }, 'id = ? AND recipient_employee_id = ?', [noticeId, employeeId]);

  await logDueProcessAudit({
    userId: employeeId,
    entityType: 'case_notice',
    entityId: noticeId,
    action: 'acknowledge_notice',
  });
};

export const submitExplanation = async ({ caseId, employeeId, explanationText, attachmentUrl = null }) => {
  const explanationId = await db.insert('case_explanations', {
    case_id: caseId,
    employee_id: employeeId,
    explanation_text: explanationText,
    attachment_url: attachmentUrl,
    submitted_at: new Date(),
  });

  await db.update('disciplinary_cases', {
    status: 'under_investigation',
  }, 'id = ?', [caseId]);

  await notifyHrPortalUsers({
    title: 'Due process explanation submitted',
    message: `Employee submitted an explanation for case ${caseId}.`,
    category: 'due_process',
    referenceModule: 'due_process',
    referenceId: `case:${caseId}`,
  });

  await logDueProcessAudit({
    userId: employeeId,
    entityType: 'case_explanation',
    entityId: explanationId,
    action: 'submit_explanation',
  });

  return explanationId;
};

export const scheduleHearing = async ({
  caseId,
  hearingDatetime,
  hearingType,
  locationOrLink,
  investigatorId = null,
  notes = null,
  createdBy = null,
  sendNotice = false,
}) => {
  const hearingId = await db.insert('case_hearings', {
    case_id: caseId,
    hearing_datetime: hearingDatetime,
    hearing_type: hearingType,
    location_or_link: locationOrLink,
    investigator_id: investigatorId,
    notes,
  });

  await db.update('disciplinary_cases', {
    status: 'hearing_scheduled',
  }, 'id = ?', [caseId]);

  await logDueProcessAudit({
    userId: createdBy,
    entityType: 'case_hearing',
    entityId: hearingId,
    action: 'schedule_hearing',
  });

  if (sendNotice) {
    const policy = await loadDueProcessPolicy();
    const template = policy.notice_templates?.hearing_notice || {};
    const caseRow = await db.getOne(
      'SELECT dc.case_number, dc.employee_id, e.first_name, e.last_name FROM disciplinary_cases dc JOIN employees e ON dc.employee_id = e.employee_id WHERE dc.id = ?',
      [caseId]
    );

    if (!caseRow?.employee_id) {
      return hearingId;
    }

    const subject = renderTemplate(template.subject, {
      case_number: caseRow?.case_number || `CASE-${caseId}`,
    });

    const content = renderTemplate(template.content, {
      case_number: caseRow?.case_number || `CASE-${caseId}`,
      employee_name: `${caseRow?.first_name || ''} ${caseRow?.last_name || ''}`.trim(),
      hearing_datetime: formatDateTime(hearingDatetime),
      hearing_location: locationOrLink || 'TBA',
    });

    await createCaseNotice({
      caseId,
      noticeType: 'hearing_notice',
      subject,
      content,
      recipientEmployeeId: caseRow?.employee_id,
      sentVia: 'both',
      createdBy,
      autoGenerated: true,
      sendNow: true,
    });
  }

  return hearingId;
};

export const addDecision = async ({
  caseId,
  decisionType,
  penaltyDays = null,
  effectiveDate = null,
  decisionSummary = null,
  approvedBy = null,
  sendNotice = false,
}) => {
  const nteSent = await db.getOne(
    `SELECT id FROM case_notices WHERE case_id = ? AND notice_type = 'NTE' AND sent_at IS NOT NULL LIMIT 1`,
    [caseId]
  );

  if (!nteSent) {
    const error = new Error('NTE must be issued before recording a decision.');
    error.code = 'DUE_PROCESS_NTE_REQUIRED';
    throw error;
  }

  const hasExplanation = await db.getOne(
    `SELECT id FROM case_explanations WHERE case_id = ? LIMIT 1`,
    [caseId]
  );

  const hasHearing = await db.getOne(
    `SELECT id FROM case_hearings WHERE case_id = ? LIMIT 1`,
    [caseId]
  );

  if (!hasExplanation && !hasHearing) {
    const error = new Error('Explanation or hearing is required before decision.');
    error.code = 'DUE_PROCESS_RESPONSE_REQUIRED';
    throw error;
  }

  const decisionId = await db.insert('case_decisions', {
    case_id: caseId,
    decision_type: decisionType,
    penalty_days: penaltyDays,
    effective_date: effectiveDate,
    decision_summary: decisionSummary,
    approved_by: approvedBy,
    issued_at: new Date(),
  });

  await db.update('disciplinary_cases', {
    status: 'resolved',
    closed_at: new Date(),
  }, 'id = ?', [caseId]);

  await logDueProcessAudit({
    userId: approvedBy,
    entityType: 'case_decision',
    entityId: decisionId,
    action: 'issue_decision',
  });

  if (sendNotice) {
    const policy = await loadDueProcessPolicy();
    const template = policy.notice_templates?.decision_notice || {};
    const caseRow = await db.getOne(
      'SELECT dc.case_number, dc.employee_id, e.first_name, e.last_name FROM disciplinary_cases dc JOIN employees e ON dc.employee_id = e.employee_id WHERE dc.id = ?',
      [caseId]
    );

    if (!caseRow?.employee_id) {
      return decisionId;
    }

    const subject = renderTemplate(template.subject, {
      case_number: caseRow?.case_number || `CASE-${caseId}`,
    });

    const content = renderTemplate(template.content, {
      case_number: caseRow?.case_number || `CASE-${caseId}`,
      employee_name: `${caseRow?.first_name || ''} ${caseRow?.last_name || ''}`.trim(),
      decision_type: decisionType,
      decision_summary: decisionSummary || 'N/A',
      effective_date: effectiveDate || 'N/A',
    });

    await createCaseNotice({
      caseId,
      noticeType: 'decision_notice',
      subject,
      content,
      recipientEmployeeId: caseRow?.employee_id,
      sentVia: 'both',
      createdBy: approvedBy,
      autoGenerated: true,
      sendNow: true,
    });
  }

  return decisionId;
};

export const findOpenCaseForEmployee = async ({ employeeId, caseType = 'attendance' }) => {
  const rows = await db.getAll(
    `SELECT id, status FROM disciplinary_cases
     WHERE employee_id = ? AND case_type = ?
     ORDER BY created_at DESC`,
    [employeeId, caseType]
  );

  const active = rows.find((row) => ACTIVE_CASE_STATUSES.has(row.status));
  return active || null;
};

export const createCaseFromViolations = async ({
  employeeId,
  violationIds,
  severity = null,
  createdBy = null,
}) => {
  const { caseId, caseNumber } = await createDisciplinaryCase({
    employeeId,
    severity,
    createdBy,
  });

  await attachViolationsToCase({ caseId, violationIds, updatedBy: createdBy });

  await notifyLeaveAttendanceOfficers({
    title: `Attendance violations escalated (${caseNumber})`,
    message: `Attendance violations reached threshold for employee ${employeeId}. Case ${caseNumber} created for review.`,
    category: 'due_process',
    referenceModule: 'due_process',
    referenceId: `case:${caseId}`,
  });

  return { caseId, caseNumber };
};
