import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('marichi_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
      setEmployee(res.data.data.employee);
      setPermissions(res.data.data.permissions || []);
    } catch {
      localStorage.removeItem('marichi_token');
      setUser(null);
      setEmployee(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedUser, employee: loggedEmployee } = res.data.data;
    localStorage.setItem('marichi_token', accessToken);
    setUser(loggedUser);
    setEmployee(loggedEmployee);
    await fetchProfile();
    return res.data.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { accessToken, user: loggedUser, employee: loggedEmployee } = res.data.data;
    localStorage.setItem('marichi_token', accessToken);
    setUser(loggedUser);
    setEmployee(loggedEmployee);
    await fetchProfile();
    return res.data.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('marichi_token');
      setUser(null);
      setEmployee(null);
      setPermissions([]);
      window.location.href = '/login';
    }
  };

  const hasPermission = (requiredPerm) => {
    if (!user) return false;
    // Check if any active role has this permission or wildcard
    return permissions.some(p => p.permission === requiredPerm || p.permission === '*');
  };

  const isHrAdmin = user?.roles?.some(r => r.name === 'HR_ADMIN' || r.name === 'SYSTEM_ADMIN');
  const isManager = user?.roles?.some(r => r.name === 'MANAGER');
  const isEmployee = Boolean(employee);

  return (
    <AuthContext.Provider value={{
      user,
      employee,
      permissions,
      loading,
      login,
      register,
      logout,
      refreshProfile: fetchProfile,
      hasPermission,
      isHrAdmin,
      isManager,
      isEmployee
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
