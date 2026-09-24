import { Notification } from './model.js';
import { User } from '../users/model.js';
import { Employee } from '../employees/model.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { logger } from '../../utils/logger.js';

export class NotificationService {
  static async createNotification({ tenantId, recipientUserId, recipientEmployeeId, type, title, message, referenceEntity }) {
    try {
      return await Notification.create({
        tenantId,
        recipientUserId,
        recipientEmployeeId,
        type,
        title,
        message,
        referenceEntity,
        channel: 'IN_APP',
        status: 'UNREAD'
      });
    } catch (err) {
      logger.error('Failed to create notification:', err);
    }
  }

  static async listForUser(tenantId, userId, { status, limit = 20 } = {}) {
    const query = { tenantId, recipientUserId: userId };
    if (status) query.status = status;
    return Notification.find(query).sort({ createdAt: -1 }).limit(limit);
  }

  static async markAsRead(tenantId, id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, tenantId, recipientUserId: userId },
      { $set: { status: 'READ', readAt: new Date() } },
      { new: true }
    );
  }

  static async markAllAsRead(tenantId, userId) {
    return Notification.updateMany(
      { tenantId, recipientUserId: userId, status: 'UNREAD' },
      { $set: { status: 'READ', readAt: new Date() } }
    );
  }
}

// Event listeners to create automated in-app notifications
eventEmitter.on(APP_EVENTS.LEAVE_SUBMITTED, async (leaveRequest) => {
  try {
    if (leaveRequest.managerId) {
      const manager = await Employee.findById(leaveRequest.managerId);
      if (manager && manager.userId) {
        await NotificationService.createNotification({
          tenantId: leaveRequest.tenantId,
          recipientUserId: manager.userId,
          recipientEmployeeId: manager._id,
          type: 'LEAVE_SUBMITTED',
          title: 'New Leave Request',
          message: `An employee has submitted a leave request from ${leaveRequest.startDate} to ${leaveRequest.endDate}.`,
          referenceEntity: { entityType: 'LeaveRequest', entityId: leaveRequest._id }
        });
      }
    }
  } catch (err) {
    logger.error('Error handling LEAVE_SUBMITTED notification:', err);
  }
});

eventEmitter.on(APP_EVENTS.LEAVE_APPROVED, async (leaveRequest) => {
  try {
    const employee = await Employee.findById(leaveRequest.employeeId);
    if (employee && employee.userId) {
      await NotificationService.createNotification({
        tenantId: leaveRequest.tenantId,
        recipientUserId: employee.userId,
        recipientEmployeeId: employee._id,
        type: 'LEAVE_APPROVED',
        title: 'Leave Request Approved',
        message: `Your leave request for ${leaveRequest.startDate} to ${leaveRequest.endDate} has been approved.`,
        referenceEntity: { entityType: 'LeaveRequest', entityId: leaveRequest._id }
      });
    }
  } catch (err) {
    logger.error('Error handling LEAVE_APPROVED notification:', err);
  }
});

eventEmitter.on(APP_EVENTS.LEAVE_REJECTED, async (leaveRequest) => {
  try {
    const employee = await Employee.findById(leaveRequest.employeeId);
    if (employee && employee.userId) {
      await NotificationService.createNotification({
        tenantId: leaveRequest.tenantId,
        recipientUserId: employee.userId,
        recipientEmployeeId: employee._id,
        type: 'LEAVE_REJECTED',
        title: 'Leave Request Rejected',
        message: `Your leave request for ${leaveRequest.startDate} has been rejected: ${leaveRequest.actionReason || 'No reason provided'}`,
        referenceEntity: { entityType: 'LeaveRequest', entityId: leaveRequest._id }
      });
    }
  } catch (err) {
    logger.error('Error handling LEAVE_REJECTED notification:', err);
  }
});
