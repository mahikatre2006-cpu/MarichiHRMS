import { AuthService } from './service.js';
import { generateAuthUrl, handleOidcCallback } from '../sso/oidc.service.js';
import { sendSuccess } from '../../utils/response.js';
import { env } from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export class AuthController {
  static async register(req, res, next) {
    try {
      const { organisationName, organisationCode, adminName, email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await AuthService.register({
        organisationName,
        organisationCode,
        adminName,
        email,
        password,
        userAgent,
        ipAddress
      });

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000
      });

      return sendSuccess(res, result, 'Organisation registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password, tenantId } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await AuthService.login({
        email,
        password,
        tenantId,
        userAgent,
        ipAddress
      });

      // Set secure refresh token cookie
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000 // 15 mins
      });

      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await AuthService.refresh({
        refreshToken,
        userAgent,
        ipAddress
      });

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.cookie('accessToken', result.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000
      });

      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const userId = req.user?._id;

      await AuthService.logout({ refreshToken, userId });

      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      res.clearCookie('accessToken', COOKIE_OPTIONS);

      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  static async logoutAll(req, res, next) {
    try {
      const userId = req.user._id;

      await AuthService.logoutAll(userId);

      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      res.clearCookie('accessToken', COOKIE_OPTIONS);

      return sendSuccess(res, null, 'Logged out from all devices successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const result = await AuthService.getCurrentUser(req.user._id, req.tenantId);
      return sendSuccess(res, result, 'Current user profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * SSO Initiation: GET /api/v1/auth/sso/:provider
   */
  static async initiateSso(req, res, next) {
    try {
      const { provider } = req.params;
      const tenantId = req.query.tenantId || req.tenantId;

      const authData = generateAuthUrl(provider, tenantId);

      if (req.headers.accept?.includes('text/html')) {
        return res.redirect(authData.authorizationUrl);
      }

      return sendSuccess(res, authData, 'SSO authorization URL generated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Canonical SSO Callback: GET /api/v1/auth/sso/:provider/callback
   */
  static async handleSsoCallback(req, res, next) {
    try {
      const { provider } = req.params;
      const { code, state, tenantId } = req.query;

      const ssoResult = await handleOidcCallback(provider, {
        code,
        state,
        tenantId
      });

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Log in the resolved user
      const user = ssoResult.user;
      const employee = await AuthService.getCurrentUser(user._id, user.tenantId);

      const loginResult = await AuthService.login({
        email: user.email,
        password: null, // bypassing password check for verified OIDC
        tenantId: user.tenantId,
        userAgent,
        ipAddress
      }).catch(async () => {
        // If password login wrapper throws because password is required, issue session directly
        const { Session } = await import('./session.model.js');
        const { generateAccessToken, generateRefreshToken, hashToken } = await import('../../utils/security.js');

        const accessToken = generateAccessToken({
          userId: user._id,
          tenantId: user.tenantId,
          employeeId: employee.employee ? employee.employee._id : null,
          sessionVersion: user.sessionVersion
        });

        const refreshToken = generateRefreshToken({ userId: user._id, tenantId: user.tenantId });

        await Session.create({
          tenantId: user.tenantId,
          userId: user._id,
          refreshTokenHash: hashToken(refreshToken),
          userAgent,
          ipAddress,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return {
          user,
          employee: employee.employee,
          accessToken,
          refreshToken
        };
      });

      res.cookie('refreshToken', loginResult.refreshToken, COOKIE_OPTIONS);
      res.cookie('accessToken', loginResult.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000
      });

      // Redirect back to frontend portal with token or cookie
      const redirectTarget = `${env.CLIENT_URL}/auth/sso-success?token=${loginResult.accessToken}`;
      return res.redirect(redirectTarget);
    } catch (err) {
      if (req.headers.accept?.includes('text/html')) {
        return res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(err.message)}`);
      }
      next(err);
    }
  }
}
