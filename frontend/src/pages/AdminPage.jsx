import React, { useState, useEffect } from 'react';
import { useTestiva } from '../context/TestivaContext';
import {
  Wrench,
  AlertTriangle,
  Clock,
  Zap,
  Terminal,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Type,
  Maximize2,
  Database,
  Save,
  Check
} from 'lucide-react';

export default function AdminPage() {
  const {
    locatorMode,
    changeLocatorMode,
    customLocators,
    updateCustomLocatorField,
    resetLocatorsToDefault,
    renderDelayMs,
    setRenderDelayMs,
    enableConsoleSpam,
    setEnableConsoleSpam,
    apiDelayMs,
    setApiDelayMs,
    fakeFailure,
    setFakeFailure,
    failureStatusCode,
    setFailureStatusCode,
    failureEndpoint,
    setFailureEndpoint,
    failureErrorMessage,
    setFailureErrorMessage,

    // Accessibility states
    a11yMode,
    toggleMasterA11yMode,
    a11yFailContrast,
    setA11yFailContrast,
    a11yFailLabels,
    setA11yFailLabels,
    a11yFailFocus,
    setA11yFailFocus,
    a11yFailHeadings,
    setA11yFailHeadings,
    a11yFailImages,
    setA11yFailImages,
    a11yFailErrorAlerts,
    setA11yFailErrorAlerts
  } = useTestiva();

  const [testApiResult, setTestApiResult] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [activeTab, setActiveTab] = useState('a11y'); // 'a11y' | 'chaos' | 'locators' | 'rules' | 'console'

  // Database-Driven Validation Rules State
  const [dbRules, setDbRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editMsgValue, setEditMsgValue] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const fetchValidationRules = async () => {
    setRulesLoading(true);
    try {
      const res = await fetch('/api/v1/validation-rules');
      const data = await res.json();
      if (data.success) {
        setDbRules(data.data);
      }
    } catch (err) {
      console.error('Failed fetching validation rules:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchValidationRules();
    }
  }, [activeTab]);

  const handleSaveRule = async (ruleId) => {
    try {
      const res = await fetch(`/api/v1/validation-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error_message: editMsgValue })
      });
      const data = await res.json();
      if (data.success) {
        setDbRules(prev => prev.map(r => r.id === ruleId ? { ...r, error_message: editMsgValue } : r));
        setEditingRuleId(null);
        setSaveSuccessMsg(`Rule '${ruleId}' error message updated in database!`);
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert('Failed saving validation rule message: ' + err.message);
    }
  };

  const handleTestApiCall = async () => {
    setTestingApi(true);
    setTestApiResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('finapex_token') || ''}`
        }
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);
      setTestApiResult({
        status: res.status,
        ok: res.ok,
        elapsedMs: elapsed,
        data
      });
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setTestApiResult({
        status: 0,
        ok: false,
        elapsedMs: elapsed,
        error: err.message
      });
    } finally {
      setTestingApi(false);
    }
  };

  const emitConsoleLogs = (type) => {
    const ts = new Date().toISOString();
    for (let i = 1; i <= 3; i++) {
      if (type === 'log') {
        console.log(`[Testiva Tracer ${ts}] Test log #${i}: Action executed with telemetry code T-${i}09`);
      } else if (type === 'warn') {
        console.warn(`[Testiva Tracer ${ts}] Test warning #${i}: Element response took longer than 150ms budget`);
      } else if (type === 'error') {
        console.error(`[Testiva Tracer ${ts}] Test error #${i}: Simulated unhandled rejection in background telemetry worker`);
      }
    }
  };

  const isAnyA11yViolationActive =
    a11yFailContrast || a11yFailLabels || a11yFailFocus || a11yFailHeadings || a11yFailImages || a11yFailErrorAlerts;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full">
                Testiva Test Lab
              </span>
              <span className="text-xs font-mono text-indigo-300">Accessibility & Chaos Edition</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Wrench className="w-7 h-7 text-orange-400" />
              <span>Admin Chaos & Accessibility Lab</span>
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Toggle WCAG 2.1 AA Accessibility compliance vs Non-Compliance for accessibility scanners,
              mutate element IDs/names to test AI Locator Self-Healing, and inject API latency and fake failures.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl">
            <div className="flex items-center gap-2">
              {isAnyA11yViolationActive ? (
                <ShieldAlert className="w-5 h-5 text-red-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
              <div className="text-xs">
                <p className="text-slate-400">Accessibility State:</p>
                <p className={`font-bold uppercase ${isAnyA11yViolationActive ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isAnyA11yViolationActive ? 'NON-COMPLIANT' : 'WCAG 2.1 AA COMPLIANT'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 border-t border-slate-800 pt-4">
          <button
            onClick={() => setActiveTab('a11y')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'a11y' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            Accessibility (a11y) Testing
          </button>
          <button
            onClick={() => setActiveTab('chaos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'chaos' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            API & Render Chaos
          </button>
          <button
            onClick={() => setActiveTab('locators')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'locators' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Locator Healing Engine
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'rules' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            DB Validation Rules &amp; Errors
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'console' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Browser Console Logs
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ACCESSIBILITY (A11Y) TESTING LAB */}
      {/* ==================================================================== */}
      {activeTab === 'a11y' && (
        <div className="space-y-6">
          {/* Master Mode Switcher Card */}
          <div className="card p-6 border-2 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  <span>Master Accessibility Mode</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Switch the entire application between WCAG 2.1 AA accessible standards and deliberate accessibility violations.
                </p>
              </div>

              {/* Master Preset Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-a11y-compliant"
                  onClick={() => toggleMasterA11yMode('compliant')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    !isAnyA11yViolationActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Compliant (WCAG 2.1 AA)</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-a11y-noncompliant"
                  onClick={() => toggleMasterA11yMode('non_compliant')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    isAnyA11yViolationActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Make Non-Compliant</span>
                </button>
              </div>
            </div>

            {/* Live Scorecard Preview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              <div className={`p-3 rounded-xl border text-center ${a11yFailContrast ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-[11px] font-bold uppercase">Contrast (1.4.3)</p>
                <p className="text-sm font-extrabold mt-0.5">{a11yFailContrast ? 'FAIL (~1.6:1)' : 'PASS (7.2:1)'}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${a11yFailLabels ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-[11px] font-bold uppercase">Form Labels (1.3.1)</p>
                <p className="text-sm font-extrabold mt-0.5">{a11yFailLabels ? 'MISSING' : 'VALID'}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${a11yFailFocus ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-[11px] font-bold uppercase">Focus Rings (2.4.7)</p>
                <p className="text-sm font-extrabold mt-0.5">{a11yFailFocus ? 'SUPPRESSED' : 'VISIBLE 3px'}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${a11yFailHeadings ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-[11px] font-bold uppercase">Heading Hierarchy</p>
                <p className="text-sm font-extrabold mt-0.5">{a11yFailHeadings ? 'SKIPPED H1->H5' : 'H1 -> H2 -> H3'}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${a11yFailImages ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-[11px] font-bold uppercase">Alt Text & Icons</p>
                <p className="text-sm font-extrabold mt-0.5">{a11yFailImages ? 'NO ALT TEXT' : 'DECORATIVE ARIA'}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${a11yFailErrorAlerts ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <p className="text-[11px] font-bold uppercase">Status Messages (4.1.3)</p>
                <p className="text-sm font-extrabold mt-0.5">{a11yFailErrorAlerts ? 'NO ROLE=ALERT' : 'LIVE REGIONS'}</p>
              </div>
            </div>
          </div>

          {/* Granular Accessibility Violation Toggles */}
          <div className="card p-6">
            <h4 className="font-bold text-slate-900 mb-4 text-base">Granular WCAG Violation Selectors</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Color Contrast Violation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Color Contrast Failure</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">WCAG 1.4.3</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Renders text in faint light gray (#A0AEC0 on #FFFFFF), dropping contrast to ~1.6:1 (requires 4.5:1 minimum).
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="toggle-a11y-contrast"
                  checked={a11yFailContrast}
                  onChange={(e) => setA11yFailContrast(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-400 mt-1"
                />
              </div>

              {/* 2. Missing Form Labels */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Missing Form Labels & ARIA</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">WCAG 1.3.1, 4.1.2</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Detaches labels from inputs and strips <code>aria-label</code> and <code>htmlFor</code>, leaving inputs unlabeled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="toggle-a11y-labels"
                  checked={a11yFailLabels}
                  onChange={(e) => setA11yFailLabels(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-400 mt-1"
                />
              </div>

              {/* 3. Suppressed Focus Ring & No Skip Link */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">No Visible Focus Rings & Skip Link</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">WCAG 2.4.7, 2.4.1</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Forces <code>outline: none !important</code> on keyboard tabs and removes the skip-to-content bypass link.
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="toggle-a11y-focus"
                  checked={a11yFailFocus}
                  onChange={(e) => setA11yFailFocus(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-400 mt-1"
                />
              </div>

              {/* 4. Broken Heading Order */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Broken Heading Hierarchy</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">WCAG 1.3.1</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Alters semantic <code>h1</code> tags to <code>h5</code> or non-semantic divs to trigger heading structure violations.
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="toggle-a11y-headings"
                  checked={a11yFailHeadings}
                  onChange={(e) => setA11yFailHeadings(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-400 mt-1"
                />
              </div>

              {/* 5. Missing Alt Text on Graphics */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Missing Alt Text on Graphics</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">WCAG 1.1.1</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Renders logos without alt text and exposes decorative SVG icons without <code>aria-hidden="true"</code>.
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="toggle-a11y-images"
                  checked={a11yFailImages}
                  onChange={(e) => setA11yFailImages(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-400 mt-1"
                />
              </div>

              {/* 6. Suppressed ARIA Live Error Announcements */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">No ARIA-Live Error Alerts</span>
                    <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">WCAG 4.1.3</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Removes <code>role="alert"</code> and <code>aria-live</code> attributes from error alerts so screen readers fail to notify users.
                  </p>
                </div>
                <input
                  type="checkbox"
                  data-testid="toggle-a11y-alerts"
                  checked={a11yFailErrorAlerts}
                  onChange={(e) => setA11yFailErrorAlerts(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-400 mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: API & RENDER CHAOS */}
      {/* ==================================================================== */}
      {activeTab === 'chaos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">API Response Latency</h3>
                <p className="text-xs text-slate-500">Inject artificial delay in API Gateway response</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Simulated Latency:</span>
                <span className="font-mono font-bold text-orange-600 text-base">{apiDelayMs} ms</span>
              </div>

              <input
                type="range"
                min="0"
                max="8000"
                step="250"
                value={apiDelayMs}
                onChange={(e) => setApiDelayMs(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />

              <div className="flex flex-wrap gap-2 pt-1">
                {[0, 500, 1500, 3000, 5000].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setApiDelayMs(ms)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                      apiDelayMs === ms
                        ? 'bg-[#1E3E62] text-white border-[#1E3E62]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {ms === 0 ? 'Normal (0ms)' : `${ms}ms`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Page Render Slowdown</h3>
                <p className="text-xs text-slate-500">Delay UI component rendering to test timeout handling</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Render Delay:</span>
                <span className="font-mono font-bold text-purple-600 text-base">{renderDelayMs} ms</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[0, 800, 2000, 4000].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => setRenderDelayMs(ms)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                      renderDelayMs === ms
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {ms === 0 ? 'Instant Render' : `Lag ${ms}ms`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                When set &gt; 0ms, screen transitions in the app will pause with a loading spinner before mounting.
              </p>
            </div>
          </div>

          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Fake API Failure Injection</h3>
                  <p className="text-xs text-slate-500">Inject HTTP 4xx / 5xx errors into targeted microservices</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fakeFailure}
                  onChange={(e) => setFakeFailure(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                <span className="ml-3 text-xs font-bold uppercase text-slate-700">
                  {fakeFailure ? 'FAILURE ACTIVE' : 'DISABLED'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Status Code</label>
                <select
                  value={failureStatusCode}
                  disabled={!fakeFailure}
                  onChange={(e) => setFailureStatusCode(Number(e.target.value))}
                  className="input-field disabled:opacity-50"
                >
                  <option value={400}>400 Bad Request</option>
                  <option value={401}>401 Unauthorized</option>
                  <option value={403}>403 Forbidden</option>
                  <option value={404}>404 Not Found</option>
                  <option value={500}>500 Internal Server Error</option>
                  <option value={502}>502 Bad Gateway</option>
                  <option value={503}>503 Service Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Endpoint</label>
                <select
                  value={failureEndpoint}
                  disabled={!fakeFailure}
                  onChange={(e) => setFailureEndpoint(e.target.value)}
                  className="input-field disabled:opacity-50"
                >
                  <option value="all">All Microservice Endpoints</option>
                  <option value="/api/v1/auth/login">Auth: /api/v1/auth/login</option>
                  <option value="/api/v1/transactions/transfer">Transfers: /api/v1/transactions/transfer</option>
                  <option value="/api/v1/bills/pay">Bills: /api/v1/bills/pay</option>
                  <option value="/api/v1/accounts">Accounts: /api/v1/accounts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Error Message</label>
                <input
                  type="text"
                  value={failureErrorMessage}
                  disabled={!fakeFailure}
                  onChange={(e) => setFailureErrorMessage(e.target.value)}
                  className="input-field disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestApiCall}
                disabled={testingApi}
                className="btn-secondary text-xs px-4 py-2 w-full sm:w-auto"
              >
                {testingApi ? 'Executing Request...' : 'Trigger Live Test Request to API Gateway'}
              </button>

              {testApiResult && (
                <div className={`text-xs px-3 py-1.5 rounded-lg font-mono flex items-center gap-2 ${
                  testApiResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span className="font-bold">HTTP {testApiResult.status}</span>
                  <span>|</span>
                  <span>Duration: {testApiResult.elapsedMs}ms</span>
                  <span>|</span>
                  <span>{testApiResult.ok ? 'Success' : testApiResult.data?.message || 'Failed'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: LOCATOR HEALING ENGINE */}
      {/* ==================================================================== */}
      {activeTab === 'locators' && (
        <div className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-500" />
                <span>Element Locator Mutation for Testiva Self-Healing</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mutate field IDs, names, and <code>data-testid</code> attributes to test whether Testiva's AI engine automatically heals and identifies the relocated elements.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetLocatorsToDefault}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Reset to Standard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => changeLocatorMode('default')}
              className={`p-4 rounded-xl border text-left transition ${
                locatorMode === 'default'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-900">Standard Locators (v1)</span>
                {locatorMode === 'default' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-slate-500">Original IDs and data-testids (e.g. <code>input-login-email</code>, <code>btn-login-submit</code>).</p>
            </button>

            <button
              onClick={() => changeLocatorMode('mutated_v2')}
              className={`p-4 rounded-xl border text-left transition ${
                locatorMode === 'mutated_v2'
                  ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-2 ring-orange-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-900">Mutated Locators (v2)</span>
                {locatorMode === 'mutated_v2' && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
              </div>
              <p className="text-xs text-slate-500">Altered IDs and names (e.g. <code>usr_identity_v2</code>, <code>field-user-ident</code>) to trigger Testiva AI healing.</p>
            </button>

            <button
              onClick={() => changeLocatorMode('custom')}
              className={`p-4 rounded-xl border text-left transition ${
                locatorMode === 'custom'
                  ? 'border-purple-500 bg-purple-50/50 shadow-sm ring-2 ring-purple-500/20'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-900">Custom Editable Locators</span>
                {locatorMode === 'custom' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
              </div>
              <p className="text-xs text-slate-500">Type your own custom IDs and names directly in the table below.</p>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Page / Field</th>
                  <th className="py-3 px-4">DOM Element <code>id</code></th>
                  <th className="py-3 px-4">DOM Element <code>name</code></th>
                  <th className="py-3 px-4"><code>data-testid</code> Attribute</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {Object.keys(customLocators).map((fieldKey) => {
                  const loc = customLocators[fieldKey];
                  const isCustom = locatorMode === 'custom';
                  return (
                    <tr key={fieldKey} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-800">
                        {fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </td>
                      <td className="py-2.5 px-4">
                        {isCustom ? (
                          <input
                            type="text"
                            value={loc.id}
                            onChange={(e) => updateCustomLocatorField(fieldKey, 'id', e.target.value)}
                            className="input-field text-xs py-1 font-mono"
                          />
                        ) : (
                          <span className="text-slate-700">{loc.id}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {isCustom ? (
                          <input
                            type="text"
                            value={loc.name}
                            onChange={(e) => updateCustomLocatorField(fieldKey, 'name', e.target.value)}
                            className="input-field text-xs py-1 font-mono"
                          />
                        ) : (
                          <span className="text-slate-700">{loc.name}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {isCustom ? (
                          <input
                            type="text"
                            value={loc.testId}
                            onChange={(e) => updateCustomLocatorField(fieldKey, 'testId', e.target.value)}
                            className="input-field text-xs py-1 font-mono text-orange-600 font-semibold"
                          />
                        ) : (
                          <span className="text-orange-600 font-semibold">{loc.testId}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ==================================================================== */}
      {/* TAB 4: DATABASE-DRIVEN VALIDATION RULES & ERROR MESSAGES MANAGER */}
      {/* ==================================================================== */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="card p-6 border-2 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <span>Database-Driven Validation Rules &amp; Error Messages</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Error messages and validation rules are queried directly from the <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono font-bold">validation_rules</code> relational database table.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchValidationRules}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold"
                  title="Reload rules from database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rulesLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh DB</span>
                </button>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Module Filter Tabs */}
            <div className="flex flex-wrap gap-2 mt-4 pt-2">
              {['ALL', 'AUTH', 'TRANSFERS', 'BILL_PAY', 'STATEMENTS'].map(mod => (
                <button
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedModule === mod
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {mod === 'ALL' ? 'All Modules' : mod}
                </button>
              ))}
            </div>

            {/* Rules Table */}
            <div className="overflow-x-auto mt-4 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Rule ID</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Field Name</th>
                    <th className="p-3">Rule Code</th>
                    <th className="p-3">Configured Error Message (In Database)</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {dbRules
                    .filter(r => selectedModule === 'ALL' || r.module === selectedModule)
                    .map(rule => (
                      <tr key={rule.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-slate-600">{rule.id}</td>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                            {rule.module}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{rule.field_name}</td>
                        <td className="p-3 font-mono text-slate-600">
                          <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                            {rule.rule_code}
                          </span>
                        </td>
                        <td className="p-3">
                          {editingRuleId === rule.id ? (
                            <input
                              type="text"
                              value={editMsgValue}
                              onChange={(e) => setEditMsgValue(e.target.value)}
                              className="input-field text-xs py-1 px-2.5 w-full font-sans border-blue-500 focus:ring-1"
                              autoFocus
                            />
                          ) : (
                            <span className="text-slate-800 font-medium">{rule.error_message}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {editingRuleId === rule.id ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSaveRule(rule.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[11px] flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => setEditingRuleId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingRuleId(rule.id);
                                setEditMsgValue(rule.error_message);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-semibold underline text-[11px]"
                            >
                              Edit Message
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
              <p className="font-semibold text-slate-800 mb-1">💡 How Testiva Automation Tests Dynamic DB Error Messages:</p>
              <p>
                Modify any error message above and click <strong>Save</strong>. The update immediately persists to the backend database table. Submit the corresponding invalid field in the application (or run your automated test step) to verify that the application dynamically renders the updated error message string drawn straight from the database!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: BROWSER CONSOLE TELEMETRY */}
      {/* ==================================================================== */}
      {activeTab === 'console' && (
        <div className="space-y-6">
          <div className="card p-6 border-2 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  <span>Browser Console Telemetry Generator</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate structured console output for Testiva browser console log captures and error assertions.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={enableConsoleSpam}
                  onChange={(e) => setEnableConsoleSpam(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-400"
                />
                <span>Periodic Heartbeat Logs (Every 3.5s)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => emitConsoleLogs('log')}
                className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition"
              >
                <div className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>Emit console.log</span>
                </div>
                <p className="text-xs text-slate-500">Triggers 3 informational telemetry entries with timestamps.</p>
              </button>

              <button
                onClick={() => emitConsoleLogs('warn')}
                className="p-4 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 rounded-xl text-left transition"
              >
                <div className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Emit console.warn</span>
                </div>
                <p className="text-xs text-amber-700">Triggers 3 non-fatal warnings to test warning capture.</p>
              </button>

              <button
                onClick={() => emitConsoleLogs('error')}
                className="p-4 bg-red-50/60 hover:bg-red-100/60 border border-red-200 rounded-xl text-left transition"
              >
                <div className="font-bold text-sm text-red-900 mb-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span>Emit console.error</span>
                </div>
                <p className="text-xs text-red-700">Triggers 3 error logs to verify Testiva test failure thresholds.</p>
              </button>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl text-slate-200 font-mono text-xs space-y-1 mt-4">
              <p className="text-slate-500">// Open Developer Tools (F12 -&gt; Console tab) to observe emitted logs:</p>
              <p className="text-emerald-400">[Testiva Tracer] Telemetry logging activated.</p>
              <p className="text-slate-300">[Testiva Tracer 2026-10-09T09:55:00Z] Heartbeat: Application DOM active...</p>
              <p className="text-amber-400">[Testiva Tracer 2026-10-09T09:55:03Z] Warning: UI reflow latency observed: 24.3ms</p>
              <p className="text-red-400">[Testiva Tracer 2026-10-09T09:55:07Z] Error: Non-fatal simulated client warning code 0x1fa</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
