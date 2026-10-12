import React from 'react';
import { Landmark, ArrowLeftRight, Receipt, FileText, LayoutDashboard, LogOut, ShieldCheck, Wrench, ShieldAlert } from 'lucide-react';
import { useTestiva } from '../context/TestivaContext';

export default function Navbar({ activePage, setActivePage, user, onLogout }) {
  const { locatorMode, fakeFailure, apiDelayMs, a11yMode, a11yFailImages } = useTestiva();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { id: 'transfers', label: 'Fund Transfer', icon: ArrowLeftRight, testId: 'nav-transfers' },
    { id: 'bill-pay', label: 'Bill Payments', icon: Receipt, testId: 'nav-bills' },
    { id: 'transactions', label: 'Statements & Audit', icon: FileText, testId: 'nav-statement' },
    { id: 'admin', label: 'Testiva Lab', icon: Wrench, testId: 'nav-admin', isLab: true }
  ];

  return (
    <header role="banner" className="bg-[#0B192C] text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <button
            type="button"
            className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-lg p-1"
            onClick={() => setActivePage('dashboard')}
            aria-label="FinApex Home Dashboard"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D9480F] flex items-center justify-center font-bold text-white shadow">
              <Landmark className="w-6 h-6" aria-hidden={a11yFailImages ? undefined : "true"} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">FinApex</span>
                <span className="text-[10px] font-bold bg-blue-900/80 border border-blue-400/40 text-blue-200 px-2 py-0.5 rounded-full">
                  Testiva Edition
                </span>
              </div>
              <p className="text-[11px] text-slate-300">AWS Enterprise Banking</p>
            </div>
          </button>

          {/* Accessible Main Navigation */}
          <nav role="navigation" aria-label="Main Banking Navigation" className="hidden md:flex items-center space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={item.testId}
                  onClick={() => setActivePage(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors relative min-h-[44px] ${
                    isActive
                      ? 'bg-[#1E3E62] text-white shadow-sm border border-blue-400/40'
                      : item.isLab
                      ? 'text-orange-300 hover:text-white hover:bg-slate-800/80'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.isLab ? 'text-orange-400' : 'text-slate-300'}`} aria-hidden={a11yFailImages ? undefined : "true"} />
                  <span>{item.label}</span>
                  {item.isLab && (fakeFailure || apiDelayMs > 0) && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute top-2 right-2" aria-label="Simulated Chaos Active"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div>
                <p className="text-sm font-bold text-white leading-tight" data-testid="user-fullname">{user?.fullName || 'Johnathan Doe'}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 justify-end font-mono">
                  <span>Locators: <strong className="text-orange-300 uppercase">{locatorMode}</strong></span>
                </div>
              </div>
            </div>

            <button
              data-testid="btn-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-red-700 border border-slate-700 px-3.5 py-2 rounded-lg transition min-h-[44px]"
              title="Sign Out"
              aria-label="Sign out of FinApex Banking"
            >
              <LogOut className="w-4 h-4" aria-hidden={a11yFailImages ? undefined : "true"} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
