import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entity',
    required: [true, 'Entity ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: 150
  },
  code: {
    type: String,
    required: [true, 'Location code is required'],
    trim: true,
    uppercase: true,
    maxlength: 50
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    default: 'UTC'
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  geoFenceRadius: {
    type: Number,
    default: 200, // meters
    min: 10
  },
  geoFenceEnabled: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

locationSchema.index({ tenantId: 1, entityId: 1, code: 1 }, { unique: true });

export const Location = mongoose.model('Location', locationSchema);
