# MarichiHR HRMS — REST API Catalog & Reference (Phase 1)

This catalog details all RESTful API endpoints, authentication requirements, query parameters, request schemas, and responses in **MarichiHR HRMS Phase 1**.

---

## 1. Global Standards & Conventions

### Base URL
```text
http://localhost:5000/api/v1
```

### Authentication Header
All authenticated endpoints require an RFC 6750 Bearer JWT access token:
```http
Authorization: Bearer <ACCESS_TOKEN>
```

### Response Formats

#### Standard Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Standard Error Response (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Start date cannot be after end date.",
    "details": null
  }
}
```

---

## 2. Authentication & SSO (`/api/v1/auth`)

| Method | Endpoint | RBAC / Scope | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register initial tenant & System Admin user |
| `POST` | `/api/v1/auth/login` | Public (Rate Limited) | Password login, issues access token & refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Public (Cookie) | Rotates refresh token and issues new access token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revokes current session and clears refresh cookie |
| `POST` | `/api/v1/auth/logout-all` | Authenticated | Revokes all active sessions across all devices (increments sessionVersion) |
| `GET` | `/api/v1/auth/me` | `SELF` | Returns current user profile, linked employee & roles |
| `GET` | `/api/v1/auth/sso/:provider` | Public | Generates IdP redirect URL for Google/Microsoft/Okta |
| `GET` | `/api/v1/auth/sso/:provider/callback` | Public | Canonical SSO callback; exchanges code, links account |

---

## 3. Organisation Structure (`/api/v1/...`)

### Organisations (`/api/v1/organisations`)
- `GET /api/v1/organisations/me`: View authenticated organisation profile.
- `PATCH /api/v1/organisations/me`: Update organisation details (`SYSTEM_ADMIN`).

### Legal Entities (`/api/v1/entities`)
- `GET /api/v1/entities`: List entities within tenant.
- `POST /api/v1/entities`: Create legal entity (`ORGANISATION_MANAGE`).
- `GET /api/v1/entities/:id`: Retrieve single entity.
- `PATCH /api/v1/entities/:id`: Update entity details (`ORGANISATION_MANAGE`).

### Departments (`/api/v1/departments`)
- `GET /api/v1/departments`: List departments within tenant.
- `POST /api/v1/departments`: Create department (`ORGANISATION_MANAGE`).
- `GET /api/v1/departments/:id`: Retrieve department.
- `PATCH /api/v1/departments/:id`: Update department details (`ORGANISATION_MANAGE`).

### Locations / Branches (`/api/v1/locations`)
- `GET /api/v1/locations`: List physical locations/branches.
- `POST /api/v1/locations`: Create location with geofence coordinates (`ORGANISATION_MANAGE`).
- `GET /api/v1/locations/:id`: Retrieve location details.
- `PATCH /api/v1/locations/:id`: Update location and geofence coordinates (`ORGANISATION_MANAGE`).

---

## 4. Role & Permission Management (`/api/v1/...`)

### Roles (`/api/v1/roles`)
- `GET /api/v1/roles`: List tenant roles.
- `POST /api/v1/roles`: Create custom role with permissions (`ROLE_MANAGE`).
- `GET /api/v1/roles/:id`: Retrieve role details and assigned permissions.
- `PATCH /api/v1/roles/:id`: Update custom role permissions (`ROLE_MANAGE`).

### Permissions (`/api/v1/permissions`)
- `GET /api/v1/permissions`: List all available system permissions grouped by domain.

---

## 5. Employee Directory & Profiles (`/api/v1/employees`)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/employees` | `EMPLOYEE_READ` | List employees filtered by 5-level RBAC scope |
| `POST` | `/api/v1/employees` | `EMPLOYEE_CREATE` | Onboard new employee (auto-generates code if omitted) |
| `GET` | `/api/v1/employees/:id` | `EMPLOYEE_READ` | Retrieve full employee profile with reporting line |
| `PATCH` | `/api/v1/employees/:id` | `EMPLOYEE_UPDATE` | Update employee profile fields |
| `PATCH` | `/api/v1/employees/:id/transfer` | `EMPLOYEE_UPDATE` | Transfer employee to new entity/dept/loc/manager with transferHistory |
| `GET` | `/api/v1/employees/:id/team` | `EMPLOYEE_READ` | Retrieve hierarchical reporting tree under employee |

---

## 6. Attendance Management (`/api/v1/attendance`)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/attendance/punch/in` | `ATTENDANCE_CLOCK` | Clock in with geofence and 60s duplicate debounce check |
| `POST` | `/api/v1/attendance/punch/out` | `ATTENDANCE_CLOCK` | Clock out with geofence and 60s duplicate debounce check |
| `POST` | `/api/v1/attendance/punch/device-sync` | `ATTENDANCE_DEVICE_SYNC` | Ingest batch punches from Biometric/QR/NFC with idempotency |
| `GET` | `/api/v1/attendance/me` | `ATTENDANCE_READ` | Current user's daily attendance records |
| `GET` | `/api/v1/attendance/team` | `ATTENDANCE_READ` | Attendance records for direct/indirect team reports |
| `GET` | `/api/v1/attendance` | `ATTENDANCE_READ` | Scoped list of attendance records (query by date/entity) |
| `GET` | `/api/v1/attendance/:employeeId` | `ATTENDANCE_READ` | Attendance history for specific employee |
| `POST` | `/api/v1/attendance/regularisations` | `ATTENDANCE_REGULARISE` | Submit punch regularisation request |
| `GET` | `/api/v1/attendance/regularisations` | `ATTENDANCE_READ` | List regularisation requests (scoped) |
| `PATCH` | `/api/v1/attendance/regularisations/:id/approve` | `ATTENDANCE_REGULARISE_APPROVE` | Approve regularisation (enforces non-self approval & locks) |
| `PATCH` | `/api/v1/attendance/regularisations/:id/reject` | `ATTENDANCE_REGULARISE_APPROVE` | Reject regularisation request |
| `PATCH` | `/api/v1/attendance/:id/override` | `ATTENDANCE_OVERRIDE` | HR/Admin attendance record override with audit log |
| `GET` | `/api/v1/attendance/locks` | `ATTENDANCE_LOCK` | List locked attendance periods |
| `POST` | `/api/v1/attendance/locks` | `ATTENDANCE_LOCK` | Lock monthly attendance for entity/period |

