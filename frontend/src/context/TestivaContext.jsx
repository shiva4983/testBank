import React, { createContext, useContext, useState, useEffect } from 'react';

const TestivaContext = createContext(null);

const DEFAULT_LOCATORS = {
  // Login Page
  loginEmail: { id: 'login-email', name: 'email', testId: 'input-login-email' },
  loginPassword: { id: 'login-password', name: 'password', testId: 'input-login-password' },
  loginSubmit: { id: 'btn-login-submit', name: 'submitBtn', testId: 'btn-login-submit' },

  // Transfer Page
  transferSource: { id: 'select-source-acc', name: 'fromAccountId', testId: 'select-source-account' },
  transferTarget: { id: 'input-dest-acc', name: 'toAccountNumber', testId: 'input-target-account' },
  transferRouting: { id: 'input-routing-num', name: 'routingNumber', testId: 'input-routing-number' },
  transferAmount: { id: 'input-transfer-amt', name: 'amount', testId: 'input-transfer-amount' },
  transferRemarks: { id: 'input-transfer-memo', name: 'remarks', testId: 'input-transfer-remarks' },
  transferSubmit: { id: 'btn-exec-transfer', name: 'submitTransfer', testId: 'btn-transfer-submit' },

  // Bill Pay Page
  billConsumer: { id: 'input-consumer-id', name: 'consumerNumber', testId: 'input-consumer-number' },
  billAmount: { id: 'input-bill-sum', name: 'billAmount', testId: 'input-bill-amount' },
  billSubmit: { id: 'btn-settle-bill', name: 'submitBill', testId: 'btn-pay-bill-submit' }
};

const MUTATED_LOCATORS_V2 = {
  // Mutated IDs, names, and data-testids to test Testiva Locator Healing
  loginEmail: { id: 'usr_identity_v2', name: 'credential_user', testId: 'field-user-ident' },
  loginPassword: { id: 'pwd_sec_v2', name: 'auth_secret_key', testId: 'field-user-pass' },
  loginSubmit: { id: 'cta-authorize-v2', name: 'doAuthAction', testId: 'action-do-login' },

  transferSource: { id: 'src_wallet_selector', name: 'originAccount', testId: 'dropdown-from-wallet' },
  transferTarget: { id: 'dest_beneficiary_input', name: 'destAccountNo', testId: 'field-dest-account' },
  transferRouting: { id: 'aba_code_input', name: 'transitNumber', testId: 'field-aba-routing' },
  transferAmount: { id: 'fiat_value_input', name: 'fundsValue', testId: 'field-debit-amount' },
  transferRemarks: { id: 'txn_description_memo', name: 'transactionReason', testId: 'field-payment-memo' },
  transferSubmit: { id: 'cta-send-funds-v2', name: 'dispatchTransfer', testId: 'action-send-funds' },

  billConsumer: { id: 'subscriber_id_field', name: 'accountReference', testId: 'field-subscriber-acc' },
  billAmount: { id: 'settle_amount_input', name: 'payableTotal', testId: 'field-settle-amount' },
  billSubmit: { id: 'cta-process-invoice', name: 'executeBill', testId: 'action-settle-invoice' }
};

