import { User } from './model.js';
import { Employee } from '../employees/model.js';
import { hashPassword } from '../../utils/security.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { AUDIT_ACTION, USER_STATUS } from '../../constants/enums.js';

export class UserService {
  static async list(tenantId, filter = {}) {
    return User.find({ tenantId, ...filter })
      .populate('roles')
      .select('-mfaSecret')
      .sort({ createdAt: -1 });
  }

  static async getById(tenantId, id) {
    const user = await User.findOne({ _id: id, tenantId })
      .populate('roles')
      .select('-mfaSecret');
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  static async create(tenantId, data, actorContext = {}) {
    const existing = await User.findOne({
      tenantId,
      email: data.email.toLowerCase()
    });
    if (existing) {
      throw new ConflictError(`User with email '${data.email}' already exists.`);
    }

    if (!data.password || data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long.');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      tenantId,
      email: data.email.toLowerCase(),
      passwordHash,
      roles: data.roles || [],
      status: data.status || USER_STATUS.ACTIVE
    });

    // Link employee to user if employeeId provided
    if (data.employeeId) {
      await Employee.findOneAndUpdate(
        { _id: data.employeeId, tenantId },
        { $set: { userId: user._id } }
      );
    }

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.USER_CREATED,
      resourceType: 'User',
      resourceId: user._id,
      after: { email: user.email, roles: user.roles, status: user.status }
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    return userObj;
  }

  static async update(tenantId, id, data, actorContext = {}) {
    const before = await User.findOne({ _id: id, tenantId });
    if (!before) {
      throw new NotFoundError('User');
    }

    const updateFields = {};
    if (data.roles) updateFields.roles = data.roles;
    if (data.status) updateFields.status = data.status;
    if (data.password) {
      updateFields.passwordHash = await hashPassword(data.password);
      updateFields.sessionVersion = (before.sessionVersion || 1) + 1; // Invalidate existing sessions
    }

    const updated = await User.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updateFields },
      { new: true }
    ).populate('roles');

    if (data.employeeId) {
      await Employee.findOneAndUpdate(
        { _id: data.employeeId, tenantId },
        { $set: { userId: id } }
      );
    }

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.USER_UPDATED,
      resourceType: 'User',
      resourceId: id,
      before: { roles: before.roles, status: before.status },
      after: { roles: updated.roles, status: updated.status }
    });

    const userObj = updated.toObject();
    delete userObj.passwordHash;
    return userObj;
  }

  static async updateStatus(tenantId, id, status, actorContext = {}) {
    if (!Object.values(USER_STATUS).includes(status)) {
      throw new ValidationError(`Invalid user status: ${status}`);
    }

    return UserService.update(tenantId, id, { status }, actorContext);
  }
}
