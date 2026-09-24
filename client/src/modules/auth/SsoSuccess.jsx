import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { CheckCircle2 } from 'lucide-react';

export function SsoSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('marichi_token', token);
      refreshProfile().then(() => {
        navigate('/');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, refreshProfile]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white">
      <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce mb-4" />
      <h2 className="text-xl font-bold">SSO Authentication Successful</h2>
      <p className="text-slate-400 text-sm mt-1">Redirecting to your portal...</p>
    </div>
  );
}
