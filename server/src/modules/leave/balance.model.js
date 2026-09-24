import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
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
  year: {
    type: Number,
    required: true
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  accrued: {
    type: Number,
    default: 0
  },
  availed: {
    type: Number,
    default: 0
  },
  adjusted: {
    type: Number,
    default: 0
  },
  lapsed: {
    type: Number,
    default: 0
  },
  encashed: {
    type: Number,
    default: 0
  },
  closingBalance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

leaveBalanceSchema.index({ tenantId: 1, employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
