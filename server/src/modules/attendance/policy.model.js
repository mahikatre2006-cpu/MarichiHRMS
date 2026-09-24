import mongoose from 'mongoose';

const attendancePolicySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entity',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  requireGeofence: {
    type: Boolean,
    default: false
  },
  allowWebPunch: {
    type: Boolean,
    default: true
  },
  allowMobilePunch: {
    type: Boolean,
    default: true
  },
  maxLateAllowedPerMonth: {
    type: Number,
    default: 3
  },
  lateDeductionPolicy: {
    type: String,
    enum: ['NONE', 'HALF_DAY_DEDUCTION', 'LWP_DEDUCTION'],
    default: 'NONE'
  },
  autoAbsentIfNoPunch: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

attendancePolicySchema.index({ tenantId: 1, entityId: 1, code: 1 }, { unique: true });

export const AttendancePolicy = mongoose.model('AttendancePolicy', attendancePolicySchema);
