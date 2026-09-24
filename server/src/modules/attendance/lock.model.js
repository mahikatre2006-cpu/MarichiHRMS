import mongoose from 'mongoose';

const attendanceLockSchema = new mongoose.Schema({
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
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number, // 1 to 12
    required: true,
    min: 1,
    max: 12
  },
  status: {
    type: String,
    enum: ['LOCKED', 'UNLOCKED'],
    default: 'LOCKED'
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lockedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

attendanceLockSchema.index({ tenantId: 1, entityId: 1, year: 1, month: 1 }, { unique: true });

export const AttendanceLock = mongoose.model('AttendanceLock', attendanceLockSchema);
