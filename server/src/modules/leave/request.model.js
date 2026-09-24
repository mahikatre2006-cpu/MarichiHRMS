import mongoose from 'mongoose';
import { LEAVE_REQUEST_STATUS } from '../../constants/enums.js';

const leaveRequestSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true,
    index: true
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0
  },
  durationUnit: {
    type: String,
    enum: ['FULL_DAY', 'HALF_DAY', 'HOURLY'],
    default: 'FULL_DAY'
  },
  hoursRequested: {
    type: Number,
    default: 0
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDaySession: {
    type: String,
    enum: ['FIRST_HALF', 'SECOND_HALF', null],
    default: null
  },
  reason: {
    type: String,
    required: [true, 'Leave reason is required'],
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: Object.values(LEAVE_REQUEST_STATUS),
    default: LEAVE_REQUEST_STATUS.PENDING_APPROVAL,
    index: true
  },
  currentApprovalStep: {
    type: Number,
    default: 1
  },
  totalApprovalSteps: {
    type: Number,
    default: 1
  },
  isBlackoutOverride: {
    type: Boolean,
    default: false
  },
  isLwp: {
    type: Boolean,
    default: false,
    index: true
  },
  attachmentUrl: {
    type: String,
    trim: true
  },
  attachmentMetadata: {
    fileName: { type: String, trim: true },
    fileSize: { type: Number },
    mimeType: { type: String, trim: true },
    storageRef: { type: String, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date }
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
    index: true
  },
  actionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actionReason: {
    type: String,
    trim: true
  },
  actionedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

leaveRequestSchema.index({ tenantId: 1, employeeId: 1, startDate: 1 });
leaveRequestSchema.index({ tenantId: 1, managerId: 1, status: 1 });
leaveRequestSchema.index({ tenantId: 1, status: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
