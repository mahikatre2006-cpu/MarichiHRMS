import mongoose from 'mongoose';

const leaveBlackoutPeriodSchema = new mongoose.Schema({
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
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  leaveTypeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType'
  }],
  name: {
    type: String,
    required: [true, 'Blackout period name is required'],
    trim: true,
    maxlength: 150
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'Start date is required']
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'End date is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

leaveBlackoutPeriodSchema.index({ tenantId: 1, entityId: 1, startDate: 1, endDate: 1, isActive: 1 });

export const LeaveBlackoutPeriod = mongoose.model('LeaveBlackoutPeriod', leaveBlackoutPeriodSchema);
