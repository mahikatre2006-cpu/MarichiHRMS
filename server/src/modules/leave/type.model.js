import mongoose from 'mongoose';
import { LEAVE_CATEGORY } from '../../constants/enums.js';

const leaveTypeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Leave type name is required'],
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: [true, 'Leave type code is required'],
    trim: true,
    uppercase: true,
    maxlength: 30
  },
  category: {
    type: String,
    enum: Object.values(LEAVE_CATEGORY),
    default: LEAVE_CATEGORY.ANNUAL
  },
  isPaid: {
    type: Boolean,
    default: true
  },
  requiresAttachment: {
    type: Boolean,
    default: false
  },
  supportsHalfDay: {
    type: Boolean,
    default: true
  },
  supportsHourly: {
    type: Boolean,
    default: false
  },
  allowsNegativeBalance: {
    type: Boolean,
    default: false
  },
  maxNegativeBalance: {
    type: Number,
    default: 0
  },
  genderApplicability: {
    type: String,
    enum: ['ALL', 'MALE', 'FEMALE'],
    default: 'ALL'
  },
  minTenureMonths: {
    type: Number,
    default: 0
  },
  minDurationDays: {
    type: Number,
    default: 0.5
  },
  maxDurationDays: {
    type: Number,
    default: 365
  },
  requiresProofAfterDays: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

leaveTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);
