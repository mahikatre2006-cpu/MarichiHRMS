import mongoose from 'mongoose';

const organisationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organisation name is required'],
    trim: true,
    maxlength: 150
  },
  code: {
    type: String,
    required: [true, 'Organisation code is required'],
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  defaultSettings: {
    defaultTimezone: { type: String, default: 'UTC' },
    defaultCurrency: { type: String, default: 'USD' },
    fiscalYearStartMonth: { type: Number, default: 1 } // 1 = January, 4 = April
  },
  supportedCountries: [{
    type: String,
    trim: true,
    uppercase: true
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export const Organisation = mongoose.model('Organisation', organisationSchema);
