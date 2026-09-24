import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo.jsx';
import { BoomerangVideoBg } from '../../components/BoomerangVideoBg.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFeature, setActiveFeature] = useState(null);

  const features = [
    {
      num: '01',
      title: 'Attendance',
      kicker: 'REAL-TIME VERIFICATION',
      headline: 'Autonomous shift tracking and presence verification.',
      description:
        'Calculates exact shift hours, off-shift allowances, and verified break deductions without arbitrary penalties. Every punch is timestamped and auditable.',
    },
    {
      num: '02',
      title: 'Governance',
      kicker: 'ROLE BOUNDARY CONTROL',
      headline: 'Multi-tier managerial hierarchy and tenant isolation.',
      description:
        'Clean boundaries between HR Administrators, Department Managers, and Staff. Dedicated approval workflows ensure zero operational overlap or privilege escalation.',
    },
    {
      num: '03',
      title: 'Compliance',
      kicker: 'STATUTORY BALANCES',
      headline: 'Automated statutory entitlement and leave governance.',
      description:
        'Statutory leave allocations provisioned instantly upon onboarding. Immutable transaction logs satisfy labor regulations and organizational audit requirements.',
    },
  ];

  const handleLaunch = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden selection:bg-[#191919] selection:text-white">
      {/* Fixed Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Logo className="w-6 h-6 text-[#191919]" />
          <span className="font-semibold text-base tracking-tight text-[#191919]">
            MarichiHR
          </span>
        </div>

        {/* Center Links (hidden below md) */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => setActiveFeature(features[0])}
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveFeature(features[1])}
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Governance
          </button>
          <button
            onClick={() => setActiveFeature(features[2])}
            className="text-sm text-[#191919]/70 hover:text-[#191919] transition-colors duration-200"
          >
            Compliance
          </button>
        </nav>

        {/* Right CTA */}
        <div>
          <button
            onClick={handleLaunch}
            className="px-5 py-2.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 flex items-center gap-2"
          >
            <span>{user ? 'Open Dashboard' : 'Launch Portal'}</span>
            <ArrowRight className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </header>

      {/* Hero Section — full viewport */}
      <main className="relative flex flex-col items-center overflow-hidden h-screen">
        {/* Video Canvas Background */}
        <BoomerangVideoBg />

        {/* Content Block */}
        <div className="relative z-10 w-full flex flex-col items-center flex-1 justify-between">
          {/* Centered Headline Copy */}
          <div className="pt-24 sm:pt-28 md:pt-36 px-4 sm:px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tighter text-[#191919] font-normal">
              Build lasting
              <br />
              relationships.
            </h1>

            <p className="max-w-sm sm:max-w-md mt-5 sm:mt-6 md:mt-8 text-sm md:text-base text-[#191919]/70 leading-relaxed font-sans">
              Autonomous workforce operations for modern organizations — automated attendance verification, statutory leave governance, and audit-ready compliance.
            </p>

            <button
              onClick={handleLaunch}
              className="mt-6 sm:mt-8 md:mt-10 px-6 sm:px-8 py-3 sm:py-3.5 bg-[#191919] text-white text-sm font-medium rounded-lg hover:bg-[#191919]/90 transition-colors duration-200 flex items-center gap-2 group"
            >
              <span>{user ? 'Open Portal Dashboard' : 'Launch Portal'}</span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>

          {/* Bottom Info Panel (Flush to bottom of viewport) */}
          <div className="w-full max-w-5xl px-4 sm:px-6 mt-auto">
            <div className="bg-white/90 backdrop-blur-sm border border-gray-200 border-b-0 pt-8 sm:pt-12 md:pt-16 px-5 sm:px-8 md:px-12 pb-6 sm:pb-8 shadow-sm">
              {/* Row 1 — 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-16 items-end">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#191919]/50 font-medium block">
                    WHAT DO WE DO?
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-serif font-normal leading-tight tracking-tight text-[#191919]">
                    Workforce operations that
                    <br className="hidden sm:inline" /> build momentum
                  </h2>
                </div>
                <div>
                  <p className="text-sm md:text-[15px] text-[#191919]/70 leading-relaxed font-sans">
                    Enterprise HRMS platform built for modern organizations. Systems that verify presence, govern statutory leave entitlements, and show audit-grade accountability.
                  </p>
                </div>
              </div>

              {/* Hairline Divider */}
              <div className="mt-6 sm:mt-8 md:mt-10 h-px bg-gray-200 w-full" />

              {/* Row 2 — 3 Interactive Feature Rows */}
              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                {features.map((item) => (
                  <div
                    key={item.num}
                    onClick={() => setActiveFeature(item)}
                    className="bg-[#F4F3F3] hover:bg-[#eaeaea] transition-all duration-200 cursor-pointer px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between group rounded-sm"
                  >
                    <div className="flex items-center text-sm">
                      <span className="text-[#191919]/40 font-normal">{item.num}</span>
                      <span className="mx-2 text-[#191919]/30">/</span>
                      <span className="font-medium text-[#191919]">{item.title}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Detail Drawer/Modal */}
      {activeFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 max-w-lg w-full p-6 sm:p-8 rounded-lg shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center text-xs tracking-wider uppercase text-[#191919]/50 font-medium">
                <span>{activeFeature.num}</span>
                <span className="mx-2">/</span>
                <span>{activeFeature.kicker}</span>
              </div>
              <button
                onClick={() => setActiveFeature(null)}
                className="text-xs text-[#191919]/60 hover:text-[#191919] px-2 py-1 rounded transition-colors"
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <h3 className="font-serif text-2xl text-[#191919] font-normal leading-snug">
                {activeFeature.headline}
              </h3>
              <p className="mt-3 text-sm text-[#191919]/70 leading-relaxed font-sans">
                {activeFeature.description}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleLaunch}
                className="px-4 py-2 bg-[#191919] text-white text-xs font-medium rounded-md hover:bg-[#191919]/90 transition-colors flex items-center gap-1.5"
              >
                <span>Access in Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/80" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
