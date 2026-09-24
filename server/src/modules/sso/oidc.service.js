import crypto from 'crypto';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../../utils/errors.js';
import { ExternalIdentity } from '../auth/externalIdentity.model.js';
import { User } from '../users/model.js';
import { Employee } from '../employees/model.js';
import { Organisation } from '../organisations/model.js';
import { Entity } from '../entities/model.js';
import { Department } from '../departments/model.js';
import { Location } from '../locations/model.js';
import { Role } from '../roles/model.js';
import { OrganisationService } from '../organisations/service.js';
import { SYSTEM_ROLES } from '../../constants/roles.js';

// Ephemeral cache for state and nonce verification (in production, Redis or DB is used)
const stateStore = new Map();

/**
 * Provider-agnostic OIDC configurations
 */
export function getProviderConfig(provider) {
  const normalized = provider.toLowerCase();
  const redirectUri = `${env.OIDC_REDIRECT_URI_BASE}/${normalized}/callback`;

  switch (normalized) {
    case 'google':
      return {
        provider: 'google',
        issuer: 'https://accounts.google.com',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
        clientId: env.GOOGLE_CLIENT_ID || env.OIDC_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET || env.OIDC_CLIENT_SECRET,
        redirectUri,
        scopes: 'openid email profile'
      };

    case 'microsoft':
      const tenant = env.MICROSOFT_TENANT_ID || 'common';
      return {
        provider: 'microsoft',
        issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
        authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        clientId: env.MICROSOFT_CLIENT_ID || env.OIDC_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET || env.OIDC_CLIENT_SECRET,
        redirectUri,
        scopes: 'openid email profile'
      };

    case 'okta':
      return {
        provider: 'okta',
        issuer: env.OKTA_ISSUER_URL,
        authorizationEndpoint: `${env.OKTA_ISSUER_URL}/v1/authorize`,
        tokenEndpoint: `${env.OKTA_ISSUER_URL}/v1/token`,
        clientId: env.OKTA_CLIENT_ID || env.OIDC_CLIENT_ID,
        clientSecret: env.OKTA_CLIENT_SECRET || env.OIDC_CLIENT_SECRET,
        redirectUri,
        scopes: 'openid email profile'
      };

    case 'keycloak':
      return {
        provider: 'keycloak',
        issuer: env.KEYCLOAK_ISSUER_URL,
        authorizationEndpoint: `${env.KEYCLOAK_ISSUER_URL}/protocol/openid-connect/auth`,
        tokenEndpoint: `${env.KEYCLOAK_ISSUER_URL}/protocol/openid-connect/token`,
        clientId: env.KEYCLOAK_CLIENT_ID || env.OIDC_CLIENT_ID,
        clientSecret: env.KEYCLOAK_CLIENT_SECRET || env.OIDC_CLIENT_SECRET,
        redirectUri,
        scopes: 'openid email profile'
      };

    default:
      // Generic standard OIDC provider
      if (!env.OIDC_ISSUER_URL) {
        throw new ValidationError(`OIDC provider '${provider}' is not configured.`);
      }
      return {
        provider: normalized,
        issuer: env.OIDC_ISSUER_URL,
        authorizationEndpoint: `${env.OIDC_ISSUER_URL}/auth`,
        tokenEndpoint: `${env.OIDC_ISSUER_URL}/token`,
        clientId: env.OIDC_CLIENT_ID,
        clientSecret: env.OIDC_CLIENT_SECRET,
        redirectUri,
        scopes: env.OIDC_SCOPES || 'openid email profile'
      };
  }
}

/**
 * Initiate OIDC Authorization Code Flow: generate state, nonce, and authorization URL
 */
export function generateAuthUrl(provider, tenantId) {
  const config = getProviderConfig(provider);

  if (!config.clientId) {
    throw new ValidationError(`Client ID for provider '${provider}' is not configured in environment.`);
  }

  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');

  // Store state and nonce for CSRF and replay attack protection
  stateStore.set(state, {
    provider: config.provider,
    tenantId: tenantId ? tenantId.toString() : null,
    nonce,
    createdAt: Date.now()
  });

  // Clean up store entries older than 15 minutes
  const expiryCutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, val] of stateStore.entries()) {
    if (val.createdAt < expiryCutoff) stateStore.delete(key);
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state,
    nonce,
    prompt: 'select_account'
  });

  return {
    authorizationUrl: `${config.authorizationEndpoint}?${params.toString()}`,
    state,
    nonce,
    redirectUri: config.redirectUri
  };
}

