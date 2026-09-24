import { LocationService } from './service.js';
import { sendSuccess } from '../../utils/response.js';
import { buildScopeFilter } from '../../middleware/rbac.js';

export class LocationController {
  static async list(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { entityField: 'entityId' });
      if (req.query.entityId) {
        scopeFilter.entityId = req.query.entityId;
      }
      const locs = await LocationService.list(req.tenantId, scopeFilter);
      return sendSuccess(res, locs, 'Locations retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const loc = await LocationService.getById(req.tenantId, req.params.id);
      return sendSuccess(res, loc, 'Location retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const loc = await LocationService.create(req.tenantId, req.body);
      return sendSuccess(res, loc, 'Location created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const loc = await LocationService.update(req.tenantId, req.params.id, req.body);
      return sendSuccess(res, loc, 'Location updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
