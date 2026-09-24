import { NotificationService } from './service.js';
import { sendSuccess } from '../../utils/response.js';

export class NotificationController {
  static async list(req, res, next) {
    try {
      const notifications = await NotificationService.listForUser(req.tenantId, req.user._id, {
        status: req.query.status,
        limit: parseInt(req.query.limit || '20', 10)
      });
      return sendSuccess(res, notifications, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const notification = await NotificationService.markAsRead(req.tenantId, req.params.id, req.user._id);
      return sendSuccess(res, notification, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      await NotificationService.markAllAsRead(req.tenantId, req.user._id);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}
