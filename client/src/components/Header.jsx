import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../services/api.js';
import { Logo } from './Logo.jsx';
import { ArrowRight } from 'lucide-react';

export function Header({ activePortal, setActivePortal }) {
  const { user, employee, logout, isHrAdmin, isManager } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications?limit=5');
        setNotifications(res.data.data || []);
      } catch {
        // ignore
      }
    };
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
    } catch {
      // ignore
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 selection:bg-[#191919] selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Logo className="w-5 h-5 text-[#191919]" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-[#191919]">
                MarichiHR
              </span>
              {user?.tenantId?.name && (
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 bg-[#F4F3F3] text-[#191919]/70 rounded border border-gray-200">
                  {user.tenantId.name}
                </span>
              )}
            </div>
          </div>

          {/* Portal Switcher Tabs */}
          <nav className="flex space-x-1 bg-[#F4F3F3] p-1 rounded-md">
            <button
              onClick={() => setActivePortal('employee')}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-200 ${
                activePortal === 'employee'
                  ? 'bg-white text-[#191919] shadow-xs'
                  : 'text-[#191919]/60 hover:text-[#191919]'
              }`}
            >
              My Workspace
            </button>

            {(isManager || isHrAdmin) && (
              <button
                onClick={() => setActivePortal('manager')}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-200 ${
                  activePortal === 'manager'
                    ? 'bg-white text-[#191919] shadow-xs'
                    : 'text-[#191919]/60 hover:text-[#191919]'
                }`}
              >
                Manager Approvals
              </button>
            )}

            {isHrAdmin && (
              <button
                onClick={() => setActivePortal('admin')}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all duration-200 ${
                  activePortal === 'admin'
                    ? 'bg-white text-[#191919] shadow-xs'
                    : 'text-[#191919]/60 hover:text-[#191919]'
                }`}
              >
                HR Administration
              </button>
            )}
          </nav>

          {/* Notifications & User Profile */}
          <div className="flex items-center space-x-4">
            {/* Notification trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 text-xs text-[#191919]/60 hover:text-[#191919] hover:bg-[#F4F3F3] rounded transition-colors relative"
                title="Notifications"
              >
                <span>Alerts</span>
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-[#191919] text-white text-[10px] rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-xl border border-gray-200 py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#191919]/50">
                      System Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-[#191919] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#191919]/40">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`p-3 text-xs ${
                            n.status === 'UNREAD' ? 'bg-[#F4F3F3]' : ''
                          }`}
                        >
                          <div className="font-medium text-[#191919]">{n.title}</div>
                          <div className="text-[#191919]/70 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
              <div className="text-right">
                <div className="text-xs font-medium text-[#191919]">
                  {employee?.displayName || user?.email?.split('@')[0]}
                </div>
                <div className="text-[11px] text-[#191919]/50">
                  {employee?.designation || user?.roles?.[0]?.name || 'Staff'}
                </div>
              </div>

              <button
                onClick={logout}
                title="Log out"
                className="px-2.5 py-1 text-xs text-[#191919]/60 hover:text-[#191919] hover:bg-[#F4F3F3] rounded transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
