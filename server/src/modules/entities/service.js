import { Entity } from './model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export class EntityService {
  static async list(tenantId, filter = {}) {
    return Entity.find({ tenantId, ...filter }).sort({ name: 1 });
  }

  static async getById(tenantId, id) {
    const entity = await Entity.findOne({ _id: id, tenantId });
    if (!entity) {
      throw new NotFoundError('Entity');
    }
    return entity;
  }

  static async create(tenantId, data) {
    const existing = await Entity.findOne({
      tenantId,
      code: data.code.toUpperCase()
    });
    if (existing) {
      throw new ConflictError(`Entity with code '${data.code}' already exists in this tenant.`);
    }

    return Entity.create({
      ...data,
      tenantId,
      organisationId: tenantId,
      code: data.code.toUpperCase()
    });
  }

  static async update(tenantId, id, data) {
    const entity = await Entity.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!entity) {
      throw new NotFoundError('Entity');
    }
    return entity;
  }
}
