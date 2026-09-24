import { EmployeeService } from './service.js';
import { sendSuccess } from '../../utils/response.js';
import { serializeEmployee } from './serializers.js';
import { buildScopeFilter } from '../../middleware/rbac.js';
import { SYSTEM_ROLES } from '../../constants/roles.js';

export class EmployeeController {
  static async list(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, {
        employeeField: '_id',
        entityField: 'entityId',
        deptField: 'departmentId'
      });

      const { page, limit, search, departmentId, entityId, status } = req.query;
      if (departmentId) scopeFilter.departmentId = departmentId;
      if (entityId) scopeFilter.entityId = entityId;
      if (status) scopeFilter.employmentStatus = status;

      const result = await EmployeeService.list(req.tenantId, scopeFilter, {
        page: parseInt(page || '1', 10),
        limit: parseInt(limit || '20', 10),
        search
      });

      const isHrAdmin = req.userRoles?.some(r => r.name === SYSTEM_ROLES.HR_ADMIN || r.name === SYSTEM_ROLES.SYSTEM_ADMIN);

      const serialized = result.employees.map(emp =>
        serializeEmployee(emp, {
          isHrAdmin,
          isSelf: req.employeeId && emp._id.toString() === req.employeeId.toString()
        })
      );

      return sendSuccess(res, serialized, 'Employees retrieved', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const employee = await EmployeeService.getById(req.tenantId, req.params.id);
      const isHrAdmin = req.userRoles?.some(r => r.name === SYSTEM_ROLES.HR_ADMIN || r.name === SYSTEM_ROLES.SYSTEM_ADMIN);
      const isSelf = req.employeeId && employee._id.toString() === req.employeeId.toString();

      const serialized = serializeEmployee(employee, { isHrAdmin, isSelf });
      return sendSuccess(res, serialized, 'Employee retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const employee = await EmployeeService.create(req.tenantId, req.body, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, employee, 'Employee created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const employee = await EmployeeService.update(req.tenantId, req.params.id, req.body, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, employee, 'Employee updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      const employee = await EmployeeService.updateStatus(req.tenantId, req.params.id, status, reason, {
        userId: req.user._id,
        employeeId: req.employeeId
      });
      return sendSuccess(res, employee, 'Employee status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async transferEmployee(req, res, next) {
    try {
      const employee = await EmployeeService.transferEmployee(
        req.tenantId,
        req.params.id,
        req.body,
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, employee, 'Employee transferred successfully');
    } catch (err) {
      next(err);
    }
  }
}
