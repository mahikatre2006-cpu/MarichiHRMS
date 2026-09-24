import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS, PERMISSION_REGISTRY } from '../../constants/permissions.js';
import { RBAC_SCOPES } from '../../constants/scopes.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ROLE_MANAGE), (req, res) => {
  return sendSuccess(res, {
    permissions: PERMISSION_REGISTRY,
    scopes: Object.values(RBAC_SCOPES)
  }, 'Permissions and scopes registry retrieved');
});

export default router;
