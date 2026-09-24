import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { Modal } from '../../components/Modal.jsx';
import {
  Building2,
  Users,
  Shield,
  Clock,
  Calendar,
  FileCheck,
  PlusCircle,
  Search,
  Lock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Play,
  DollarSign,
  Ban
} from 'lucide-react';

export function AdminPortal() {
  const [activeTab, setActiveTab] = useState('employees'); // employees, org, users, attendance, leave, audit
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState({ type: '', text: '' });

  // Data states
  const [employees, setEmployees] = useState([]);
  const [entities, setEntities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    firstName: '',
    lastName: '',
    employeeCode: '',
    email: '',
    phone: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    entityId: '',
    departmentId: '',
    locationId: '',
    managerId: ''
  });

  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    entityId: '',
    managerId: ''
  });

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locForm, setLocForm] = useState({
    name: '',
    code: '',
    entityId: '',
    city: '',
    state: '',
    country: 'IND',
    geoFenceRadius: 300,
    geoFenceEnabled: false
  });

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockForm, setLockForm] = useState({
    entityId: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    notes: ''
  });

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    amount: 1,
    reason: ''
  });

  const [blackoutPeriods, setBlackoutPeriods] = useState([]);
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [blackoutForm, setBlackoutForm] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: ''
  });

  const [isEncashModalOpen, setIsEncashModalOpen] = useState(false);
  const [encashForm, setEncashForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    days: 1,
    reason: ''
  });

  const [viewAuditModal, setViewAuditModal] = useState({ isOpen: false, log: null });

  // Initial load
  useEffect(() => {
    loadHierarchy();
  }, []);

  useEffect(() => {
    if (activeTab === 'employees') loadEmployees();
    if (activeTab === 'org') loadHierarchy();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'attendance') loadAttendanceConfig();
    if (activeTab === 'leave') loadLeaveConfig();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  const loadHierarchy = async () => {
    try {
      const [entRes, deptRes, locRes] = await Promise.all([
        api.get('/entities'),
        api.get('/departments'),
        api.get('/locations')
      ]);
      setEntities(entRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setLocations(locRes.data.data || []);

      if (entRes.data.data?.length > 0 && !empForm.entityId) {
        setEmpForm(prev => ({
          ...prev,
          entityId: entRes.data.data[0]._id,
          departmentId: deptRes.data.data?.[0]?._id || '',
          locationId: locRes.data.data?.[0]?._id || ''
        }));
        setLockForm(prev => ({ ...prev, entityId: entRes.data.data[0]._id }));
      }
    } catch { /* ignore */ }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees?limit=50');
      setEmployees(res.data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const [uRes, rRes] = await Promise.all([api.get('/users'), api.get('/roles')]);
      setUsers(uRes.data.data || []);
      setRoles(rRes.data.data || []);
    } catch { /* ignore */ }
  };

  const loadAttendanceConfig = async () => {
    try {
      const res = await api.get('/shifts');
      setShifts(res.data.data || []);
    } catch { /* ignore */ }
  };

  const loadLeaveConfig = async () => {
    try {
      const [typesRes, blackoutsRes] = await Promise.all([
        api.get('/leave/types'),
        api.get('/leave/blackouts').catch(() => ({ data: { data: [] } }))
      ]);
      setLeaveTypes(typesRes.data.data || []);
      setBlackoutPeriods(blackoutsRes.data.data || []);
      if (typesRes.data.data?.length > 0 && !adjustForm.leaveTypeId) {
        setAdjustForm(prev => ({ ...prev, leaveTypeId: typesRes.data.data[0]._id }));
        setEncashForm(prev => ({ ...prev, leaveTypeId: typesRes.data.data[0]._id }));
      }
    } catch { /* ignore */ }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs?limit=50');
      setAuditLogs(res.data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    const payload = {
      ...empForm,
      entityId: empForm.entityId || entities[0]?._id,
      departmentId: empForm.departmentId || departments[0]?._id,
      locationId: empForm.locationId || locations[0]?._id,
      managerId: empForm.managerId || null
    };

    if (!payload.entityId || !payload.departmentId || !payload.locationId) {
      setBanner({ type: 'error', text: 'Please ensure Legal Entity, Department, and Location exist before adding employees.' });
      return;
    }

    try {
      await api.post('/employees', payload);
      setBanner({ type: 'success', text: 'Employee profile created successfully!' });
      setIsEmpModalOpen(false);
      setEmpForm({
        firstName: '',
        lastName: '',
        employeeCode: '',
        email: '',
        phone: '',
        designation: '',
        joiningDate: new Date().toISOString().split('T')[0],
        entityId: entities[0]?._id || '',
        departmentId: departments[0]?._id || '',
        locationId: locations[0]?._id || '',
        managerId: ''
      });
      loadEmployees();
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create employee' });
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    try {
      await api.post('/departments', {
        ...deptForm,
        code: deptForm.code.toUpperCase(),
        entityId: deptForm.entityId || entities[0]?._id,
        managerId: deptForm.managerId || null
      });
      setBanner({ type: 'success', text: `Department / Team '${deptForm.name}' created successfully!` });
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '', entityId: entities[0]?._id || '', managerId: '' });
      loadHierarchy();
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create department' });
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    try {
      await api.post('/locations', {
        name: locForm.name,
        code: locForm.code.toUpperCase(),
        entityId: locForm.entityId || entities[0]?._id,
        address: {
          city: locForm.city,
          state: locForm.state,
          country: locForm.country || 'IND'
        },
        geoFenceRadius: Number(locForm.geoFenceRadius) || 300,
        geoFenceEnabled: Boolean(locForm.geoFenceEnabled),
        timezone: 'Asia/Kolkata'
      });
      setBanner({ type: 'success', text: `Location / Branch '${locForm.name}' created successfully!` });
      setIsLocModalOpen(false);
      setLocForm({ name: '', code: '', entityId: entities[0]?._id || '', city: '', state: '', country: 'IND', geoFenceRadius: 300, geoFenceEnabled: false });
      loadHierarchy();
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create location' });
    }
  };

  const handleLockAttendance = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    try {
      await api.post('/attendance/locks', lockForm);
      setBanner({ type: 'success', text: `Attendance locked for ${lockForm.year}-${String(lockForm.month).padStart(2, '0')}!` });
      setIsLockModalOpen(false);
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to lock attendance' });
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    try {
      await api.post('/leave/balances/adjust', adjustForm);
      setBanner({ type: 'success', text: 'Leave balance adjusted with immutable ledger entry!' });
      setIsAdjustModalOpen(false);
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to adjust balance' });
    }
  };

  const handleCreateBlackout = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    try {
      await api.post('/leave/blackouts', blackoutForm);
      setBanner({ type: 'success', text: 'Leave blackout period created successfully!' });
      setIsBlackoutModalOpen(false);
      loadLeaveConfig();
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create blackout period' });
    }
  };

  const handleEncashLeave = async (e) => {
    e.preventDefault();
    setBanner({ type: '', text: '' });
    try {
      await api.post('/leave/encash', encashForm);
      setBanner({ type: 'success', text: 'Leave balance encashed and ledger updated!' });
      setIsEncashModalOpen(false);
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to encash leave' });
    }
  };

  const handleTriggerAccruals = async () => {
    if (!window.confirm('Run monthly leave accruals for all active employees?')) return;
    setBanner({ type: '', text: '' });
    try {
      const now = new Date();
      const res = await api.post('/leave/accruals/run', { year: now.getFullYear(), month: now.getMonth() + 1 });
      setBanner({ type: 'success', text: `Monthly accrual job complete! Processed: ${res.data.data?.accruedCount || 0}` });
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to run accruals' });
    }
  };

  const handleTriggerCarryForward = async () => {
    if (!window.confirm('Run year-end carry forward & expiry process?')) return;
    setBanner({ type: '', text: '' });
    try {
      const now = new Date();
      const res = await api.post('/leave/carry-forward/run', { year: now.getFullYear() });
      setBanner({ type: 'success', text: `Carry-forward job complete! Processed: ${res.data.data?.processedCount || 0}` });
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to run carry forward' });
    }
  };

  const handleTriggerEscalations = async () => {
    setBanner({ type: '', text: '' });
    try {
      const res = await api.post('/leave/escalations/run');
      setBanner({ type: 'success', text: `Approval SLA scan complete! Escalated: ${res.data.data?.escalatedCount || 0}` });
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.error?.message || 'Failed to run escalations' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      {banner.text && (
        <div className={`p-4 rounded-md text-sm font-medium flex items-center space-x-2 ${
          banner.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {banner.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Admin Module Tabs */}
      <div className="bg-[#F4F3F3] rounded-md p-1 flex flex-wrap gap-1">
        {[
          { id: 'employees', label: 'Employees', icon: Users },
          { id: 'org', label: 'Org Hierarchy', icon: Building2 },
          { id: 'users', label: 'Users & Roles', icon: Shield },
          { id: 'attendance', label: 'Attendance & Locking', icon: Clock },
          { id: 'leave', label: 'Leave & Balances', icon: Calendar },
          { id: 'audit', label: 'Audit Logs', icon: FileCheck }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-[#191919] shadow-xs'
                  : 'text-[#191919]/60 hover:text-[#191919]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">Employee Directory</h3>
            <button
              onClick={() => setIsEmpModalOpen(true)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-md text-xs font-semibold shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#191919]/70">
              <thead className="bg-[#F4F3F3] text-xs font-semibold text-[#191919]/60 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Designation</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Manager</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-xs text-[#191919]/40">
                      No employee profiles found. Click "+ Add Employee" to onboard your first team member.
                    </td>
                  </tr>
                ) : (
                  employees.map(emp => (
                    <tr key={emp._id} className="hover:bg-[#F4F3F3]/80 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-[#191919]">{emp.employeeCode}</td>
                      <td className="px-6 py-3.5 font-semibold text-[#191919]">{emp.displayName}</td>
                      <td className="px-6 py-3.5">{emp.designation}</td>
                      <td className="px-6 py-3.5">{emp.departmentId?.name || '—'}</td>
                      <td className="px-6 py-3.5">{emp.locationId?.name || '—'}</td>
                      <td className="px-6 py-3.5">{emp.managerId?.displayName || 'Direct HR'}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {emp.employmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ORG HIERARCHY */}
      {activeTab === 'org' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider mb-4">Legal Entities</h4>
            <div className="space-y-3">
              {entities.map(e => (
                <div key={e._id} className="p-3 bg-[#F4F3F3] rounded-md border border-gray-200">
                  <div className="font-bold text-[#191919] text-sm">{e.name}</div>
                  <div className="text-xs text-[#191919]/60 mt-0.5">Code: {e.code} | Country: {e.country} | Currency: {e.currency}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider">Departments & Teams</h4>
              <button
                onClick={() => setIsDeptModalOpen(true)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Team</span>
              </button>
            </div>
            <div className="space-y-3">
              {departments.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#191919]/40">No departments added yet.</div>
              ) : (
                departments.map(d => (
                  <div key={d._id} className="p-3 bg-[#F4F3F3] rounded-md border border-gray-200">
                    <div className="font-bold text-[#191919] text-sm">{d.name}</div>
                    <div className="text-xs text-[#191919]/60 mt-0.5">Code: {d.code}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider">Locations & Geofences</h4>
              <button
                onClick={() => setIsLocModalOpen(true)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Location</span>
              </button>
            </div>
            <div className="space-y-3">
              {locations.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#191919]/40">No locations added yet.</div>
              ) : (
                locations.map(l => (
                  <div key={l._id} className="p-3 bg-[#F4F3F3] rounded-md border border-gray-200">
                    <div className="font-bold text-[#191919] text-sm">{l.name}</div>
                    <div className="text-xs text-[#191919]/60 mt-0.5">
                      Radius: {l.geoFenceRadius}m | Enabled: {l.geoFenceEnabled ? 'Yes' : 'No'}
                    </div>
                    {l.latitude && (
                      <div className="text-[11px] text-[#191919]/40 font-mono mt-0.5">
                        {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider mb-4">User Accounts</h4>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u._id} className="p-3 bg-[#F4F3F3] rounded-md border border-gray-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[#191919] text-sm">{u.email}</div>
                    <div className="text-xs text-[#191919]/60 mt-0.5">
                      Roles: {u.roles?.map(r => r.name).join(', ') || 'None'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {u.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider mb-4">Configured Roles</h4>
            <div className="space-y-3">
              {roles.map(r => (
                <div key={r._id} className="p-3 bg-[#F4F3F3] rounded-md border border-gray-200">
                  <div className="font-bold text-[#191919] text-sm flex items-center justify-between">
                    <span>{r.name}</span>
                    {r.isSystem && <span className="text-[10px] bg-slate-200 text-[#191919]/80 px-2 py-0.5 rounded-full font-bold">SYSTEM</span>}
                  </div>
                  <div className="text-xs text-[#191919]/60 mt-1">{r.description}</div>
                  <div className="text-xs text-[#191919] mt-1 font-semibold">{r.permissions?.length || 0} permissions assigned</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ATTENDANCE & LOCKING */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200 flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-[#191919]">Monthly Attendance Locking</h4>
              <p className="text-xs text-[#191919]/60 mt-0.5">
                Locking an entity's monthly cutoff prevents silent edits and protects payroll-ready attendance records.
              </p>
            </div>
            <button
              onClick={() => setIsLockModalOpen(true)}
              className="inline-flex items-center space-x-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Attendance Month</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider mb-4">Active Shift Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shifts.map(s => (
                <div key={s._id} className="p-4 bg-[#F4F3F3] rounded-md border border-gray-200">
                  <div className="font-bold text-[#191919] text-sm">{s.name} ({s.code})</div>
                  <div className="text-xs text-[#191919]/70 mt-1 font-mono">Hours: {s.startTime} to {s.endTime} | Break: {s.breakMinutes}m</div>
                  <div className="text-xs text-[#191919]/60 mt-1">Grace periods: Late {s.lateGraceMinutes}m / Early exit {s.earlyExitGraceMinutes}m</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LEAVE & BALANCES */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-[#191919]">Leave Policies & Batch Operations</h4>
              <p className="text-xs text-[#191919]/60 mt-0.5">
                Trigger automated accruals, process year-end carry forward, encash balances, or record ledger adjustments.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTriggerAccruals}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Accruals</span>
              </button>
              <button
                onClick={handleTriggerCarryForward}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Carry Forward</span>
              </button>
              <button
                onClick={handleTriggerEscalations}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Run Escalations</span>
              </button>
              <button
                onClick={() => setIsEncashModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Encash Leave</span>
              </button>
              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#191919] hover:bg-[#191919]/90 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Adjust Balance</span>
              </button>
            </div>
          </div>

          {/* Configured Leave Types */}
          <div className="bg-white p-6 rounded-lg shadow-xs border border-gray-200">
            <h4 className="text-xs font-bold text-[#191919]/60 uppercase tracking-wider mb-4">Configured Leave Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaveTypes.map(lt => (
                <div key={lt._id} className="p-4 bg-[#F4F3F3] rounded-md border border-gray-200">
                  <div className="font-bold text-[#191919] text-sm">{lt.name}</div>
                  <div className="text-xs text-[#191919]/60 mt-1">Code: {lt.code} | Category: {lt.category}</div>
                  <div className="text-xs font-semibold mt-2">
                    {lt.isPaid ? <span className="text-emerald-700">Paid Leave</span> : <span className="text-rose-700">Unpaid (LWP)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blackout Periods */}
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">Leave Blackout Periods</h3>
              </div>
              <button
                onClick={() => setIsBlackoutModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Blackout Period</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#191919]/70">
                <thead className="bg-[#F4F3F3] text-xs font-semibold text-[#191919]/60 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {blackoutPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-xs text-[#191919]/40">
                        No blackout periods configured. Leaves can be requested freely according to standard policies.
                      </td>
                    </tr>
                  ) : (
                    blackoutPeriods.map((bp) => (
                      <tr key={bp._id} className="hover:bg-[#F4F3F3]/80 transition">
                        <td className="px-6 py-3.5 font-bold text-[#191919]">{bp.name}</td>
                        <td className="px-6 py-3.5 text-xs font-mono">{bp.startDate} to {bp.endDate}</td>
                        <td className="px-6 py-3.5 text-xs text-[#191919]/60 max-w-xs truncate">{bp.description || '—'}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                            bp.isActive ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#F4F3F3] text-[#191919]/70'
                          }`}>
                            {bp.isActive ? 'ENFORCED' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">Tamper-Resistant Audit Trail</h3>
            <span className="text-xs text-[#191919]/40">Total entries: {auditLogs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#191919]/70">
              <thead className="bg-[#F4F3F3] text-xs font-semibold text-[#191919]/60 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Resource</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map(log => (
                  <tr key={log._id} className="hover:bg-[#F4F3F3]/80 transition">
                    <td className="px-6 py-3 text-xs font-mono text-[#191919]/60">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-[#191919] text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-[#F4F3F3] text-[#191919] border border-gray-200 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {log.resourceType} ({log.resourceId?.slice(-6)})
                    </td>
                    <td className="px-6 py-3 text-xs font-medium">
                      {log.actorUserId?.email || 'System'}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      <button
                        onClick={() => setViewAuditModal({ isOpen: true, log })}
                        className="text-[#191919] hover:underline font-semibold"
                      >
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        isOpen={isEmpModalOpen}
        onClose={() => setIsEmpModalOpen(false)}
        title="Add New Employee"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">First Name</label>
              <input
                required
                type="text"
                value={empForm.firstName}
                onChange={e => setEmpForm({ ...empForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Last Name</label>
              <input
                required
                type="text"
                value={empForm.lastName}
                onChange={e => setEmpForm({ ...empForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Employee Code</label>
              <input
                required
                type="text"
                placeholder="EMP100"
                value={empForm.employeeCode}
                onChange={e => setEmpForm({ ...empForm, employeeCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Work Email</label>
              <input
                required
                type="email"
                value={empForm.email}
                onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Designation</label>
              <input
                required
                type="text"
                placeholder="Software Engineer"
                value={empForm.designation}
                onChange={e => setEmpForm({ ...empForm, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Joining Date</label>
              <input
                required
                type="date"
                value={empForm.joiningDate}
                onChange={e => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Entity</label>
              <select
                required
                value={empForm.entityId}
                onChange={e => setEmpForm({ ...empForm, entityId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Department</label>
              <select
                required
                value={empForm.departmentId}
                onChange={e => setEmpForm({ ...empForm, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Location</label>
              <select
                required
                value={empForm.locationId}
                onChange={e => setEmpForm({ ...empForm, locationId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Reporting Manager (Optional)</label>
            <select
              value={empForm.managerId}
              onChange={e => setEmpForm({ ...empForm, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="">None (Direct Reporting to HR)</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.displayName} ({emp.designation})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEmpModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#191919]/90"
            >
              Create Employee Profile
            </button>
          </div>
        </form>
      </Modal>

      {/* Lock Monthly Attendance Modal */}
      <Modal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        title="Lock Monthly Attendance"
      >
        <form onSubmit={handleLockAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Entity</label>
            <select
              required
              value={lockForm.entityId}
              onChange={e => setLockForm({ ...lockForm, entityId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Year</label>
              <input
                type="number"
                required
                value={lockForm.year}
                onChange={e => setLockForm({ ...lockForm, year: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Month (1-12)</label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={lockForm.month}
                onChange={e => setLockForm({ ...lockForm, month: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Notes / Reason for Lock</label>
            <textarea
              rows={2}
              value={lockForm.notes}
              onChange={e => setLockForm({ ...lockForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="Payroll cutoff lock for this month..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsLockModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold shadow-xs hover:bg-rose-700"
            >
              Confirm Month Lock
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Leave Balance Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Manual Leave Balance Adjustment"
      >
        <form onSubmit={handleAdjustBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Employee</label>
            <select
              required
              value={adjustForm.employeeId}
              onChange={e => setAdjustForm({ ...adjustForm, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.displayName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Leave Type</label>
              <select
                required
                value={adjustForm.leaveTypeId}
                onChange={e => setAdjustForm({ ...adjustForm, leaveTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {leaveTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Amount (+/- days)</label>
              <input
                type="number"
                step="0.5"
                required
                value={adjustForm.amount}
                onChange={e => setAdjustForm({ ...adjustForm, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Reason for Adjustment</label>
            <textarea
              required
              rows={2}
              value={adjustForm.reason}
              onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="e.g. Compensatory credit for weekend deployment"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#191919]/90"
            >
              Record Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Inspect Audit Log Diff Modal */}
      <Modal
        isOpen={viewAuditModal.isOpen}
        onClose={() => setViewAuditModal({ isOpen: false, log: null })}
        title={`Audit Entry: ${viewAuditModal.log?.action}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-3 text-xs font-mono">
          <div><strong>Resource:</strong> {viewAuditModal.log?.resourceType} ({viewAuditModal.log?.resourceId})</div>
          <div><strong>Actor:</strong> {viewAuditModal.log?.actorUserId?.email || 'System'}</div>
          <div><strong>IP Address:</strong> {viewAuditModal.log?.ipAddress || 'Internal'}</div>
          <div><strong>Reason:</strong> {viewAuditModal.log?.reason || 'None specified'}</div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <div className="font-bold text-[#191919]/60 mb-1 uppercase tracking-wider">Before Change</div>
              <pre className="p-3 bg-slate-900 text-[#F4F3F3] rounded-md overflow-x-auto max-h-60 text-[11px]">
                {JSON.stringify(viewAuditModal.log?.before || {}, null, 2)}
              </pre>
            </div>
            <div>
              <div className="font-bold text-[#191919]/60 mb-1 uppercase tracking-wider">After Change</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-md overflow-x-auto max-h-60 text-[11px]">
                {JSON.stringify(viewAuditModal.log?.after || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Blackout Period Modal */}
      <Modal
        isOpen={isBlackoutModalOpen}
        onClose={() => setIsBlackoutModalOpen(false)}
        title="Create Leave Blackout Period"
      >
        <form onSubmit={handleCreateBlackout} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Blackout Name</label>
            <input
              type="text"
              required
              value={blackoutForm.name}
              onChange={e => setBlackoutForm({ ...blackoutForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="e.g. Q4 Financial Year-End Close"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={blackoutForm.startDate}
                onChange={e => setBlackoutForm({ ...blackoutForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">End Date</label>
              <input
                type="date"
                required
                value={blackoutForm.endDate}
                onChange={e => setBlackoutForm({ ...blackoutForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Reason / Description</label>
            <textarea
              rows={2}
              value={blackoutForm.description}
              onChange={e => setBlackoutForm({ ...blackoutForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="All non-emergency leaves restricted during critical operational cutoff."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsBlackoutModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded-md text-xs font-semibold shadow-xs hover:bg-rose-700"
            >
              Enforce Blackout
            </button>
          </div>
        </form>
      </Modal>

      {/* Encash Leave Modal */}
      <Modal
        isOpen={isEncashModalOpen}
        onClose={() => setIsEncashModalOpen(false)}
        title="Encash Employee Leave Balance"
      >
        <form onSubmit={handleEncashLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Employee</label>
            <select
              required
              value={encashForm.employeeId}
              onChange={e => setEncashForm({ ...encashForm, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.displayName} ({emp.employeeCode})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Leave Type</label>
              <select
                required
                value={encashForm.leaveTypeId}
                onChange={e => setEncashForm({ ...encashForm, leaveTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {leaveTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Days to Encash</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={encashForm.days}
                onChange={e => setEncashForm({ ...encashForm, days: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Encashment Reason / Notes</label>
            <textarea
              required
              rows={2}
              value={encashForm.reason}
              onChange={e => setEncashForm({ ...encashForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="e.g. Annual policy encashment or full & final settlement balance payout"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEncashModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-md text-xs font-semibold shadow-xs hover:bg-teal-700"
            >
              Confirm Encashment
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Department / Team Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Department / Functional Team"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Department / Team Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Engineering, Sales, Human Resources"
              value={deptForm.name}
              onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Code</label>
              <input
                required
                type="text"
                placeholder="ENG"
                value={deptForm.code}
                onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Legal Entity</label>
              <select
                required
                value={deptForm.entityId || entities[0]?._id}
                onChange={e => setDeptForm({ ...deptForm, entityId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Department Head / Manager (Optional)</label>
            <select
              value={deptForm.managerId}
              onChange={e => setDeptForm({ ...deptForm, managerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="">None (Assigned Later)</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.displayName} ({emp.designation})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#191919]/90"
            >
              Create Team
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Location / Branch Modal */}
      <Modal
        isOpen={isLocModalOpen}
        onClose={() => setIsLocModalOpen(false)}
        title="Add Location / Branch Office"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Branch / Location Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Bangalore Headquarters"
                value={locForm.name}
                onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Branch Code</label>
              <input
                required
                type="text"
                placeholder="BLR-01"
                value={locForm.code}
                onChange={e => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">City</label>
              <input
                required
                type="text"
                placeholder="Bengaluru"
                value={locForm.city}
                onChange={e => setLocForm({ ...locForm, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">State</label>
              <input
                required
                type="text"
                placeholder="Karnataka"
                value={locForm.state}
                onChange={e => setLocForm({ ...locForm, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Country</label>
              <input
                required
                type="text"
                value={locForm.country}
                onChange={e => setLocForm({ ...locForm, country: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Legal Entity</label>
              <select
                required
                value={locForm.entityId || entities[0]?._id}
                onChange={e => setLocForm({ ...locForm, entityId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              >
                {entities.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#191919]/80 mb-1">Geo-Fence Radius (meters)</label>
              <input
                type="number"
                min="50"
                max="5000"
                value={locForm.geoFenceRadius}
                onChange={e => setLocForm({ ...locForm, geoFenceRadius: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="geoFenceEnabled"
              checked={locForm.geoFenceEnabled}
              onChange={e => setLocForm({ ...locForm, geoFenceEnabled: e.target.checked })}
              className="rounded border-gray-200 text-[#191919] focus:ring-blue-500"
            />
            <label htmlFor="geoFenceEnabled" className="text-xs font-medium text-[#191919]/80">
              Enforce strict GPS Geo-Fencing for attendance at this branch
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsLocModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-[#191919]/70 rounded-md text-xs font-semibold hover:bg-[#F4F3F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#191919] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#191919]/90"
            >
              Create Branch Location
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
