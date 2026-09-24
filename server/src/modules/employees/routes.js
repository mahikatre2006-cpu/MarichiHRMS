import { Router } from 'express';
import { EmployeeController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.EMPLOYEE_READ), EmployeeController.list);
router.post('/', authorize(PERMISSIONS.EMPLOYEE_CREATE), EmployeeController.create);
router.get('/:id', authorize(PERMISSIONS.EMPLOYEE_READ, { paramIsEmployeeId: true }), EmployeeController.getById);
router.patch('/:id', authorize(PERMISSIONS.EMPLOYEE_UPDATE, { paramIsEmployeeId: true }), EmployeeController.update);
router.patch('/:id/status', authorize(PERMISSIONS.EMPLOYEE_DEACTIVATE, { paramIsEmployeeId: true }), EmployeeController.updateStatus);
router.patch('/:id/transfer', authorize(PERMISSIONS.EMPLOYEE_UPDATE, { paramIsEmployeeId: true }), EmployeeController.transferEmployee);

export default router;
