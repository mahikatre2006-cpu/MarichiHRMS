import { UserService } from './service.js';
import { sendSuccess } from '../../utils/response.js';

export class UserController {
  static async list(req, res, next) {
    try {
      const users = await UserService.list(req.tenantId);
      return sendSuccess(res, users, 'Users retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const user = await UserService.getById(req.tenantId, req.params.id);
      return sendSuccess(res, user, 'User retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const user = await UserService.create(req.tenantId, req.body, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const user = await UserService.update(req.tenantId, req.params.id, req.body, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const user = await UserService.updateStatus(req.tenantId, req.params.id, status, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, user, 'User status updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
