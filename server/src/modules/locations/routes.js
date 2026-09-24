import { Router } from 'express';
import { LocationController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ORGANISATION_READ), LocationController.list);
router.post('/', authorize(PERMISSIONS.LOCATION_MANAGE), LocationController.create);
router.get('/:id', authorize(PERMISSIONS.ORGANISATION_READ), LocationController.getById);
router.patch('/:id', authorize(PERMISSIONS.LOCATION_MANAGE), LocationController.update);

export default router;
