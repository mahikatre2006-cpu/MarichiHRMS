import { RoleService } from './service.js';
import { sendSuccess } from '../../utils/response.js';

export class RoleController {
  static async list(req, res, next) {
    try {
      const roles = await RoleService.list(req.tenantId);
      return sendSuccess(res, roles, 'Roles retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const role = await RoleService.getById(req.tenantId, req.params.id);
      return sendSuccess(res, role, 'Role retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const role = await RoleService.create(req.tenantId, req.body, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, role, 'Role created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const role = await RoleService.update(req.tenantId, req.params.id, req.body, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, role, 'Role updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
