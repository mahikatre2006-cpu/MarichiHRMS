import mongoose from 'mongoose';

const leaveApprovalDelegationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  delegatorEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Delegator Employee ID is required'],
    index: true
  },
  delegateEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Delegate Employee ID is required'],
    index: true
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'Start date is required']
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'End date is required']
  },
  scope: {
    type: String,
    enum: ['ALL', 'LEAVE_APPROVAL'],
    default: 'LEAVE_APPROVAL'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
    default: 'ACTIVE',
    index: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 300
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

leaveApprovalDelegationSchema.index({ tenantId: 1, delegatorEmployeeId: 1, status: 1 });
leaveApprovalDelegationSchema.index({ tenantId: 1, delegateEmployeeId: 1, status: 1 });

export const LeaveApprovalDelegation = mongoose.model('LeaveApprovalDelegation', leaveApprovalDelegationSchema);
