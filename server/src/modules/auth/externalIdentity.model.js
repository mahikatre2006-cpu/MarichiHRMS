import mongoose from 'mongoose';

const externalIdentitySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    trim: true,
    lowercase: true // google, microsoft, okta, keycloak
  },
  providerSubject: {
    type: String,
    required: true,
    trim: true // sub from ID token
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Unique provider + providerSubject within tenant
externalIdentitySchema.index({ tenantId: 1, provider: 1, providerSubject: 1 }, { unique: true });

export const ExternalIdentity = mongoose.model('ExternalIdentity', externalIdentitySchema);
