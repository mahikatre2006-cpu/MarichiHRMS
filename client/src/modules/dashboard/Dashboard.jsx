import React, { useState } from 'react';
import { Header } from '../../components/Header.jsx';
import { EmployeePortal } from './EmployeePortal.jsx';
import { ManagerPortal } from './ManagerPortal.jsx';
import { AdminPortal } from './AdminPortal.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

export function Dashboard() {
  const { isHrAdmin, isManager } = useAuth();
  const [activePortal, setActivePortal] = useState('employee');

  return (
    <div className="min-h-screen bg-white text-[#191919] flex flex-col selection:bg-[#191919] selection:text-white">
      <Header activePortal={activePortal} setActivePortal={setActivePortal} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePortal === 'employee' && <EmployeePortal />}
        {activePortal === 'manager' && (isManager || isHrAdmin) && <ManagerPortal />}
        {activePortal === 'admin' && isHrAdmin && <AdminPortal />}
      </main>
    </div>
  );
}

export default Dashboard;
