# MarichiHR HRMS — Production Deployment & Hardening Guide

This document outlines the operational procedures, infrastructure requirements, database security, and hardening steps for deploying **MarichiHR HRMS Phase 1** to production.

---

## 1. MongoDB Atlas Production Configuration

### 1.1 Cluster Tier & Topology
- **Minimum Tier**: M10 replica set (3-node minimum) for high availability and automatic failover.
- **Regions**: Multi-region or latency-optimized to your operational headquarters.
- **Storage Engine**: WiredTiger with encrypted data-at-rest enabled (FIPS 140-2 compliant).

### 1.2 Network Security & Access Control
- **Network Peering / Private Endpoints**: Use AWS Direct Connect, Azure ExpressRoute, or Google Cloud Dedicated Interconnect with VPC Peering.
- **IP Access List**: Never allow `0.0.0.0/0`. Whitelist only the static egress IPs of your application cluster (e.g., AWS NAT Gateway elastic IPs).
- **Authentication**: SCRAM-SHA-256 or X.509 certificates.
- **Least-Privilege Database Users**:
  - Application user: `readWrite` on `marichihrms` database only.
  - No global cluster administrator rights for application runtime connections.

### 1.3 Connection String
```ini
MONGODB_URI="mongodb+srv://app_user:STRONG_PASSWORD@cluster0.abcde.mongodb.net/marichihrms?retryWrites=true&w=majority&appName=MarichiHRMS"
```

---

## 2. Environment Variables Checklist for Production

Ensure every variable is populated securely using your cloud provider's secrets manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, or HashiCorp Vault):

```ini
# Environment
NODE_ENV=production
PORT=5000
CLIENT_URL=https://hrms.yourdomain.com

# Database
MONGODB_URI=mongodb+srv://...

# JWT & Cryptographic Keys (Must be randomly generated >= 256 bits)
JWT_SECRET=GENERATED_SECURE_RANDOM_STRING_MIN_32_BYTES
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=GENERATED_SECURE_RANDOM_STRING_MIN_32_BYTES
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=GENERATED_SECURE_RANDOM_STRING_MIN_32_BYTES

# Strict CORS Allowlist
CORS_ORIGINS=https://hrms.yourdomain.com

# Enterprise Single Sign-On (Google / Azure / Okta)
SSO_ENABLED=true
OIDC_ISSUER_URL=https://accounts.google.com
OIDC_CLIENT_ID=your-client-id.apps.googleusercontent.com
OIDC_CLIENT_SECRET=your-production-client-secret
OIDC_REDIRECT_URI_BASE=https://api.hrms.yourdomain.com/api/v1/auth/sso
OIDC_SCOPES=openid profile email

# Production Seeding Safeguard (MUST be false in normal production)
ALLOW_PROD_SEED=false
```

---

## 3. Database Migration & Seeding Safeguards

### Production Seeding Safeguard
The database initialization script (`server/src/seed/seed.js`) incorporates an active production safety lock:
```javascript
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  logger.error('CRITICAL: Seed script aborted. Refusing to run in production without ALLOW_PROD_SEED=true.');
  process.exit(1);
}
```
Accidental execution of `npm run seed` in a live environment will not wipe or tamper with production records.

---

## 4. Frontend Production Build & Hosting

### Build Command:
```bash
cd client
npm run build
```
This builds an optimized production distribution in `client/dist`.

### Static Hosting with Nginx:
```nginx
server {
    listen 443 ssl http2;
    server_name hrms.yourdomain.com;

    ssl_certificate /etc/ssl/certs/hrms.crt;
    ssl_certificate_key /etc/ssl/private/hrms.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/marichihrms/client/dist;
    index index.html;

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Security & Runtime Hardening

1. **Helmet & Security Headers**: Enforces `X-DNS-Prefetch-Control`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, and `X-Content-Type-Options: nosniff`.
2. **Rate Limiting**: Configured on `/api/v1/auth/login` to prevent brute-force attacks (100 requests per 15 minutes per IP).
3. **Cookie Security**: All refresh token cookies enforce:
   - `HttpOnly: true` (prevents JavaScript/XSS extraction)
   - `Secure: true` in production (transmitted only over HTTPS)
   - `SameSite: 'Strict'` (prevents CSRF attacks)
4. **Tenant Isolation**: Every database interaction is scoped to the validated `req.tenantId`.
5. **Double-Entry Ledger & Audit Immutability**: Protected at the schema engine level against alteration and deletion.
