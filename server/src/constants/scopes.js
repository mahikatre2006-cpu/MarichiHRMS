/**
 * MarichiHR RBAC Scope Hierarchy
 * 
 * Hierarchy:
 * 1. SELF - Access only own employee/user records
 * 2. TEAM - Access records of direct and indirect reports
 * 3. DEPARTMENT - Access records of employees within user's department(s)
 * 4. ENTITY - Access records of employees within user's business/legal entity
 * 5. ORGANISATION - Access records across the entire tenant organization
 */
export const RBAC_SCOPES = {
  SELF: 'SELF',
  TEAM: 'TEAM',
  DEPARTMENT: 'DEPARTMENT',
  ENTITY: 'ENTITY',
  ORGANISATION: 'ORGANISATION'
};

export const SCOPE_HIERARCHY_LEVELS = {
  [RBAC_SCOPES.SELF]: 1,
  [RBAC_SCOPES.TEAM]: 2,
  [RBAC_SCOPES.DEPARTMENT]: 3,
  [RBAC_SCOPES.ENTITY]: 4,
  [RBAC_SCOPES.ORGANISATION]: 5
};
