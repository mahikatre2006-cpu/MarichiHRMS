import { User } from '../users/model.js';
import { Employee } from '../employees/model.js';
import { Session } from './session.model.js';
import { Organisation } from '../organisations/model.js';
import { OrganisationService } from '../organisations/service.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken
} from '../../utils/security.js';
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { USER_STATUS } from '../../constants/enums.js';
import { SYSTEM_ROLES } from '../../constants/roles.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import { logger } from '../../utils/logger.js';

export class AuthService {
  /**
   * Local email + password login
   */
  static async login({ email, password, tenantId, userAgent, ipAddress }) {
    const query = { email: email.toLowerCase() };
    if (tenantId) {
      query.tenantId = tenantId;
    }

    // Must explicitly select passwordHash
    const user = await User.findOne(query).select('+passwordHash').populate('roles');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ForbiddenError(`Account is ${user.status.toLowerCase()}. Please contact your HR administrator.`);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Find linked employee profile
    let employee = await Employee.findOne({
      tenantId: user.tenantId,
      userId: user._id
    }).populate('entityId departmentId locationId');

    if (!employee && user.email) {
      employee = await Employee.findOne({
        tenantId: user.tenantId,
        email: user.email.toLowerCase()
      }).populate('entityId departmentId locationId');

      if (employee) {
        employee.userId = user._id;
        await employee.save();
      }
    }

    // Create session & tokens
    const accessTokenPayload = {
      userId: user._id,
      tenantId: user.tenantId,
      employeeId: employee ? employee._id : null,
      sessionVersion: user.sessionVersion
    };

    const accessToken = generateAccessToken(accessTokenPayload);
    const refreshToken = generateRefreshToken({ userId: user._id, tenantId: user.tenantId });

    // Store hashed refresh token in Session collection
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = await Session.create({
      tenantId: user.tenantId,
      userId: user._id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt
    });

    user.lastLoginAt = new Date();
    await user.save();

    // Sanitize user output
    const userObj = user.toObject();
    delete userObj.passwordHash;

    return {
      user: userObj,
      employee: employee ? employee.toObject() : null,
      accessToken,
      refreshToken,
      sessionId: session._id
    };
  }

  /**
   * Refresh token rotation
   */
  static async refresh({ refreshToken, userAgent, ipAddress }) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required.');
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const tokenHash = hashToken(refreshToken);
    const session = await Session.findOne({
      userId: decoded.userId,
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      // Check if this token was previously revoked (Refresh Token Reuse Detection)
      const revokedSession = await Session.findOne({
        userId: decoded.userId,
        refreshTokenHash: tokenHash,
        revokedAt: { $ne: null }
      });

      if (revokedSession) {
        // Token reuse / theft detected: invalidate ALL sessions for this user and increment sessionVersion
        await Session.updateMany(
          { userId: decoded.userId, revokedAt: null },
          { revokedAt: new Date() }
        );
        await User.findByIdAndUpdate(decoded.userId, { $inc: { sessionVersion: 1 } });
        logger.warn(`Security alert: Refresh token reuse detected for user ${decoded.userId}. All sessions revoked.`);
        throw new UnauthorizedError('Compromised session detected (refresh token reuse). All active sessions have been revoked. Please log in again.');
      }

      throw new UnauthorizedError('Session expired or revoked. Please log in again.');
    }

    const user = await User.findById(decoded.userId).populate('roles');
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedError('User account inactive.');
    }

    const employee = await Employee.findOne({
      tenantId: user.tenantId,
      userId: user._id
    });

    // Rotate refresh token
    const newAccessToken = generateAccessToken({
      userId: user._id,
      tenantId: user.tenantId,
      employeeId: employee ? employee._id : null,
      sessionVersion: user.sessionVersion
    });

    const newRefreshToken = generateRefreshToken({ userId: user._id, tenantId: user.tenantId });

    // Mark current session as revoked upon rotation
    session.revokedAt = new Date();
    await session.save();

