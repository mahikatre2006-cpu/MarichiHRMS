import { RBAC_SCOPES } from './scopes.js';

export const PERMISSIONS = {
  // Employee permissions
  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DEACTIVATE: 'employee.deactivate',

  // Attendance permissions
  ATTENDANCE_CLOCK: 'attendance.clock',
  ATTENDANCE_READ: 'attendance.read',
  ATTENDANCE_UPDATE: 'attendance.update',
  ATTENDANCE_REGULARISE: 'attendance.regularise',
  ATTENDANCE_REGULARISE_APPROVE: 'attendance.regularise.approve',
  ATTENDANCE_OVERRIDE: 'attendance.override',
  ATTENDANCE_LOCK: 'attendance.lock',
  SHIFT_MANAGE: 'shift.manage',
  ROSTER_MANAGE: 'roster.manage',
  ATTENDANCE_POLICY_MANAGE: 'attendance.policy.manage',
  HOLIDAY_MANAGE: 'holiday.manage',

  // Leave permissions
  LEAVE_READ: 'leave.read',
  LEAVE_APPLY: 'leave.apply',
  LEAVE_UPDATE: 'leave.update',
  LEAVE_APPROVE: 'leave.approve',
  LEAVE_REJECT: 'leave.reject',
  LEAVE_CANCEL: 'leave.cancel',
  LEAVE_ADJUST: 'leave.adjust',
  LEAVE_LEDGER_READ: 'leave.ledger.read',
  LEAVE_POLICY_MANAGE: 'leave.policy.manage',
  LEAVE_TYPE_MANAGE: 'leave.type.manage',
  LEAVE_DELEGATE: 'leave.delegate',
  LEAVE_BLACKOUT_MANAGE: 'leave.blackout.manage',
  LEAVE_ENCASH: 'leave.encash',
  ATTENDANCE_DEVICE_SYNC: 'attendance.device.sync',

  // Organisation hierarchy
  ORGANISATION_READ: 'organisation.read',
  ORGANISATION_MANAGE: 'organisation.manage',
  ENTITY_MANAGE: 'entity.manage',
  DEPARTMENT_MANAGE: 'department.manage',
  LOCATION_MANAGE: 'location.manage',

  // Administration & Security
  USER_READ: 'user.read',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  PERMISSION_MANAGE: 'permission.manage',
  AUDIT_READ: 'audit.read',
  NOTIFICATION_MANAGE: 'notification.manage'
};

/**
 * Registry of all permissions with metadata and supported scopes
 */
export const PERMISSION_REGISTRY = [
  // Employee
  { key: PERMISSIONS.EMPLOYEE_READ, description: 'View employee profiles and records', category: 'Employee', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.EMPLOYEE_CREATE, description: 'Create new employee records', category: 'Employee', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.EMPLOYEE_UPDATE, description: 'Update employee records', category: 'Employee', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.EMPLOYEE_DEACTIVATE, description: 'Deactivate or exit employee', category: 'Employee', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },

  // Attendance
  { key: PERMISSIONS.ATTENDANCE_CLOCK, description: 'Clock in and out', category: 'Attendance', supportedScopes: [RBAC_SCOPES.SELF] },
  { key: PERMISSIONS.ATTENDANCE_READ, description: 'View attendance records and timesheets', category: 'Attendance', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ATTENDANCE_UPDATE, description: 'Update attendance punches and entries', category: 'Attendance', supportedScopes: [RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ATTENDANCE_REGULARISE, description: 'Submit attendance regularisation requests', category: 'Attendance', supportedScopes: [RBAC_SCOPES.SELF] },
  { key: PERMISSIONS.ATTENDANCE_REGULARISE_APPROVE, description: 'Approve or reject attendance regularisation', category: 'Attendance', supportedScopes: [RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ATTENDANCE_OVERRIDE, description: 'HR override of attendance records with reason', category: 'Attendance', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ATTENDANCE_LOCK, description: 'Lock monthly attendance cutoff', category: 'Attendance', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.SHIFT_MANAGE, description: 'Create and edit shift templates', category: 'Attendance', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ROSTER_MANAGE, description: 'Assign shifts and rosters to employees', category: 'Attendance', supportedScopes: [RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ATTENDANCE_POLICY_MANAGE, description: 'Configure attendance policies', category: 'Attendance', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.HOLIDAY_MANAGE, description: 'Manage holiday calendars and dates', category: 'Attendance', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },

  // Leave
  { key: PERMISSIONS.LEAVE_READ, description: 'View leave requests and balances', category: 'Leave', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_APPLY, description: 'Apply for leave', category: 'Leave', supportedScopes: [RBAC_SCOPES.SELF] },
  { key: PERMISSIONS.LEAVE_UPDATE, description: 'Modify leave request', category: 'Leave', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_APPROVE, description: 'Approve leave requests', category: 'Leave', supportedScopes: [RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_REJECT, description: 'Reject leave requests', category: 'Leave', supportedScopes: [RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_CANCEL, description: 'Cancel approved/pending leave requests', category: 'Leave', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_ADJUST, description: 'Direct adjustment of leave balances via ledger', category: 'Leave', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_LEDGER_READ, description: 'View immutable leave ledger transactions', category: 'Leave', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.TEAM, RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_POLICY_MANAGE, description: 'Create and configure leave policies', category: 'Leave', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_TYPE_MANAGE, description: 'Configure leave types and statutory settings', category: 'Leave', supportedScopes: [RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_DELEGATE, description: 'Delegate leave approval authority during absence', category: 'Leave', supportedScopes: [RBAC_SCOPES.SELF, RBAC_SCOPES.TEAM, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_BLACKOUT_MANAGE, description: 'Manage blackout periods restricting leave', category: 'Leave', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LEAVE_ENCASH, description: 'Encash eligible leave balances for settlements', category: 'Leave', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ATTENDANCE_DEVICE_SYNC, description: 'Biometric and device punch synchronization', category: 'Attendance', supportedScopes: [RBAC_SCOPES.ORGANISATION] },

  // Organisation
  { key: PERMISSIONS.ORGANISATION_READ, description: 'View organisation structure', category: 'Organisation', supportedScopes: [RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ORGANISATION_MANAGE, description: 'Modify organisation settings', category: 'Organisation', supportedScopes: [RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ENTITY_MANAGE, description: 'Manage entities, currencies, and country configs', category: 'Organisation', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.DEPARTMENT_MANAGE, description: 'Manage departments and department trees', category: 'Organisation', supportedScopes: [RBAC_SCOPES.DEPARTMENT, RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.LOCATION_MANAGE, description: 'Manage locations and geofence parameters', category: 'Organisation', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },

  // Admin & Audit
  { key: PERMISSIONS.USER_READ, description: 'View user accounts and identities', category: 'Administration', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.USER_MANAGE, description: 'Create, update, and link user accounts', category: 'Administration', supportedScopes: [RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.ROLE_MANAGE, description: 'Configure roles and grant permissions', category: 'Administration', supportedScopes: [RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.PERMISSION_MANAGE, description: 'Manage permission registry', category: 'Administration', supportedScopes: [RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.AUDIT_READ, description: 'View immutable audit log trail', category: 'Administration', supportedScopes: [RBAC_SCOPES.ENTITY, RBAC_SCOPES.ORGANISATION] },
  { key: PERMISSIONS.NOTIFICATION_MANAGE, description: 'Configure system notifications', category: 'Administration', supportedScopes: [RBAC_SCOPES.ORGANISATION] }
];
