import { AuditService } from './service.js';
import { sendSuccess } from '../../utils/response.js';
import { buildScopeFilter } from '../../middleware/rbac.js';

export class AuditController {
  static async list(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { entityField: 'entityId' });
      const { action, resourceType, page, limit } = req.query;

      if (action) scopeFilter.action = action;
      if (resourceType) scopeFilter.resourceType = resourceType;

      const result = await AuditService.list(req.tenantId, scopeFilter, {
        page: parseInt(page || '1', 10),
        limit: parseInt(limit || '50', 10)
      });

      return sendSuccess(res, result.logs, 'Audit logs retrieved', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }
}