    // Create a new active session for the rotated token
    await Session.create({
      tenantId: user.tenantId,
      userId: user._id,
      refreshTokenHash: hashToken(newRefreshToken),
      userAgent: userAgent || session.userAgent,
      ipAddress: ipAddress || session.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Logout / revoke active session
   */
  static async logout({ refreshToken, userId }) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await Session.findOneAndUpdate(
        { refreshTokenHash: tokenHash },
        { revokedAt: new Date() }
      );
    } else if (userId) {
      // Revoke all sessions for user if specific token not given
      await Session.updateMany(
        { userId, revokedAt: null },
        { revokedAt: new Date() }
      );
    }
    return { success: true };
  }

  /**
   * Revoke all active sessions for a user across all devices/browsers
   */
  static async logoutAll(userId) {
    if (!userId) {
      throw new ValidationError('User ID required to revoke all sessions.');
    }
    await Session.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    await User.findByIdAndUpdate(userId, { $inc: { sessionVersion: 1 } });
    return { success: true, message: 'All active sessions have been revoked.' };
  }

  /**
   * Enterprise Organisation & Admin User Registration
   */
  static async register({ organisationName, organisationCode, adminName, email, password, userAgent, ipAddress }) {
    if (!organisationName || !email || !password) {
      throw new ValidationError('Organisation name, work email, and password are required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      throw new ConflictError('A user with this work email already exists.');
    }

    const cleanCode = (organisationCode || organisationName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8)).toUpperCase();
    const existingOrg = await Organisation.findOne({ code: cleanCode });
    if (existingOrg) {
      throw new ConflictError(`Organisation with code '${cleanCode}' already exists. Please choose a different code.`);
    }

    // 1. Create Organisation
    const org = await Organisation.create({
      name: organisationName.trim(),
      code: cleanCode,
      status: 'ACTIVE'
    });

    // 2. Bootstrap Organisation defaults (roles, entity, dept, location, leave types, shifts)
    const { entity, department, location, roles } = await OrganisationService.bootstrapOrganisation(org._id);

    // 3. Create System Admin User
    const passwordHash = await hashPassword(password);
    const adminRole = roles[SYSTEM_ROLES.SYSTEM_ADMIN];

    const user = await User.create({
      tenantId: org._id,
      email: cleanEmail,
      passwordHash,
      roles: adminRole ? [adminRole._id] : [],
      status: USER_STATUS.ACTIVE
    });

    // 4. Create linked Admin Employee profile
    const nameParts = (adminName || 'Admin User').trim().split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const employee = await Employee.create({
      tenantId: org._id,
      userId: user._id,
      employeeCode: 'EMP001',
      firstName,
      lastName,
      displayName: adminName || `${firstName} ${lastName}`,
      email: cleanEmail,
      joiningDate: new Date(),
      designation: 'Enterprise Administrator',
      entityId: entity._id,
      departmentId: department._id,
      locationId: location._id,
      employmentStatus: 'ACTIVE'
    });

    // 5. Generate tokens and session
    const accessToken = generateAccessToken({
      userId: user._id,
      tenantId: org._id,
      employeeId: employee._id,
      sessionVersion: user.sessionVersion
    });

    const refreshToken = generateRefreshToken({ userId: user._id, tenantId: org._id });

    const session = await Session.create({
      tenantId: org._id,
      userId: user._id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return {
      user: userObj,
      employee: employee.toObject(),
      organisation: org.toObject(),
      accessToken,
      refreshToken,
      sessionId: session._id
    };
  }

  /**
   * Get current authenticated user profile and permissions
   */
  static async getCurrentUser(userId, tenantId) {
    const user = await User.findOne({ _id: userId, tenantId }).populate('roles tenantId');
    if (!user) {
      throw new NotFoundError('User');
    }

    let employee = await Employee.findOne({
      tenantId,
      userId: user._id
    }).populate('entityId departmentId locationId managerId');

    if (!employee && user.email) {
      employee = await Employee.findOne({
        tenantId,
        email: user.email.toLowerCase()
      }).populate('entityId departmentId locationId managerId');

      if (employee) {
        employee.userId = user._id;
        await employee.save();
      }
    }

    // Aggregate permissions across active roles
    const permissions = [];
    for (const role of user.roles || []) {
      for (const p of role.permissions || []) {
        permissions.push(p);
      }
    }

    const userObj = user.toObject();
    delete userObj.passwordHash;

    return {
      user: userObj,
      employee: employee ? employee.toObject() : null,
      permissions
    };
  }
}
