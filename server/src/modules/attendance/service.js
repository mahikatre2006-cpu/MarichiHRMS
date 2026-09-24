import { AttendancePunch } from './punch.model.js';
import { AttendanceRecord } from './record.model.js';
import { ShiftTemplate } from './shift.model.js';
import { Roster } from './roster.model.js';
import { AttendancePolicy } from './policy.model.js';
import { AttendanceRegularisation } from './regularisation.model.js';
import { AttendanceLock } from './lock.model.js';
import { HolidayCalendar, Holiday } from './holiday.model.js';
import { Employee } from '../employees/model.js';
import { Location } from '../locations/model.js';
import { LeaveRequest } from '../leave/request.model.js';
import { validateGeofence } from '../../utils/geofence.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  BusinessRuleError,
  ConflictError
} from '../../utils/errors.js';
import { eventEmitter, APP_EVENTS } from '../../events/eventEmitter.js';
import {
  ATTENDANCE_STATUS,
  PUNCH_TYPE,
  REGULARISATION_STATUS,
  LEAVE_REQUEST_STATUS,
  AUDIT_ACTION
} from '../../constants/enums.js';

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export class AttendanceService {
  /**
   * Enforce attendance lock validation across all mutation paths
   */
  static async assertNotLocked(tenantId, entityId, date) {
    if (!date) return;
    const targetDate = new Date(date);
    const isLocked = await AttendanceLock.findOne({
      tenantId,
      ...(entityId ? { entityId } : {}),
      year: targetDate.getFullYear(),
      month: targetDate.getMonth() + 1,
      status: 'LOCKED'
    });
    if (isLocked) {
      throw new BusinessRuleError('Attendance for this month has been locked by HR. Modifications are strictly prohibited.');
    }
  }

  /**
   * Find applicable shift template for employee on a given date
   */
  static async resolveShiftForEmployee(tenantId, employee, date) {
    const targetDate = new Date(date);

    // 1. Check active roster assignment
    const roster = await Roster.findOne({
      tenantId,
      employeeId: employee._id,
      effectiveFrom: { $lte: targetDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: targetDate } }],
      status: 'ACTIVE'
    }).populate('shiftTemplateId');

    if (roster && roster.shiftTemplateId && roster.shiftTemplateId.isActive) {
      return roster.shiftTemplateId;
    }

    // 2. Fall back to location or entity default shift
    const defaultShift = await ShiftTemplate.findOne({
      tenantId,
      entityId: employee.entityId,
      isActive: true
    }).sort({ locationId: employee.locationId ? -1 : 1 });

    return defaultShift;
  }

  /**
   * Calculate status and minutes for an attendance record given punches and shift
   */
  static calculateAttendanceMetrics(firstIn, lastOut, shift, options = {}) {
    if (!firstIn && !lastOut) {
      return {
        status: options.isHoliday ? ATTENDANCE_STATUS.HOLIDAY : (options.isWeekOff ? ATTENDANCE_STATUS.WEEK_OFF : ATTENDANCE_STATUS.ABSENT),
        totalWorkedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0
      };
    }

    if (options.isOnLeave) {
      return {
        status: ATTENDANCE_STATUS.ON_LEAVE,
        totalWorkedMinutes: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0
      };
    }

    const shiftStartMins = shift ? parseTimeToMinutes(shift.startTime) : 9 * 60;
    let shiftEndMins = shift ? parseTimeToMinutes(shift.endTime) : 18 * 60;
    const isOvernight = shiftEndMins < shiftStartMins;
    if (isOvernight) {
      shiftEndMins += 24 * 60; // adjust to next day
    }
    const lateGrace = shift ? shift.lateGraceMinutes : 15;
    const earlyGrace = shift ? shift.earlyExitGraceMinutes : 15;
    const breakMinutes = shift ? shift.breakMinutes : 60;
    const halfDayThreshold = shift ? shift.halfDayThresholdMinutes : 240;
    const fullDayThreshold = shift ? shift.fullDayThresholdMinutes : 480;

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let totalWorkedMinutes = 0;
    let overtimeMinutes = 0;

    if (firstIn) {
      const inDate = new Date(firstIn);
      const inMins = inDate.getHours() * 60 + inDate.getMinutes();
      // Only calculate late arrival if employee clocked in during active shift hours
      if (inMins > shiftStartMins + lateGrace && inMins <= shiftEndMins) {
        lateMinutes = inMins - shiftStartMins;
      }
    }

    if (lastOut) {
      const outDate = new Date(lastOut);
      let outMins = outDate.getHours() * 60 + outDate.getMinutes();
      if (isOvernight && firstIn && new Date(lastOut).getDate() !== new Date(firstIn).getDate()) {
        outMins += 24 * 60;
      }
      if (outMins < shiftEndMins - earlyGrace && outMins >= shiftStartMins) {
        earlyLeaveMinutes = shiftEndMins - outMins;
      }
    }

    if (firstIn && lastOut) {
      const elapsedMs = new Date(lastOut) - new Date(firstIn);
      const grossMinutes = Math.max(0, Math.floor(elapsedMs / (1000 * 60)));
      // Deduct break only if employee worked 5+ hours (300 mins) or 30m break if 4+ hours
      const breakToDeduct = grossMinutes >= 300 ? breakMinutes : (grossMinutes >= 240 ? Math.min(30, breakMinutes) : 0);
      totalWorkedMinutes = Math.max(0, grossMinutes - breakToDeduct);

      if (totalWorkedMinutes > fullDayThreshold) {
        overtimeMinutes = totalWorkedMinutes - fullDayThreshold;
      }
    }

    let status = ATTENDANCE_STATUS.PRESENT;
    if (totalWorkedMinutes >= fullDayThreshold) {
      status = ATTENDANCE_STATUS.PRESENT;
    } else if (totalWorkedMinutes >= halfDayThreshold) {
      status = ATTENDANCE_STATUS.HALF_DAY;
    } else if (firstIn) {
      // If clocked in (and even if clocked out under 4 hours), record as HALF_DAY rather than cold ABSENT
      status = ATTENDANCE_STATUS.HALF_DAY;
    } else {
      status = ATTENDANCE_STATUS.ABSENT;
    }

    return {
      totalWorkedMinutes,
      lateMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
      status
    };
  }

  /**
   * Web/Mobile Punch In
   */
  static async punchIn(tenantId, employeeId, { source = 'WEB', latitude, longitude, deviceMetadata = {} } = {}) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee || employee.employmentStatus !== 'ACTIVE') {
      throw new ForbiddenError('Only active employees can record attendance punches.');
    }

    // Check Monthly Lock
    await AttendanceService.assertNotLocked(tenantId, employee.entityId, new Date());

    // Duplicate punch debounce (must be at least 60 seconds since last punch in)
    const recentPunchIn = await AttendancePunch.findOne({
      tenantId,
      employeeId,
      type: PUNCH_TYPE.IN
    }).sort({ timestamp: -1 });

    if (recentPunchIn && (Date.now() - new Date(recentPunchIn.timestamp).getTime() < 60000)) {
      throw new ConflictError('Duplicate punch detected. Please wait at least 60 seconds before punching in again.');
    }

    const todayStr = formatDate(new Date());

    // Geofence verification
    let geofenceResult = null;
    const location = await Location.findOne({ _id: employee.locationId, tenantId });
    const policy = await AttendancePolicy.findOne({ tenantId, entityId: employee.entityId, isActive: true });

    if (location && (location.geoFenceEnabled || policy?.requireGeofence)) {
      geofenceResult = validateGeofence(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
        location.geoFenceRadius
      );

      if (policy?.requireGeofence && !geofenceResult.isInside) {
        throw new BusinessRuleError(`Punch outside allowed geofence boundary (${geofenceResult.distanceMeters}m away, allowed: ${geofenceResult.radiusMeters}m).`);
      }
    }

    // Record raw immutable punch
    const punch = await AttendancePunch.create({
      tenantId,
      employeeId,
      type: PUNCH_TYPE.IN,
      source,
      latitude,
      longitude,
      geofenceResult,
      deviceMetadata,
      timestamp: new Date()
    });

    // Resolve shift
    const shift = await AttendanceService.resolveShiftForEmployee(tenantId, employee, new Date());

    // Upsert daily AttendanceRecord
    let record = await AttendanceRecord.findOne({ tenantId, employeeId, date: todayStr });
    if (!record) {
      const metrics = AttendanceService.calculateAttendanceMetrics(punch.timestamp, null, shift);
      record = await AttendanceRecord.create({
        tenantId,
        employeeId,
        date: todayStr,
        shiftTemplateId: shift?._id,
        firstIn: punch.timestamp,
        ...metrics
      });
    } else if (!record.firstIn) {
      record.firstIn = punch.timestamp;
      const metrics = AttendanceService.calculateAttendanceMetrics(record.firstIn, record.lastOut, shift);
      Object.assign(record, metrics);
      await record.save();
    }

    eventEmitter.emit(APP_EVENTS.PUNCH_RECORDED, { punch, record });
    return { punch, record };
  }

  /**
   * Web/Mobile Punch Out
   */
  static async punchOut(tenantId, employeeId, { source = 'WEB', latitude, longitude, deviceMetadata = {} } = {}) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee || employee.employmentStatus !== 'ACTIVE') {
      throw new ForbiddenError('Only active employees can record attendance punches.');
    }

    // Check Monthly Lock
    await AttendanceService.assertNotLocked(tenantId, employee.entityId, new Date());

    // Duplicate punch debounce (must be at least 60 seconds since last punch out)
    const recentPunchOut = await AttendancePunch.findOne({
      tenantId,
      employeeId,
      type: PUNCH_TYPE.OUT
    }).sort({ timestamp: -1 });

    if (recentPunchOut && (Date.now() - new Date(recentPunchOut.timestamp).getTime() < 60000)) {
      throw new ConflictError('Duplicate punch detected. Please wait at least 60 seconds before punching out again.');
    }

    const todayStr = formatDate(new Date());

    // Geofence check
    let geofenceResult = null;
    const location = await Location.findOne({ _id: employee.locationId, tenantId });
    const policy = await AttendancePolicy.findOne({ tenantId, entityId: employee.entityId, isActive: true });

    if (location && (location.geoFenceEnabled || policy?.requireGeofence)) {
      geofenceResult = validateGeofence(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
        location.geoFenceRadius
      );
    }

    // Record raw immutable punch
    const punch = await AttendancePunch.create({
      tenantId,
      employeeId,
      type: PUNCH_TYPE.OUT,
      source,
      latitude,
      longitude,
      geofenceResult,
      deviceMetadata,
      timestamp: new Date()
    });

    const shift = await AttendanceService.resolveShiftForEmployee(tenantId, employee, new Date());

    let record = await AttendanceRecord.findOne({ tenantId, employeeId, date: todayStr });
    if (!record) {
      const metrics = AttendanceService.calculateAttendanceMetrics(null, punch.timestamp, shift);
      record = await AttendanceRecord.create({
        tenantId,
        employeeId,
        date: todayStr,
        shiftTemplateId: shift?._id,
        lastOut: punch.timestamp,
        ...metrics
      });
    } else {
      record.lastOut = punch.timestamp;
      if (!record.isOverridden) {
        const metrics = AttendanceService.calculateAttendanceMetrics(record.firstIn, record.lastOut, shift);
        Object.assign(record, metrics);
      }
      await record.save();
    }

    eventEmitter.emit(APP_EVENTS.PUNCH_RECORDED, { punch, record });
    return { punch, record };
  }

  /**
   * Attendance Regularisation Request by Employee
   */
  static async submitRegularisation(tenantId, employeeId, data) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) throw new NotFoundError('Employee');

    // Enforce Monthly Lock on requested date
    await AttendanceService.assertNotLocked(tenantId, employee.entityId, data.date);

    const reg = await AttendanceRegularisation.create({
      tenantId,
      employeeId,
      date: data.date,
      requestedFirstIn: data.requestedFirstIn,
      requestedLastOut: data.requestedLastOut,
      reason: data.reason,
      status: REGULARISATION_STATUS.PENDING_APPROVAL
    });

    eventEmitter.emit(APP_EVENTS.REGULARISATION_SUBMITTED, reg);
    return reg;
  }

  /**
   * Regularisation Approval by Manager or HR
   */
  static async approveRegularisation(tenantId, regId, approverContext) {
    const reg = await AttendanceRegularisation.findOne({ _id: regId, tenantId });
    if (!reg) throw new NotFoundError('Regularisation request');

    if (reg.status !== REGULARISATION_STATUS.PENDING_APPROVAL) {
      throw new BusinessRuleError(`Regularisation is already ${reg.status.toLowerCase()}`);
    }

    const employee = await Employee.findOne({ _id: reg.employeeId, tenantId });

    // Enforce Monthly Lock on regularisation date
    await AttendanceService.assertNotLocked(tenantId, employee?.entityId, reg.date);

    reg.status = REGULARISATION_STATUS.APPROVED;
    reg.approverEmployeeId = approverContext.employeeId;
    reg.approverUserId = approverContext.userId;
    reg.approverComments = approverContext.comments || 'Approved';
    reg.actionedAt = new Date();
    await reg.save();

    // Recalculate attendance record for the date
    const shift = await AttendanceService.resolveShiftForEmployee(tenantId, employee, new Date(reg.date));

    let record = await AttendanceRecord.findOne({ tenantId, employeeId: reg.employeeId, date: reg.date });
    const metrics = AttendanceService.calculateAttendanceMetrics(reg.requestedFirstIn, reg.requestedLastOut, shift);

    if (!record) {
      record = await AttendanceRecord.create({
        tenantId,
        employeeId: reg.employeeId,
        date: reg.date,
        shiftTemplateId: shift?._id,
        firstIn: reg.requestedFirstIn,
        lastOut: reg.requestedLastOut,
        ...metrics
      });
    } else {
      record.firstIn = reg.requestedFirstIn;
      record.lastOut = reg.requestedLastOut;
      Object.assign(record, metrics);
      await record.save();
    }

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: approverContext.userId,
      actorEmployeeId: approverContext.employeeId,
      action: AUDIT_ACTION.REGULARISATION_APPROVED,
      resourceType: 'AttendanceRegularisation',
      resourceId: reg._id,
      after: reg.toObject()
    });

    return reg;
  }

  /**
   * Regularisation Rejection by Manager or HR
   */
  static async rejectRegularisation(tenantId, regId, approverContext) {
    const reg = await AttendanceRegularisation.findOne({ _id: regId, tenantId });
    if (!reg) throw new NotFoundError('Regularisation request');

    if (reg.status !== REGULARISATION_STATUS.PENDING_APPROVAL) {
      throw new BusinessRuleError(`Regularisation is already ${reg.status.toLowerCase()}`);
    }

    reg.status = REGULARISATION_STATUS.REJECTED;
    reg.approverEmployeeId = approverContext.employeeId;
    reg.approverUserId = approverContext.userId;
    reg.approverComments = approverContext.comments || 'Rejected';
    reg.actionedAt = new Date();
    await reg.save();

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: approverContext.userId,
      actorEmployeeId: approverContext.employeeId,
      action: AUDIT_ACTION.REGULARISATION_REJECTED,
      resourceType: 'AttendanceRegularisation',
      resourceId: reg._id,
      after: reg.toObject()
    });

    return reg;
  }

  /**
   * HR Override with mandatory audit reason
   */
  static async overrideAttendance(tenantId, recordId, overrideData, reason, actorContext) {
    if (!reason || !reason.trim()) {
      throw new ValidationError('A mandatory reason is required for HR attendance overrides.');
    }

    const before = await AttendanceRecord.findOne({ _id: recordId, tenantId });
    if (!before) throw new NotFoundError('Attendance record');

    const employee = await Employee.findOne({ _id: before.employeeId, tenantId });

    // Enforce Monthly Lock on override date
    await AttendanceService.assertNotLocked(tenantId, employee?.entityId, before.date);

    const updated = await AttendanceRecord.findOneAndUpdate(
      { _id: recordId, tenantId },
      {
        $set: {
          ...overrideData,
          isOverridden: true,
          overrideReason: reason.trim(),
          overriddenBy: actorContext.userId,
          overriddenAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.ATTENDANCE_OVERRIDE,
      resourceType: 'AttendanceRecord',
      resourceId: recordId,
      before: before.toObject(),
      after: updated.toObject(),
      reason
    });

    return updated;
  }

  /**
   * Monthly Attendance Locking
   */
  static async lockAttendance(tenantId, entityId, year, month, actorContext, notes = '') {
    const existing = await AttendanceLock.findOne({ tenantId, entityId, year, month });
    if (existing && existing.status === 'LOCKED') {
      throw new ConflictError(`Attendance for ${year}-${String(month).padStart(2, '0')} is already locked.`);
    }

    const lock = await AttendanceLock.findOneAndUpdate(
      { tenantId, entityId, year, month },
      {
        $set: {
          status: 'LOCKED',
          lockedBy: actorContext.userId,
          lockedAt: new Date(),
          notes
        }
      },
      { upsert: true, new: true }
    );

    // Lock all attendance records for this month and entity
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const employeesInEntity = await Employee.find({ tenantId, entityId }).select('_id');
    const employeeIds = employeesInEntity.map(e => e._id);

    await AttendanceRecord.updateMany(
      {
        tenantId,
        employeeId: { $in: employeeIds },
        date: { $gte: startDateStr, $lte: endDateStr }
      },
      { $set: { isLocked: true } }
    );

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId,
      actorEmployeeId: actorContext.employeeId,
      action: AUDIT_ACTION.ATTENDANCE_LOCKED,
      resourceType: 'AttendanceLock',
      resourceId: lock._id,
      after: lock.toObject()
    });

    return lock;
  }

  /**
   * Recalculate daily attendance status and metrics
   */
  static async recalculateDailyAttendance(tenantId, employeeId, dateStr) {
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) return null;

    // Check if on approved leave
    const onLeave = await LeaveRequest.findOne({
      tenantId,
      employeeId,
      status: LEAVE_REQUEST_STATUS.APPROVED,
      startDate: { $lte: dateStr },
      endDate: { $gte: dateStr }
    });
    if (onLeave) {
      return AttendanceRecord.findOneAndUpdate(
        { tenantId, employeeId, date: dateStr },
        { $set: { status: ATTENDANCE_STATUS.ON_LEAVE, leaveRequestId: onLeave._id } },
        { upsert: true, new: true }
      );
    }

    // Check if Holiday
    const holiday = await Holiday.findOne({ tenantId, date: dateStr });
    if (holiday) {
      return AttendanceRecord.findOneAndUpdate(
        { tenantId, employeeId, date: dateStr },
        { $set: { status: ATTENDANCE_STATUS.HOLIDAY } },
        { upsert: true, new: true }
      );
    }

    // Check shift working days (WEEK_OFF)
    const shift = await AttendanceService.resolveShiftForEmployee(tenantId, employee, new Date(dateStr));
    const dayOfWeek = new Date(dateStr).getUTCDay();
    const isWeekOff = shift?.workingDays && !shift.workingDays.includes(dayOfWeek);

    // Get all punches on this date
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    const punches = await AttendancePunch.find({
      tenantId,
      employeeId,
      timestamp: { $gte: dayStart, $lte: dayEnd }
    }).sort({ timestamp: 1 });

    if (punches.length === 0) {
      const defaultStatus = isWeekOff ? ATTENDANCE_STATUS.WEEK_OFF : ATTENDANCE_STATUS.ABSENT;
      return AttendanceRecord.findOneAndUpdate(
        { tenantId, employeeId, date: dateStr },
        { $set: { status: defaultStatus, shiftTemplateId: shift?._id } },
        { upsert: true, new: true }
      );
    }

    const firstIn = punches.find(p => p.type === 'IN')?.timestamp || punches[0].timestamp;
    const lastOut = [...punches].reverse().find(p => p.type === 'OUT')?.timestamp || null;

    const metrics = AttendanceService.calculateAttendanceMetrics(firstIn, lastOut, shift);
    return AttendanceRecord.findOneAndUpdate(
      { tenantId, employeeId, date: dateStr },
      {
        $set: {
          shiftTemplateId: shift?._id,
          firstIn,
          lastOut,
          ...metrics
        }
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Biometric / QR / NFC / Device Sync Ingestion
   */
  static async deviceSync(tenantId, { deviceId, punches = [], deviceMetadata = {} }, actorContext = {}) {
    if (!Array.isArray(punches) || punches.length === 0) {
      throw new ValidationError('Punches array is required.');
    }

    const createdPunches = [];

    for (const p of punches) {
      if (!p.employeeCode && !p.employeeId) continue;

      let employee;
      if (p.employeeId) {
        employee = await Employee.findOne({ _id: p.employeeId, tenantId });
      } else {
        employee = await Employee.findOne({ employeeCode: p.employeeCode.toUpperCase(), tenantId });
      }

      if (!employee || employee.employmentStatus !== 'ACTIVE') continue;

      const punchType = (p.type || p.punchType || 'IN').toUpperCase();
      const punchSource = (p.source || 'BIOMETRIC').toUpperCase();
      const timestamp = p.timestamp ? new Date(p.timestamp) : new Date();

      // Idempotency: check if rawEventId has already been ingested
      if (p.rawEventId) {
        const existingPunch = await AttendancePunch.findOne({ tenantId, rawEventId: p.rawEventId });
        if (existingPunch) {
          createdPunches.push(existingPunch);
          continue;
        }
      }

      const punch = await AttendancePunch.create({
        tenantId,
        employeeId: employee._id,
        type: punchType,
        source: punchSource,
        timestamp,
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        rawEventId: p.rawEventId || null,
        deviceMetadata: {
          deviceId,
          ...deviceMetadata,
          ...(p.deviceMetadata || {})
        }
      });

      createdPunches.push(punch);
      const dateStr = formatDate(timestamp);
      await AttendanceService.recalculateDailyAttendance(tenantId, employee._id, dateStr);
    }

    eventEmitter.emit(APP_EVENTS.AUDIT_LOG, {
      tenantId,
      actorUserId: actorContext.userId || null,
      action: AUDIT_ACTION.PUNCH_CREATED,
      resourceType: 'AttendancePunch',
      resourceId: tenantId,
      reason: `Device sync completed: ${createdPunches.length} punches ingested from ${deviceId || 'device'}`
    });

    return { ingestedCount: createdPunches.length, punches: createdPunches };
  }
}
