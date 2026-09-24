import { Employee } from './model.js';
import { Entity } from '../entities/model.js';
import { Department } from '../departments/model.js';
import { Location } from '../locations/model.js';
import { User } from '../users/model.js';
import { Role } from '../roles/model.js';
import { DEFAULT_ROLE_DEFINITIONS } from '../../constants/roles.js';
import { hashPassword } from '../../utils/security.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { AUDIT_ACTION, EMPLOYEE_STATUS, USER_STATUS } from '../../constants/enums.js';

export class EmployeeService {
  static async resolveRoleIds(tenantId, systemRole) {
    const roleNames = systemRole === 'MANAGER' ? ['MANAGER', 'EMPLOYEE'] : ['EMPLOYEE'];
    let dbRoles = await Role.find({ tenantId, name: { $in: roleNames } });

    if (dbRoles.length < roleNames.length) {
      for (const name of roleNames) {
        if (!dbRoles.some(r => r.name === name) && DEFAULT_ROLE_DEFINITIONS[name]) {
          const def = DEFAULT_ROLE_DEFINITIONS[name];
          const newRole = await Role.create({
            tenantId,
            name: def.name,
            description: def.description,
            isSystem: true,
            permissions: def.permissions
          });
          dbRoles.push(newRole);
        }
      }
    }

    return dbRoles.map(r => r._id);
  }

  static async list(tenantId, filter = {}, { page = 1, limit = 20, search = '' } = {}) {
    const query = { tenantId, ...filter };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate('entityId departmentId locationId managerId')
        .populate({
          path: 'userId',
          select: 'email status roles',
          populate: { path: 'roles', select: 'name' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Employee.countDocuments(query)
    ]);

    return {
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getById(tenantId, id) {
    const employee = await Employee.findOne({ _id: id, tenantId })
      .populate('entityId departmentId locationId managerId')
      .populate({
        path: 'userId',
        select: 'email status roles',
        populate: { path: 'roles', select: 'name' }
      });
    if (!employee) {
      throw new NotFoundError('Employee');
    }
    return employee;
  }

  static async create(tenantId, data, actorContext = {}) {
    // 0. Extract credentials and role if provided
    const { password, systemRole = 'EMPLOYEE', ...empData } = data;

    // 1. Validate Entity, Department, Location exist within tenant
    const [entity, dept, loc] = await Promise.all([
      Entity.findOne({ _id: empData.entityId, tenantId }),
      Department.findOne({ _id: empData.departmentId, tenantId }),
      Location.findOne({ _id: empData.locationId, tenantId })
    ]);

    if (!entity) throw new ValidationError('Invalid entity ID');
    if (!dept) throw new ValidationError('Invalid department ID');
    if (!loc) throw new ValidationError('Invalid location ID');

    // 2. Resolve employeeCode
    let employeeCode = empData.employeeCode;
    if (!employeeCode) {
      const count = await Employee.countDocuments({ tenantId });
      const entityPrefix = entity.code || 'EMP';
      employeeCode = `${entityPrefix}-${String(count + 1).padStart(4, '0')}`;
    } else {
      employeeCode = employeeCode.trim().toUpperCase();
    }

    // 3. Check unique employeeCode within tenant
    const existingCode = await Employee.findOne({
      tenantId,
      employeeCode
    });
    if (existingCode) {
      throw new ConflictError(`Employee code '${employeeCode}' already in use.`);
    }

    // 4. If managerId provided, validate manager
    if (empData.managerId) {
      const manager = await Employee.findOne({ _id: empData.managerId, tenantId });
      if (!manager) throw new ValidationError('Invalid manager ID');
    }

    // 5. If password provided, create or update User account with specified systemRole
    let createdUser = null;
    const cleanEmail = (empData.email || '').trim().toLowerCase();

    if (password && password.trim()) {
      if (password.trim().length < 6) {
        throw new ValidationError('Password must be at least 6 characters long.');
      }

      const roleToUse = ['MANAGER', 'EMPLOYEE'].includes(systemRole?.toUpperCase())
        ? systemRole.toUpperCase()
        : 'EMPLOYEE';

      const roleIds = await EmployeeService.resolveRoleIds(tenantId, roleToUse);
      const passwordHash = await hashPassword(password.trim());

      let user = await User.findOne({ tenantId, email: cleanEmail }).select('+passwordHash');
      if (user) {
        user.passwordHash = passwordHash;
        user.roles = roleIds;
        user.status = USER_STATUS.ACTIVE;
        user.sessionVersion = (user.sessionVersion || 1) + 1;
        await user.save();
        createdUser = user;
      } else {
        createdUser = await User.create({
          tenantId,
          email: cleanEmail,
          passwordHash,
          roles: roleIds,
          status: USER_STATUS.ACTIVE
        });
      }

      empData.userId = createdUser._id;
    }

    const employee = await Employee.create({
      ...empData,
      email: cleanEmail,
      tenantId,
      employeeCode,
      country: empData.country || entity.country,
      timezone: empData.timezone || loc.timezone || entity.timezone,
      createdBy: actorContext.userId
    });

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.EMPLOYEE_CREATED,
      resourceType: 'Employee',
      resourceId: employee._id,
      after: employee.toObject()
    });

    if (createdUser) {
      eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
        tenantId,
        actorUserId: actorContext.userId,
        actorEmployeeId: actorContext.employeeId,
        action: AUDIT_ACTION.USER_CREATED,
        resourceType: 'User',
        resourceId: createdUser._id,
        after: { email: createdUser.email, roles: createdUser.roles, status: createdUser.status }
      });
    }

