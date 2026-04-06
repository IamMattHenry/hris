import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { getActivityLogs } from '../controllers/activityController.js';

const router = express.Router();

router.get("/", verifyToken, requirePermission('activity.read'), getActivityLogs);



export default router;
