# MarichiHR — Enterprise Human Resource Management System

MarichiHR is an enterprise-grade Human Resource Management System (HRMS) built for multi-tenant, multi-entity, multi-currency, and multi-jurisdiction workforce operations.

It combines autonomous workforce operations with an editorial visual design: automated shift tracking, geofenced presence verification, statutory leave governance, double-entry leave ledgers, and role-based portal experiences.

---

## Architecture Overview

```text
MarichiHR
├── Client (React 18 + Vite + Tailwind CSS + Lucide Icons)
│   ├── Landing Page (Full-viewport editorial hero with canvas video ping-pong loop)
│   ├── Portal Switcher (Single unified app shell with role-aware views)
│   ├── My Workspace (Employee self-service presence, leave balances, punch clock)
│   ├── Manager Approvals (Team attendance monitoring, leave queue, punch regularisation)
│   └── HR Administration (Org hierarchy, employee directory, shifts, policies, audit logs)
│
└── Server (Node.js + Express ES Modules + Mongoose ODM)
    ├── Multi-Tenant Isolation (Tenant-scoped queries on all data models)
    ├── RBAC Engine (5-level scope hierarchy: SELF, TEAM, DEPARTMENT, ENTITY, ORGANISATION)
    ├── Authentication (JWT access tokens, HttpOnly refresh cookies, OIDC SSO routing)
    ├── Attendance Module (Haversine GPS geofencing, shift rules, overtime, locks)
    ├── Leave Engine (Double-entry transaction ledger, statutory provisioning, accruals)
    └── Audit Subsystem (Tamper-resistant audit trail with before/after diffs)
```

---

## Core Capabilities

### 1. Multi-Tenant Organization Hierarchy
- **Organization / Tenant**: Root tenant domain with isolated data boundaries.
- **Legal Entities**: Distinct business or corporate entities with localized currency and fiscal settings.
- **Office Locations**: Physical work sites with configurable GPS coordinates and geofence radiuses (e.g., 300 meters).
- **Departments & Teams**: Organizational units mapped to department heads and reporting lines.

### 2. Role-Based Access Control (RBAC) & Scope Hierarchy
Permissions are enforced at the backend API layer across five granular scopes:
1. `SELF` — Access limited to the authenticated user's own records.
2. `TEAM` — Access to records of direct and indirect reports within the managerial tree.
3. `DEPARTMENT` — Access to records within the employee's assigned department.
4. `ENTITY` — Access across the specific legal entity.
5. `ORGANISATION` — Unrestricted access across the entire tenant organization.

### 3. Attendance & Presence Tracking
- **Verified Punch Clock**: Real-time clock-in and clock-out with optional Haversine distance geofencing.
- **Accurate Worked Time**: Shift calculations accounting for working hours, late arrivals with grace thresholds, and shift-verified break deductions.
- **Punch Regularisation**: Employee submission workflow for missed punches or offsite client visits, requiring managerial approval before recalculating daily metrics.
- **Month-End Cutoff Lock**: HR Administrator freeze of attendance records to prevent retroactive modifications before payroll processing.

### 4. Statutory Leave Engine & Double-Entry Ledger
- **Configurable Leave Types**: Paid Leave (PL), Sick Leave (SL), Casual Leave (CL), Maternity/Paternity Leave, and Leave Without Pay (LWP).
- **Double-Entry Balance Ledger**: Every allocation, accrual, deduction, rejection revert, and administrative adjustment is recorded in an immutable ledger with unique transaction references.
- **Automated Attendance Sync**: Approved leaves automatically reflect as `ON_LEAVE` in daily attendance rosters.
- **Approval Delegation**: Managers can assign temporary approval authority to peers during out-of-office periods.

### 5. Audit Logging & Security
- **Immutable Audit Trail**: All administrative updates, status overrides, and policy modifications record the actor ID, timestamp, target entity, and change diffs.
- **Tenant Isolation**: Middleware verifies that all operations are strictly scoped to the active tenant ID.

---

## User Personas & Workflows

### 1. Enterprise Administrator (HR Admin)
- Builds organizational structures (entities, locations, departments).
- Manages the company employee roster and assigns reporting hierarchies.
- Configures work shifts, holiday calendars, and statutory leave policies.
- Executes month-end attendance locks and reviews audit logs.

### 2. People Manager
- Monitors real-time attendance across direct and indirect team reports.
- Approves or rejects incoming leave requests with mandatory comments.
- Reviews punch regularisation requests to resolve time-tracking exceptions.
- Delegates approval authority when taking planned leaves.

### 3. Employee (Staff)
- Clocks in and out with live presence status and GPS geofence checks.
- Views real-time statutory leave balances and avails leaves.
- Submits attendance regularisations for missed or offsite punches.
- Tracks personal monthly attendance history and duration.

---

## Technology Stack

- **Frontend**:
  - React 18
  - Vite
  - Tailwind CSS
  - Lucide React
  - P22 Mackinac serif display typography and Inter UI sans
- **Backend**:
  - Node.js (v20+)
  - Express.js (ES Modules)
  - Mongoose ODM / MongoDB
  - JSON Web Tokens (JWT) & Argon2 / Bcrypt

---

## Local Development Setup

### Prerequisites
- Node.js (v20.x or higher)
- npm (v10.x or higher)
- MongoDB instance (local or MongoDB Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mahikatre2006-cpu/MarichiHRMS.git
   cd MarichiHRMS
   ```

2. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../client
   npm install
   ```

4. **Start the development servers:**
   ```bash
   # Terminal 1 — Backend API Server (Port 5000)
   cd server
   npm run dev

   # Terminal 2 — Frontend Application (Port 5173)
   cd client
   npm run dev
   ```

5. **Access the application:**
   Open `http://localhost:5173` in your browser.

---

## License

This project is licensed under the MIT License.
