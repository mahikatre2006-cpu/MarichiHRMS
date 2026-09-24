import { Router } from 'express';
import { EntityController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ORGANISATION_READ), EntityController.list);
router.post('/', authorize(PERMISSIONS.ENTITY_MANAGE), EntityController.create);
router.get('/:id', authorize(PERMISSIONS.ORGANISATION_READ), EntityController.getById);
router.patch('/:id', authorize(PERMISSIONS.ENTITY_MANAGE), EntityController.update);

export default router;
