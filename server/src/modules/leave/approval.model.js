import mongoose from 'mongoose';

const leaveApprovalSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  leaveRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest',
    required: true,
    index: true
  },
  step: {
    type: Number,
    default: 1
  },
  role: {
    type: String,
    enum: ['MANAGER', 'SKIP_LEVEL', 'HR_ADMIN'],
    default: 'MANAGER'
  },
  approverEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  approverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  delegatedToEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  escalatedToEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  slaHours: {
    type: Number,
    default: 48
  },
  dueAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'SKIPPED'],
    default: 'PENDING'
  },
  comments: {
    type: String,
    trim: true
  },
  actionedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

leaveApprovalSchema.index({ tenantId: 1, leaveRequestId: 1, step: 1 });

export const LeaveApproval = mongoose.model('LeaveApproval', leaveApprovalSchema);
