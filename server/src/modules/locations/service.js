import { Location } from './model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export class LocationService {
  static async list(tenantId, filter = {}) {
    return Location.find({ tenantId, ...filter })
      .populate('entityId')
      .sort({ name: 1 });
  }

  static async getById(tenantId, id) {
    const loc = await Location.findOne({ _id: id, tenantId }).populate('entityId');
    if (!loc) {
      throw new NotFoundError('Location');
    }
    return loc;
  }

  static async create(tenantId, data) {
    const existing = await Location.findOne({
      tenantId,
      entityId: data.entityId,
      code: data.code.toUpperCase()
    });
    if (existing) {
      throw new ConflictError(`Location with code '${data.code}' already exists in this entity.`);
    }

    return Location.create({
      ...data,
      tenantId,
      code: data.code.toUpperCase()
    });
  }

  static async update(tenantId, id, data) {
    const loc = await Location.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!loc) {
      throw new NotFoundError('Location');
    }
    return loc;
  }
}
