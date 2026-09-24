import { Employee } from './model.js';
import { Entity } from '../entities/model.js';
import { Department } from '../departments/model.js';
import { Location } from '../locations/model.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { AUDIT_ACTION, EMPLOYEE_STATUS } from '../../constants/enums.js';

export class EmployeeService {
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
        .populate('entityId departmentId locationId managerId userId')
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
      .populate('entityId departmentId locationId managerId userId');
    if (!employee) {
      throw new NotFoundError('Employee');
    }
    return employee;
  }

  static async create(tenantId, data, actorContext = {}) {
    // 1. Validate Entity, Department, Location exist within tenant
    const [entity, dept, loc] = await Promise.all([
      Entity.findOne({ _id: data.entityId, tenantId }),
      Department.findOne({ _id: data.departmentId, tenantId }),
      Location.findOne({ _id: data.locationId, tenantId })
    ]);

    if (!entity) throw new ValidationError('Invalid entity ID');
    if (!dept) throw new ValidationError('Invalid department ID');
    if (!loc) throw new ValidationError('Invalid location ID');

    // 2. Resolve employeeCode
    let employeeCode = data.employeeCode;
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
    if (data.managerId) {
      const manager = await Employee.findOne({ _id: data.managerId, tenantId });
      if (!manager) throw new ValidationError('Invalid manager ID');
    }

    const employee = await Employee.create({
      ...data,
      tenantId,
      employeeCode,
      country: data.country || entity.country,
      timezone: data.timezone || loc.timezone || entity.timezone,
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

    return employee;
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
