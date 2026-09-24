import { Router } from 'express';
import authRoutes from '../modules/auth/routes.js';
import organisationRoutes from '../modules/organisations/routes.js';
import entityRoutes from '../modules/entities/routes.js';
import departmentRoutes from '../modules/departments/routes.js';
import locationRoutes from '../modules/locations/routes.js';
import employeeRoutes from '../modules/employees/routes.js';
import userRoutes from '../modules/users/routes.js';
import roleRoutes from '../modules/roles/routes.js';
import permissionRoutes from '../modules/permissions/routes.js';
import attendanceRoutes from '../modules/attendance/routes.js';
import attendanceConfigRoutes from '../modules/attendance/config.routes.js';
import leaveRoutes from '../modules/leave/routes.js';
import notificationRoutes from '../modules/notifications/routes.js';
import auditRoutes from '../modules/audit/routes.js';

const router = Router();

// Master API v1 Routing Table
router.use('/auth', authRoutes);
router.use('/organisations', organisationRoutes);
router.use('/entities', entityRoutes);
router.use('/departments', departmentRoutes);
router.use('/locations', locationRoutes);
router.use('/employees', employeeRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/', attendanceConfigRoutes); // shifts, rosters, attendance-policies, holidays
router.use('/leave', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/audit', auditRoutes);

export default router;
