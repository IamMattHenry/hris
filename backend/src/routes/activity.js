import express from 'express';
import { verifyToken, verifyRole, verifyAccess } from '../middleware/auth.js';
import { getActivityLogs } from '../controllers/activityController.js';

const router = express.Router();

router.get("/", verifyToken, verifyAccess({
  roles: ["admin", "superadmin"],
  subRoles: ["it"],
}), getActivityLogs);



export default router;
