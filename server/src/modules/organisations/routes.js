import { Router } from 'express';
import { OrganisationController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ORGANISATION_READ), OrganisationController.list);
router.post('/', authorize(PERMISSIONS.ORGANISATION_MANAGE), OrganisationController.create);
router.get('/:id', authorize(PERMISSIONS.ORGANISATION_READ), OrganisationController.getById);
router.patch('/:id', authorize(PERMISSIONS.ORGANISATION_MANAGE), OrganisationController.update);

export default router;
