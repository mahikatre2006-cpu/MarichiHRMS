import { LeaveService } from './service.js';
import { LeaveRequest } from './request.model.js';
import { LeaveBalance } from './balance.model.js';
import { LeaveLedgerEntry } from './ledger.model.js';
import { LeaveType } from './type.model.js';
import { LeavePolicy } from './policy.model.js';
import { sendSuccess } from '../../utils/response.js';
import { buildScopeFilter } from '../../middleware/rbac.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { SYSTEM_ROLES } from '../../constants/roles.js';

export class LeaveController {
  static async applyLeave(req, res, next) {
    try {
      const isHrOrAdmin = req.userRoles?.some(r => [SYSTEM_ROLES.SYSTEM_ADMIN, SYSTEM_ROLES.HR_ADMIN].includes(r.name));
      const targetEmpId = (isHrOrAdmin && req.body.employeeId) ? req.body.employeeId : req.employeeId;
      if (!targetEmpId) throw new ValidationError('No linked employee profile');
      const request = await LeaveService.applyLeave(req.tenantId, targetEmpId, req.body, { userId: req.user._id, employeeId: req.employeeId });
      return sendSuccess(res, request, 'Leave request submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async listRequests(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { employeeField: 'employeeId' });
      const { status, leaveTypeId, employeeId } = req.query;

      if (status) scopeFilter.status = status;
      if (leaveTypeId) scopeFilter.leaveTypeId = leaveTypeId;
      if (employeeId) scopeFilter.employeeId = employeeId;

      const requests = await LeaveRequest.find(scopeFilter)
        .populate('employeeId leaveTypeId managerId')
        .sort({ createdAt: -1 });

      return sendSuccess(res, requests, 'Leave requests retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getRequestById(req, res, next) {
    try {
      const request = await LeaveRequest.findOne({ _id: req.params.id, tenantId: req.tenantId })
        .populate('employeeId leaveTypeId managerId');
      if (!request) throw new NotFoundError('Leave request');
      return sendSuccess(res, request, 'Leave request retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async approveLeave(req, res, next) {
    try {
      const isSystemAdmin = req.userRoles?.some(r => r.name === SYSTEM_ROLES.SYSTEM_ADMIN);
      const request = await LeaveService.approveLeave(req.tenantId, req.params.id, {
        userId: req.user._id,
        employeeId: req.employeeId,
        isSystemAdmin,
        comments: req.body.comments
      });
      return sendSuccess(res, request, 'Leave request approved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async rejectLeave(req, res, next) {
    try {
      const request = await LeaveService.rejectLeave(
        req.tenantId,
        req.params.id,
        { userId: req.user._id, employeeId: req.employeeId, comments: req.body.comments },
        req.body.reason || req.body.comments
      );
      return sendSuccess(res, request, 'Leave request rejected');
    } catch (err) {
      next(err);
    }
  }

  static async cancelLeave(req, res, next) {
    try {
      const request = await LeaveService.cancelLeave(
        req.tenantId,
        req.params.id,
        req.employeeId,
        req.body.reason,
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, request, 'Leave request cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMyBalances(req, res, next) {
    try {
      if (!req.employeeId) return sendSuccess(res, [], 'No linked employee profile');
      const year = parseInt(req.query.year || new Date().getFullYear(), 10);
      const balances = await LeaveBalance.find({
        tenantId: req.tenantId,
        employeeId: req.employeeId,
        year
      }).populate('leaveTypeId');
      return sendSuccess(res, balances, 'Personal leave balances retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getEmployeeBalances(req, res, next) {
    try {
      const year = parseInt(req.query.year || new Date().getFullYear(), 10);
      let balances = await LeaveBalance.find({
        tenantId: req.tenantId,
        employeeId: req.params.employeeId,
        year
      }).populate('leaveTypeId');

      if (balances.length === 0) {
        const leaveTypes = await LeaveType.find({ tenantId: req.tenantId, isActive: true });
        for (const lt of leaveTypes) {
          const quota = lt.code === 'PL' ? 15 : lt.code === 'LWP' ? 0 : 12;
          await LeaveBalance.findOneAndUpdate(
            { tenantId: req.tenantId, employeeId: req.params.employeeId, leaveTypeId: lt._id, year },
            {
              $setOnInsert: {
                tenantId: req.tenantId,
                employeeId: req.params.employeeId,
                leaveTypeId: lt._id,
                year,
                openingBalance: quota,
                allocated: quota,
                accrued: quota,
                used: 0,
                pending: 0,
                closingBalance: quota
              }
            },
            { upsert: true, new: true }
          );
        }
        balances = await LeaveBalance.find({
          tenantId: req.tenantId,
          employeeId: req.params.employeeId,
          year
        }).populate('leaveTypeId');
      }

      return sendSuccess(res, balances, 'Employee leave balances retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getLedger(req, res, next) {
    try {
      const { employeeId } = req.params;
      const query = { tenantId: req.tenantId, employeeId };
      if (req.query.leaveTypeId) query.leaveTypeId = req.query.leaveTypeId;

      const entries = await LeaveLedgerEntry.find(query)
        .populate('leaveTypeId performedBy')
        .sort({ createdAt: -1 });

      return sendSuccess(res, entries, 'Leave ledger entries retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async adjustBalance(req, res, next) {
    try {
      const { employeeId, leaveTypeId, amount, reason } = req.body;
      const balance = await LeaveService.adjustBalance(
        req.tenantId,
        employeeId,
        leaveTypeId,
        parseFloat(amount),
        reason,
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, balance, 'Leave balance adjusted with ledger transaction');
    } catch (err) {
      next(err);
    }
  }

  // --- LEAVE TYPES ---
  static async listTypes(req, res, next) {
    try {
      const types = await LeaveType.find({ tenantId: req.tenantId }).sort({ name: 1 });
      return sendSuccess(res, types, 'Leave types retrieved');
    } catch (err) { next(err); }
  }

  static async createType(req, res, next) {
    try {
      const type = await LeaveType.create({ ...req.body, tenantId: req.tenantId });
      return sendSuccess(res, type, 'Leave type created successfully', 201);
    } catch (err) { next(err); }
  }

  static async updateType(req, res, next) {
    try {
      const type = await LeaveType.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantId },
        { $set: req.body },
        { new: true }
      );
      if (!type) throw new NotFoundError('Leave type');
      return sendSuccess(res, type, 'Leave type updated successfully');
    } catch (err) { next(err); }
  }

  // --- LEAVE POLICIES ---
  static async listPolicies(req, res, next) {
    try {
      const query = { tenantId: req.tenantId };
      if (req.query.entityId) query.entityId = req.query.entityId;
      const policies = await LeavePolicy.find(query).populate('entityId leaveTypeId');
      return sendSuccess(res, policies, 'Leave policies retrieved');
    } catch (err) { next(err); }
  }

  static async createPolicy(req, res, next) {
    try {
      const policy = await LeavePolicy.create({ ...req.body, tenantId: req.tenantId });
      return sendSuccess(res, policy, 'Leave policy created successfully', 201);
    } catch (err) { next(err); }
  }

  static async updatePolicy(req, res, next) {
    try {
      const policy = await LeavePolicy.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantId },
        { $set: req.body },
        { new: true }
      );
      if (!policy) throw new NotFoundError('Leave policy');
      return sendSuccess(res, policy, 'Leave policy updated successfully');
    } catch (err) { next(err); }
  }

  // --- ACCRUALS & ENCASHMENT ---
  static async runAccruals(req, res, next) {
    try {
      const { entityId, year, month } = req.body;
      const result = await LeaveService.accrueMonthly({
        tenantId: req.tenantId,
        entityId,
        year,
        month,
        actorContext: { userId: req.user._id, employeeId: req.employeeId }
      });
      return sendSuccess(res, result, 'Monthly leave accrual executed successfully');
    } catch (err) { next(err); }
  }

  static async runCarryForward(req, res, next) {
    try {
      const { entityId, fromYear, toYear } = req.body;
      const result = await LeaveService.processAnnualCarryForward({
        tenantId: req.tenantId,
        entityId,
        fromYear,
        toYear,
        actorContext: { userId: req.user._id, employeeId: req.employeeId }
      });
      return sendSuccess(res, result, 'Annual leave carry-forward processed successfully');
    } catch (err) { next(err); }
  }

  static async encashLeave(req, res, next) {
    try {
      const { employeeId, leaveTypeId, days, reason } = req.body;
      const result = await LeaveService.encashLeave(
        { tenantId: req.tenantId, employeeId: employeeId || req.employeeId, leaveTypeId, days, reason },
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, result, 'Leave encashment processed successfully');
    } catch (err) { next(err); }
  }

  static async bulkEncash(req, res, next) {
    try {
      const { entityId, leaveTypeId, criteria } = req.body;
      const result = await LeaveService.bulkEncashLeave(
        { tenantId: req.tenantId, entityId, leaveTypeId, criteria },
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, result, 'Bulk leave encashment executed successfully');
    } catch (err) { next(err); }
  }

  // --- ESCALATIONS ---
  static async runEscalations(req, res, next) {
    try {
      const result = await LeaveService.escalatePendingApprovals({
        tenantId: req.tenantId,
        actorContext: { userId: req.user._id }
      });
      return sendSuccess(res, result, 'Approval auto-escalation check completed');
    } catch (err) { next(err); }
  }

  // --- DELEGATIONS ---
  static async createDelegation(req, res, next) {
    try {
      if (!req.employeeId) throw new ValidationError('No linked employee profile');
      const delegation = await LeaveService.createDelegation(
        req.tenantId,
        req.employeeId,
        req.body,
        { userId: req.user._id }
      );
      return sendSuccess(res, delegation, 'Approval delegation created successfully', 201);
    } catch (err) { next(err); }
  }

  static async revokeDelegation(req, res, next) {
    try {
      const delegation = await LeaveService.revokeDelegation(
        req.tenantId,
        req.params.id,
        { userId: req.user._id }
      );
      return sendSuccess(res, delegation, 'Approval delegation revoked successfully');
    } catch (err) { next(err); }
  }

  static async listDelegations(req, res, next) {
    try {
      const query = {};
      if (req.query.delegatorEmployeeId) query.delegatorEmployeeId = req.query.delegatorEmployeeId;
      if (req.query.status) query.status = req.query.status;
      const delegations = await LeaveService.listDelegations(req.tenantId, query);
      return sendSuccess(res, delegations, 'Delegations retrieved');
    } catch (err) { next(err); }
  }

  // --- BLACKOUT PERIODS ---
  static async createBlackoutPeriod(req, res, next) {
    try {
      const blackout = await LeaveService.createBlackoutPeriod(
        req.tenantId,
        req.body,
        { userId: req.user._id }
      );
      return sendSuccess(res, blackout, 'Leave blackout period created successfully', 201);
    } catch (err) { next(err); }
  }

  static async listBlackoutPeriods(req, res, next) {
    try {
      const query = {};
      if (req.query.entityId) query.entityId = req.query.entityId;
      if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
      const blackouts = await LeaveService.listBlackoutPeriods(req.tenantId, query);
      return sendSuccess(res, blackouts, 'Blackout periods retrieved');
    } catch (err) { next(err); }
  }

  // --- TEAM LEAVE CALENDAR ---
  static async getTeamLeaveCalendar(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { employeeField: '_id' });
      const { Employee } = await import('../employees/model.js');
      const teamEmployees = await Employee.find(scopeFilter, { _id: 1 });
      const teamEmployeeIds = teamEmployees.map(e => e._id);

      const calendar = await LeaveService.getTeamLeaveCalendar(
        req.tenantId,
        teamEmployeeIds,
        { startDate: req.query.startDate, endDate: req.query.endDate }
      );
      return sendSuccess(res, calendar, 'Team leave calendar retrieved');
    } catch (err) { next(err); }
  }
}
