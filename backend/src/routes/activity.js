import express from 'express';
import { verifyToken, verifyRole, verifyAccess } from '../middleware/auth';
import { getActivityLogs } from '../controllers/activityController.js';

const router = express.Router();

router.get("/", verifyToken, verifyAccess({
  roles: ["superadmin"],
  subRoles: ["it"],
}), getActivityLogs);



export default router;
