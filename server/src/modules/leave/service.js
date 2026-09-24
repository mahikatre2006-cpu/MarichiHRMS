import { LeaveType } from './type.model.js';
import { LeavePolicy } from './policy.model.js';
import { LeaveBalance } from './balance.model.js';
import { LeaveLedgerEntry } from './ledger.model.js';
import { LeaveRequest } from './request.model.js';
import { LeaveApproval } from './approval.model.js';
import { LeaveApprovalDelegation } from './delegation.model.js';
import { LeaveBlackoutPeriod } from './blackout.model.js';
import { Holiday } from '../attendance/holiday.model.js';
import { AttendanceRecord } from '../attendance/record.model.js';
import { Employee } from '../employees/model.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  BusinessRuleError,
  ConflictError
} from '../../utils/errors.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import {
  LEAVE_REQUEST_STATUS,
  LEAVE_LEDGER_TRANSACTION_TYPE,
  ATTENDANCE_STATUS,
  AUDIT_ACTION
} from '../../constants/enums.js';

function getDatesBetween(startDateStr, endDateStr) {
  const dates = [];
  const curr = new Date(startDateStr);
  const end = new Date(endDateStr);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export class LeaveService {
  /**
   * Submit a new leave request
   */
  static async applyLeave(tenantId, employeeId, data, actorContext = {}) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee || employee.employmentStatus !== 'ACTIVE') {
      throw new ForbiddenError('Only active employees can submit leave requests.');
    }

    const leaveType = await LeaveType.findOne({ _id: data.leaveTypeId, tenantId, isActive: true });
    if (!leaveType) {
      throw new NotFoundError('Leave type');
    }

    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new ValidationError('Start date cannot be after end date.');
    }

    // 1. Gender Applicability Check
    if (leaveType.genderApplicability && leaveType.genderApplicability !== 'ALL') {
      if (employee.gender && employee.gender !== leaveType.genderApplicability) {
        throw new ValidationError(`This leave type is restricted to ${leaveType.genderApplicability.toLowerCase()} employees.`);
      }
    }

    // 2. Minimum Tenure in Months
    if (leaveType.minTenureMonths > 0 && employee.joiningDate) {
      const tenureMonths = (new Date(data.startDate) - new Date(employee.joiningDate)) / (1000 * 60 * 60 * 24 * 30.4375);
      if (tenureMonths < leaveType.minTenureMonths) {
        throw new BusinessRuleError(`Minimum tenure of ${leaveType.minTenureMonths} months required for '${leaveType.name}'. Current tenure: ${Math.floor(tenureMonths)} months.`);
      }
    }

    // 3. Blackout Period Interception
    const blackout = await LeaveBlackoutPeriod.findOne({
      tenantId,
      entityId: employee.entityId,
      isActive: true,
      startDate: { $lte: data.endDate },
      endDate: { $gte: data.startDate },
      $or: [
        { leaveTypeIds: { $size: 0 } },
        { leaveTypeIds: leaveType._id }
      ]
    });

    if (blackout && !data.isBlackoutOverride) {
      throw new ConflictError(`Leave dates overlap with blackout period '${blackout.name}' (${blackout.startDate} to ${blackout.endDate}): ${blackout.reason}`);
    }

    // 4. Overlapping active requests check
    const overlapping = await LeaveRequest.findOne({
      tenantId,
      employeeId,
      status: { $in: [LEAVE_REQUEST_STATUS.PENDING_APPROVAL, LEAVE_REQUEST_STATUS.APPROVED] },
      $or: [
        { startDate: { $lte: data.endDate }, endDate: { $gte: data.startDate } }
      ]
    });
    if (overlapping) {
      throw new ConflictError(`Leave request overlaps with an existing request (${overlapping.startDate} to ${overlapping.endDate}).`);
    }

    // 5. Calculate eligible days considering Weekend and Holiday policies
    const rawDates = getDatesBetween(data.startDate, data.endDate);
    const policy = await LeavePolicy.findOne({ tenantId, entityId: employee.entityId, leaveTypeId: leaveType._id, isActive: true });

    let eligibleDates = [...rawDates];
    if (policy && policy.includeWeekends === false) {
      eligibleDates = eligibleDates.filter(d => {
        const dayOfWeek = new Date(d).getUTCDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      });
    }

    if (policy && policy.includeHolidays === false) {
      const holidays = await Holiday.find({ tenantId, date: { $in: rawDates } });
      const holidayDates = new Set(holidays.map(h => h.date));
      eligibleDates = eligibleDates.filter(d => !holidayDates.has(d));
    }

    let totalDays;
    const durationUnit = data.durationUnit || (data.isHalfDay ? 'HALF_DAY' : 'FULL_DAY');
    if (durationUnit === 'HOURLY') {
      const hours = Number(data.hoursRequested) || 4;
      totalDays = Number((hours / 8).toFixed(2));
    } else if (durationUnit === 'HALF_DAY' || data.isHalfDay) {
      totalDays = 0.5;
    } else {
      totalDays = eligibleDates.length;
    }

    if (totalDays === 0) {
      throw new ValidationError('Requested date range consists entirely of non-working days or holidays.');
    }

    // 6. Minimum / Maximum Duration Rules
    if (durationUnit !== 'HOURLY' && leaveType.minDurationDays && totalDays < leaveType.minDurationDays) {
      throw new ValidationError(`Minimum duration for ${leaveType.name} is ${leaveType.minDurationDays} day(s).`);
    }
    if (leaveType.maxDurationDays && totalDays > leaveType.maxDurationDays) {
      throw new ValidationError(`Maximum duration for ${leaveType.name} is ${leaveType.maxDurationDays} day(s).`);
    }

    // 7. Secure Attachment Validation
    const requiresProof = leaveType.requiresAttachment || (leaveType.requiresProofAfterDays && totalDays >= leaveType.requiresProofAfterDays);
    if (requiresProof && !data.attachmentUrl && !data.attachmentMetadata) {
      throw new ValidationError(`Attachment is mandatory for leave type '${leaveType.name}'.`);
    }

    if (data.attachmentMetadata) {
      const blockedMimes = ['application/x-msdownload', 'application/x-sh', 'application/x-bat', 'application/javascript'];
      const blockedExts = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.com'];
      const fileName = data.attachmentMetadata.fileName || '';
      if (
        blockedMimes.includes(data.attachmentMetadata.mimeType) ||
        blockedExts.some(ext => fileName.toLowerCase().endsWith(ext))
      ) {
        throw new ValidationError('Executable or script files are strictly prohibited as attachments.');
      }
    }

    // 8. Validate leave balance
    const currentYear = new Date(data.startDate).getFullYear();
    let balanceDoc = await LeaveBalance.findOne({
      tenantId,
      employeeId,
      leaveTypeId: leaveType._id,
      year: currentYear
    });

    if (!balanceDoc) {
      balanceDoc = await LeaveBalance.create({
        tenantId,
        employeeId,
        leaveTypeId: leaveType._id,
        year: currentYear,
        openingBalance: 0,
        closingBalance: 0
      });
    }

    const availableBalance = balanceDoc.closingBalance;
    const isUnpaid = leaveType.category === 'UNPAID' || !leaveType.isPaid;

    if (!isUnpaid && totalDays > availableBalance) {
      if (!leaveType.allowsNegativeBalance) {
        throw new BusinessRuleError(
          `Insufficient leave balance. Available: ${availableBalance}, Requested: ${totalDays}`
        );
      }
      const potentialNegative = availableBalance - totalDays;
      if (Math.abs(potentialNegative) > (leaveType.maxNegativeBalance || 0)) {
        throw new BusinessRuleError(
          `Negative leave limit exceeded. Maximum negative allowed: -${leaveType.maxNegativeBalance}`
        );
      }
    }

    // 9. Multi-Level Approval Hierarchy Setup
    const approvalLevels = policy?.approvalLevels || 1;
    const slaHours = policy?.slaHours || 48;
    const stepsToCreate = [];

    // Level 1: Direct Manager
    if (employee.managerId) {
      stepsToCreate.push({
        step: 1,
        role: 'MANAGER',
        approverEmployeeId: employee.managerId,
        status: 'PENDING',
        slaHours,
        dueAt: new Date(Date.now() + slaHours * 3600000)
      });

      // Level 2: Skip-Level Manager (if policy specifies multi-level approval)
      if (approvalLevels >= 2) {
        const manager = await Employee.findById(employee.managerId);
        if (manager && manager.managerId) {
          stepsToCreate.push({
            step: 2,
            role: 'SKIP_LEVEL',
            approverEmployeeId: manager.managerId,
            status: 'PENDING',
            slaHours,
            dueAt: new Date(Date.now() + slaHours * 2 * 3600000)
          });
        }
      }
    }

    const leaveRequest = await LeaveRequest.create({
      tenantId,
      employeeId,
      leaveTypeId: leaveType._id,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      durationUnit,
      hoursRequested: data.hoursRequested || 0,
      isHalfDay: durationUnit === 'HALF_DAY',
      halfDaySession: data.halfDaySession || null,
      reason: data.reason,
      status: LEAVE_REQUEST_STATUS.PENDING_APPROVAL,
      currentApprovalStep: 1,
      totalApprovalSteps: Math.max(1, stepsToCreate.length),
      isBlackoutOverride: Boolean(data.isBlackoutOverride),
      isLwp: isUnpaid || (availableBalance < totalDays),
      attachmentUrl: data.attachmentUrl || data.attachmentMetadata?.storageRef,
      attachmentMetadata: data.attachmentMetadata || null,
      managerId: employee.managerId
    });

    // Create approval steps
    for (const step of stepsToCreate) {
      await LeaveApproval.create({
        tenantId,
        leaveRequestId: leaveRequest._id,
        ...step
      });
    }

    eventEmitter.emit(APP_EVENTS.LEAVE_SUBMITTED, leaveRequest);
    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: employeeId,
      action: AUDIT_ACTION.LEAVE_REQUESTED,
      resourceType: 'LeaveRequest',
      resourceId: leaveRequest._id,
      after: leaveRequest.toObject()
    });

    return leaveRequest;
  }

  /**
   * Approve leave request (handles delegation, multi-step advance, ledger debit, attendance sync)
   */
  static async approveLeave(tenantId, requestId, approverContext) {
    const request = await LeaveRequest.findOne({ _id: requestId, tenantId });
    if (!request) throw new NotFoundError('Leave request');

    // Prevent self-approval unless system administrator
    if (
      approverContext.employeeId &&
      request.employeeId.toString() === approverContext.employeeId.toString() &&
      !approverContext.isSystemAdmin
    ) {
      throw new ForbiddenError('Self-approval violation: Employees cannot approve their own leave requests.');
    }

    if (request.status === LEAVE_REQUEST_STATUS.APPROVED) {
      throw new BusinessRuleError('Leave request is already approved.');
    }

    if (request.status !== LEAVE_REQUEST_STATUS.PENDING_APPROVAL) {
      throw new BusinessRuleError(`Cannot approve request with status '${request.status}'`);
    }

    // Find the active pending step
    const currentStep = await LeaveApproval.findOne({
      tenantId,
      leaveRequestId: request._id,
      status: { $in: ['PENDING', 'ESCALATED'] }
    }).sort({ step: 1 });

    if (currentStep) {
      const isDirectApprover = approverContext.employeeId && currentStep.approverEmployeeId.toString() === approverContext.employeeId.toString();

      // Check delegation if not direct approver
      let isDelegated = false;
      if (!isDirectApprover && approverContext.employeeId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const activeDelegation = await LeaveApprovalDelegation.findOne({
          tenantId,
          delegatorEmployeeId: currentStep.approverEmployeeId,
          delegateEmployeeId: approverContext.employeeId,
          status: 'ACTIVE',
          startDate: { $lte: todayStr },
          endDate: { $gte: todayStr }
        });
        if (activeDelegation) {
          isDelegated = true;
          currentStep.delegatedToEmployeeId = approverContext.employeeId;
        }
      }

      if (!isDirectApprover && !isDelegated && !approverContext.isSystemAdmin && !approverContext.isHrAdmin) {
        throw new ForbiddenError('You are not authorized to approve this step of the leave request.');
      }

      currentStep.status = 'APPROVED';
      currentStep.approverUserId = approverContext.userId;
      currentStep.comments = approverContext.comments || 'Approved';
      currentStep.actionedAt = new Date();
      await currentStep.save();

      // Check if subsequent pending approval step exists
      const nextStep = await LeaveApproval.findOne({
        tenantId,
        leaveRequestId: request._id,
        step: currentStep.step + 1
      });

      if (nextStep) {
        nextStep.status = 'PENDING';
        nextStep.dueAt = new Date(Date.now() + (nextStep.slaHours || 48) * 3600000);
        await nextStep.save();

        request.currentApprovalStep = nextStep.step;
        await request.save();
        eventEmitter.emit(APP_EVENTS.LEAVE_SUBMITTED, request);
        return request;
      }
    }

    // Final Approval Execution
    const year = new Date(request.startDate).getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId,
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      year
    });

    const balanceBefore = balance ? balance.closingBalance : 0;
    const balanceAfter = balanceBefore - request.totalDays;

    request.status = LEAVE_REQUEST_STATUS.APPROVED;
    request.actionedBy = approverContext.userId;
    request.actionReason = approverContext.comments || 'Approved';
    request.actionedAt = new Date();
    await request.save();

    // 1. Immutable Ledger Entry
    await LeaveLedgerEntry.create({
      tenantId,
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      transactionType: LEAVE_LEDGER_TRANSACTION_TYPE.AVAILED,
      amount: -request.totalDays,
      balanceBefore,
      balanceAfter,
      referenceId: request._id,
      reason: `Leave availed: ${request.startDate} to ${request.endDate}`,
      performedBy: approverContext.userId
    });

    // 2. Update Leave Balance snapshot
    if (balance) {
      balance.availed = (balance.availed || 0) + request.totalDays;
      balance.closingBalance = balanceAfter;
      await balance.save();
    }

    // 3. LEAVE ↔ ATTENDANCE INTEGRATION: Sync dates to ON_LEAVE
    const leaveDates = getDatesBetween(request.startDate, request.endDate);
    for (const d of leaveDates) {
      await AttendanceRecord.findOneAndUpdate(
        { tenantId, employeeId: request.employeeId, date: d },
        {
          $set: {
            status: ATTENDANCE_STATUS.ON_LEAVE,
            leaveRequestId: request._id
          }
        },
        { upsert: true }
      );
    }

    eventEmitter.emit(APP_EVENTS.LEAVE_APPROVED, request);
    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: approverContext.userId,
      actorEmployeeId: approverContext.employeeId,
      action: AUDIT_ACTION.LEAVE_APPROVED,
      resourceType: 'LeaveRequest',
      resourceId: request._id,
      after: request.toObject()
    });

    return request;
  }

  /**
   * Reject leave request
   */
  static async rejectLeave(tenantId, requestId, approverContext, reason) {
    const request = await LeaveRequest.findOne({ _id: requestId, tenantId });
    if (!request) throw new NotFoundError('Leave request');

    if (request.status === LEAVE_REQUEST_STATUS.APPROVED) {
      throw new BusinessRuleError('Cannot reject an already approved leave request.');
    }

    if (request.status !== LEAVE_REQUEST_STATUS.PENDING_APPROVAL) {
      throw new BusinessRuleError(`Cannot reject request with status '${request.status}'`);
    }

    request.status = LEAVE_REQUEST_STATUS.REJECTED;
    request.actionedBy = approverContext.userId;
    request.actionReason = reason || approverContext.comments || 'Rejected';
    request.actionedAt = new Date();
    await request.save();

    await LeaveApproval.updateMany(
      { tenantId, leaveRequestId: request._id, status: { $in: ['PENDING', 'ESCALATED'] } },
      {
        $set: {
          status: 'REJECTED',
          approverUserId: approverContext.userId,
          comments: reason,
          actionedAt: new Date()
        }
      }
    );

    eventEmitter.emit(APP_EVENTS.LEAVE_REJECTED, request);
    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: approverContext.userId,
      actorEmployeeId: approverContext.employeeId,
      action: AUDIT_ACTION.LEAVE_REJECTED,
      resourceType: 'LeaveRequest',
      resourceId: request._id,
      after: request.toObject()
    });

    return request;
  }

  /**
   * Cancel leave request (and rollback ledger/attendance if was approved)
   */
  static async cancelLeave(tenantId, requestId, employeeId, reason, actorContext) {
    const request = await LeaveRequest.findOne({ _id: requestId, tenantId });
    if (!request) throw new NotFoundError('Leave request');

    if (employeeId && request.employeeId.toString() !== employeeId.toString()) {
      throw new ForbiddenError('You can only cancel your own leave requests.');
    }

    if (request.status === LEAVE_REQUEST_STATUS.CANCELLED) {
      throw new BusinessRuleError('Leave request is already cancelled.');
    }

    if (request.status === LEAVE_REQUEST_STATUS.REJECTED) {
      throw new BusinessRuleError('Cannot cancel an already rejected leave request.');
    }

    const wasApproved = request.status === LEAVE_REQUEST_STATUS.APPROVED;

    request.status = LEAVE_REQUEST_STATUS.CANCELLED;
    request.cancelledAt = new Date();
    request.cancellationReason = reason;
    await request.save();

    if (wasApproved) {
      const year = new Date(request.startDate).getFullYear();
      const balance = await LeaveBalance.findOne({
        tenantId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year
      });

      const balanceBefore = balance ? balance.closingBalance : 0;
      const balanceAfter = balanceBefore + request.totalDays;

      // Credit ledger entry
      await LeaveLedgerEntry.create({
        tenantId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        transactionType: LEAVE_LEDGER_TRANSACTION_TYPE.CANCELLATION,
        amount: request.totalDays,
        balanceBefore,
        balanceAfter,
        referenceId: request._id,
        reason: `Reversal on leave cancellation: ${request.startDate} to ${request.endDate}`,
        performedBy: actorContext.userId
      });

      if (balance) {
        balance.availed = Math.max(0, (balance.availed || 0) - request.totalDays);
        balance.closingBalance = balanceAfter;
        await balance.save();
      }

      // Revert attendance records
      const leaveDates = getDatesBetween(request.startDate, request.endDate);
      await AttendanceRecord.updateMany(
        { tenantId, employeeId: request.employeeId, date: { $in: leaveDates }, leaveRequestId: request._id },
        { $set: { status: ATTENDANCE_STATUS.ABSENT, leaveRequestId: null } }
      );
    }

    eventEmitter.emit(APP_EVENTS.LEAVE_CANCELLED, request);
    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.LEAVE_CANCELLED,
      resourceType: 'LeaveRequest',
      resourceId: request._id,
      after: request.toObject(),
      reason
    });

    return request;
  }

  /**
   * Manual balance adjustment (creates ledger entry + updates balance)
   */
  static async adjustBalance(tenantId, employeeId, leaveTypeId, amount, reason, actorContext) {
    if (!reason) throw new ValidationError('Reason is required for leave balance adjustments.');
    const year = new Date().getFullYear();

    let balance = await LeaveBalance.findOne({ tenantId, employeeId, leaveTypeId, year });
    if (!balance) {
      balance = await LeaveBalance.create({
        tenantId,
        employeeId,
        leaveTypeId,
        year,
        openingBalance: 0,
        closingBalance: 0
      });
    }

    const balanceBefore = balance.closingBalance;
    const balanceAfter = balanceBefore + amount;

    await LeaveLedgerEntry.create({
      tenantId,
      employeeId,
      leaveTypeId,
      transactionType: LEAVE_LEDGER_TRANSACTION_TYPE.ADJUSTMENT,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      performedBy: actorContext.userId
    });

    balance.adjusted = (balance.adjusted || 0) + amount;
    balance.closingBalance = balanceAfter;
    await balance.save();

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.LEAVE_BALANCE_ADJUSTED,
      resourceType: 'LeaveBalance',
      resourceId: balance._id,
      after: balance.toObject(),
      reason
    });

    return balance;
  }

  /**
   * Monthly Pro-Rata & Tenure Slab Accrual Engine
   */
  static async accrueMonthly({ tenantId, entityId, year, month, actorContext = {} }) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const policies = await LeavePolicy.find({ tenantId, entityId, isActive: true }).populate('leaveTypeId');
    const employees = await Employee.find({ tenantId, entityId, employmentStatus: 'ACTIVE' });

    const results = [];

    for (const policy of policies) {
      if (!policy.leaveTypeId || !policy.leaveTypeId.isPaid) continue;

      for (const emp of employees) {
        // Calculate entitlement based on policy accrual model
        let annualEntitlement = policy.annualEntitlement;

        // Check tenure slabs
        if (policy.accrualModel === 'TENURE_SLABS' && policy.tenureSlabs?.length > 0 && emp.joiningDate) {
          const tenureMonths = (new Date() - new Date(emp.joiningDate)) / (1000 * 60 * 60 * 24 * 30.4375);
          const matchedSlab = policy.tenureSlabs.find(s => tenureMonths >= s.minMonths && tenureMonths < s.maxMonths);
          if (matchedSlab) {
            annualEntitlement = matchedSlab.annualEntitlement;
          }
        }

        let accrualAmount = policy.accrualModel === 'TENURE_SLABS'
          ? Number((annualEntitlement / 12).toFixed(2))
          : (policy.monthlyAccrual || Number((annualEntitlement / 12).toFixed(2)));

        // Pro-rata on joining month if joining is in the current month
        if (policy.proRataOnJoining && emp.joiningDate) {
          const jDate = new Date(emp.joiningDate);
          if (jDate.getFullYear() === currentYear && (jDate.getMonth() + 1) === currentMonth) {
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            const daysRemaining = daysInMonth - jDate.getDate() + 1;
            accrualAmount = Number(((daysRemaining / daysInMonth) * accrualAmount).toFixed(2));
          }
        }

        let balance = await LeaveBalance.findOne({
          tenantId,
          employeeId: emp._id,
          leaveTypeId: policy.leaveTypeId._id,
          year: currentYear
        });

        if (!balance) {
          balance = await LeaveBalance.create({
            tenantId,
            employeeId: emp._id,
            leaveTypeId: policy.leaveTypeId._id,
            year: currentYear,
            openingBalance: 0,
            closingBalance: 0
          });
        }

        const balanceBefore = balance.closingBalance;
        const balanceAfter = balanceBefore + accrualAmount;

        balance.accrued = (balance.accrued || 0) + accrualAmount;
        balance.closingBalance = balanceAfter;
        await balance.save();

        await LeaveLedgerEntry.create({
          tenantId,
          employeeId: emp._id,
          leaveTypeId: policy.leaveTypeId._id,
          transactionType: LEAVE_LEDGER_TRANSACTION_TYPE.ACCRUAL,
          amount: accrualAmount,
          balanceBefore,
          balanceAfter,
          reason: `Monthly accrual ${currentMonth}/${currentYear} (${policy.leaveTypeId.name})`,
          performedBy: actorContext.userId || null
        });

        results.push({ employeeId: emp._id, leaveTypeId: policy.leaveTypeId._id, amount: accrualAmount });
      }
    }

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      action: AUDIT_ACTION.LEAVE_ACCRUED,
      resourceType: 'LeaveAccrual',
      resourceId: tenantId,
      reason: `Monthly accrual executed for month ${currentMonth}/${currentYear}`
    });

    return { processed: results.length, records: results };
  }

  /**
   * Annual Carry-Forward & Expiry Processor
   */
  static async processAnnualCarryForward({ tenantId, entityId, fromYear, toYear, actorContext = {} }) {
    const policies = await LeavePolicy.find({ tenantId, entityId, isActive: true });
    const employees = await Employee.find({ tenantId, entityId, employmentStatus: 'ACTIVE' });
    const processed = [];

    for (const policy of policies) {
      if (!policy.carryForwardAllowed) continue;

      for (const emp of employees) {
        const oldBalance = await LeaveBalance.findOne({
          tenantId,
          employeeId: emp._id,
          leaveTypeId: policy.leaveTypeId,
          year: fromYear
        });

        if (!oldBalance || oldBalance.closingBalance <= 0) continue;

        const closing = oldBalance.closingBalance;
        const limit = policy.carryForwardLimit || 10;
        const carryForwardAmount = Math.min(closing, limit);
        const lapsedAmount = Math.max(0, closing - carryForwardAmount);

        // Record lapse in old year if any
        if (lapsedAmount > 0) {
          await LeaveLedgerEntry.create({
            tenantId,
            employeeId: emp._id,
            leaveTypeId: policy.leaveTypeId,
            transactionType: LEAVE_LEDGER_TRANSACTION_TYPE.LAPSED,
            amount: -lapsedAmount,
            balanceBefore: closing,
            balanceAfter: carryForwardAmount,
            reason: `Lapsed excess leave at year-end (${fromYear})`,
            performedBy: actorContext.userId || null
          });
        }

        // Initialize new year balance
        let newBalance = await LeaveBalance.findOne({
          tenantId,
          employeeId: emp._id,
          leaveTypeId: policy.leaveTypeId,
          year: toYear
        });

        if (!newBalance) {
          newBalance = await LeaveBalance.create({
            tenantId,
            employeeId: emp._id,
            leaveTypeId: policy.leaveTypeId,
            year: toYear,
            openingBalance: carryForwardAmount,
            closingBalance: carryForwardAmount
          });
        } else {
          newBalance.openingBalance = carryForwardAmount;
          newBalance.closingBalance = (newBalance.closingBalance || 0) + carryForwardAmount;
          await newBalance.save();
        }

        processed.push({ employeeId: emp._id, carriedForward: carryForwardAmount, lapsed: lapsedAmount });
      }
    }

    return { totalProcessed: processed.length, details: processed };
  }

  /**
   * Leave Encashment (Phase 1 Leave-Side Settlement - No Payroll Disbursement)
   */
  static async encashLeave({ tenantId, employeeId, leaveTypeId, days, reason }, actorContext = {}) {
    if (!days || days <= 0) throw new ValidationError('Days to encash must be greater than 0.');
    const year = new Date().getFullYear();

    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) throw new NotFoundError('Employee');

    const policy = await LeavePolicy.findOne({ tenantId, entityId: employee.entityId, leaveTypeId, isActive: true });
    if (policy && !policy.encashmentAllowed) {
      throw new BusinessRuleError('Leave encashment is not permitted by policy for this leave type.');
    }

    const maxDays = policy?.maxEncashmentDays || 30;
    if (days > maxDays) {
      throw new BusinessRuleError(`Maximum encashable days is ${maxDays}.`);
    }

    const balance = await LeaveBalance.findOne({ tenantId, employeeId, leaveTypeId, year });
    if (!balance || balance.closingBalance < days) {
      throw new BusinessRuleError(`Insufficient leave balance to encash. Available: ${balance?.closingBalance || 0}, Requested: ${days}`);
    }

    const minRetained = policy?.minBalanceRetained || 0;
    if (balance.closingBalance - days < minRetained) {
      throw new BusinessRuleError(`Policy requires maintaining a minimum balance of ${minRetained} days after encashment.`);
    }

    const balanceBefore = balance.closingBalance;
    const balanceAfter = balanceBefore - days;

    balance.closingBalance = balanceAfter;
    await balance.save();

    await LeaveLedgerEntry.create({
      tenantId,
      employeeId,
      leaveTypeId,
      transactionType: LEAVE_LEDGER_TRANSACTION_TYPE.ENCASHED,
      amount: -days,
      balanceBefore,
      balanceAfter,
      reason: reason || 'Leave encashment on settlement',
      performedBy: actorContext.userId || null
    });

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: employeeId,
      action: AUDIT_ACTION.LEAVE_ENCASHED,
      resourceType: 'LeaveBalance',
      resourceId: balance._id,
      after: { encashedDays: days, balanceAfter, reason }
    });

    return { employeeId, leaveTypeId, encashedDays: days, remainingBalance: balanceAfter };
  }

  /**
   * Bulk Encashment for Multiple Employees (e.g. Exit Batch or Year-End Settlement)
   */
  static async bulkEncashLeave({ tenantId, entityId, leaveTypeId, criteria = {} }, actorContext = {}) {
    const query = { tenantId };
    if (entityId) query.entityId = entityId;
    if (criteria.employmentStatus) query.employmentStatus = criteria.employmentStatus;

    const employees = await Employee.find(query);
    const results = [];

    for (const emp of employees) {
      try {
        const balance = await LeaveBalance.findOne({
          tenantId,
          employeeId: emp._id,
          leaveTypeId,
          year: new Date().getFullYear()
        });

        if (balance && balance.closingBalance > 0) {
          const daysToEncash = criteria.days ? Math.min(criteria.days, balance.closingBalance) : balance.closingBalance;
          if (daysToEncash > 0) {
            const encashed = await LeaveService.encashLeave({
              tenantId,
              employeeId: emp._id,
              leaveTypeId,
              days: daysToEncash,
              reason: criteria.reason || 'Bulk settlement encashment'
            }, actorContext);
            results.push(encashed);
          }
        }
      } catch (e) {
        // Skip employee if policy restrictions prevent encashment
      }
    }

    return { processedCount: results.length, encashments: results };
  }

  /**
   * Auto-Escalation Engine for Pending Approvals
   */
  static async escalatePendingApprovals({ tenantId, actorContext = {} }) {
    const overdueApprovals = await LeaveApproval.find({
      tenantId,
      status: 'PENDING',
      dueAt: { $ne: null, $lt: new Date() }
    }).populate('leaveRequestId');

    const escalated = [];

    for (const app of overdueApprovals) {
      app.status = 'ESCALATED';

      // Find skip-level manager or assign to HR
      const currentApprover = await Employee.findById(app.approverEmployeeId);
      if (currentApprover && currentApprover.managerId) {
        app.escalatedToEmployeeId = currentApprover.managerId;
      }

      await app.save();

      eventEmitter.emit(APP_EVENTS.LEAVE_ESCALATED, app);
      eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
        tenantId,
        actorUserId: actorContext.userId || null,
        action: AUDIT_ACTION.LEAVE_ESCALATED,
        resourceType: 'LeaveApproval',
        resourceId: app._id,
        reason: 'Approval SLA breached; auto-escalated to higher authority'
      });

      escalated.push(app._id);
    }

    return { escalatedCount: escalated.length, approvalIds: escalated };
  }

  /**
   * Leave Approval Delegation
   */
  static async createDelegation(tenantId, delegatorEmployeeId, data, actorContext = {}) {
    const delegateId = data.delegateEmployeeId || data.delegateeEmployeeId;
    if (!delegateId) {
      throw new ValidationError('Delegate employee ID is required.');
    }

    if (delegateId.toString() === delegatorEmployeeId.toString()) {
      throw new ValidationError('Cannot delegate approval authority to yourself.');
    }

    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new ValidationError('Start date cannot be after end date.');
    }

    const delegation = await LeaveApprovalDelegation.create({
      tenantId,
      delegatorEmployeeId,
      delegateEmployeeId: delegateId,
      startDate: data.startDate,
      endDate: data.endDate,
      scope: data.scope || 'LEAVE_APPROVAL',
      reason: data.reason || 'Manager absence delegation',
      status: 'ACTIVE',
      createdBy: actorContext.userId
    });

    eventEmitter.emit(APP_EVENTS.LEAVE_DELEGATED, delegation);
    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: delegatorEmployeeId,
      action: AUDIT_ACTION.LEAVE_DELEGATED,
      resourceType: 'LeaveApprovalDelegation',
      resourceId: delegation._id,
      after: delegation.toObject()
    });

    return delegation;
  }

  static async revokeDelegation(tenantId, delegationId, actorContext = {}) {
    const delegation = await LeaveApprovalDelegation.findOneAndUpdate(
      { _id: delegationId, tenantId },
      { $set: { status: 'REVOKED' } },
      { new: true }
    );
    if (!delegation) throw new NotFoundError('Delegation');

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      action: AUDIT_ACTION.LEAVE_DELEGATION_REVOKED,
      resourceType: 'LeaveApprovalDelegation',
      resourceId: delegation._id
    });

    return delegation;
  }

  static async listDelegations(tenantId, query = {}) {
    return LeaveApprovalDelegation.find({ tenantId, ...query })
      .populate('delegatorEmployeeId delegateEmployeeId')
      .sort({ createdAt: -1 });
  }

  /**
   * Leave Blackout Periods
   */
  static async createBlackoutPeriod(tenantId, data, actorContext = {}) {
    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new ValidationError('Start date cannot be after end date.');
    }

    const blackout = await LeaveBlackoutPeriod.create({
      tenantId,
      entityId: data.entityId,
      departmentId: data.departmentId || null,
      leaveTypeIds: data.leaveTypeIds || [],
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      isActive: data.isActive !== false,
      createdBy: actorContext.userId
    });

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      action: AUDIT_ACTION.LEAVE_BLACKOUT_CREATED,
      resourceType: 'LeaveBlackoutPeriod',
      resourceId: blackout._id,
      after: blackout.toObject()
    });

    return blackout;
  }

  static async listBlackoutPeriods(tenantId, query = {}) {
    return LeaveBlackoutPeriod.find({ tenantId, ...query })
      .populate('leaveTypeIds entityId departmentId')
      .sort({ startDate: 1 });
  }

  /**
   * Team Leave Calendar for Managers
   */
  static async getTeamLeaveCalendar(tenantId, teamEmployeeIds, { startDate, endDate }) {
    const query = {
      tenantId,
      employeeId: { $in: teamEmployeeIds },
      status: { $in: [LEAVE_REQUEST_STATUS.PENDING_APPROVAL, LEAVE_REQUEST_STATUS.APPROVED] }
    };

    if (startDate && endDate) {
      query.$or = [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ];
    }

    return LeaveRequest.find(query)
      .populate('employeeId leaveTypeId')
      .sort({ startDate: 1 });
  }
}
