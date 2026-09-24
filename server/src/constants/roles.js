import { PERMISSIONS } from './permissions.js';
import { RBAC_SCOPES } from './scopes.js';

export const SYSTEM_ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR_ADMIN: 'HR_ADMIN',
  HR_BUSINESS_PARTNER: 'HR_BUSINESS_PARTNER',
  PAYROLL_ADMIN: 'PAYROLL_ADMIN',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN'
};

/**
 * Default role configurations mapping roles to permissions with default scopes
 */
export const DEFAULT_ROLE_DEFINITIONS = {
  [SYSTEM_ROLES.EMPLOYEE]: {
    name: SYSTEM_ROLES.EMPLOYEE,
    description: 'Standard employee with self-service access',
    isSystem: true,
    permissions: [
      { permission: PERMISSIONS.EMPLOYEE_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.EMPLOYEE_UPDATE, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_CLOCK, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_REGULARISE, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_APPLY, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_CANCEL, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_LEDGER_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ORGANISATION_READ, scope: RBAC_SCOPES.ORGANISATION }
    ]
  },

  [SYSTEM_ROLES.MANAGER]: {
    name: SYSTEM_ROLES.MANAGER,
    description: 'People manager with team approval authority and self-service',
    isSystem: true,
    permissions: [
      // Self permissions
      { permission: PERMISSIONS.EMPLOYEE_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.EMPLOYEE_UPDATE, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_CLOCK, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_REGULARISE, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_APPLY, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_CANCEL, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_LEDGER_READ, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ORGANISATION_READ, scope: RBAC_SCOPES.ORGANISATION },

      // Team management permissions
      { permission: PERMISSIONS.EMPLOYEE_READ, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.ATTENDANCE_READ, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.ATTENDANCE_REGULARISE_APPROVE, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.LEAVE_READ, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.LEAVE_APPROVE, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.LEAVE_REJECT, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.LEAVE_CANCEL, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.LEAVE_LEDGER_READ, scope: RBAC_SCOPES.TEAM },
      { permission: PERMISSIONS.LEAVE_DELEGATE, scope: RBAC_SCOPES.SELF }
    ]
  },

  [SYSTEM_ROLES.HR_ADMIN]: {
    name: SYSTEM_ROLES.HR_ADMIN,
    description: 'Human resources administrator with organisation/entity scope',
    isSystem: true,
    permissions: [
      { permission: PERMISSIONS.EMPLOYEE_READ, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.EMPLOYEE_CREATE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.EMPLOYEE_UPDATE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.EMPLOYEE_DEACTIVATE, scope: RBAC_SCOPES.ORGANISATION },

      { permission: PERMISSIONS.ATTENDANCE_CLOCK, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_READ, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ATTENDANCE_UPDATE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ATTENDANCE_REGULARISE, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.ATTENDANCE_REGULARISE_APPROVE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ATTENDANCE_OVERRIDE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ATTENDANCE_LOCK, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.SHIFT_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ROSTER_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ATTENDANCE_POLICY_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.HOLIDAY_MANAGE, scope: RBAC_SCOPES.ORGANISATION },

      { permission: PERMISSIONS.LEAVE_READ, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_APPLY, scope: RBAC_SCOPES.SELF },
      { permission: PERMISSIONS.LEAVE_UPDATE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_APPROVE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_REJECT, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_CANCEL, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_ADJUST, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_LEDGER_READ, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_POLICY_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_TYPE_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_DELEGATE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_BLACKOUT_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LEAVE_ENCASH, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ATTENDANCE_DEVICE_SYNC, scope: RBAC_SCOPES.ORGANISATION },

      { permission: PERMISSIONS.ORGANISATION_READ, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ORGANISATION_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ENTITY_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.DEPARTMENT_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.LOCATION_MANAGE, scope: RBAC_SCOPES.ORGANISATION },

      { permission: PERMISSIONS.USER_READ, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.USER_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.ROLE_MANAGE, scope: RBAC_SCOPES.ORGANISATION },
      { permission: PERMISSIONS.AUDIT_READ, scope: RBAC_SCOPES.ORGANISATION }
    ]
  },

  [SYSTEM_ROLES.SYSTEM_ADMIN]: {
    name: SYSTEM_ROLES.SYSTEM_ADMIN,
    description: 'System superuser with complete platform control',
    isSystem: true,
    permissions: Object.values(PERMISSIONS).map(perm => ({
      permission: perm,
      scope: RBAC_SCOPES.ORGANISATION
    }))
  }
};
