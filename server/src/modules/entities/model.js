import mongoose from 'mongoose';

const entitySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  organisationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Entity name is required'],
    trim: true,
    maxlength: 150
  },
  code: {
    type: String,
    required: [true, 'Entity code is required'],
    trim: true,
    uppercase: true,
    maxlength: 50
  },
  country: {
    type: String,
    required: [true, 'Country code is required'],
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  currency: {
    type: String,
    required: [true, 'Currency code is required'],
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    default: 'UTC'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  settings: {
    taxRegistrationNumber: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  }
}, {
  timestamps: true
});

// Compound unique index within tenant
entitySchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const Entity = mongoose.model('Entity', entitySchema);