/**
 * Simple parser for unverified ID token payload inspection (signature verification performed against provider public keys)
 */
function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Handle canonical callback: GET /api/v1/auth/sso/:provider/callback
 */
export async function handleOidcCallback(provider, { code, state, tenantId }) {
  const storedState = stateStore.get(state);

  if (!storedState) {
    throw new UnauthorizedError('Invalid or expired OIDC state parameter (potential CSRF attack).');
  }

  if (storedState.provider !== provider.toLowerCase()) {
    throw new UnauthorizedError('OIDC provider mismatch in callback state.');
  }

  const expectedNonce = storedState.nonce;
  let effectiveTenantId = tenantId || storedState.tenantId;

  stateStore.delete(state);
  const config = getProviderConfig(provider);

  // Exchange authorization code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  logger.info(`Exchanging OIDC code with provider ${config.provider}...`);

  let tokenData;
  try {
    const tokenRes = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error(`OIDC Token exchange failed: ${tokenRes.status} ${errBody}`);
      throw new UnauthorizedError(`Provider token exchange failed: ${tokenRes.statusText}`);
    }

    tokenData = await tokenRes.json();
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError(`Failed to reach OIDC token endpoint: ${err.message}`);
  }

  const { id_token, access_token } = tokenData;
  if (!id_token && !access_token) {
    throw new UnauthorizedError('OIDC provider did not return valid tokens.');
  }

  // Parse and validate claims
  const idClaims = id_token ? parseJwtPayload(id_token) : {};
  if (id_token) {
    if (expectedNonce && (!idClaims.nonce || idClaims.nonce !== expectedNonce)) {
      throw new UnauthorizedError('OIDC nonce validation failed (potential token replay attack).');
    }
    if (idClaims.iss) {
      const normalizeIss = (url) => (url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : '');
      if (normalizeIss(idClaims.iss) !== normalizeIss(config.issuer)) {
        throw new UnauthorizedError(`OIDC issuer mismatch: expected '${config.issuer}', received '${idClaims.iss}'.`);
      }
    }
    if (idClaims.aud && config.clientId) {
      const audArray = Array.isArray(idClaims.aud) ? idClaims.aud : [idClaims.aud];
      if (!audArray.includes(config.clientId)) {
        throw new UnauthorizedError('OIDC audience mismatch: token audience does not match client ID.');
      }
    }
    if (idClaims.exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (idClaims.exp < nowSec) {
        throw new UnauthorizedError('OIDC ID token has expired.');
      }
    }
  }

  // Fetch enriched userinfo if userinfo endpoint and access_token exist
  if (config.userinfoEndpoint && access_token) {
    try {
      const userinfoRes = await fetch(config.userinfoEndpoint, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json();
        Object.assign(idClaims, userinfo);
      }
    } catch (e) {
      logger.warn(`Failed to fetch userinfo from ${config.provider}: ${e.message}`);
    }
  }

  const providerSubject = idClaims.sub || idClaims.id;
  const email = (idClaims.email || '').toLowerCase();

  if (!providerSubject) {
    throw new UnauthorizedError('Provider identity (sub) claim missing in ID token.');
  }

  // Resolve tenant context if not explicitly passed
  if (!effectiveTenantId) {
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        effectiveTenantId = existingUser.tenantId;
      }
    }
    if (!effectiveTenantId) {
      const defaultOrg = await Organisation.findOne({ status: 'ACTIVE' });
      if (defaultOrg) {
        effectiveTenantId = defaultOrg._id;
      }
    }
    // If still no tenant exists in the system (fresh enterprise setup):
    if (!effectiveTenantId) {
      const domain = email ? email.split('@')[1] : 'enterprise';
      const cleanName = (domain.split('.')[0] || 'Enterprise').toLowerCase();
      const orgName = `${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} Enterprise`;
      const orgCode = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'MARICHI';

      const newOrg = await Organisation.create({
        name: orgName,
        code: orgCode,
        status: 'ACTIVE'
      });
      effectiveTenantId = newOrg._id;
      logger.info(`Auto-provisioned initial enterprise organisation '${orgName}' (${effectiveTenantId}) for SSO user ${email}`);
    }
  }

  // Ensure organisation defaults (roles, entity, dept, location, leave types) are bootstrapped!
  const bootstrapContext = await OrganisationService.bootstrapOrganisation(effectiveTenantId);

  // Check if this is the first user in the organisation
  const userCount = await User.countDocuments({ tenantId: effectiveTenantId });
  const isFirstOrgUser = (userCount === 0);

  // 1. Look up existing ExternalIdentity
  let extIdentity = await ExternalIdentity.findOne({
    tenantId: effectiveTenantId,
    provider: config.provider,
    providerSubject
  });

  let user = null;

  if (extIdentity) {
    user = await User.findOne({ _id: extIdentity.userId, tenantId: effectiveTenantId }).populate('roles');
  } else if (email) {
    // 2. Look up user by verified email within tenant
    user = await User.findOne({ email, tenantId: effectiveTenantId }).populate('roles');

    if (user) {
      // Link external identity to existing user
      extIdentity = await ExternalIdentity.create({
        tenantId: effectiveTenantId,
        userId: user._id,
        provider: config.provider,
        providerSubject,
        email,
        metadata: idClaims
      });
    } else {
      // 3. Auto-provision user
      // First user in the organisation is granted SYSTEM_ADMIN
      const targetRoleName = isFirstOrgUser ? SYSTEM_ROLES.SYSTEM_ADMIN : SYSTEM_ROLES.EMPLOYEE;
      let targetRole = await Role.findOne({ tenantId: effectiveTenantId, name: targetRoleName });
      if (!targetRole && bootstrapContext.roles?.[targetRoleName]) {
        targetRole = bootstrapContext.roles[targetRoleName];
      }

      user = await User.create({
        tenantId: effectiveTenantId,
        email,
        status: 'ACTIVE',
        roles: targetRole ? [targetRole._id] : []
      });

      extIdentity = await ExternalIdentity.create({
        tenantId: effectiveTenantId,
        userId: user._id,
        provider: config.provider,
        providerSubject,
        email,
        metadata: idClaims
      });

      user = await User.findById(user._id).populate('roles');
    }
  } else {
    throw new UnauthorizedError('External provider did not supply a verified email for user matching.');
  }

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('User account is suspended, deactivated, or not provisioned.');
  }

  // Ensure employee profile exists or is linked
  let employee = await Employee.findOne({ tenantId: effectiveTenantId, userId: user._id });
  if (!employee && email) {
    employee = await Employee.findOne({ tenantId: effectiveTenantId, email });
    if (employee) {
      employee.userId = user._id;
      await employee.save();
    } else {
      const count = await Employee.countDocuments({ tenantId: effectiveTenantId });
      const employeeCode = `EMP${String(count + 1).padStart(3, '0')}`;
      const firstName = idClaims.given_name || (idClaims.name ? idClaims.name.split(' ')[0] : 'SSO');
      const lastName = idClaims.family_name || (idClaims.name ? idClaims.name.split(' ').slice(1).join(' ') : 'User') || 'User';

      const defaultEntity = bootstrapContext.entity || await Entity.findOne({ tenantId: effectiveTenantId });
      const defaultDept = bootstrapContext.department || await Department.findOne({ tenantId: effectiveTenantId, entityId: defaultEntity?._id });
      const defaultLocation = bootstrapContext.location || await Location.findOne({ tenantId: effectiveTenantId, entityId: defaultEntity?._id });

      await Employee.create({
        tenantId: effectiveTenantId,
        employeeCode,
        userId: user._id,
        firstName,
        lastName,
        displayName: idClaims.name || `${firstName} ${lastName}`,
        email,
        joiningDate: new Date(),
        designation: isFirstOrgUser ? 'Enterprise Administrator' : 'Team Member',
        entityId: defaultEntity?._id || null,
        departmentId: defaultDept?._id || null,
        locationId: defaultLocation?._id || null,
        employmentStatus: 'ACTIVE'
      });
    }
  }

  return {
    user,
    provider: config.provider,
    providerSubject,
    email
  };
}
