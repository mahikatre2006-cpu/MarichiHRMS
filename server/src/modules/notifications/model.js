import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  recipientUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  type: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  channel: {
    type: String,
    enum: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
    default: 'IN_APP'
  },
  status: {
    type: String,
    enum: ['UNREAD', 'READ'],
    default: 'UNREAD',
    index: true
  },
  referenceEntity: {
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

notificationSchema.index({ tenantId: 1, recipientUserId: 1, status: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
