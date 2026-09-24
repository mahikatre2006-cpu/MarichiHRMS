import mongoose from 'mongoose';
import { LEAVE_LEDGER_TRANSACTION_TYPE } from '../../constants/enums.js';

const leaveLedgerEntrySchema = new mongoose.Schema({
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
  transactionType: {
    type: String,
    enum: Object.values(LEAVE_LEDGER_TRANSACTION_TYPE),
    required: true
  },
  amount: {
    type: Number,
    required: true // Positive for credit, negative for debit
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  reason: {
    type: String,
    trim: true,
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // IMMUTABLE
});

leaveLedgerEntrySchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Leave ledger entries are immutable and cannot be modified'));
  }
  next();
});

leaveLedgerEntrySchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
  next(new Error('Security violation: Leave ledger entries cannot be modified (double-entry immutability)'));
});

leaveLedgerEntrySchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('Security violation: Leave ledger entries cannot be deleted (double-entry immutability)'));
});

leaveLedgerEntrySchema.index({ tenantId: 1, employeeId: 1, leaveTypeId: 1, createdAt: -1 });

export const LeaveLedgerEntry = mongoose.model('LeaveLedgerEntry', leaveLedgerEntrySchema);
