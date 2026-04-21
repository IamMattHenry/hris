import logger from '../utils/logger.js';
import {
  deleteReadNotificationsForUser,
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const { limit = 20, status } = req.query || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const notifications = await getNotificationsForUser({
      userId,
      limit,
      status,
    });

    return res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    logger.error('Get my notifications error:', error);
    next(error);
  }
};

export const getMyUnreadNotificationCount = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const unreadCount = await getUnreadNotificationCount(userId);

    return res.json({
      success: true,
      data: {
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    logger.error('Get unread notification count error:', error);
    next(error);
  }
};

export const readNotification = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const affectedRows = await markNotificationAsRead({
      userId,
      notificationId: id,
    });

    if (!affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read',
      });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        affectedRows,
      },
    });
  } catch (error) {
    logger.error('Read notification error:', error);
    next(error);
  }
};

export const readAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const affectedRows = await markAllNotificationsAsRead(userId);

    return res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        affectedRows,
      },
    });
  } catch (error) {
    logger.error('Read all notifications error:', error);
    next(error);
  }
};

export const deleteMyReadNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const affectedRows = await deleteReadNotificationsForUser(userId);

    return res.json({
      success: true,
      message: 'Read notifications deleted successfully',
      data: {
        affectedRows,
      },
    });
  } catch (error) {
    logger.error('Delete read notifications error:', error);
    next(error);
  }
};
