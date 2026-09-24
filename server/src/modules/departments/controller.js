import { DepartmentService } from './service.js';
import { sendSuccess } from '../../utils/response.js';
import { buildScopeFilter } from '../../middleware/rbac.js';

export class DepartmentController {
  static async list(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { deptField: '_id' });
      if (req.query.entityId) {
        scopeFilter.entityId = req.query.entityId;
      }
      const depts = await DepartmentService.list(req.tenantId, scopeFilter);
      return sendSuccess(res, depts, 'Departments retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const dept = await DepartmentService.getById(req.tenantId, req.params.id);
      return sendSuccess(res, dept, 'Department retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const dept = await DepartmentService.create(req.tenantId, req.body);
      return sendSuccess(res, dept, 'Department created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const dept = await DepartmentService.update(req.tenantId, req.params.id, req.body);
      return sendSuccess(res, dept, 'Department updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
