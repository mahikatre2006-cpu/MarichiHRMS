import mongoose from 'mongoose';
import { REGULARISATION_STATUS } from '../../constants/enums.js';

const attendanceRegularisationSchema = new mongoose.Schema({
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
  attendanceRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceRecord',
    default: null
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  requestedFirstIn: {
    type: Date,
    required: true
  },
  requestedLastOut: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Reason for regularisation is required'],
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: Object.values(REGULARISATION_STATUS),
    default: REGULARISATION_STATUS.PENDING_APPROVAL,
    index: true
  },
  approverEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  approverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approverComments: {
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

attendanceRegularisationSchema.index({ tenantId: 1, employeeId: 1, date: 1 });

export const AttendanceRegularisation = mongoose.model('AttendanceRegularisation', attendanceRegularisationSchema);
