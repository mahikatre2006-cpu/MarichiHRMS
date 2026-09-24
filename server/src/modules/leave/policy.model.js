import mongoose from 'mongoose';

const leavePolicySchema = new mongoose.Schema({
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
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true,
    index: true
  },
  accrualModel: {
    type: String,
    enum: ['MONTHLY_PRO_RATA', 'ANNUAL_LUMP_SUM', 'TENURE_SLABS'],
    default: 'MONTHLY_PRO_RATA'
  },
  annualEntitlement: {
    type: Number,
    required: true,
    min: 0
  },
  monthlyAccrual: {
    type: Number,
    default: 0
  },
  carryForwardAllowed: {
    type: Boolean,
    default: true
  },
  carryForwardLimit: {
    type: Number,
    default: 10
  },
  expiryMonths: {
    type: Number,
    default: 12
  },
  encashmentAllowed: {
    type: Boolean,
    default: false
  },
  maxEncashmentDays: {
    type: Number,
    default: 30
  },
  minBalanceRetained: {
    type: Number,
    default: 0
  },
  proRataOnJoining: {
    type: Boolean,
    default: true
  },
  tenureSlabs: [{
    minMonths: { type: Number, required: true },
    maxMonths: { type: Number, required: true },
    annualEntitlement: { type: Number, required: true }
  }],
  includeWeekends: {
    type: Boolean,
    default: false
  },
  includeHolidays: {
    type: Boolean,
    default: false
  },
  approvalLevels: {
    type: Number,
    default: 1
  },
  slaHours: {
    type: Number,
    default: 48
  },
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

leavePolicySchema.index({ tenantId: 1, entityId: 1, leaveTypeId: 1 }, { unique: true });

export const LeavePolicy = mongoose.model('LeavePolicy', leavePolicySchema);
