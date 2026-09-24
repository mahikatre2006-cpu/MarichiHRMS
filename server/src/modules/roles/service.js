import { Role } from './model.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { AUDIT_ACTION } from '../../constants/enums.js';

export class RoleService {
  static async list(tenantId) {
    return Role.find({ tenantId }).sort({ isSystem: -1, name: 1 });
  }

  static async getById(tenantId, id) {
    const role = await Role.findOne({ _id: id, tenantId });
    if (!role) {
      throw new NotFoundError('Role');
    }
    return role;
  }

  static async create(tenantId, data, actorContext = {}) {
    const existing = await Role.findOne({
      tenantId,
      name: data.name.trim().toUpperCase()
    });
    if (existing) {
      throw new ConflictError(`Role '${data.name}' already exists.`);
    }

    const role = await Role.create({
      ...data,
      tenantId,
      name: data.name.trim().toUpperCase(),
      isSystem: false
    });

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.ROLE_CREATED,
      resourceType: 'Role',
      resourceId: role._id,
      after: role.toObject()
    });

    return role;
  }

  static async update(tenantId, id, data, actorContext = {}) {
    const before = await Role.findOne({ _id: id, tenantId });
    if (!before) {
      throw new NotFoundError('Role');
    }

    if (before.isSystem && data.name && data.name !== before.name) {
      throw new ValidationError('System role names cannot be renamed.');
    }

    const updated = await Role.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: data },
      { new: true, runValidators: true }
    );

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.ROLE_UPDATED,
      resourceType: 'Role',
      resourceId: id,
      before: before.toObject(),
      after: updated.toObject()
    });

    return updated;
  }
}
