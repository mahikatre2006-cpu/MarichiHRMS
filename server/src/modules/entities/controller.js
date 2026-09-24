import { EntityService } from './service.js';
import { sendSuccess } from '../../utils/response.js';
import { buildScopeFilter } from '../../middleware/rbac.js';

export class EntityController {
  static async list(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { entityField: '_id' });
      const entities = await EntityService.list(req.tenantId, scopeFilter);
      return sendSuccess(res, entities, 'Entities retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const entity = await EntityService.getById(req.tenantId, req.params.id);
      return sendSuccess(res, entity, 'Entity retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const entity = await EntityService.create(req.tenantId, req.body);
      return sendSuccess(res, entity, 'Entity created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const entity = await EntityService.update(req.tenantId, req.params.id, req.body);
      return sendSuccess(res, entity, 'Entity updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
