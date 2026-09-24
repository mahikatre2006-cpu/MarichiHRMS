import { Router } from 'express';
import { DepartmentController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ORGANISATION_READ), DepartmentController.list);
router.post('/', authorize(PERMISSIONS.DEPARTMENT_MANAGE), DepartmentController.create);
router.get('/:id', authorize(PERMISSIONS.ORGANISATION_READ), DepartmentController.getById);
router.patch('/:id', authorize(PERMISSIONS.DEPARTMENT_MANAGE), DepartmentController.update);

export default router;
