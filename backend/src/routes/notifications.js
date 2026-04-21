import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  deleteMyReadNotifications,
  getMyNotifications,
  getMyUnreadNotificationCount,
  readAllNotifications,
  readNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', verifyToken, getMyNotifications);
router.get('/unread-count', verifyToken, getMyUnreadNotificationCount);
router.delete('/read', verifyToken, deleteMyReadNotifications);
router.put('/read-all', verifyToken, readAllNotifications);
router.put('/:id/read', verifyToken, readNotification);

export default router;
