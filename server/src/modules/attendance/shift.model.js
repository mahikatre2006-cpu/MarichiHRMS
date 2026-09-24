import mongoose from 'mongoose';

const shiftTemplateSchema = new mongoose.Schema({
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
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Shift name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Shift code is required'],
    trim: true,
    uppercase: true
  },
  shiftType: {
    type: String,
    enum: ['FIXED', 'ROTATIONAL', 'SPLIT', 'FLEXIBLE'],
    default: 'FIXED'
  },
  startTime: {
    type: String, // HH:mm format, e.g. "09:00"
    required: true
  },
  endTime: {
    type: String, // HH:mm format, e.g. "18:00"
    required: true
  },
  breakMinutes: {
    type: Number,
    default: 60
  },
  lateGraceMinutes: {
    type: Number,
    default: 15
  },
  earlyExitGraceMinutes: {
    type: Number,
    default: 15
  },
  halfDayThresholdMinutes: {
    type: Number,
    default: 240 // 4 hours
  },
  fullDayThresholdMinutes: {
    type: Number,
    default: 480 // 8 hours
  },
  crossMidnight: {
    type: Boolean,
    default: false
  },
  workingDays: [{
    type: Number, // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    min: 0,
    max: 6
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

shiftTemplateSchema.index({ tenantId: 1, entityId: 1, code: 1 }, { unique: true });

export const ShiftTemplate = mongoose.model('ShiftTemplate', shiftTemplateSchema);
