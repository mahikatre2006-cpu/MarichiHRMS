import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { RBAC_SCOPES, SCOPE_HIERARCHY_LEVELS } from '../constants/scopes.js';
import { Employee } from '../modules/employees/model.js';
import { LeaveRequest } from '../modules/leave/request.model.js';
import { AttendanceRecord } from '../modules/attendance/record.model.js';
import { AttendanceRegularisation } from '../modules/attendance/regularisation.model.js';
import { LeaveApprovalDelegation } from '../modules/leave/delegation.model.js';

/**
 * Check if target employee reports directly or indirectly to manager (including active approval delegations)
 */
export async function isEmployeeInTeam(managerEmployeeId, targetEmployeeId, tenantId) {
  if (!managerEmployeeId || !targetEmployeeId) return false;
  if (managerEmployeeId.toString() === targetEmployeeId.toString()) return true;

  // 1. Direct or indirect hierarchical reporting
  let currentTarget = await Employee.findOne({ _id: targetEmployeeId, tenantId }).select('managerId');
  const visited = new Set();

  while (currentTarget && currentTarget.managerId) {
    if (visited.has(currentTarget.managerId.toString())) {
      break; // prevent circular reporting loops
    }
    visited.add(currentTarget.managerId.toString());

    if (currentTarget.managerId.toString() === managerEmployeeId.toString()) {
      return true;
    }

    currentTarget = await Employee.findOne({ _id: currentTarget.managerId, tenantId }).select('managerId');
  }

  // 2. Active approval delegation check
  const todayStr = new Date().toISOString().split('T')[0];
  const delegations = await LeaveApprovalDelegation.find({
    tenantId,
    delegateEmployeeId: managerEmployeeId,
    status: 'ACTIVE',
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr }
  });

  for (const del of delegations) {
    if (del.delegatorEmployeeId.toString() !== managerEmployeeId.toString()) {
      let isDelegatorManager = false;
      let checkTarget = await Employee.findOne({ _id: targetEmployeeId, tenantId }).select('managerId');
      const delVisited = new Set();
      while (checkTarget && checkTarget.managerId) {
        if (delVisited.has(checkTarget.managerId.toString())) break;
        delVisited.add(checkTarget.managerId.toString());
        if (checkTarget.managerId.toString() === del.delegatorEmployeeId.toString()) {
          isDelegatorManager = true;
          break;
        }
        checkTarget = await Employee.findOne({ _id: checkTarget.managerId, tenantId }).select('managerId');
      }
      if (isDelegatorManager) return true;
    }
  }

  return false;
}

/**
 * Authorize middleware with 5-level scope hierarchy:
 * SELF -> TEAM -> DEPARTMENT -> ENTITY -> ORGANISATION
 */
