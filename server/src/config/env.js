import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const requiredInProduction = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim()),

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/marichihr',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_should_be_replaced_in_prod',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_should_be_replaced_in_prod',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_secret_32_chars',

  SSO_ENABLED: process.env.SSO_ENABLED === 'true',
  OIDC_REDIRECT_URI_BASE: process.env.OIDC_REDIRECT_URI_BASE || 'http://localhost:5000/api/v1/auth/sso',
  OIDC_ISSUER_URL: process.env.OIDC_ISSUER_URL || '',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || '',
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || '',
  OIDC_SCOPES: process.env.OIDC_SCOPES || 'openid profile email',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || '',
  MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID || 'common',

  OKTA_ISSUER_URL: process.env.OKTA_ISSUER_URL || '',
  OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID || '',
  OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET || '',

  KEYCLOAK_ISSUER_URL: process.env.KEYCLOAK_ISSUER_URL || '',
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || '',
  KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || '',

  ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL || 'admin@marichihr.com',
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || 'MarichiHR@2026!Secure'
};

export function validateEnv() {
  if (env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`CRITICAL: Missing required environment variables in production: ${missing.join(', ')}`);
    }
  }
}
