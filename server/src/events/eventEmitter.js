import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

class AppEventEmitter extends EventEmitter {}

export const eventEmitter = new AppEventEmitter();

// Limit max listeners to prevent memory leak warnings in dev
eventEmitter.setMaxListeners(50);

export const APP_EVENTS = {
  LEAVE_SUBMITTED: 'leave.submitted',
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',
  LEAVE_CANCELLED: 'leave.cancelled',
  LEAVE_DELEGATED: 'leave.delegated',
  LEAVE_ESCALATED: 'leave.escalated',
  PUNCH_RECORDED: 'punch.recorded',
  ATTENDANCE_OVERRIDDEN: 'attendance.overridden',
  ATTENDANCE_LOCKED: 'attendance.locked',
  REGULARISATION_SUBMITTED: 'regularisation.submitted',
  REGULARISATION_APPROVED: 'regularisation.approved',
  REGULARISATION_REJECTED: 'regularisation.rejected',
  AUDIT_LOG: 'audit.log',
  NOTIFICATION_SEND: 'notification.send'
};

eventEmitter.on('error', (err) => {
  logger.error('Unhandled EventEmitter error:', err);
});
