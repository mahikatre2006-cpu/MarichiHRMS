import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo.jsx';

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setError(decodeURIComponent(err));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          organisationName: orgName,
          organisationCode: orgCode,
          adminName,
          email,
          password,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Operation failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSsoClick = (provider) => {
    window.location.href = `/api/v1/auth/sso/${provider}`;
  };

  return (
    <div className="min-h-screen bg-white text-[#191919] flex flex-col justify-between selection:bg-[#191919] selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex items-center justify-between border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="w-6 h-6 text-[#191919]" />
          <span className="font-semibold text-base tracking-tight text-[#191919]">
            MarichiHR
          </span>
        </Link>
        <Link
          to="/"
          className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors"
        >
          Return to Overview
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium block mb-2">
              {mode === 'login' ? 'PORTAL AUTHENTICATION' : 'ORGANIZATION ONBOARDING'}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#191919]">
              {mode === 'login' ? 'Sign in to your portal' : 'Register your organization'}
            </h1>
            <p className="mt-2 text-sm text-[#191919]/70 leading-relaxed font-sans">
              {mode === 'login'
                ? 'Enter your enterprise credentials to access your workspace.'
                : 'Create a new tenant domain with administrator privileges.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#F4F3F3] p-1 rounded-md mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-sm transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-[#191919] shadow-xs'
                  : 'text-[#191919]/60 hover:text-[#191919]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-sm transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-white text-[#191919] shadow-xs'
                  : 'text-[#191919]/60 hover:text-[#191919]'
              }`}
            >
              Register Organization
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-[#F4F3F3] border-l-2 border-[#191919] text-xs text-[#191919] leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-[#191919] placeholder-[#191919]/30 focus:outline-hidden focus:border-[#191919] transition-colors"
                    placeholder="Acme Corporation"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1.5">
                    Organization Code
                  </label>
                  <input
                    type="text"
                    required
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-[#191919] placeholder-[#191919]/30 focus:outline-hidden focus:border-[#191919] transition-colors uppercase"
                    placeholder="ACME"
                    maxLength={10}
                  />
                  <span className="text-[11px] text-[#191919]/40 mt-1 block">
                    Alphanumeric identifier for your tenant workspace.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1.5">
                    Administrator Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-[#191919] placeholder-[#191919]/30 focus:outline-hidden focus:border-[#191919] transition-colors"
                    placeholder="Jane Doe"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-[#191919] placeholder-[#191919]/30 focus:outline-hidden focus:border-[#191919] transition-colors"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#191919]/60 font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-[#191919] placeholder-[#191919]/30 focus:outline-hidden focus:border-[#191919] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-5 py-3 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In to Portal'
                  : 'Register & Launch Workspace'}
              </span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </form>

          {/* Single Sign-On Divider */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <span className="text-[11px] uppercase tracking-wider text-[#191919]/50 font-medium block text-center mb-4">
              Enterprise Single Sign-On
            </span>

            <button
              type="button"
              onClick={() => handleSsoClick('google')}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-200 rounded-md bg-white text-xs font-medium text-[#191919] hover:bg-[#F4F3F3] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSsoClick('microsoft')}
                className="py-2 px-2 border border-gray-200 rounded-md bg-white text-[11px] font-medium text-[#191919]/80 hover:bg-[#F4F3F3] transition-colors text-center"
              >
                Microsoft
              </button>
              <button
                type="button"
                onClick={() => handleSsoClick('okta')}
                className="py-2 px-2 border border-gray-200 rounded-md bg-white text-[11px] font-medium text-[#191919]/80 hover:bg-[#F4F3F3] transition-colors text-center"
              >
                Okta
              </button>
              <button
                type="button"
                onClick={() => handleSsoClick('keycloak')}
                className="py-2 px-2 border border-gray-200 rounded-md bg-white text-[11px] font-medium text-[#191919]/80 hover:bg-[#F4F3F3] transition-colors text-center"
              >
                Keycloak
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-10 md:px-14 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-[#191919]/50">
        <span>MarichiHR Platform</span>
        <span>Verified Multi-Tenant Architecture</span>
      </footer>
    </div>
  );
}

export default Login;
