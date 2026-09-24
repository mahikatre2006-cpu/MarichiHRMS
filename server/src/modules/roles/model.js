import mongoose from 'mongoose';
import { RBAC_SCOPES } from '../../constants/scopes.js';

const rolePermissionSchema = new mongoose.Schema({
  permission: {
    type: String,
    required: true,
    trim: true
  },
  scope: {
    type: String,
    enum: Object.values(RBAC_SCOPES),
    default: RBAC_SCOPES.ORGANISATION,
    required: true
  },
  scopeIds: [{
    type: mongoose.Schema.Types.ObjectId
  }]
}, { _id: false });

const roleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  permissions: [rolePermissionSchema]
}, {
  timestamps: true
});

roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Role = mongoose.model('Role', roleSchema);
