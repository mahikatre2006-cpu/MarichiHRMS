import { Router } from 'express';
import { AttendanceController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

// Punches
router.post('/punch/in', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.punchIn);
router.post('/punch/out', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.punchOut);
router.post('/punch/device-sync', authorize(PERMISSIONS.ATTENDANCE_DEVICE_SYNC), AttendanceController.deviceSync);

// Views
router.get('/me', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getMyAttendance);
router.get('/team', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getTeamAttendance);
router.get('/locks', authorize(PERMISSIONS.ATTENDANCE_LOCK), AttendanceController.getLocks);
router.post('/locks', authorize(PERMISSIONS.ATTENDANCE_LOCK), AttendanceController.lockAttendance);

// Regularisation
router.post('/regularisations', authorize(PERMISSIONS.ATTENDANCE_REGULARISE), AttendanceController.submitRegularisation);
router.get('/regularisations', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.listRegularisations);
router.patch('/regularisations/:id/approve', authorize(PERMISSIONS.ATTENDANCE_REGULARISE_APPROVE), AttendanceController.approveRegularisation);
router.patch('/regularisations/:id/reject', authorize(PERMISSIONS.ATTENDANCE_REGULARISE_APPROVE), AttendanceController.rejectRegularisation);

// Override & Detailed Views
router.patch('/:id/override', authorize(PERMISSIONS.ATTENDANCE_OVERRIDE), AttendanceController.overrideAttendance);
router.get('/:employeeId', authorize(PERMISSIONS.ATTENDANCE_READ, { paramIsEmployeeId: true }), AttendanceController.getEmployeeAttendance);
router.get('/', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.listAllAttendance);

export default router;
