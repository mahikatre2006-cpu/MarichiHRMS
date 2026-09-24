import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Login } from '../modules/auth/Login.jsx';
import { SsoSuccess } from '../modules/auth/SsoSuccess.jsx';
import { Dashboard } from '../modules/dashboard/Dashboard.jsx';
import { LandingPage } from '../modules/landing/LandingPage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-[#191919] selection:bg-[#191919] selection:text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#191919] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono tracking-wider uppercase text-[#191919]/60">
            Loading Workspace...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOrDashboardRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-[#191919] selection:bg-[#191919] selection:text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#191919] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-mono tracking-wider uppercase text-[#191919]/60">
            Loading Workspace...
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOrDashboardRoute />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/sso-success" element={<SsoSuccess />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
