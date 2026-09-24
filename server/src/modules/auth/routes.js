import { Router } from 'express';
import { AuthController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Local Authentication
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.get('/me', authenticate, AuthController.getMe);

// Canonical OIDC / OAuth 2.0 SSO Routes
router.get('/sso/:provider', AuthController.initiateSso);
router.get('/sso/:provider/callback', AuthController.handleSsoCallback);

export default router;
