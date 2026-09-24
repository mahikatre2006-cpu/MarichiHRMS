import mongoose from 'mongoose';
import { EMPLOYEE_STATUS, EMPLOYMENT_TYPE } from '../../constants/enums.js';

const employeeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  employeeCode: {
    type: String,
    required: [true, 'Employee code is required'],
    trim: true,
    uppercase: true,
    maxlength: 50
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: 100
  },
  middleName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: 100
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  email: {
    type: String,
    required: [true, 'Work email is required'],
    trim: true,
    lowercase: true,
    maxlength: 150
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 30
  },
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
    default: 'PREFER_NOT_TO_SAY'
  },
  dateOfBirth: {
    type: Date
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required']
  },
  exitDate: {
    type: Date,
    default: null
  },
  employmentType: {
    type: String,
    enum: Object.values(EMPLOYMENT_TYPE),
    default: EMPLOYMENT_TYPE.FULL_TIME
  },
  employmentStatus: {
    type: String,
    enum: Object.values(EMPLOYEE_STATUS),
    default: EMPLOYEE_STATUS.ACTIVE
  },
  designation: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Team Member'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entity',
    default: null,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
    index: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null,
    index: true
  },
  country: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 10
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  emergencyContact: {
    name: { type: String, trim: true },
    relation: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  transferHistory: [{
    fromEntityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity' },
    toEntityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity' },
    fromDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    toDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    fromLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    toLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    fromManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    toManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    transferDate: { type: Date, default: Date.now },
    reason: { type: String, trim: true },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-populate displayName before saving if not explicitly set
employeeSchema.pre('save', function (next) {
  if (!this.displayName) {
    this.displayName = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
  next();
});

// Compound unique index: employeeCode within tenant
employeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, email: 1 });
employeeSchema.index({ tenantId: 1, entityId: 1 });
employeeSchema.index({ tenantId: 1, departmentId: 1 });
employeeSchema.index({ tenantId: 1, managerId: 1 });
employeeSchema.index({ tenantId: 1, locationId: 1 });
employeeSchema.index({ tenantId: 1, employmentStatus: 1 });

export const Employee = mongoose.model('Employee', employeeSchema);
