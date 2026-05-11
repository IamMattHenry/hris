import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAttendanceViolations,
  createAttendanceViolation,
  updateAttendanceViolationStatus,
  scanAttendanceViolations,
} from '../controllers/attendanceViolationController.js';
import {
  getDisciplinaryCases,
  getDisciplinaryCaseDetail,
  createDisciplinaryCaseManual,
  updateDisciplinaryCase,
  createCaseNoticeHandler,
  sendCaseNoticeHandler,
  acknowledgeCaseNotice,
  submitCaseExplanation,
  scheduleCaseHearing,
  issueCaseDecision,
  getMyDueProcessNotices,
  getMyDueProcessCases,
} from '../controllers/disciplinaryCaseController.js';
import {
  getDueProcessPolicy,
  updateDueProcessPolicy,
} from '../controllers/dueProcessPolicyController.js';

const router = express.Router();

// Policy settings
router.get('/policy', verifyToken, requirePermission('due_process.read'), getDueProcessPolicy);
router.put('/policy', verifyToken, requirePermission('due_process.policy_manage'), updateDueProcessPolicy);

// Attendance violations
router.get('/violations', verifyToken, requirePermission('due_process.read'), getAttendanceViolations);
router.post('/violations', verifyToken, requirePermission('due_process.manage'), createAttendanceViolation);
router.patch('/violations/:id/status', verifyToken, requirePermission('due_process.manage'), updateAttendanceViolationStatus);
router.post('/violations/scan', verifyToken, requirePermission('due_process.manage'), scanAttendanceViolations);

// Disciplinary cases
router.get('/cases', verifyToken, requirePermission('due_process.read'), getDisciplinaryCases);
router.get('/cases/:id', verifyToken, requirePermission('due_process.read'), getDisciplinaryCaseDetail);
router.post('/cases', verifyToken, requirePermission('due_process.manage'), createDisciplinaryCaseManual);
router.put('/cases/:id', verifyToken, requirePermission('due_process.manage'), updateDisciplinaryCase);
router.post('/cases/:id/notices', verifyToken, requirePermission('due_process.manage'), createCaseNoticeHandler);
router.post('/cases/:id/hearings', verifyToken, requirePermission('due_process.hearing_schedule'), scheduleCaseHearing);
router.post('/cases/:id/decision', verifyToken, requirePermission('due_process.decision_issue'), issueCaseDecision);

// Notice actions
router.post('/notices/:notice_id/send', verifyToken, requirePermission('due_process.notice_send'), sendCaseNoticeHandler);
router.post('/notices/:notice_id/acknowledge', verifyToken, acknowledgeCaseNotice);

// Employee portal
router.get('/my/notices', verifyToken, getMyDueProcessNotices);
router.get('/my/cases', verifyToken, getMyDueProcessCases);
router.post('/cases/:id/explanations', verifyToken, submitCaseExplanation);

export default router;
