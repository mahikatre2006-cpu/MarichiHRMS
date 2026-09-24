import { Router } from 'express';
import { LeaveController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';

const router = Router();

router.use(authenticate);

// Types
router.get('/types', authorize(PERMISSIONS.LEAVE_READ), LeaveController.listTypes);
router.post('/types', authorize(PERMISSIONS.LEAVE_TYPE_MANAGE), LeaveController.createType);
router.patch('/types/:id', authorize(PERMISSIONS.LEAVE_TYPE_MANAGE), LeaveController.updateType);

// Policies
router.get('/policies', authorize(PERMISSIONS.LEAVE_READ), LeaveController.listPolicies);
router.post('/policies', authorize(PERMISSIONS.LEAVE_POLICY_MANAGE), LeaveController.createPolicy);
router.patch('/policies/:id', authorize(PERMISSIONS.LEAVE_POLICY_MANAGE), LeaveController.updatePolicy);

// Balances & Ledger
router.get('/balances/me', authorize(PERMISSIONS.LEAVE_READ), LeaveController.getMyBalances);
router.get('/balances/:employeeId', authorize(PERMISSIONS.LEAVE_READ, { paramIsEmployeeId: true }), LeaveController.getEmployeeBalances);
router.get('/ledger/:employeeId', authorize(PERMISSIONS.LEAVE_LEDGER_READ, { paramIsEmployeeId: true }), LeaveController.getLedger);
router.post('/balances/adjust', authorize(PERMISSIONS.LEAVE_ADJUST), LeaveController.adjustBalance);

// Requests & Workflow
router.get('/team-calendar', authorize(PERMISSIONS.LEAVE_READ), LeaveController.getTeamLeaveCalendar);
router.post('/requests', authorize(PERMISSIONS.LEAVE_APPLY), LeaveController.applyLeave);
router.get('/requests', authorize(PERMISSIONS.LEAVE_READ), LeaveController.listRequests);
router.get('/requests/:id', authorize(PERMISSIONS.LEAVE_READ), LeaveController.getRequestById);
router.patch('/requests/:id/cancel', authorize(PERMISSIONS.LEAVE_CANCEL), LeaveController.cancelLeave);
router.post('/requests/:id/cancel', authorize(PERMISSIONS.LEAVE_CANCEL), LeaveController.cancelLeave);
router.post('/requests/:id/approve', authorize(PERMISSIONS.LEAVE_APPROVE), LeaveController.approveLeave);
router.post('/requests/:id/reject', authorize(PERMISSIONS.LEAVE_REJECT), LeaveController.rejectLeave);

// Accruals & Encashment
router.post('/accruals/run', authorize(PERMISSIONS.LEAVE_POLICY_MANAGE), LeaveController.runAccruals);
router.post('/carry-forward/run', authorize(PERMISSIONS.LEAVE_POLICY_MANAGE), LeaveController.runCarryForward);
router.post('/encash', authorize(PERMISSIONS.LEAVE_ENCASH), LeaveController.encashLeave);
router.post('/bulk-encash', authorize(PERMISSIONS.LEAVE_ENCASH), LeaveController.bulkEncash);
router.post('/escalations/run', authorize(PERMISSIONS.LEAVE_POLICY_MANAGE), LeaveController.runEscalations);

// Delegations
router.get('/delegations', authorize(PERMISSIONS.LEAVE_DELEGATE), LeaveController.listDelegations);
router.post('/delegations', authorize(PERMISSIONS.LEAVE_DELEGATE), LeaveController.createDelegation);
router.delete('/delegations/:id', authorize(PERMISSIONS.LEAVE_DELEGATE), LeaveController.revokeDelegation);

// Blackout Periods
router.get('/blackouts', authorize(PERMISSIONS.LEAVE_READ), LeaveController.listBlackoutPeriods);
router.post('/blackouts', authorize(PERMISSIONS.LEAVE_BLACKOUT_MANAGE), LeaveController.createBlackoutPeriod);

export default router;
