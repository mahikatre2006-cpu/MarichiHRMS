import { verifyAccessToken } from '../utils/security.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { User } from '../modules/users/model.js';
import { Employee } from '../modules/employees/model.js';
import { USER_STATUS } from '../constants/enums.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Extract from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Fallback to HttpOnly cookie
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token missing. Please log in.');
    }

    // 3. Verify JWT
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid or expired access token. Please refresh your session.');
    }

    // 4. Fetch user and populated roles
    const user = await User.findById(decoded.userId).populate('roles');
    if (!user) {
      throw new UnauthorizedError('User account not found or deactivated.');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ForbiddenError(`User account is ${user.status.toLowerCase()}. Access denied.`);
    }

    // Session version validation (for revocation on password change / admin logout)
    if (decoded.sessionVersion !== undefined && decoded.sessionVersion !== user.sessionVersion) {
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
    }

    // 5. Fetch linked employee record (HR identity)
    const employee = await Employee.findOne({
      tenantId: user.tenantId,
      userId: user._id
    });

    // 6. Attach context to request
    req.user = user;
    req.tenantId = user.tenantId;
    req.employee = employee || null;
    req.employeeId = employee ? employee._id : null;
    req.userRoles = user.roles || [];

    // 7. Enforce strict tenant isolation: reject client-supplied tenant tampering
    const clientTenantId = req.query?.tenantId || req.body?.tenantId || req.params?.tenantId;
    if (clientTenantId && clientTenantId.toString() !== req.tenantId.toString()) {
      throw new ForbiddenError('Security violation: Cross-tenant operations are strictly prohibited.');
    }
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      req.body.tenantId = req.tenantId;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Tenant Isolation Guard: Ensures tenantId can never be overridden by client params
 */
export function enforceTenantIsolation(req, res, next) {
  if (!req.tenantId) {
    return next(new UnauthorizedError('Tenant context missing'));
  }

  const clientTenantId = req.query.tenantId || req.body?.tenantId || req.params.tenantId;
  if (clientTenantId && clientTenantId.toString() !== req.tenantId.toString()) {
    return next(new ForbiddenError('Security violation: Cross-tenant operations are strictly prohibited'));
  }

  next();
}
