import { Department } from './model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export class DepartmentService {
  static async list(tenantId, filter = {}) {
    return Department.find({ tenantId, ...filter })
      .populate('entityId parentDepartmentId managerId')
      .sort({ name: 1 });
  }

  static async getById(tenantId, id) {
    const dept = await Department.findOne({ _id: id, tenantId })
      .populate('entityId parentDepartmentId managerId');
    if (!dept) {
      throw new NotFoundError('Department');
    }
    return dept;
  }

  static async create(tenantId, data) {
    const existing = await Department.findOne({
      tenantId,
      entityId: data.entityId,
      code: data.code.toUpperCase()
    });
    if (existing) {
      throw new ConflictError(`Department with code '${data.code}' already exists in this entity.`);
    }

    return Department.create({
      ...data,
      tenantId,
      code: data.code.toUpperCase()
    });
  }

  static async update(tenantId, id, data) {
    const dept = await Department.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!dept) {
      throw new NotFoundError('Department');
    }
    return dept;
  }
}