    return employee;
  }

  static async setCredentials(tenantId, employeeId, { password, systemRole = 'EMPLOYEE' } = {}, actorContext = {}) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      throw new NotFoundError('Employee');
    }

    if (!password || password.trim().length < 6) {
      throw new ValidationError('Password must be at least 6 characters long.');
    }

    const roleToUse = ['MANAGER', 'EMPLOYEE'].includes(systemRole?.toUpperCase())
      ? systemRole.toUpperCase()
      : 'EMPLOYEE';

    const roleIds = await EmployeeService.resolveRoleIds(tenantId, roleToUse);
    const passwordHash = await hashPassword(password.trim());
    const cleanEmail = (employee.email || '').trim().toLowerCase();

    let user = null;
    if (employee.userId) {
      user = await User.findOne({ _id: employee.userId, tenantId }).select('+passwordHash');
    }
    if (!user) {
      user = await User.findOne({ tenantId, email: cleanEmail }).select('+passwordHash');
    }

    if (user) {
      user.passwordHash = passwordHash;
      user.roles = roleIds;
      user.status = USER_STATUS.ACTIVE;
      user.sessionVersion = (user.sessionVersion || 1) + 1;
      await user.save();
    } else {
      user = await User.create({
        tenantId,
        email: cleanEmail,
        passwordHash,
        roles: roleIds,
        status: USER_STATUS.ACTIVE
      });
    }

    if (!employee.userId || employee.userId.toString() !== user._id.toString()) {
      employee.userId = user._id;
      await employee.save();
    }

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.USER_UPDATED,
      resourceType: 'User',
      resourceId: user._id,
      after: { email: user.email, roles: user.roles, roleToUse, status: user.status }
    });

    return {
      success: true,
      message: `Login credentials configured successfully as ${roleToUse}.`,
      employeeId: employee._id,
      userId: user._id,
      email: cleanEmail,
      systemRole: roleToUse
    };
  }

  static async update(tenantId, id, data, actorContext = {}) {
    const before = await Employee.findOne({ _id: id, tenantId });
    if (!before) {
      throw new NotFoundError('Employee');
    }

    // Prevent updating immutable tenantId or employeeCode directly
    delete data.tenantId;
    delete data.employeeCode;

    const updated = await Employee.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { ...data, updatedBy: actorContext.userId } },
      { new: true, runValidators: true }
    ).populate('entityId departmentId locationId managerId userId');

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.EMPLOYEE_UPDATED,
      resourceType: 'Employee',
      resourceId: id,
      before: before.toObject(),
      after: updated.toObject()
    });

    return updated;
  }

  static async updateStatus(tenantId, id, status, reason, actorContext = {}) {
    if (!Object.values(EMPLOYEE_STATUS).includes(status)) {
      throw new ValidationError(`Invalid employee status: ${status}`);
    }

    const before = await Employee.findOne({ _id: id, tenantId });
    if (!before) {
      throw new NotFoundError('Employee');
    }

    const updateFields = {
      employmentStatus: status,
      updatedBy: actorContext.userId
    };

    if (['RESIGNED', 'TERMINATED', 'EXITED'].includes(status) && !before.exitDate) {
      updateFields.exitDate = new Date();
    }

    const updated = await Employee.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updateFields },
      { new: true }
    );

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.EMPLOYEE_DEACTIVATED,
      resourceType: 'Employee',
      resourceId: id,
      before: before.toObject(),
      after: updated.toObject(),
      reason
    });

    return updated;
  }

  static async transferEmployee(tenantId, id, { newEntityId, newDepartmentId, newLocationId, newManagerId, transferDate, reason }, actorContext = {}) {
    const employee = await Employee.findOne({ _id: id, tenantId });
    if (!employee) throw new NotFoundError('Employee');

    const updateFields = { updatedBy: actorContext.userId };
    const transferEntry = {
      fromEntityId: employee.entityId,
      toEntityId: newEntityId || employee.entityId,
      fromDepartmentId: employee.departmentId,
      toDepartmentId: newDepartmentId || employee.departmentId,
      fromLocationId: employee.locationId,
      toLocationId: newLocationId || employee.locationId,
      fromManagerId: employee.managerId,
      toManagerId: newManagerId !== undefined ? newManagerId : employee.managerId,
      transferDate: transferDate ? new Date(transferDate) : new Date(),
      reason: reason || 'Internal transfer',
      transferredBy: actorContext.userId
    };

    if (newEntityId) {
      const entity = await Entity.findOne({ _id: newEntityId, tenantId });
      if (!entity) throw new ValidationError('Invalid target entity ID');
      updateFields.entityId = newEntityId;
    }
    if (newDepartmentId) {
      const dept = await Department.findOne({ _id: newDepartmentId, tenantId });
      if (!dept) throw new ValidationError('Invalid target department ID');
      updateFields.departmentId = newDepartmentId;
    }
    if (newLocationId) {
      const loc = await Location.findOne({ _id: newLocationId, tenantId });
      if (!loc) throw new ValidationError('Invalid target location ID');
      updateFields.locationId = newLocationId;
    }
    if (newManagerId !== undefined) {
      if (newManagerId) {
        const mgr = await Employee.findOne({ _id: newManagerId, tenantId });
        if (!mgr) throw new ValidationError('Invalid target manager ID');
      }
      updateFields.managerId = newManagerId;
    }

    const updated = await Employee.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $set: updateFields,
        $push: { transferHistory: transferEntry }
      },
      { new: true }
    ).populate('entityId departmentId locationId managerId');

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.EMPLOYEE_TRANSFERRED,
      resourceType: 'Employee',
      resourceId: id,
      before: {
        entityId: employee.entityId,
        departmentId: employee.departmentId,
        locationId: employee.locationId,
        managerId: employee.managerId
      },
      after: {
        entityId: updated.entityId,
        departmentId: updated.departmentId,
        locationId: updated.locationId,
        managerId: updated.managerId
      },
      reason
    });

    return updated;
  }
}
