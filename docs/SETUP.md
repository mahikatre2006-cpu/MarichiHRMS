# MarichiHR HRMS — Local Development & Setup Guide

This guide provides step-by-step instructions for installing, configuring, running, and testing the **MarichiHR HRMS Phase 1** application.

---

## 1. Prerequisites

Ensure your development environment meets the following requirements:

- **Node.js**: `v18.0.0` or higher (`v20.x` or `v22.x` LTS recommended)
- **npm**: `v9.x` or `v10.x`
- **MongoDB**:
  - **MongoDB Atlas** (recommended for staging/production), OR
  - **Local MongoDB Community Server** (`v6.0` or `v7.0`)
- **Git**: Latest version

Verify your environment:
```bash
node -v
npm -v
```

---

## 2. Repository Structure

```text
MarichiHRMS/
├── client/              # React (Vite) Frontend (100% JavaScript, Zero TypeScript)
│   ├── src/
│   │   ├── api/         # Axios client and API wrappers
│   │   ├── context/     # AuthContext and state providers
│   │   ├── pages/       # Route pages (Auth, Dashboard, Employees, Attendance, Leave)
│   │   ├── components/  # Reusable UI components
│   │   └── utils/       # Formatters, helpers, constants
│   └── package.json
├── server/              # Node.js + Express + Mongoose Backend
│   ├── src/
│   │   ├── config/      # Environment validation & DB connection
│   │   ├── constants/   # Enums, roles, and permissions
│   │   ├── middleware/  # Auth, RBAC scoping, validation, error handler
│   │   ├── modules/     # Domain modules (auth, org, employee, attendance, leave, audit)
│   │   ├── seed/        # Database initialization & default fixtures
│   │   └── utils/       # Logger, security, response helpers
│   ├── tests/           # Jest test suites (Multi-tenancy, RBAC, Attendance, Leave, E2E)
│   └── package.json
├── docs/                # Architectural & operational documentation
│   ├── SETUP.md         # Setup and run instructions
│   ├── SSO.md           # Enterprise OIDC / SSO setup guide
│   ├── RBAC.md          # 5-level RBAC scoping specification
│   ├── API.md           # Complete REST API reference
│   ├── DEPLOYMENT.md    # Production deployment & hardening guide
│   └── openapi.yaml     # OpenAPI 3.0 API specification
├── .env.example         # Root environment variables template
└── README.md            # Project overview & architectural summary
```

---

## 3. Environment Variables Configuration

Copy `.env.example` to `server/.env` and `client/.env`.

### Server Environment (`server/.env`)

```ini
# Server Core
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection (MongoDB Atlas or local)
MONGODB_URI=mongodb://localhost:27017/marichihrms_dev

# JWT & Cookie Security
JWT_SECRET=super_secure_jwt_access_secret_change_in_production_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super_secure_jwt_refresh_secret_change_in_production_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=super_secure_cookie_signing_secret_min_32_chars

# CORS Whitelist (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Enterprise SSO / OpenID Connect (Google Cloud, Microsoft, Okta)
SSO_ENABLED=true
OIDC_ISSUER_URL=https://accounts.google.com
OIDC_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
OIDC_CLIENT_SECRET=your-google-client-secret
OIDC_REDIRECT_URI_BASE=http://localhost:5000/api/v1/auth/sso
OIDC_SCOPES=openid profile email

# Initial Setup & Seeding Safeguards
ALLOW_PROD_SEED=false
```

### Client Environment (`client/.env`)

```ini
VITE_API_URL=http://localhost:5000/api/v1
```

---

## 4. Installation

Install dependencies for root, server, and client:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## 5. Database Initialization & Seeding

Populate initial enterprise tenants, roles, permissions, administrative entities, departments, and seed users:

```bash
cd server
npm run seed
```

This creates default seed accounts:
- **System Administrator**: `admin@marichi.com` / `Admin@12345`
- **HR Administrator**: `hr@marichi.com` / `Admin@12345`
- **Manager**: `manager@marichi.com` / `Admin@12345`
- **Employee**: `employee@marichi.com` / `Admin@12345`

> [!NOTE]
> The database seeder will safely abort if `NODE_ENV=production` unless `ALLOW_PROD_SEED=true` is explicitly configured.

---

## 6. Running the Automated Test Suite

MarichiHR includes comprehensive Jest test suites covering authentication, multi-tenancy isolation, 5-level RBAC scopes, attendance edge cases, leave state machine validation, and end-to-end business flows:

```bash
cd server
npm test
```

To run individual test suites:
```bash
npx jest tests/multi_tenancy.test.js
npx jest tests/rbac_scopes.test.js
npx jest tests/attendance_edge_cases.test.js
npx jest tests/leave_state_machine.test.js
npx jest tests/e2e_business_flow.test.js
```

---

## 7. Starting the Development Servers

### Start Backend API Server:
```bash
cd server
npm run dev
```
The server starts at `http://localhost:5000`. Health check: `http://localhost:5000/api/v1/health`.

### Start Frontend Application:
```bash
cd client
npm run dev
```
The Vite development server runs at `http://localhost:5173`. Open your browser and navigate to `http://localhost:5173`.

---

## 8. Building for Production

### Frontend Production Build
```bash
cd client
npm run build
```
The optimized production bundle is generated in `client/dist/`.

### Server Production Run
```bash
cd server
NODE_ENV=production node src/server.js
```
