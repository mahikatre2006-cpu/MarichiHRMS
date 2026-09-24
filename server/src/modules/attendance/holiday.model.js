import mongoose from 'mongoose';

const holidayCalendarSchema = new mongoose.Schema({
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
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  country: {
    type: String,
    required: true,
    uppercase: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

holidayCalendarSchema.index({ tenantId: 1, entityId: 1, year: 1, name: 1 }, { unique: true });

export const HolidayCalendar = mongoose.model('HolidayCalendar', holidayCalendarSchema);

const holidaySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  holidayCalendarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HolidayCalendar',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  holidayType: {
    type: String,
    enum: ['PUBLIC', 'OPTIONAL', 'COMPANY'],
    default: 'PUBLIC'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

holidaySchema.index({ tenantId: 1, holidayCalendarId: 1, date: 1 }, { unique: true });

export const Holiday = mongoose.model('Holiday', holidaySchema);
