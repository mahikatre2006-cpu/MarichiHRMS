import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../../constants/enums.js';

const attendanceRecordSchema = new mongoose.Schema({
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
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },
  shiftTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShiftTemplate',
    default: null
  },
  firstIn: {
    type: Date,
    default: null
  },
  lastOut: {
    type: Date,
    default: null
  },
  totalWorkedMinutes: {
    type: Number,
    default: 0
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  earlyLeaveMinutes: {
    type: Number,
    default: 0
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  overtimeMultiplier: {
    type: Number,
    default: 1.5
  },
  status: {
    type: String,
    enum: Object.values(ATTENDANCE_STATUS),
    default: ATTENDANCE_STATUS.ABSENT,
    index: true
  },
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  },
  isOverridden: {
    type: Boolean,
    default: false
  },
  overrideReason: {
    type: String,
    trim: true
  },
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  overriddenAt: {
    type: Date,
    default: null
  },
  leaveRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest',
    default: null
  },
  calculationMetadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

attendanceRecordSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceRecordSchema.index({ tenantId: 1, date: 1, status: 1 });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
