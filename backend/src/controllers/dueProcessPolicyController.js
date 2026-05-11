import logger from '../utils/logger.js';
import { loadDueProcessPolicy, saveDueProcessPolicy } from '../utils/dueProcessPolicy.js';
import { logDueProcessAudit } from '../services/dueProcessAuditService.js';

export const getDueProcessPolicy = async (req, res, next) => {
  try {
    const policy = await loadDueProcessPolicy();
    return res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    logger.error('Get due process policy error:', error);
    next(error);
  }
};

export const updateDueProcessPolicy = async (req, res, next) => {
  try {
    const updatedPolicy = await saveDueProcessPolicy(req.body || {});

    await logDueProcessAudit({
      userId: req.user?.user_id || null,
      entityType: 'due_process_policy',
      entityId: 'policy',
      action: 'update_policy',
      newValues: updatedPolicy,
    });

    return res.json({
      success: true,
      message: 'Policy updated successfully',
      data: updatedPolicy,
    });
  } catch (error) {
    if (error?.details) {
      return res.status(400).json({
        success: false,
        message: 'Invalid policy payload',
        data: { errors: error.details },
      });
    }

    logger.error('Update due process policy error:', error);
    next(error);
  }
};
