import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { Modal } from '../../components/Modal.jsx';
import { ArrowRight } from 'lucide-react';

export function EmployeePortal() {
  const { employee } = useAuth();

  // State
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Geolocation
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState('');

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    durationUnit: 'FULL_DAY',
    isHalfDay: false,
    halfDaySession: 'FIRST_HALF',
    hoursRequested: 2,
    reason: '',
    attachmentMetadata: {
      fileName: '',
      fileType: 'application/pdf',
      fileSize: 102400,
    },
  });

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedFirstIn: '09:00',
    requestedLastOut: '18:00',
    reason: '',
  });

  // Digital clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser geolocation
  const detectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setGeoError('');
        },
        () => {
          setGeoError('GPS unavailable or permission denied. Defaulting to standard web punch.');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attRes, balRes, typesRes] = await Promise.all([
        api.get('/attendance/me'),
        api.get('/leave/balances/me'),
        api.get('/leave/types'),
      ]);

      const records = attRes.data.data || [];
      setAttendanceRecords(records);

      const todayStr = new Date().toISOString().split('T')[0];
      const today = records.find((r) => r.date === todayStr);
      setTodayRecord(today || null);

      setLeaveBalances(balRes.data.data || []);
      const activeTypes = (typesRes.data.data || []).filter((t) => t.isActive);
      setLeaveTypes(activeTypes);
      if (activeTypes.length > 0 && !leaveForm.leaveTypeId) {
        setLeaveForm((prev) => ({ ...prev, leaveTypeId: activeTypes[0]._id }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePunch = async (type) => {
    setActionLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const endpoint = type === 'IN' ? '/attendance/punch/in' : '/attendance/punch/out';
      const payload = {
        source: 'WEB',
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };
      await api.post(endpoint, payload);
      setMsg({ type: 'success', text: `Punch recorded: Clock-${type.toLowerCase()} logged.` });
      await fetchData();
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.error?.message || `Clock-${type.toLowerCase()} failed`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const payload = {
        leaveTypeId: leaveForm.leaveTypeId,
        startDate: leaveForm.startDate,
        endDate:
          leaveForm.durationUnit === 'HOURLY' || leaveForm.durationUnit === 'HALF_DAY'
            ? leaveForm.startDate
            : leaveForm.endDate,
        durationUnit: leaveForm.durationUnit,
        isHalfDay: leaveForm.durationUnit === 'HALF_DAY',
        halfDaySession: leaveForm.halfDaySession,
        hoursRequested:
          leaveForm.durationUnit === 'HOURLY' ? Number(leaveForm.hoursRequested) : undefined,
        reason: leaveForm.reason,
      };
      if (leaveForm.attachmentMetadata.fileName) {
        payload.attachmentMetadata = leaveForm.attachmentMetadata;
      }
      await api.post('/leave/requests', payload);
      setIsLeaveModalOpen(false);
      setMsg({ type: 'success', text: 'Leave request dispatched for managerial review.' });
      await fetchData();
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to submit leave request',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyReg = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const inDate = new Date(`${regForm.date}T${regForm.requestedFirstIn}:00`);
      const outDate = new Date(`${regForm.date}T${regForm.requestedLastOut}:00`);

      await api.post('/attendance/regularisations', {
        date: regForm.date,
        requestedFirstIn: inDate,
        requestedLastOut: outDate,
        reason: regForm.reason,
      });
      setIsRegModalOpen(false);
      setMsg({
        type: 'success',
        text: 'Attendance regularisation dispatched for managerial approval.',
      });
    } catch (err) {
      setMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to submit regularisation',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 selection:bg-[#191919] selection:text-white">
      {/* Alert Messages */}
      {msg.text && (
        <div
          className={`p-3.5 rounded-md text-xs font-medium border ${
            msg.type === 'success'
              ? 'bg-[#F4F3F3] border-gray-300 text-[#191919]'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Top Presence & Leave Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presence Card */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#191919]/50">
                Today's Presence
              </span>
              <span className="text-xs font-mono text-[#191919]/60">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="my-6 text-center">
              <div className="text-4xl font-normal tracking-tight text-[#191919] font-mono">
                {currentTime}
              </div>
              <div className="text-[11px] text-[#191919]/50 mt-1.5">
                {coords ? 'Office Geofence Active (GPS Verified)' : 'Standard Web Punch Active'}
              </div>
            </div>

            {/* Status Details */}
            <div className="bg-[#F4F3F3] p-4 rounded-md text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-[#191919]/60">First In:</span>
                <span className="font-mono text-[#191919]">
                  {todayRecord?.firstIn
                    ? new Date(todayRecord.firstIn).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#191919]/60">Last Out:</span>
                <span className="font-mono text-[#191919]">
                  {todayRecord?.lastOut
                    ? new Date(todayRecord.lastOut).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200/80 pt-2">
                <span className="text-[#191919]/60">Shift Status:</span>
                <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[#191919]">
                  {todayRecord?.firstIn && !todayRecord?.lastOut
                    ? 'CLOCKED IN'
                    : todayRecord?.firstIn && todayRecord?.lastOut
                    ? 'CLOCKED OUT'
                    : 'NOT CLOCKED IN'}
                </span>
              </div>
              {todayRecord?.firstIn && (
                <div className="flex justify-between text-[11px] text-[#191919]/60 pt-1">
                  <span>Tracked Time:</span>
                  <span className="font-mono font-medium text-[#191919]">
                    {(() => {
                      let m = todayRecord.totalWorkedMinutes;
                      if (!m && todayRecord.lastOut) {
                        m = Math.max(
                          1,
                          Math.round(
                            (new Date(todayRecord.lastOut) - new Date(todayRecord.firstIn)) /
                              60000
                          )
                        );
                      }
                      if (!m) return 'Under 1 min';
                      return m >= 60 ? `${(m / 60).toFixed(1)} hrs` : `${m} mins`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Punch Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePunch('IN')}
              disabled={actionLoading || Boolean(todayRecord?.firstIn && !todayRecord?.lastOut)}
              className="w-full py-2.5 px-4 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Clock In
            </button>
            <button
              onClick={() => handlePunch('OUT')}
              disabled={
                actionLoading ||
                !todayRecord?.firstIn ||
                Boolean(todayRecord?.firstIn && todayRecord?.lastOut)
              }
              className="w-full py-2.5 px-4 bg-[#F4F3F3] hover:bg-[#eaeaea] text-[#191919] border border-gray-200 rounded-md text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Clock Out
            </button>
          </div>
        </div>

        {/* Leave Balances Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#191919]/50 block">
                  Statutory Allocations
                </span>
                <h3 className="font-serif text-xl font-normal text-[#191919] tracking-tight mt-0.5">
                  Leave Entitlements
                </h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsRegModalOpen(true)}
                  className="px-3 py-1.5 bg-[#F4F3F3] hover:bg-[#eaeaea] text-[#191919] rounded-md text-xs font-medium transition-colors border border-gray-200"
                >
                  Regularise
                </button>
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <span>Apply Leave</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/80" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {leaveBalances.length === 0 ? (
                <div className="col-span-3 p-6 text-center text-xs text-[#191919]/40 bg-[#F4F3F3] rounded-md">
                  Loading statutory leave balance entitlements...
                </div>
              ) : (
                leaveBalances.map((b) => (
                  <div
                    key={b._id}
                    className="p-4 rounded-md bg-[#F4F3F3] border border-gray-200/80"
                  >
                    <div className="text-xs font-medium text-[#191919] truncate">
                      {b.leaveTypeId?.name || 'Leave'}
                    </div>
                    <div className="text-3xl font-serif font-normal text-[#191919] mt-2">
                      {b.closingBalance}{' '}
                      <span className="text-xs font-sans text-[#191919]/50 font-normal">
                        days
                      </span>
                    </div>
                    <div className="mt-3 text-[11px] text-[#191919]/60 flex justify-between border-t border-gray-200 pt-2">
                      <span>Annual: {b.allocated || b.accrued}</span>
                      <span>Availed: {b.used || b.availed || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Profile Meta */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-[#191919]/60 gap-3">
            <div>
              <span className="text-[#191919]/40 mr-1.5">Code:</span>
              <span className="font-mono text-[#191919]">{employee?.employeeCode || '—'}</span>
            </div>
            <div>
              <span className="text-[#191919]/40 mr-1.5">Department:</span>
              <span className="text-[#191919]">{employee?.departmentId?.name || '—'}</span>
            </div>
            <div>
              <span className="text-[#191919]/40 mr-1.5">Location:</span>
              <span className="text-[#191919]">{employee?.locationId?.name || '—'}</span>
            </div>
            <div>
              <span className="text-[#191919]/40 mr-1.5">Reporting Manager:</span>
              <span className="text-[#191919]">
                {employee?.managerId?.displayName || 'Direct HR'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">
              Attendance Timesheet
            </h3>
            <p className="text-xs text-[#191919]/50 mt-0.5">
              Verified daily work hours and punch records
            </p>
          </div>
          <span className="text-xs font-mono text-[#191919]/40">Last 30 days</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191919]">
            <thead className="bg-[#F4F3F3] text-[11px] font-medium uppercase tracking-wider text-[#191919]/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Clock In</th>
                <th className="px-6 py-3 font-medium">Clock Out</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Arrival Status</th>
                <th className="px-6 py-3 font-medium">Day Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                    No attendance records found. Clock in to record today's presence.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((r) => {
                  let displayDuration = '—';
                  let mins = r.totalWorkedMinutes;
                  if (!mins && r.firstIn && r.lastOut) {
                    mins = Math.max(
                      1,
                      Math.round((new Date(r.lastOut) - new Date(r.firstIn)) / 60000)
                    );
                  }
                  if (mins) {
                    displayDuration = mins >= 60 ? `${(mins / 60).toFixed(1)} hrs` : `${mins} mins`;
                  }

                  let punctualityLabel = 'On Time';
                  let punctualityCls = 'text-[#191919]/60';
                  if (r.lateMinutes > 0 && r.lateMinutes <= 180) {
                    punctualityLabel =
                      r.lateMinutes < 60
                        ? `${r.lateMinutes}m late`
                        : `${Math.floor(r.lateMinutes / 60)}h ${r.lateMinutes % 60}m late`;
                    punctualityCls = 'text-[#191919] font-medium';
                  } else if (r.lateMinutes > 180 || !r.firstIn) {
                    punctualityLabel = '—';
                    punctualityCls = 'text-[#191919]/40';
                  }

                  return (
                    <tr key={r._id} className="hover:bg-[#F4F3F3]/60 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-[#191919]">{r.date}</td>
                      <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                        {r.firstIn
                          ? new Date(r.firstIn).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                        {r.lastOut
                          ? new Date(r.lastOut).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-medium text-[#191919]">
                        {displayDuration}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={punctualityCls}>{punctualityLabel}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded-xs text-[10px] font-mono border border-gray-200 bg-[#F4F3F3] text-[#191919]">
                          {r.status === 'ABSENT' && r.firstIn
                            ? 'PARTIAL'
                            : r.status
                            ? r.status.replace('_', ' ')
                            : 'NOT RECORDED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply for Leave"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Leave Type
            </label>
            <select
              value={leaveForm.leaveTypeId}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              required
            >
              {leaveTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.isPaid ? '(Paid)' : '(Unpaid)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Duration
            </label>
            <select
              value={leaveForm.durationUnit}
              onChange={(e) =>
                setLeaveForm({
                  ...leaveForm,
                  durationUnit: e.target.value,
                  isHalfDay: e.target.value === 'HALF_DAY',
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
            >
              <option value="FULL_DAY">Full Day</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="HOURLY">Hourly (Short Leave)</option>
            </select>
          </div>

          {leaveForm.durationUnit === 'HALF_DAY' && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
                Half Day Session
              </label>
              <select
                value={leaveForm.halfDaySession}
                onChange={(e) => setLeaveForm({ ...leaveForm, halfDaySession: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              >
                <option value="FIRST_HALF">First Half (Morning)</option>
                <option value="SECOND_HALF">Second Half (Afternoon)</option>
              </select>
            </div>
          )}

          {leaveForm.durationUnit === 'HOURLY' && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
                Hours Requested (1-4 hrs)
              </label>
              <input
                type="number"
                min="1"
                max="4"
                value={leaveForm.hoursRequested}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, hoursRequested: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Supporting Document (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. medical_certificate.pdf"
              value={leaveForm.attachmentMetadata.fileName}
              onChange={(e) =>
                setLeaveForm({
                  ...leaveForm,
                  attachmentMetadata: {
                    ...leaveForm.attachmentMetadata,
                    fileName: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Reason for Leave
            </label>
            <textarea
              required
              rows={3}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              placeholder="Please provide details for review..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-medium hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-medium hover:bg-[#191919]/90 disabled:opacity-50"
            >
              {actionLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Regularise Attendance Modal */}
      <Modal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        title="Submit Attendance Regularisation"
      >
        <form onSubmit={handleApplyReg} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Date to Regularise
            </label>
            <input
              type="date"
              required
              value={regForm.date}
              onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
                Requested Clock In
              </label>
              <input
                type="time"
                required
                value={regForm.requestedFirstIn}
                onChange={(e) => setRegForm({ ...regForm, requestedFirstIn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
                Requested Clock Out
              </label>
              <input
                type="time"
                required
                value={regForm.requestedLastOut}
                onChange={(e) => setRegForm({ ...regForm, requestedLastOut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Reason
            </label>
            <textarea
              required
              rows={3}
              value={regForm.reason}
              onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              placeholder="e.g. Biometric machine glitch, client on-site visit..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsRegModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-medium hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-medium hover:bg-[#191919]/90 disabled:opacity-50"
            >
              {actionLoading ? 'Submitting...' : 'Submit Regularisation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EmployeePortal;
