import { Router } from 'express';
import { RoleController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ROLE_MANAGE), RoleController.list);
router.post('/', authorize(PERMISSIONS.ROLE_MANAGE), RoleController.create);
router.get('/:id', authorize(PERMISSIONS.ROLE_MANAGE), RoleController.getById);
router.patch('/:id', authorize(PERMISSIONS.ROLE_MANAGE), RoleController.update);

export default router;
