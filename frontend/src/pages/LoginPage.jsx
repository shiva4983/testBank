import React, { useState } from 'react';
import { Landmark, Lock, Mail, AlertCircle, CheckCircle2, Eye, EyeOff, Wrench, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useTestiva } from '../context/TestivaContext';

export default function LoginPage({ onLoginSuccess, onOpenAdmin }) {
  const {
    getLocator,
    locatorMode,
    a11yFailContrast,
    a11yFailLabels,
    a11yFailHeadings,
    a11yFailImages,
    a11yFailErrorAlerts
  } = useTestiva();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState('');

  const emailLoc = getLocator('loginEmail');
  const passLoc = getLocator('loginPassword');
  const submitLoc = getLocator('loginSubmit');

  // Specific field error computation
  const getEmailError = () => {
    if (!email || email.trim() === '') {
      return 'Email or username is mandatory.';
    }
    if (email.length > 100) {
      return 'Email or username cannot exceed 100 characters.';
    }
    const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    const isUsername = /^[a-zA-Z0-9_]{4,20}$/.test(email);
    if (!isEmail && !isUsername) {
      if (email.includes('@')) {
        return 'Invalid email format (e.g. user@example.com, 5-100 characters).';
      }
      return 'Username must be 4 to 20 alphanumeric characters (letters, numbers, underscore).';
    }
    return '';
  };

  const getPasswordError = () => {
    if (!password) {
      return 'Password is mandatory.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (password.length > 64) {
      return 'Password cannot exceed 64 characters.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least 1 uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least 1 lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least 1 numeric digit (0-9).';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least 1 special character (!@#$%^&*...).';
    }
    return '';
  };

  const emailError = getEmailError();
  const passwordError = getPasswordError();
  const isEmailValid = !emailError;
  const isPasswordValid = !passwordError;
  const isFormValid = isEmailValid && isPasswordValid;

  const passwordLengthValid = password.length >= 8 && password.length <= 64;
  const passwordUpperValid = /[A-Z]/.test(password);
  const passwordLowerValid = /[a-z]/.test(password);
  const passwordNumValid = /[0-9]/.test(password);
  const passwordSpecValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleAutofill = (testEmail, testPass) => {
    setEmail(testEmail);
    setPassword(testPass);
    setTouched({ email: true, password: true });
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem('finapex_token', data.token);
      localStorage.setItem('finapex_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const HeadingTag = a11yFailHeadings ? 'h5' : 'h1';

  return (
    <div className={`min-h-screen bg-slate-900 bg-gradient-to-br from-[#0B192C] via-[#1E3E62] to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative ${a11yFailContrast ? 'a11y-low-contrast' : ''}`}>
      {/* Skip to Main Content Link (WCAG 2.4.1) */}
      <a href="#login-main-form" className="skip-link">Skip to login form</a>

      {/* Top Testiva Toolbar */}
      <header role="banner" className="w-full max-w-md flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-800/90 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full font-mono shadow-sm">
            Locators: <strong className="text-white uppercase">{locatorMode}</strong>
          </span>
          {a11yFailContrast || a11yFailLabels ? (
            <span className="text-[11px] bg-red-950/80 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <ShieldAlert className="w-3 h-3 text-red-400" />
              <span>A11y Non-Compliant</span>
            </span>
          ) : (
            <span className="text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>WCAG 2.1 AA</span>
            </span>
          )}
        </div>

        {onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-full transition shadow-md focus:ring-2 focus:ring-white"
            title="Open Testiva Admin Lab"
            aria-label="Open Testiva Chaos & Accessibility Lab"
          >
            <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Testiva Lab</span>
          </button>
        )}
      </header>

      {/* Main Login Card */}
      <main id="login-main-form" role="main" className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D9480F] text-white mb-3 shadow-lg shadow-orange-500/20"
            role="img"
            aria-label={a11yFailImages ? undefined : "FinApex Bank Security Shield"}
          >
            <Landmark className="w-8 h-8" aria-hidden={a11yFailImages ? undefined : "true"} />
          </div>

          <HeadingTag className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign In to FinApex
          </HeadingTag>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Enterprise Banking | Testiva Automation & A11y Suite
          </p>
        </div>

        {/* Server Error Alert Banner */}
        {serverError && (
          <div
            data-testid="login-error-banner"
            role={a11yFailErrorAlerts ? undefined : "alert"}
            aria-live={a11yFailErrorAlerts ? undefined : "assertive"}
            className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3 text-red-800 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold text-red-900">Authentication Error</p>
              <p className="text-xs mt-0.5 text-red-800">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email / Username Field */}
          <div className="mb-5">
            {!a11yFailLabels && (
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor={emailLoc.id}
                  className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                >
                  Email or Username <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">id: #{emailLoc.id}</span>
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id={emailLoc.id}
                name={emailLoc.name}
                data-testid={emailLoc.testId}
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                placeholder="john.doe@bank.com"
                aria-label={a11yFailLabels ? undefined : "Email or Username"}
                aria-required={a11yFailLabels ? undefined : "true"}
                aria-invalid={a11yFailLabels ? undefined : (touched.email && !isEmailValid ? "true" : "false")}
                aria-describedby={!a11yFailLabels && touched.email && !isEmailValid ? "error-login-email" : undefined}
                className={`input-field pl-10 ${touched.email && !isEmailValid ? 'input-error' : ''}`}
              />
            </div>
            {touched.email && !isEmailValid && (
              <p id="error-login-email" data-testid="error-login-email" className="field-error-text" role="alert">
                <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1.5">
              {!a11yFailLabels && (
                <label
                  htmlFor={passLoc.id}
                  className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                >
                  Password <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                </label>
              )}
              <span className="text-[10px] text-slate-500 font-mono">id: #{passLoc.id}</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id={passLoc.id}
                name={passLoc.name}
                data-testid={passLoc.testId}
                type={showPassword ? 'text' : 'password'}
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                placeholder="••••••••••••"
                aria-label={a11yFailLabels ? undefined : "Account Password"}
                aria-required={a11yFailLabels ? undefined : "true"}
                aria-invalid={a11yFailLabels ? undefined : (touched.password && !isPasswordValid ? "true" : "false")}
                aria-describedby={!a11yFailLabels && touched.password && !isPasswordValid ? "error-login-password" : undefined}
                className={`input-field pl-10 pr-10 ${touched.password && !isPasswordValid ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            {touched.password && !isPasswordValid && (
              <p id="error-login-password" data-testid="error-login-password" className="field-error-text mt-2" role="alert">
                <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                <span>{passwordError}</span>
              </p>
            )}

            {/* Password Validation Policy Checklist */}
            {touched.password && !isPasswordValid && (
              <div
                id="password-policy-checklist"
                data-testid="password-policy-checklist"
                role="region"
                aria-label="Password Requirements"
                className="mt-2.5 p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs space-y-1.5"
              >
                <p className="font-bold text-slate-800">Password Requirements:</p>
                <div className={`flex items-center gap-1.5 font-medium ${passwordLengthValid ? 'text-emerald-700' : 'text-slate-600'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 font-medium ${passwordUpperValid && passwordLowerValid ? 'text-emerald-700' : 'text-slate-600'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>Uppercase & lowercase letters</span>
                </div>
                <div className={`flex items-center gap-1.5 font-medium ${passwordNumValid && passwordSpecValid ? 'text-emerald-700' : 'text-slate-600'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>At least one number and special character</span>
                </div>
              </div>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-700">
              <input
                id="checkbox-remember-me"
                type="checkbox"
                data-testid="checkbox-remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-400 text-orange-600 focus:ring-orange-500"
              />
              <span>Remember this browser</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            id={submitLoc.id}
            name={submitLoc.name}
            data-testid={submitLoc.testId}
            type="submit"
            disabled={loading}
            aria-busy={loading ? "true" : "false"}
            className="btn-primary w-full text-base font-bold shadow-md"
          >
            {loading ? 'Authenticating...' : 'Sign In Securely'}
          </button>
        </form>

        {/* Quick Test Persona Selector for Testiva Automation */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-center mb-3">
            Quick Testiva Automation Fixtures
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="btn-autofill-john"
              onClick={() => handleAutofill('john.doe@bank.com', 'Password123!')}
              className="p-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition text-left"
              aria-label="Autofill credentials for Johnathan Doe"
            >
              <span className="block font-bold text-slate-900">Johnathan Doe</span>
              <span className="text-[11px] text-slate-600">Checking: $14.2k</span>
            </button>
            <button
              type="button"
              data-testid="btn-autofill-jane"
              onClick={() => handleAutofill('jane.smith@bank.com', 'Password123!')}
              className="p-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition text-left"
              aria-label="Autofill credentials for Jane Smith"
            >
              <span className="block font-bold text-slate-900">Jane Smith</span>
              <span className="text-[11px] text-slate-600">Checking: $8.5k</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
