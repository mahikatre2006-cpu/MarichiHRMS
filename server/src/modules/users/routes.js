import { Router } from 'express';
import { UserController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.USER_READ), UserController.list);
router.post('/', authorize(PERMISSIONS.USER_MANAGE), UserController.create);
router.get('/:id', authorize(PERMISSIONS.USER_READ), UserController.getById);
router.patch('/:id', authorize(PERMISSIONS.USER_MANAGE), UserController.update);
router.patch('/:id/status', authorize(PERMISSIONS.USER_MANAGE), UserController.updateStatus);

export default router;
