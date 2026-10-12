import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransferPage from './pages/TransferPage';
import BillPayPage from './pages/BillPayPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminPage from './pages/AdminPage';
import { TestivaProvider, useTestiva } from './context/TestivaContext';
import { ShieldCheck, RefreshCw, AlertTriangle, Wrench, ShieldAlert } from 'lucide-react';

function MainAppShell() {
  const {
    renderDelayMs,
    fakeFailure,
    apiDelayMs,
    locatorMode,
    a11yMode,
    a11yFailContrast,
    a11yFailFocus
  } = useTestiva();

  const [token, setToken] = useState(() => localStorage.getItem('finapex_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('finapex_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activePage, setActivePage] = useState('dashboard');
  const [isRenderLagging, setIsRenderLagging] = useState(false);
  const [displayedPage, setDisplayedPage] = useState('dashboard');

  const handleLoginSuccess = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('finapex_token');
    localStorage.removeItem('finapex_user');
    setToken(null);
    setUser(null);
  };

  const handlePageChange = (newPage) => {
    setActivePage(newPage);
    if (renderDelayMs > 0) {
      setIsRenderLagging(true);
      setTimeout(() => {
        setDisplayedPage(newPage);
        setIsRenderLagging(false);
      }, renderDelayMs);
    } else {
      setDisplayedPage(newPage);
    }
  };

  useEffect(() => {
    setDisplayedPage(activePage);
  }, []);

  const a11yClassNames = [
    a11yFailContrast ? 'a11y-low-contrast' : '',
    a11yFailFocus ? 'a11y-no-focus' : ''
  ].filter(Boolean).join(' ');

  if (!token) {
    if (activePage === 'admin') {
      return (
        <div className={`min-h-screen bg-slate-50 flex flex-col ${a11yClassNames}`}>
          <header role="banner" className="bg-[#0B192C] text-white p-4 flex justify-between items-center shadow">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-400" aria-hidden="true" />
              <span>FinApex Testiva Chaos & A11y Lab</span>
            </h1>
            <button
              onClick={() => setActivePage('login')}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Back to Login
            </button>
          </header>
          <main id="main-content" role="main" className="max-w-7xl mx-auto p-6 w-full flex-1">
            <AdminPage />
          </main>
        </div>
      );
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} onOpenAdmin={() => setActivePage('admin')} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${a11yClassNames}`}>
      {/* Accessible Skip Link (WCAG 2.4.1) */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Testiva Notification Banner */}
      <div className="bg-[#1E3E62] text-xs text-blue-100 py-2 px-4 text-center border-b border-blue-900 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Testiva Testing Engine</span>
        </div>
        <span className="opacity-40" aria-hidden="true">|</span>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>Locators: <strong className="text-orange-300 uppercase">{locatorMode}</strong></span>
          <span className="opacity-40" aria-hidden="true">|</span>
          <span className={a11yMode === 'compliant' ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>
            A11y: {a11yMode === 'compliant' ? 'WCAG 2.1 AA' : 'NON-COMPLIANT'}
          </span>
          {apiDelayMs > 0 && <span className="text-amber-300">| API: {apiDelayMs}ms</span>}
          {fakeFailure && <span className="text-red-300">| Failure: ACTIVE</span>}
          {renderDelayMs > 0 && <span className="text-purple-300">| Render Lag: {renderDelayMs}ms</span>}
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={handlePageChange}
        user={user}
        onLogout={handleLogout}
      />

      {/* Render Delay Spinner Overlay (For Testiva Slow Page Render Testing) */}
      {isRenderLagging && (
        <div data-testid="render-lag-indicator" role="status" aria-live="polite" className="bg-purple-50 border-b border-purple-200 py-2.5 px-4 text-center text-xs text-purple-700 flex items-center justify-center gap-2 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          <span>Simulating slow page render ({renderDelayMs}ms) for Testiva timeout test...</span>
        </div>
      )}

      {/* Microapp Container */}
      <main id="main-content" role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isRenderLagging ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3" role="status" aria-live="polite">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">Simulating slow component mount ({renderDelayMs}ms)...</p>
          </div>
        ) : (
          <>
            {displayedPage === 'dashboard' && <DashboardPage token={token} onNavigate={handlePageChange} />}
            {displayedPage === 'transfers' && <TransferPage token={token} />}
            {displayedPage === 'bill-pay' && <BillPayPage token={token} />}
            {displayedPage === 'transactions' && <TransactionsPage token={token} />}
            {displayedPage === 'admin' && <AdminPage />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer role="contentinfo" className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 FinApex Bank. WCAG 2.1 AA Compliant Microapp Architecture.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => handlePageChange('admin')}
              className="text-orange-600 hover:underline font-bold flex items-center gap-1"
              aria-label="Open Testiva Admin Lab"
            >
              <Wrench className="w-3 h-3" aria-hidden="true" />
              <span>Testiva Admin Lab</span>
            </button>
            <a href="http://localhost:9000/api-docs" target="_blank" rel="noreferrer" className="hover:text-slate-900 underline font-medium">
              Swagger API Docs
            </a>
            <a href="http://localhost:9000/health" target="_blank" rel="noreferrer" className="hover:text-slate-900 underline font-medium">
              Gateway Health
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <TestivaProvider>
      <MainAppShell />
    </TestivaProvider>
  );
}
