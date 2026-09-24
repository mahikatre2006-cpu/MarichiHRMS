import mongoose from 'mongoose';
import { PUNCH_SOURCE, PUNCH_TYPE } from '../../constants/enums.js';

const attendancePunchSchema = new mongoose.Schema({
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
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(PUNCH_TYPE),
    required: true
  },
  source: {
    type: String,
    enum: Object.values(PUNCH_SOURCE),
    default: PUNCH_SOURCE.WEB
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  geofenceResult: {
    isInside: Boolean,
    distanceMeters: Number,
    radiusMeters: Number
  },
  deviceMetadata: {
    ip: String,
    userAgent: String,
    deviceId: String
  },
  rawEventId: {
    type: String,
    trim: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // IMMUTABLE: no updatedAt
});

// Protect against modification of raw punch records
attendancePunchSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Attendance punches are immutable and cannot be updated once recorded'));
  }
  next();
});

attendancePunchSchema.index({ tenantId: 1, employeeId: 1, timestamp: 1 });

export const AttendancePunch = mongoose.model('AttendancePunch', attendancePunchSchema);