---

## 7. Leave Management (`/api/v1/leave`)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/leave/types` | `LEAVE_READ` | List tenant leave types (Casual, Sick, Annual, LWP) |
| `POST` | `/api/v1/leave/types` | `LEAVE_TYPE_MANAGE` | Create leave type |
| `PATCH` | `/api/v1/leave/types/:id` | `LEAVE_TYPE_MANAGE` | Update leave type configuration |
| `GET` | `/api/v1/leave/policies` | `LEAVE_READ` | List leave policies |
| `POST` | `/api/v1/leave/policies` | `LEAVE_POLICY_MANAGE` | Create leave policy (accrual rates, carry-forward) |
| `PATCH` | `/api/v1/leave/policies/:id` | `LEAVE_POLICY_MANAGE` | Update leave policy |
| `GET` | `/api/v1/leave/balances/me` | `LEAVE_READ` | Current user's leave balances |
| `GET` | `/api/v1/leave/balances/:employeeId` | `LEAVE_READ` | Leave balances for specific employee |
| `GET` | `/api/v1/leave/ledger/:employeeId` | `LEAVE_LEDGER_READ` | Append-only double-entry leave ledger entries |
| `POST` | `/api/v1/leave/balances/adjust` | `LEAVE_ADJUST` | Administrative balance adjustment with reason |
| `POST` | `/api/v1/leave/requests` | `LEAVE_APPLY` | Submit leave request (duration units, attachments, blackouts) |
| `GET` | `/api/v1/leave/requests` | `LEAVE_READ` | List leave requests (scoped) |
| `GET` | `/api/v1/leave/requests/:id` | `LEAVE_READ` | Get specific leave request |
| `POST` / `PATCH` | `/api/v1/leave/requests/:id/cancel` | `LEAVE_CANCEL` | Cancel request (restores balance & reverses attendance) |
| `POST` | `/api/v1/leave/requests/:id/approve` | `LEAVE_APPROVE` | Multi-step approval (enforces non-self approval & delegations) |
| `POST` | `/api/v1/leave/requests/:id/reject` | `LEAVE_REJECT` | Reject leave request |
| `GET` | `/api/v1/leave/team-calendar` | `LEAVE_READ` | Team leave calendar view for managers |
| `GET` | `/api/v1/leave/delegations` | `LEAVE_DELEGATE` | List active approval delegations |
| `POST` | `/api/v1/leave/delegations` | `LEAVE_DELEGATE` | Create approval delegation for out-of-office manager |
| `DELETE` | `/api/v1/leave/delegations/:id` | `LEAVE_DELEGATE` | Revoke approval delegation |
| `GET` | `/api/v1/leave/blackouts` | `LEAVE_READ` | List blackout periods |
| `POST` | `/api/v1/leave/blackouts` | `LEAVE_BLACKOUT_MANAGE` | Create blackout period (blocks leaves without HR override) |
| `DELETE` | `/api/v1/leave/blackouts/:id` | `LEAVE_BLACKOUT_MANAGE` | Delete blackout period |
| `POST` | `/api/v1/leave/accruals/run` | `LEAVE_POLICY_MANAGE` | Execute monthly accruals engine batch job |
| `POST` | `/api/v1/leave/carry-forward/run` | `LEAVE_POLICY_MANAGE` | Execute year-end carry forward engine batch job |
| `POST` | `/api/v1/leave/encash` | `LEAVE_ENCASH` | Encash employee leave balance into ledger |
| `POST` | `/api/v1/leave/bulk-encash` | `LEAVE_ENCASH` | Bulk encash balances by entity/tenure |
| `POST` | `/api/v1/leave/escalations/run` | `LEAVE_APPROVE` | Run SLA auto-escalation engine for overdue approvals |

---

## 8. Audit Logs (`/api/v1/audit` or `/api/v1/audit-logs`)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/audit` | `AUDIT_READ` | List immutable audit logs with multi-tenant filtering |
| `GET` | `/api/v1/audit/logs` | `AUDIT_READ` | Canonical alias for audit log inspection |
| `GET` | `/api/v1/audit/:id` | `AUDIT_READ` | View specific audit entry before/after state |

---

## 9. In-App Notifications (`/api/v1/notifications`)

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | `SELF` | List notifications for authenticated user |
| `PATCH` | `/api/v1/notifications/:id/read` | `SELF` | Mark notification as read |
| `PATCH` | `/api/v1/notifications/read-all` | `SELF` | Mark all notifications as read |
