import { Router } from 'express';
import { ShiftTemplate } from './shift.model.js';
import { Roster } from './roster.model.js';
import { AttendancePolicy } from './policy.model.js';
import { HolidayCalendar, Holiday } from './holiday.model.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

const router = Router();
router.use(authenticate);

// --- SHIFTS ---
router.get('/shifts', authorize(PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.entityId) query.entityId = req.query.entityId;
    const shifts = await ShiftTemplate.find(query).sort({ name: 1 });
    return sendSuccess(res, shifts, 'Shifts retrieved');
  } catch (err) { next(err); }
});

router.post('/shifts', authorize(PERMISSIONS.SHIFT_MANAGE), async (req, res, next) => {
  try {
    const shift = await ShiftTemplate.create({ ...req.body, tenantId: req.tenantId });
    return sendSuccess(res, shift, 'Shift created successfully', 201);
  } catch (err) { next(err); }
});

router.patch('/shifts/:id', authorize(PERMISSIONS.SHIFT_MANAGE), async (req, res, next) => {
  try {
    const shift = await ShiftTemplate.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!shift) throw new NotFoundError('Shift');
    return sendSuccess(res, shift, 'Shift updated successfully');
  } catch (err) { next(err); }
});

// --- ROSTERS ---
router.get('/rosters', authorize(PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.employeeId) query.employeeId = req.query.employeeId;
    const rosters = await Roster.find(query).populate('employeeId shiftTemplateId').sort({ effectiveFrom: -1 });
    return sendSuccess(res, rosters, 'Rosters retrieved');
  } catch (err) { next(err); }
});

router.post('/rosters', authorize(PERMISSIONS.ROSTER_MANAGE), async (req, res, next) => {
  try {
    const roster = await Roster.create({ ...req.body, tenantId: req.tenantId, assignedBy: req.user._id });
    return sendSuccess(res, roster, 'Roster assigned successfully', 201);
  } catch (err) { next(err); }
});

router.patch('/rosters/:id', authorize(PERMISSIONS.ROSTER_MANAGE), async (req, res, next) => {
  try {
    const roster = await Roster.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!roster) throw new NotFoundError('Roster');
    return sendSuccess(res, roster, 'Roster updated successfully');
  } catch (err) { next(err); }
});

// --- ATTENDANCE POLICIES ---
router.get('/attendance-policies', authorize(PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.entityId) query.entityId = req.query.entityId;
    const policies = await AttendancePolicy.find(query);
    return sendSuccess(res, policies, 'Attendance policies retrieved');
  } catch (err) { next(err); }
});

router.post('/attendance-policies', authorize(PERMISSIONS.ATTENDANCE_POLICY_MANAGE), async (req, res, next) => {
  try {
    const policy = await AttendancePolicy.create({ ...req.body, tenantId: req.tenantId });
    return sendSuccess(res, policy, 'Attendance policy created successfully', 201);
  } catch (err) { next(err); }
});

router.patch('/attendance-policies/:id', authorize(PERMISSIONS.ATTENDANCE_POLICY_MANAGE), async (req, res, next) => {
  try {
    const policy = await AttendancePolicy.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!policy) throw new NotFoundError('Attendance policy');
    return sendSuccess(res, policy, 'Attendance policy updated successfully');
  } catch (err) { next(err); }
});

// --- HOLIDAY CALENDARS & HOLIDAYS ---
router.get('/holiday-calendars', authorize(PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.year) query.year = parseInt(req.query.year, 10);
    const calendars = await HolidayCalendar.find(query).populate('entityId locationId');
    return sendSuccess(res, calendars, 'Holiday calendars retrieved');
  } catch (err) { next(err); }
});

router.post('/holiday-calendars', authorize(PERMISSIONS.HOLIDAY_MANAGE), async (req, res, next) => {
  try {
    const calendar = await HolidayCalendar.create({ ...req.body, tenantId: req.tenantId });
    return sendSuccess(res, calendar, 'Holiday calendar created successfully', 201);
  } catch (err) { next(err); }
});

router.get('/holidays', authorize(PERMISSIONS.ATTENDANCE_READ), async (req, res, next) => {
  try {
    const query = { tenantId: req.tenantId };
    if (req.query.holidayCalendarId) query.holidayCalendarId = req.query.holidayCalendarId;
    const holidays = await Holiday.find(query).sort({ date: 1 });
    return sendSuccess(res, holidays, 'Holidays retrieved');
  } catch (err) { next(err); }
});

router.post('/holidays', authorize(PERMISSIONS.HOLIDAY_MANAGE), async (req, res, next) => {
  try {
    const holiday = await Holiday.create({ ...req.body, tenantId: req.tenantId });
    return sendSuccess(res, holiday, 'Holiday added successfully', 201);
  } catch (err) { next(err); }
});

export default router;
