import { Router } from 'express';
import { AuditController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.AUDIT_READ), AuditController.list);
router.get('/logs', authorize(PERMISSIONS.AUDIT_READ), AuditController.list);

export default router;