export function authorize(requiredPermission, options = {}) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ForbiddenError('Authentication required before authorization'));
      }

      // 1. Collect all permissions from user's active roles
      const matchingGrants = [];
      const userRoles = req.userRoles || [];

      for (const role of userRoles) {
        if (!role.permissions) continue;
        for (const p of role.permissions) {
          if (p.permission === requiredPermission || p.permission === '*') {
            matchingGrants.push(p);
          }
        }
      }

      if (matchingGrants.length === 0) {
        return next(new ForbiddenError(`Forbidden: missing required permission '${requiredPermission}'`));
      }

      // 2. Determine highest granted scope level for this permission
      let highestGrant = matchingGrants[0];
      let highestLevel = SCOPE_HIERARCHY_LEVELS[highestGrant.scope] || 0;

      for (const grant of matchingGrants) {
        const level = SCOPE_HIERARCHY_LEVELS[grant.scope] || 0;
        if (level > highestLevel) {
          highestLevel = level;
          highestGrant = grant;
        }
      }

      req.authScope = {
        permission: requiredPermission,
        scope: highestGrant.scope,
        scopeIds: highestGrant.scopeIds || []
      };

      // 3. If highest scope is ORGANISATION, user has full tenant-wide access
      if (highestGrant.scope === RBAC_SCOPES.ORGANISATION) {
        return next();
      }

      // 4. Extract target employee ID if provided in route params, query, body, or resolved from resource
      let targetEmployeeId =
        req.params.employeeId ||
        (options.paramIsEmployeeId && req.params.id) ||
        req.body?.employeeId ||
        req.query?.employeeId;

      if (!targetEmployeeId && req.params.id) {
        if (req.baseUrl?.includes('/leave')) {
          const leaveDoc = await LeaveRequest.findById(req.params.id).select('employeeId');
          if (leaveDoc) targetEmployeeId = leaveDoc.employeeId;
        } else if (req.baseUrl?.includes('/attendance')) {
          const attDoc = await AttendanceRecord.findById(req.params.id).select('employeeId');
          if (attDoc) {
            targetEmployeeId = attDoc.employeeId;
          } else {
            const regDoc = await AttendanceRegularisation.findById(req.params.id).select('employeeId');
            if (regDoc) targetEmployeeId = regDoc.employeeId;
          }
        }
      }

      // Also check target entity ID if provided in params or body
      const targetEntityId =
        req.params.entityId ||
        (options.paramIsEntityId && req.params.id) ||
        req.body?.entityId ||
        req.query?.entityId;

      const userEmployee = req.employee;

      // 5. Evaluate scope constraints if a specific employee or entity is targeted
      if (targetEmployeeId) {
        // Target is an employee
        const targetEmp = await Employee.findOne({
          _id: targetEmployeeId,
          tenantId: req.tenantId
        });

        if (!targetEmp) {
          return next(new NotFoundError('Target employee'));
        }

        // Attached target employee for subsequent middleware/controller convenience
        req.targetEmployee = targetEmp;

        switch (highestGrant.scope) {
          case RBAC_SCOPES.SELF:
            if (!userEmployee || userEmployee._id.toString() !== targetEmp._id.toString()) {
              return next(new ForbiddenError('Access denied: operation restricted to own records (SELF scope)'));
            }
            break;

          case RBAC_SCOPES.TEAM:
            if (!userEmployee) {
              return next(new ForbiddenError('Access denied: user is not linked to an employee profile'));
            }
            const inTeam = await isEmployeeInTeam(userEmployee._id, targetEmp._id, req.tenantId);
            if (!inTeam) {
              return next(new ForbiddenError('Access denied: target employee is outside your team scope (TEAM scope)'));
            }
            break;

          case RBAC_SCOPES.DEPARTMENT:
            if (!userEmployee) {
              return next(new ForbiddenError('Access denied: user is not linked to an employee profile'));
            }
            const allowedDeptIds = (highestGrant.scopeIds && highestGrant.scopeIds.length > 0)
              ? highestGrant.scopeIds.map(id => id.toString())
              : [userEmployee.departmentId?.toString()];

            if (!targetEmp.departmentId || !allowedDeptIds.includes(targetEmp.departmentId.toString())) {
              return next(new ForbiddenError('Access denied: target employee is outside your department scope (DEPARTMENT scope)'));
            }
            break;

          case RBAC_SCOPES.ENTITY:
            const allowedEntityIds = (highestGrant.scopeIds && highestGrant.scopeIds.length > 0)
              ? highestGrant.scopeIds.map(id => id.toString())
              : [userEmployee?.entityId?.toString()].filter(Boolean);

            if (!targetEmp.entityId || !allowedEntityIds.includes(targetEmp.entityId.toString())) {
              return next(new ForbiddenError('Access denied: target employee is outside your authorized entity (ENTITY scope)'));
            }
            break;

          default:
            return next(new ForbiddenError('Access denied: unknown authorization scope'));
        }
      } else if (targetEntityId) {
        // Target is directly an Entity resource
        if (highestGrant.scope === RBAC_SCOPES.ENTITY) {
          const allowedEntityIds = (highestGrant.scopeIds && highestGrant.scopeIds.length > 0)
            ? highestGrant.scopeIds.map(id => id.toString())
            : [userEmployee?.entityId?.toString()].filter(Boolean);

          if (!allowedEntityIds.includes(targetEntityId.toString())) {
            return next(new ForbiddenError('Access denied: target entity is outside your authorized entity scope (ENTITY scope)'));
          }
        } else if (highestGrant.scope !== RBAC_SCOPES.ORGANISATION) {
          return next(new ForbiddenError('Access denied: insufficient scope to access entity resource'));
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Utility to build tenant-isolated and scope-filtered queries for list endpoints
 */
export async function buildScopeFilter(req, { employeeField = 'employeeId', entityField = 'entityId', deptField = 'departmentId' } = {}) {
  const filter = { tenantId: req.tenantId };
  const scope = req.authScope?.scope || RBAC_SCOPES.SELF;
  const scopeIds = req.authScope?.scopeIds || [];
  const userEmployee = req.employee;

  if (scope === RBAC_SCOPES.ORGANISATION) {
    return filter;
  }

  if (scope === RBAC_SCOPES.ENTITY) {
    const entityIds = scopeIds.length > 0 ? scopeIds : (userEmployee?.entityId ? [userEmployee.entityId] : []);
    filter[entityField] = { $in: entityIds };
    return filter;
  }

  if (scope === RBAC_SCOPES.DEPARTMENT) {
    const deptIds = scopeIds.length > 0 ? scopeIds : (userEmployee?.departmentId ? [userEmployee.departmentId] : []);
    filter[deptField] = { $in: deptIds };
    return filter;
  }

  if (scope === RBAC_SCOPES.TEAM) {
    if (!userEmployee) {
      filter[employeeField] = null;
      return filter;
    }
    // Find all direct & indirect report IDs via tree traversal
    const memberIds = [userEmployee._id];
    const queue = [userEmployee._id];
    const visited = new Set([userEmployee._id.toString()]);

    while (queue.length > 0) {
      const currentManagerId = queue.shift();
      const directReports = await Employee.find({
        tenantId: req.tenantId,
        managerId: currentManagerId
      }).select('_id');

      for (const report of directReports) {
        const idStr = report._id.toString();
        if (!visited.has(idStr)) {
          visited.add(idStr);
          memberIds.push(report._id);
          queue.push(report._id);
        }
      }
    }

    filter[employeeField] = { $in: memberIds };
    return filter;
  }

  // SELF scope
  filter[employeeField] = userEmployee ? userEmployee._id : null;
  return filter;
}
