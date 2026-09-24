import { AttendanceService } from './service.js';
import { AttendanceRecord } from './record.model.js';
import { AttendancePunch } from './punch.model.js';
import { AttendanceRegularisation } from './regularisation.model.js';
import { AttendanceLock } from './lock.model.js';
import { ShiftTemplate } from './shift.model.js';
import { Roster } from './roster.model.js';
import { AttendancePolicy } from './policy.model.js';
import { HolidayCalendar, Holiday } from './holiday.model.js';
import { sendSuccess } from '../../utils/response.js';
import { buildScopeFilter } from '../../middleware/rbac.js';
import { ValidationError } from '../../utils/errors.js';

export class AttendanceController {
  static async punchIn(req, res, next) {
    try {
      if (!req.employeeId) {
        throw new ValidationError('User is not associated with an active Employee record.');
      }
      const { source, latitude, longitude } = req.body;
      const deviceMetadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await AttendanceService.punchIn(req.tenantId, req.employeeId, {
        source,
        latitude,
        longitude,
        deviceMetadata
      });

      return sendSuccess(res, result, 'Clock-in recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async punchOut(req, res, next) {
    try {
      if (!req.employeeId) {
        throw new ValidationError('User is not associated with an active Employee record.');
      }
      const { source, latitude, longitude } = req.body;
      const deviceMetadata = {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      const result = await AttendanceService.punchOut(req.tenantId, req.employeeId, {
        source,
        latitude,
        longitude,
        deviceMetadata
      });

      return sendSuccess(res, result, 'Clock-out recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMyAttendance(req, res, next) {
    try {
      if (!req.employeeId) {
        return sendSuccess(res, [], 'No linked employee profile');
      }
      const { startDate, endDate } = req.query;
      const query = { tenantId: req.tenantId, employeeId: req.employeeId };

      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      const records = await AttendanceRecord.find(query)
        .populate('shiftTemplateId')
        .sort({ date: -1 });

      return sendSuccess(res, records, 'Personal attendance retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getTeamAttendance(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { employeeField: 'employeeId' });
      const { date, startDate, endDate } = req.query;

      if (date) {
        scopeFilter.date = date;
      } else if (startDate && endDate) {
        scopeFilter.date = { $gte: startDate, $lte: endDate };
      }

      const records = await AttendanceRecord.find(scopeFilter)
        .populate('employeeId shiftTemplateId')
        .sort({ date: -1 });

      return sendSuccess(res, records, 'Team attendance retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async listAllAttendance(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, {
        employeeField: 'employeeId',
        entityField: 'entityId'
      });

      const { date, startDate, endDate, employeeId } = req.query;
      if (employeeId) scopeFilter.employeeId = employeeId;
      if (date) scopeFilter.date = date;
      else if (startDate && endDate) scopeFilter.date = { $gte: startDate, $lte: endDate };

      const records = await AttendanceRecord.find(scopeFilter)
        .populate('employeeId shiftTemplateId')
        .sort({ date: -1 })
        .limit(100);

      return sendSuccess(res, records, 'Attendance records retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getEmployeeAttendance(req, res, next) {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;
      const query = { tenantId: req.tenantId, employeeId };

      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      const records = await AttendanceRecord.find(query)
        .populate('shiftTemplateId')
        .sort({ date: -1 });

      return sendSuccess(res, records, 'Employee attendance retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async submitRegularisation(req, res, next) {
    try {
      if (!req.employeeId) throw new ValidationError('No linked employee profile');
      const reg = await AttendanceService.submitRegularisation(req.tenantId, req.employeeId, req.body);
      return sendSuccess(res, reg, 'Regularisation request submitted', 201);
    } catch (err) {
      next(err);
    }
  }

  static async listRegularisations(req, res, next) {
    try {
      const scopeFilter = await buildScopeFilter(req, { employeeField: 'employeeId' });
      if (req.query.status) scopeFilter.status = req.query.status;

      const list = await AttendanceRegularisation.find(scopeFilter)
        .populate('employeeId approverEmployeeId')
        .sort({ createdAt: -1 });

      return sendSuccess(res, list, 'Regularisations retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async approveRegularisation(req, res, next) {
    try {
      const result = await AttendanceService.approveRegularisation(req.tenantId, req.params.id, {
        userId: req.user._id,
        employeeId: req.employeeId,
        comments: req.body.comments
      });
      return sendSuccess(res, result, 'Regularisation approved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async rejectRegularisation(req, res, next) {
    try {
      const result = await AttendanceService.rejectRegularisation(req.tenantId, req.params.id, {
        userId: req.user._id,
        employeeId: req.employeeId,
        comments: req.body.comments
      });
      return sendSuccess(res, result, 'Regularisation rejected');
    } catch (err) {
      next(err);
    }
  }

  static async overrideAttendance(req, res, next) {
    try {
      const { overrideData, reason } = req.body;
      const result = await AttendanceService.overrideAttendance(
        req.tenantId,
        req.params.id,
        overrideData || req.body,
        reason || req.body.reason,
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, result, 'Attendance record overridden with audit trail');
    } catch (err) {
      next(err);
    }
  }

  static async lockAttendance(req, res, next) {
    try {
      const { entityId, year, month, notes } = req.body;
      const lock = await AttendanceService.lockAttendance(
        req.tenantId,
        entityId,
        parseInt(year, 10),
        parseInt(month, 10),
        { userId: req.user._id, employeeId: req.employeeId },
        notes
      );
      return sendSuccess(res, lock, 'Attendance locked successfully for the specified period');
    } catch (err) {
      next(err);
    }
  }

  static async getLocks(req, res, next) {
    try {
      const query = { tenantId: req.tenantId };
      if (req.query.entityId) query.entityId = req.query.entityId;
      const locks = await AttendanceLock.find(query).populate('entityId lockedBy').sort({ year: -1, month: -1 });
      return sendSuccess(res, locks, 'Attendance locks retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async deviceSync(req, res, next) {
    try {
      const { deviceId, punches, deviceMetadata } = req.body;
      const result = await AttendanceService.deviceSync(
        req.tenantId,
        { deviceId, punches, deviceMetadata },
        { userId: req.user._id, employeeId: req.employeeId }
      );
      return sendSuccess(res, result, 'Device punches ingested successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}
