import React, { useState, useEffect } from 'react';
import { Zap, Droplets, Wifi, Smartphone, CreditCard, AlertCircle, CheckCircle2, ShieldCheck, Check, Sliders } from 'lucide-react';
import { useTestiva } from '../context/TestivaContext';

export default function BillPayPage({ token }) {
  const {
    getLocator,
    locatorMode,
    a11yFailLabels,
    a11yFailHeadings,
    a11yFailImages,
    a11yFailErrorAlerts
  } = useTestiva();

  const [accounts, setAccounts] = useState([]);
  const [billers, setBillers] = useState([]);
  const [formData, setFormData] = useState({
    accountId: '',
    category: 'ELECTRICITY',
    billerId: '',
    consumerNumber: '',
    dueDate: new Date().toISOString().slice(0, 10),
    amount: '',
    autoPay: false
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [serverError, setServerError] = useState('');

  // Dynamic Testiva Locators
  const consumerLoc = getLocator('billConsumer');
  const amountLoc = getLocator('billAmount');
  const submitLoc = getLocator('billSubmit');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [accRes, bilRes] = await Promise.all([
          fetch('/api/v1/accounts', { headers }),
          fetch('/api/v1/bills/billers', { headers })
        ]);
        const accData = await accRes.json();
        const bilData = await bilRes.json();

        if (accData.data?.length > 0) {
          setAccounts(accData.data);
          setFormData(prev => ({ ...prev, accountId: accData.data[0].id }));
        }

        if (bilData.data?.length > 0) {
          setBillers(bilData.data);
          const firstInCat = bilData.data.find(b => b.category === 'ELECTRICITY') || bilData.data[0];
          setFormData(prev => ({ ...prev, billerId: firstInCat?.id || '' }));
        }
      } catch (err) {
        setServerError('Failed to fetch initial billing data');
      }
    };
    fetchData();
  }, [token]);

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const filteredBillers = billers.filter(b => b.category === formData.category);
  const selectedBiller = billers.find(b => b.id === formData.billerId);

  const validate = () => {
    const newErrors = {};

    // 1. Account ID: Mandatory, UUID
    if (!formData.accountId || String(formData.accountId).trim() === '') {
      newErrors.accountId = 'Source debit account is mandatory.';
    }

    // 2. Biller ID: Mandatory
    if (!formData.billerId || String(formData.billerId).trim() === '') {
      newErrors.billerId = 'Biller / utility provider selection is mandatory.';
    }

    // 3. Consumer Number: Mandatory, Alphanumeric string, Size 6 to 20, Regex pattern
    const consumer = String(formData.consumerNumber || '').trim();
    if (!consumer) {
      newErrors.consumerNumber = 'Consumer account / meter number is mandatory.';
    } else if (consumer.length < 6) {
      newErrors.consumerNumber = `Consumer number too short (minimum 6 characters required, entered ${consumer.length}).`;
    } else if (consumer.length > 20) {
      newErrors.consumerNumber = `Consumer number too long (maximum 20 characters permitted, entered ${consumer.length}).`;
    } else if (selectedBiller?.consumer_regex) {
      const reg = new RegExp(selectedBiller.consumer_regex);
      if (!reg.test(consumer)) {
        newErrors.consumerNumber = `Format invalid for ${selectedBiller.name}. Must match pattern: ${selectedBiller.consumer_regex} (e.g. ELEC-123456).`;
      }
    }

    // 4. Due Date: Mandatory, Valid Date, not in past
    if (!formData.dueDate || String(formData.dueDate).trim() === '') {
      newErrors.dueDate = 'Bill due date is mandatory.';
    } else if (isNaN(Date.parse(formData.dueDate))) {
      newErrors.dueDate = 'Due date must be a valid calendar date format (YYYY-MM-DD).';
    }

    // 5. Amount: Mandatory, Numeric Decimal (2 decimals), Size bounds min_amount to max_amount
    const rawAmt = String(formData.amount || '').trim();
    const numAmount = Number(rawAmt);
    if (!rawAmt) {
      newErrors.amount = 'Bill payment amount is mandatory.';
    } else if (isNaN(numAmount) || !/^\d+(\.\d{1,2})?$/.test(rawAmt)) {
      newErrors.amount = 'Bill payment amount must be a valid positive number with up to 2 decimal places.';
    } else if (selectedBiller && numAmount < selectedBiller.min_amount) {
      newErrors.amount = `Payment amount below minimum acceptable limit of $${selectedBiller.min_amount.toFixed(2)} USD for ${selectedBiller.name}.`;
    } else if (selectedBiller && numAmount > selectedBiller.max_amount) {
      newErrors.amount = `Payment amount exceeds maximum acceptable limit of $${selectedBiller.max_amount.toFixed(2)} USD for ${selectedBiller.name}.`;
    } else if (selectedAccount && numAmount > Number(selectedAccount.availableBalance)) {
      newErrors.amount = `Insufficient available account balance. Available: $${Number(selectedAccount.availableBalance).toFixed(2)}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => {
      const firstInNewCat = billers.find(b => b.category === category);
      return {
        ...prev,
        category,
        billerId: firstInNewCat?.id || '',
        consumerNumber: ''
      };
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      accountId: true,
      billerId: true,
      consumerNumber: true,
      dueDate: true,
      amount: true
    });

    if (!validate()) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await fetch('/api/v1/bills/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: formData.accountId,
          billerId: formData.billerId,
          consumerNumber: formData.consumerNumber,
          dueDate: formData.dueDate,
          amount: Number(formData.amount)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment execution failed');
      }

      setSuccessReceipt(data.data);
      setAccounts(prev => prev.map(a => a.id === formData.accountId ? { ...a, availableBalance: data.data.updatedBalance } : a));
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessReceipt(null);
    setFormData(prev => ({
      ...prev,
      consumerNumber: '',
      amount: ''
    }));
    setTouched({});
    setErrors({});
  };

  const PageHeading = a11yFailHeadings ? 'h5' : 'h2';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <PageHeading className="text-2xl font-bold text-slate-900">Utility Bill Payments</PageHeading>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Pay electricity, water, fiber internet, and mobile phone bills securely.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-300 px-3 py-1 rounded-full font-mono text-slate-700">
          <Sliders className="w-3.5 h-3.5 text-orange-600" aria-hidden={a11yFailImages ? undefined : "true"} />
          <span>Locators: <strong className="text-slate-900 uppercase">{locatorMode}</strong></span>
        </div>
      </div>

      {serverError && (
        <div
          data-testid="billpay-server-error"
          role={a11yFailErrorAlerts ? undefined : "alert"}
          aria-live={a11yFailErrorAlerts ? undefined : "assertive"}
          className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-3 text-red-800 text-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {successReceipt ? (
        <div
          data-testid="billpay-success-receipt"
          role="region"
          aria-label="Bill Payment Receipt"
          className="card p-8 text-center bg-white border-2 border-emerald-300 shadow-xl"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-300">
            <Check className="w-8 h-8" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Bill Payment Confirmed!</h3>
          <p className="text-sm text-slate-600 mt-1">Provider acknowledged the settlement.</p>

          <div className="mt-6 max-w-md mx-auto bg-slate-50 rounded-xl p-5 border border-slate-300 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Receipt Ref:</span>
              <span className="font-mono font-bold text-slate-900" data-testid="bill-receipt-ref">{successReceipt.referenceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Biller Provider:</span>
              <span className="font-bold text-slate-800">{successReceipt.billerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Amount Paid:</span>
              <span className="font-bold text-emerald-700">${Number(successReceipt.amount).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Remaining Balance:</span>
              <span className="font-bold text-slate-900">${Number(successReceipt.updatedBalance).toFixed(2)} USD</span>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button data-testid="btn-pay-another-bill" onClick={resetForm} className="btn-primary">
              Pay Another Bill
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate>
            {/* 1. Category Switcher */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                1. Select Bill Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'ELECTRICITY', label: 'Electricity', icon: Zap },
                  { id: 'WATER', label: 'Water', icon: Droplets },
                  { id: 'INTERNET', label: 'Internet', icon: Wifi },
                  { id: 'MOBILE_RECHARGE', label: 'Mobile', icon: Smartphone },
                  { id: 'CREDIT_CARD', label: 'Card Pay', icon: CreditCard }
                ].map(cat => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      data-testid={`btn-cat-${cat.id.toLowerCase()}`}
                      onClick={() => handleCategoryChange(cat.id)}
                      aria-pressed={isSelected ? "true" : "false"}
                      aria-label={`Category ${cat.label}`}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 text-center transition min-h-[50px] ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50 text-orange-950 font-bold shadow-sm'
                          : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} aria-hidden={a11yFailImages ? undefined : "true"} />
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Source Account */}
            <div className="mb-6">
              {!a11yFailLabels && (
                <label htmlFor="select-bill-account" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  2. Debit From Account <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                </label>
              )}
              <select
                id="select-bill-account"
                data-testid="select-bill-account"
                value={formData.accountId}
                onChange={(e) => setFormData(p => ({ ...p, accountId: e.target.value }))}
                aria-label={a11yFailLabels ? undefined : "Source Bank Account for Bill Settlement"}
                aria-required={a11yFailLabels ? undefined : "true"}
                className="input-field"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountType} (•••• {acc.accountNumber.slice(-4)}) — Balance: ${Number(acc.availableBalance).toFixed(2)}
                  </option>
                ))}
              </select>
              {touched.accountId && errors.accountId && (
                <p id="error-bill-account" data-testid="error-bill-account" className="field-error-text" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                  <span>{errors.accountId}</span>
                </p>
              )}
            </div>

            {/* 3. Biller Provider & Consumer Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                {!a11yFailLabels && (
                  <label htmlFor="select-biller-provider" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    3. Service Provider <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                  </label>
                )}
                <select
                  id="select-biller-provider"
                  data-testid="select-biller-provider"
                  value={formData.billerId}
                  onChange={(e) => setFormData(p => ({ ...p, billerId: e.target.value }))}
                  aria-label={a11yFailLabels ? undefined : "Select Bill Provider Company"}
                  aria-required={a11yFailLabels ? undefined : "true"}
                  className="input-field"
                >
                  {filteredBillers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  {!a11yFailLabels && (
                    <label htmlFor={consumerLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      4. Consumer / Account # <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                    </label>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">id: #{consumerLoc.id}</span>
                </div>
                <input
                  id={consumerLoc.id}
                  name={consumerLoc.name}
                  data-testid={consumerLoc.testId}
                  type="text"
                  maxLength={20}
                  placeholder={selectedBiller?.biller_code === 'CONED-PWR' ? 'ELEC-982341' : 'Consumer Account ID'}
                  value={formData.consumerNumber}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, consumerNumber: e.target.value }));
                    setTouched(p => ({ ...p, consumerNumber: true }));
                  }}
                  aria-label={a11yFailLabels ? undefined : "Consumer Account Number"}
                  aria-required={a11yFailLabels ? undefined : "true"}
                  aria-invalid={a11yFailLabels ? undefined : (touched.consumerNumber && errors.consumerNumber ? "true" : "false")}
                  aria-describedby={!a11yFailLabels && touched.consumerNumber && errors.consumerNumber ? "error-consumer-number" : undefined}
                  className={`input-field ${touched.consumerNumber && errors.consumerNumber ? 'input-error' : ''}`}
                />
                {touched.consumerNumber && errors.consumerNumber && (
                  <p id="error-consumer-number" data-testid="error-consumer-number" className="field-error-text" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                    <span>{errors.consumerNumber}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 4. Due Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                {!a11yFailLabels && (
                  <label htmlFor="input-bill-due-date" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    5. Bill Due Date <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                  </label>
                )}
                <input
                  id="input-bill-due-date"
                  data-testid="input-bill-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData(p => ({ ...p, dueDate: e.target.value }));
                    setTouched(p => ({ ...p, dueDate: true }));
                  }}
                  aria-label={a11yFailLabels ? undefined : "Bill Payment Due Date"}
                  aria-required={a11yFailLabels ? undefined : "true"}
                  aria-invalid={a11yFailLabels ? undefined : (touched.dueDate && errors.dueDate ? "true" : "false")}
                  aria-describedby={!a11yFailLabels && touched.dueDate && errors.dueDate ? "error-bill-due-date" : undefined}
                  className={`input-field ${touched.dueDate && errors.dueDate ? 'input-error' : ''}`}
                />
                {touched.dueDate && errors.dueDate && (
                  <p id="error-bill-due-date" data-testid="error-bill-due-date" className="field-error-text" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                    <span>{errors.dueDate}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  {!a11yFailLabels && (
                    <label htmlFor={amountLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      6. Bill Amount ($ USD) <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                    </label>
                  )}
                  {selectedBiller && (
                    <span className="text-xs text-slate-600 font-medium">
                      Bounds: ${selectedBiller.min_amount} - ${selectedBiller.max_amount}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-600 font-bold" aria-hidden="true">$</span>
                  <input
                    id={amountLoc.id}
                    name={amountLoc.name}
                    data-testid={amountLoc.testId}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData(p => ({ ...p, amount: e.target.value }));
                      setTouched(p => ({ ...p, amount: true }));
                    }}
                    aria-label={a11yFailLabels ? undefined : "Bill Settlement Amount"}
                    aria-required={a11yFailLabels ? undefined : "true"}
                    aria-invalid={a11yFailLabels ? undefined : (touched.amount && errors.amount ? "true" : "false")}
                    aria-describedby={!a11yFailLabels && touched.amount && errors.amount ? "error-bill-amount" : undefined}
                    className={`input-field pl-8 font-bold ${touched.amount && errors.amount ? 'input-error' : ''}`}
                  />
                </div>
                {touched.amount && errors.amount && (
                  <p id="error-bill-amount" data-testid="error-bill-amount" className="field-error-text" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                    <span>{errors.amount}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Auto Pay Toggle */}
            <div className="mb-8 p-4 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Enroll in Auto-Pay</p>
                <p className="text-xs text-slate-600">Automatically settle bills from this account 3 days before due date</p>
              </div>
              <input
                id="toggle-autopay"
                data-testid="toggle-autopay"
                type="checkbox"
                checked={formData.autoPay}
                onChange={(e) => setFormData(p => ({ ...p, autoPay: e.target.checked }))}
                aria-label="Enroll in monthly auto-pay"
                className="w-5 h-5 text-orange-600 rounded border-slate-400 focus:ring-orange-500"
              />
            </div>

            {/* Submit */}
            <button
              id={submitLoc.id}
              name={submitLoc.name}
              data-testid={submitLoc.testId}
              type="submit"
              disabled={loading}
              aria-busy={loading ? "true" : "false"}
              className="btn-primary w-full text-base font-bold shadow-md"
            >
              {loading ? 'Processing Payment...' : 'Pay Bill Now'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
