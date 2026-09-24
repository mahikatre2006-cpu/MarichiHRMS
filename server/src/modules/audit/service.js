import { AuditLog } from './model.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { logger } from '../../utils/logger.js';

export class AuditService {
  static async log(data) {
    try {
      return await AuditLog.create(data);
    } catch (err) {
      logger.error('Failed to create audit log entry:', err);
    }
  }

  static async list(tenantId, filter = {}, { page = 1, limit = 50 } = {}) {
    const query = { tenantId, ...filter };
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorUserId actorEmployeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

// Global listener for audit events
eventEmitter.on(APP_EVENTS.AUDIT_LOG, async (payload) => {
  await AuditService.log(payload);
});
