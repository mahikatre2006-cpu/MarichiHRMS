import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Modal } from '../../components/Modal.jsx';
import { ArrowRight, Check, X } from 'lucide-react';

export function ManagerPortal() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [pendingRegularisations, setPendingRegularisations] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [teamCalendar, setTeamCalendar] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState({ type: '', text: '' });

  // Action comment modal state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: '', // 'APPROVE_LEAVE', 'REJECT_LEAVE', 'APPROVE_REG', 'REJECT_REG'
    id: null,
    title: '',
    comments: '',
  });

  // Delegation modal state
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [delegationForm, setDelegationForm] = useState({
    delegateeEmployeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
  });

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0)
        .toISOString()
        .split('T')[0];

      const [leaveRes, regRes, attRes, empRes, calRes, delRes] = await Promise.all([
        api.get('/leave/requests?status=PENDING_APPROVAL'),
        api.get('/attendance/regularisations?status=PENDING_APPROVAL'),
        api.get(`/attendance/team?date=${todayStr}`),
        api.get('/employees?limit=50'),
        api
          .get(`/leave/team-calendar?startDate=${startMonth}&endDate=${endMonth}`)
          .catch(() => ({ data: { data: [] } })),
        api.get('/leave/delegations').catch(() => ({ data: { data: [] } })),
      ]);

      setPendingLeaveRequests(leaveRes.data.data || []);
      setPendingRegularisations(regRes.data.data || []);
      setTeamAttendance(attRes.data.data || []);
      setTeamMembers(empRes.data.data || []);
      setTeamCalendar(calRes.data.data || []);
      setDelegations(delRes.data.data || []);
    } catch {
      setBannerMsg({ type: 'error', text: 'Failed to load manager queue' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, []);

  const openActionModal = (type, id, title) => {
    setActionModal({
      isOpen: true,
      type,
      id,
      title,
      comments: '',
    });
  };

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setBannerMsg({ type: '', text: '' });

    try {
      if (actionModal.type === 'APPROVE_LEAVE') {
        await api.post(`/leave/requests/${actionModal.id}/approve`, {
          comments: actionModal.comments,
        });
        setBannerMsg({ type: 'success', text: 'Leave request approved.' });
      } else if (actionModal.type === 'REJECT_LEAVE') {
        await api.post(`/leave/requests/${actionModal.id}/reject`, {
          comments: actionModal.comments,
        });
        setBannerMsg({ type: 'success', text: 'Leave request rejected.' });
      } else if (actionModal.type === 'APPROVE_REG') {
        await api.patch(`/attendance/regularisations/${actionModal.id}/approve`, {
          comments: actionModal.comments,
        });
        setBannerMsg({
          type: 'success',
          text: 'Regularisation approved and attendance recalculated.',
        });
      } else if (actionModal.type === 'REJECT_REG') {
        await api.patch(`/attendance/regularisations/${actionModal.id}/reject`, {
          comments: actionModal.comments,
        });
        setBannerMsg({ type: 'success', text: 'Regularisation request rejected.' });
      }

      setActionModal({ isOpen: false, type: '', id: null, title: '', comments: '' });
      await fetchManagerData();
    } catch (err) {
      setBannerMsg({ type: 'error', text: err.response?.data?.error?.message || 'Action failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDelegation = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setBannerMsg({ type: '', text: '' });
    try {
      await api.post('/leave/delegations', delegationForm);
      setBannerMsg({ type: 'success', text: 'Approval delegation established.' });
      setIsDelegationModalOpen(false);
      setDelegationForm({
        delegateeEmployeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: '',
      });
      await fetchManagerData();
    } catch (err) {
      setBannerMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to create delegation',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeDelegation = async (id) => {
    setActionLoading(true);
    setBannerMsg({ type: '', text: '' });
    try {
      await api.delete(`/leave/delegations/${id}`);
      setBannerMsg({ type: 'success', text: 'Delegation revoked successfully.' });
      await fetchManagerData();
    } catch (err) {
      setBannerMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to revoke delegation',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const presentCount = teamAttendance.filter(
    (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
  ).length;
  const onLeaveCount = teamAttendance.filter((a) => a.status === 'ON_LEAVE').length;

  return (
    <div className="space-y-8 selection:bg-[#191919] selection:text-white">
      {/* Feedback Banner */}
      {bannerMsg.text && (
        <div
          className={`p-3.5 rounded-md text-xs font-medium border ${
            bannerMsg.type === 'success'
              ? 'bg-[#F4F3F3] border-gray-300 text-[#191919]'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {bannerMsg.text}
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#F4F3F3] p-5 rounded-lg border border-gray-200">
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#191919]/50">
            Team Scope
          </div>
          <div className="text-3xl font-serif font-normal text-[#191919] mt-2">
            {teamMembers.length}
          </div>
          <div className="text-xs text-[#191919]/60 mt-1">Managed Employees</div>
        </div>

        <div className="bg-[#F4F3F3] p-5 rounded-lg border border-gray-200">
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#191919]/50">
            Present Today
          </div>
          <div className="text-3xl font-serif font-normal text-[#191919] mt-2">
            {presentCount}
          </div>
          <div className="text-xs text-[#191919]/60 mt-1">Clocked In</div>
        </div>

        <div className="bg-[#F4F3F3] p-5 rounded-lg border border-gray-200">
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#191919]/50">
            On Leave
          </div>
          <div className="text-3xl font-serif font-normal text-[#191919] mt-2">
            {onLeaveCount}
          </div>
          <div className="text-xs text-[#191919]/60 mt-1">Approved Leaves</div>
        </div>

        <div className="bg-[#F4F3F3] p-5 rounded-lg border border-gray-200">
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#191919]/50">
            Pending Queue
          </div>
          <div className="text-3xl font-serif font-normal text-[#191919] mt-2">
            {pendingLeaveRequests.length + pendingRegularisations.length}
          </div>
          <div className="text-xs text-[#191919]/60 mt-1">Awaiting Decision</div>
        </div>
      </div>

      {/* Today's Team Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">
              Today's Team Attendance
            </h3>
            <p className="text-xs text-[#191919]/50 mt-0.5">
              Presence verification for direct and indirect reports
            </p>
          </div>
          <span className="text-xs font-mono text-[#191919]/60">
            {presentCount} / {teamMembers.length} Present
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191919]">
            <thead className="bg-[#F4F3F3] text-[11px] font-medium uppercase tracking-wider text-[#191919]/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Clock In</th>
                <th className="px-6 py-3 font-medium">Clock Out</th>
                <th className="px-6 py-3 font-medium">Hours Worked</th>
                <th className="px-6 py-3 font-medium">Arrival</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                    No team members currently assigned under your reporting hierarchy.
                  </td>
                </tr>
              ) : (
                teamMembers.map((emp) => {
                  const record = teamAttendance.find(
                    (a) => (a.employeeId?._id || a.employeeId) === emp._id
                  );
                  let displayDuration = '—';
                  let mins = record?.totalWorkedMinutes;
                  if (!mins && record?.firstIn && record?.lastOut) {
                    mins = Math.max(
                      1,
                      Math.round(
                        (new Date(record.lastOut) - new Date(record.firstIn)) / 60000
                      )
                    );
                  }
                  if (mins) {
                    displayDuration = mins >= 60 ? `${(mins / 60).toFixed(1)} hrs` : `${mins} mins`;
                  }

                  let punctualityLabel = 'On Time';
                  let punctualityCls = 'text-[#191919]/60';
                  if (record?.lateMinutes > 0 && record?.lateMinutes <= 180) {
                    punctualityLabel =
                      record.lateMinutes < 60
                        ? `${record.lateMinutes}m late`
                        : `${Math.floor(record.lateMinutes / 60)}h ${record.lateMinutes % 60}m late`;
                    punctualityCls = 'text-[#191919] font-medium';
                  } else if (record?.lateMinutes > 180 || !record?.firstIn) {
                    punctualityLabel = '—';
                    punctualityCls = 'text-[#191919]/40';
                  }

                  const isClockedIn = record?.firstIn && !record?.lastOut;
                  const isClockedOut = record?.firstIn && record?.lastOut;

                  return (
                    <tr key={emp._id} className="hover:bg-[#F4F3F3]/60 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-[#191919]">
                        <div>{emp.displayName}</div>
                        <div className="text-[11px] text-[#191919]/40 font-mono font-normal">
                          {emp.designation || emp.employeeCode}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                        {record?.firstIn
                          ? new Date(record.firstIn).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                        {record?.lastOut
                          ? new Date(record.lastOut).toLocaleTimeString([], {
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
                          {isClockedIn
                            ? 'CLOCKED IN'
                            : isClockedOut
                            ? 'CLOCKED OUT'
                            : record?.status === 'ON_LEAVE'
                            ? 'ON LEAVE'
                            : 'NOT CLOCKED IN'}
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

      {/* Pending Leave Requests Queue */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">
              Pending Leave Approvals
            </h3>
            <p className="text-xs text-[#191919]/50 mt-0.5">
              Review requests requiring managerial approval
            </p>
          </div>
          <span className="text-xs font-mono text-[#191919]/60">
            {pendingLeaveRequests.length} Pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191919]">
            <thead className="bg-[#F4F3F3] text-[11px] font-medium uppercase tracking-wider text-[#191919]/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Leave Type</th>
                <th className="px-6 py-3 font-medium">Period</th>
                <th className="px-6 py-3 font-medium">Days</th>
                <th className="px-6 py-3 font-medium">Reason</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingLeaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                    No pending leave approval requests in your team queue.
                  </td>
                </tr>
              ) : (
                pendingLeaveRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-[#F4F3F3]/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-[#191919]">
                      <div>{req.employeeId?.displayName || 'Employee'}</div>
                      <div className="text-[11px] text-[#191919]/40 font-mono">
                        {req.employeeId?.employeeCode}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-[#191919]">{req.leaveTypeId?.name}</span>
                      {req.isLwp && (
                        <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 bg-[#F4F3F3] border border-gray-200 rounded">
                          LWP
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                      {req.startDate} to {req.endDate}
                    </td>
                    <td className="px-6 py-3.5 font-mono font-medium">
                      {req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-[#191919]/70">
                      {req.reason}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() =>
                          openActionModal(
                            'APPROVE_LEAVE',
                            req._id,
                            `Approve Leave for ${req.employeeId?.displayName}`
                          )
                        }
                        className="px-3 py-1 bg-[#191919] text-white rounded-md text-xs font-medium hover:bg-[#191919]/90 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          openActionModal(
                            'REJECT_LEAVE',
                            req._id,
                            `Reject Leave for ${req.employeeId?.displayName}`
                          )
                        }
                        className="px-3 py-1 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-medium hover:bg-[#F4F3F3] transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Attendance Regularisations Queue */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">
              Attendance Regularisation Queue
            </h3>
            <p className="text-xs text-[#191919]/50 mt-0.5">
              Review punch corrections and adjustments
            </p>
          </div>
          <span className="text-xs font-mono text-[#191919]/60">
            {pendingRegularisations.length} Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191919]">
            <thead className="bg-[#F4F3F3] text-[11px] font-medium uppercase tracking-wider text-[#191919]/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Requested In</th>
                <th className="px-6 py-3 font-medium">Requested Out</th>
                <th className="px-6 py-3 font-medium">Reason</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingRegularisations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                    No regularisation requests pending approval.
                  </td>
                </tr>
              ) : (
                pendingRegularisations.map((reg) => (
                  <tr key={reg._id} className="hover:bg-[#F4F3F3]/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-[#191919]">
                      <div>{reg.employeeId?.displayName || 'Employee'}</div>
                      <div className="text-[11px] text-[#191919]/40 font-mono">
                        {reg.employeeId?.employeeCode}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono">{reg.date}</td>
                    <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                      {new Date(reg.requestedFirstIn).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                      {new Date(reg.requestedLastOut).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-[#191919]/70">
                      {reg.reason}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() =>
                          openActionModal(
                            'APPROVE_REG',
                            reg._id,
                            `Approve Regularisation for ${reg.employeeId?.displayName}`
                          )
                        }
                        className="px-3 py-1 bg-[#191919] text-white rounded-md text-xs font-medium hover:bg-[#191919]/90 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          openActionModal(
                            'REJECT_REG',
                            reg._id,
                            `Reject Regularisation for ${reg.employeeId?.displayName}`
                          )
                        }
                        className="px-3 py-1 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-medium hover:bg-[#F4F3F3] transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Leave Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">
              Team Leave Calendar
            </h3>
            <p className="text-xs text-[#191919]/50 mt-0.5">
              Scheduled leaves across your department
            </p>
          </div>
          <span className="text-xs font-mono text-[#191919]/60">
            {teamCalendar.length} Scheduled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191919]">
            <thead className="bg-[#F4F3F3] text-[11px] font-medium uppercase tracking-wider text-[#191919]/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium">Employee</th>
                <th className="px-6 py-3 font-medium">Leave Type</th>
                <th className="px-6 py-3 font-medium">Dates</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teamCalendar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                    No scheduled leaves for your team in this window.
                  </td>
                </tr>
              ) : (
                teamCalendar.map((item) => (
                  <tr key={item._id} className="hover:bg-[#F4F3F3]/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-[#191919]">
                      <div>{item.employeeId?.displayName || 'Team Member'}</div>
                      <div className="text-[11px] text-[#191919]/40 font-normal">
                        {item.employeeId?.designation}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-[#191919]">{item.leaveTypeId?.name}</span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                      {item.startDate} to {item.endDate}
                    </td>
                    <td className="px-6 py-3.5 font-mono">
                      {item.durationUnit === 'HOURLY'
                        ? `${item.hoursRequested || 2} hrs`
                        : `${item.totalDays} day(s)`}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded border border-gray-200 bg-[#F4F3F3] text-[#191919]">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Delegations Management */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">
              Approval Delegations
            </h3>
            <p className="text-xs text-[#191919]/50 mt-0.5">
              Out-of-office delegation to peers or substitute managers
            </p>
          </div>
          <button
            onClick={() => setIsDelegationModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>Delegate Approvals</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191919]">
            <thead className="bg-[#F4F3F3] text-[11px] font-medium uppercase tracking-wider text-[#191919]/60 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium">Delegated To</th>
                <th className="px-6 py-3 font-medium">Period</th>
                <th className="px-6 py-3 font-medium">Reason</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {delegations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                    No active approval delegations. Click "Delegate Approvals" if you are taking leave.
                  </td>
                </tr>
              ) : (
                delegations.map((del) => (
                  <tr key={del._id} className="hover:bg-[#F4F3F3]/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-[#191919]">
                      <div>{del.delegateeEmployeeId?.displayName || 'Delegate'}</div>
                      <div className="text-[11px] text-[#191919]/40 font-mono">
                        {del.delegateeEmployeeId?.email}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[#191919]/80">
                      {del.startDate} to {del.endDate}
                    </td>
                    <td className="px-6 py-3.5 text-[#191919]/70 max-w-xs truncate">
                      {del.reason || 'Out of office delegation'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded border border-gray-200 bg-[#F4F3F3] text-[#191919]">
                        {del.isActive ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {del.isActive && (
                        <button
                          onClick={() => handleRevokeDelegation(del._id)}
                          className="px-2.5 py-1 text-xs text-[#191919]/60 hover:text-[#191919] hover:bg-[#F4F3F3] rounded transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Action Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.title}
      >
        <form onSubmit={handleExecuteAction} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Comments / Decision Notes (Required for rejection)
            </label>
            <textarea
              required={actionModal.type.includes('REJECT')}
              rows={3}
              value={actionModal.comments}
              onChange={(e) => setActionModal({ ...actionModal, comments: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              placeholder="Enter decision rationale..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setActionModal({ ...actionModal, isOpen: false })}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-medium hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-medium hover:bg-[#191919]/90 disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delegation Modal */}
      <Modal
        isOpen={isDelegationModalOpen}
        onClose={() => setIsDelegationModalOpen(false)}
        title="Delegate Approval Authority"
      >
        <form onSubmit={handleCreateDelegation} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Delegate To (Peer / Substitute Manager)
            </label>
            <select
              required
              value={delegationForm.delegateeEmployeeId}
              onChange={(e) =>
                setDelegationForm({ ...delegationForm, delegateeEmployeeId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
            >
              <option value="">Select an employee...</option>
              {teamMembers.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.displayName} ({emp.designation || 'Staff'})
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
                value={delegationForm.startDate}
                onChange={(e) =>
                  setDelegationForm({ ...delegationForm, startDate: e.target.value })
                }
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
                value={delegationForm.endDate}
                onChange={(e) =>
                  setDelegationForm({ ...delegationForm, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1">
              Delegation Reason / Notes
            </label>
            <textarea
              required
              rows={3}
              value={delegationForm.reason}
              onChange={(e) => setDelegationForm({ ...delegationForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs bg-white text-[#191919] focus:outline-hidden focus:border-[#191919]"
              placeholder="e.g. Taking annual leave, delegating team leave approvals."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsDelegationModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-medium hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-medium hover:bg-[#191919]/90 disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Authorize Delegation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ManagerPortal;