export function TestivaProvider({ children }) {
  // Locator Engine State
  const [locatorMode, setLocatorMode] = useState(() => localStorage.getItem('testiva_locator_mode') || 'default');
  const [customLocators, setCustomLocators] = useState(() => {
    try {
      const saved = localStorage.getItem('testiva_custom_locators');
      return saved ? JSON.parse(saved) : DEFAULT_LOCATORS;
    } catch {
      return DEFAULT_LOCATORS;
    }
  });

  // Chaos & Timing State
  const [renderDelayMs, setRenderDelayMs] = useState(() => Number(localStorage.getItem('testiva_render_delay') || 0));
  const [enableConsoleSpam, setEnableConsoleSpam] = useState(() => localStorage.getItem('testiva_console_spam') === 'true');
  const [apiDelayMs, setApiDelayMs] = useState(0);
  const [fakeFailure, setFakeFailure] = useState(false);
  const [failureStatusCode, setFailureStatusCode] = useState(500);
  const [failureEndpoint, setFailureEndpoint] = useState('all');
  const [failureErrorMessage, setFailureErrorMessage] = useState('Simulated 500 error triggered by Testiva Admin Lab');

  // Accessibility (a11y) Testing State (WCAG 2.1 AA Compliant vs Non-Compliant)
  const [a11yMode, setA11yMode] = useState(() => localStorage.getItem('testiva_a11y_mode') || 'compliant');
  const [a11yFailContrast, setA11yFailContrast] = useState(() => localStorage.getItem('testiva_a11y_contrast') === 'true');
  const [a11yFailLabels, setA11yFailLabels] = useState(() => localStorage.getItem('testiva_a11y_labels') === 'true');
  const [a11yFailFocus, setA11yFailFocus] = useState(() => localStorage.getItem('testiva_a11y_focus') === 'true');
  const [a11yFailHeadings, setA11yFailHeadings] = useState(() => localStorage.getItem('testiva_a11y_headings') === 'true');
  const [a11yFailImages, setA11yFailImages] = useState(() => localStorage.getItem('testiva_a11y_images') === 'true');
  const [a11yFailErrorAlerts, setA11yFailErrorAlerts] = useState(() => localStorage.getItem('testiva_a11y_alerts') === 'true');

  const toggleMasterA11yMode = (mode) => {
    setA11yMode(mode);
    localStorage.setItem('testiva_a11y_mode', mode);
    if (mode === 'non_compliant') {
      setA11yFailContrast(true);
      setA11yFailLabels(true);
      setA11yFailFocus(true);
      setA11yFailHeadings(true);
      setA11yFailImages(true);
      setA11yFailErrorAlerts(true);
      localStorage.setItem('testiva_a11y_contrast', 'true');
      localStorage.setItem('testiva_a11y_labels', 'true');
      localStorage.setItem('testiva_a11y_focus', 'true');
      localStorage.setItem('testiva_a11y_headings', 'true');
      localStorage.setItem('testiva_a11y_images', 'true');
      localStorage.setItem('testiva_a11y_alerts', 'true');
    } else {
      setA11yFailContrast(false);
      setA11yFailLabels(false);
      setA11yFailFocus(false);
      setA11yFailHeadings(false);
      setA11yFailImages(false);
      setA11yFailErrorAlerts(false);
      localStorage.setItem('testiva_a11y_contrast', 'false');
      localStorage.setItem('testiva_a11y_labels', 'false');
      localStorage.setItem('testiva_a11y_focus', 'false');
      localStorage.setItem('testiva_a11y_headings', 'false');
      localStorage.setItem('testiva_a11y_images', 'false');
      localStorage.setItem('testiva_a11y_alerts', 'false');
    }
    console.info(`[Testiva A11y Engine] Switched master accessibility mode to: ${mode}`);
  };

  // Load gateway chaos status on mount
  useEffect(() => {
    fetch('/api/v1/admin/chaos')
      .then(res => res.json())
      .then(data => {
        if (data.chaos) {
          setApiDelayMs(data.chaos.apiDelayMs || 0);
          setFakeFailure(data.chaos.fakeFailure || false);
          setFailureStatusCode(data.chaos.failureStatusCode || 500);
          setFailureEndpoint(data.chaos.failureEndpoint || 'all');
          setFailureErrorMessage(data.chaos.failureErrorMessage || '');
        }
      })
      .catch(() => {});
  }, []);

  const syncChaosToGateway = async (newConfig) => {
    try {
      await fetch('/api/v1/admin/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      console.log('[Testiva Lab] Synced chaos config to API Gateway:', newConfig);
    } catch (err) {
      console.error('[Testiva Lab] Failed syncing chaos to gateway:', err);
    }
  };

  // Periodic Browser Console Logging for Testiva test log validation
  useEffect(() => {
    if (!enableConsoleSpam) return;

    console.info('[Testiva Tracer] Telemetry logging activated.');
    const interval = setInterval(() => {
      const ts = new Date().toISOString();
      const rand = Math.random();
      if (rand < 0.6) {
        console.log(`[Testiva Tracer ${ts}] Heartbeat: Application DOM active, memory healthy, route: ${window.location.pathname}`);
      } else if (rand < 0.85) {
        console.warn(`[Testiva Tracer ${ts}] Telemetry warning: Minor UI reflow latency observed: ${(rand * 50).toFixed(1)}ms`);
      } else {
        console.error(`[Testiva Tracer ${ts}] Injected test log error: Non-fatal simulated client warning code 0x${Math.floor(rand * 1000).toString(16)}`);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [enableConsoleSpam]);

  const changeLocatorMode = (mode) => {
    setLocatorMode(mode);
    localStorage.setItem('testiva_locator_mode', mode);
    console.log(`[Testiva Locator Engine] Locator mode changed to: ${mode}`);
  };

  const updateCustomLocatorField = (key, prop, value) => {
    setCustomLocators(prev => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          [prop]: value
        }
      };
      localStorage.setItem('testiva_custom_locators', JSON.stringify(updated));
      return updated;
    });
  };

  const resetLocatorsToDefault = () => {
    setLocatorMode('default');
    setCustomLocators(DEFAULT_LOCATORS);
    localStorage.setItem('testiva_locator_mode', 'default');
    localStorage.removeItem('testiva_custom_locators');
    console.log('[Testiva Locator Engine] Locators reset to default standard.');
  };

  const getLocator = (key) => {
    if (locatorMode === 'mutated_v2') {
      return MUTATED_LOCATORS_V2[key] || DEFAULT_LOCATORS[key];
    }
    if (locatorMode === 'custom') {
      return customLocators[key] || DEFAULT_LOCATORS[key];
    }
    return DEFAULT_LOCATORS[key];
  };

  return (
    <TestivaContext.Provider
      value={{
        locatorMode,
        changeLocatorMode,
        getLocator,
        customLocators,
        updateCustomLocatorField,
        resetLocatorsToDefault,
        renderDelayMs,
        setRenderDelayMs: (val) => {
          setRenderDelayMs(val);
          localStorage.setItem('testiva_render_delay', val);
        },
        enableConsoleSpam,
        setEnableConsoleSpam: (val) => {
          setEnableConsoleSpam(val);
          localStorage.setItem('testiva_console_spam', val);
        },
        apiDelayMs,
        setApiDelayMs: (ms) => {
          setApiDelayMs(ms);
          syncChaosToGateway({ apiDelayMs: ms });
        },
        fakeFailure,
        setFakeFailure: (flag) => {
          setFakeFailure(flag);
          syncChaosToGateway({ fakeFailure: flag });
        },
        failureStatusCode,
        setFailureStatusCode: (code) => {
          setFailureStatusCode(code);
          syncChaosToGateway({ failureStatusCode: code });
        },
        failureEndpoint,
        setFailureEndpoint: (ep) => {
          setFailureEndpoint(ep);
          syncChaosToGateway({ failureEndpoint: ep });
        },
        failureErrorMessage,
        setFailureErrorMessage: (msg) => {
          setFailureErrorMessage(msg);
          syncChaosToGateway({ failureErrorMessage: msg });
        },
        syncChaosToGateway,

        // Accessibility (a11y) States & Controls
        a11yMode,
        toggleMasterA11yMode,
        a11yFailContrast,
        setA11yFailContrast: (v) => {
          setA11yFailContrast(v);
          localStorage.setItem('testiva_a11y_contrast', v);
        },
        a11yFailLabels,
        setA11yFailLabels: (v) => {
          setA11yFailLabels(v);
          localStorage.setItem('testiva_a11y_labels', v);
        },
        a11yFailFocus,
        setA11yFailFocus: (v) => {
          setA11yFailFocus(v);
          localStorage.setItem('testiva_a11y_focus', v);
        },
        a11yFailHeadings,
        setA11yFailHeadings: (v) => {
          setA11yFailHeadings(v);
          localStorage.setItem('testiva_a11y_headings', v);
        },
        a11yFailImages,
        setA11yFailImages: (v) => {
          setA11yFailImages(v);
          localStorage.setItem('testiva_a11y_images', v);
        },
        a11yFailErrorAlerts,
        setA11yFailErrorAlerts: (v) => {
          setA11yFailErrorAlerts(v);
          localStorage.setItem('testiva_a11y_alerts', v);
        }
      }}
    >
      {children}
    </TestivaContext.Provider>
  );
}

export function useTestiva() {
  return useContext(TestivaContext);
}
