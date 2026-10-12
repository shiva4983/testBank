import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, AlertCircle, HelpCircle, Shield, X, Check, Sliders } from 'lucide-react';
import { useTestiva } from '../context/TestivaContext';

export default function TransferPage({ token }) {
  const {
    getLocator,
    locatorMode,
    a11yFailLabels,
    a11yFailHeadings,
    a11yFailImages,
    a11yFailErrorAlerts
  } = useTestiva();

  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountNumber: '',
    routingNumber: '',
    recipientName: '',
    amount: '',
    remarks: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [serverError, setServerError] = useState('');

  // Dynamic Testiva Locators
  const sourceLoc = getLocator('transferSource');
  const targetLoc = getLocator('transferTarget');
  const routingLoc = getLocator('transferRouting');
  const amountLoc = getLocator('transferAmount');
  const remarksLoc = getLocator('transferRemarks');
  const submitLoc = getLocator('transferSubmit');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [accRes, benRes] = await Promise.all([
          fetch('/api/v1/accounts', { headers }),
          fetch('/api/v1/accounts/beneficiaries', { headers })
        ]);
        const accData = await accRes.json();
        const benData = await benRes.json();

        if (accData.data?.length > 0) {
          setAccounts(accData.data);
          setFormData(prev => ({ ...prev, fromAccountId: accData.data[0].id }));
        }
        if (benData.data) {
          setBeneficiaries(benData.data);
        }
      } catch (err) {
        setServerError('Failed loading initial accounts data');
      }
    };
    fetchData();
  }, [token]);

  const selectedAccount = accounts.find(a => a.id === formData.fromAccountId);

  const validate = () => {
    const newErrors = {};

    // 1. Source Account: Mandatory, UUID
    if (!formData.fromAccountId || String(formData.fromAccountId).trim() === '') {
      newErrors.fromAccountId = 'Source account selection is mandatory.';
    }

    // 2. Beneficiary Account: Mandatory, String/Numeric digits, Size 10-12
    const targetAcct = String(formData.toAccountNumber || '').trim();
    if (!targetAcct) {
      newErrors.toAccountNumber = 'Recipient account number is mandatory.';
    } else if (!/^\d+$/.test(targetAcct)) {
      newErrors.toAccountNumber = 'Recipient account number must contain numeric digits only (0-9).';
    } else if (targetAcct.length < 10) {
      newErrors.toAccountNumber = `Account number too short (minimum 10 digits required, entered ${targetAcct.length}).`;
    } else if (targetAcct.length > 12) {
      newErrors.toAccountNumber = `Account number too long (maximum 12 digits permitted, entered ${targetAcct.length}).`;
    } else if (selectedAccount && selectedAccount.accountNumber === targetAcct) {
      newErrors.toAccountNumber = 'Destination account cannot be identical to your source account.';
    }

    // 3. Routing Number: Mandatory, String/Numeric digits, Size exactly 9
    const routing = String(formData.routingNumber || '').trim();
    if (!routing) {
      newErrors.routingNumber = 'Routing number (ABA Transit) is mandatory.';
    } else if (!/^\d+$/.test(routing)) {
      newErrors.routingNumber = 'Routing number must contain numeric digits only (0-9).';
    } else if (routing.length !== 9) {
      newErrors.routingNumber = `Routing number must be exactly 9 digits (entered ${routing.length}).`;
    }

    // 4. Amount: Mandatory, Number (Decimal 2 places), Bounds $1.00 - $10,000.00
    const rawAmt = String(formData.amount || '').trim();
    const numAmount = Number(rawAmt);
    if (!rawAmt) {
      newErrors.amount = 'Transfer amount is mandatory.';
    } else if (isNaN(numAmount) || !/^\d+(\.\d{1,2})?$/.test(rawAmt)) {
      newErrors.amount = 'Transfer amount must be a valid numeric currency value with up to 2 decimal places (e.g. 150.00).';
    } else if (numAmount < 1.00) {
      newErrors.amount = 'Transfer amount must be at least $1.00 USD (minimum acceptable size).';
    } else if (numAmount > 10000.00) {
      newErrors.amount = 'Transfer amount exceeds maximum limit of $10,000.00 USD per transaction.';
    } else if (selectedAccount && numAmount > Number(selectedAccount.availableBalance)) {
      newErrors.amount = `Insufficient available funds. Current balance is $${Number(selectedAccount.availableBalance).toFixed(2)}.`;
    }

    // 5. Remarks: Mandatory, Text string, Size 3 to 100 characters
    const remarks = String(formData.remarks || '').trim();
    if (!remarks) {
      newErrors.remarks = 'Payment memo / remarks is mandatory.';
    } else if (remarks.length < 3) {
      newErrors.remarks = `Remarks must be at least 3 characters long (entered ${remarks.length}).`;
    } else if (remarks.length > 100) {
      newErrors.remarks = `Remarks cannot exceed 100 characters (entered ${remarks.length}).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    setServerError('');
  };

  const handleSelectBeneficiary = (ben) => {
    setFormData(prev => ({
      ...prev,
      toAccountNumber: ben.account_number,
      routingNumber: ben.routing_number,
      recipientName: ben.name
    }));
    setTouched(prev => ({
      ...prev,
      toAccountNumber: true,
      routingNumber: true
    }));
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    setTouched({
      fromAccountId: true,
      toAccountNumber: true,
      routingNumber: true,
      amount: true,
      remarks: true
    });

    if (validate()) {
      setShowConfirmModal(true);
    }
  };

  const handleExecuteTransfer = async () => {
    setLoading(true);
    setServerError('');
    try {
      const response = await fetch('/api/v1/transactions/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fromAccountId: formData.fromAccountId,
          toAccountNumber: formData.toAccountNumber,
          routingNumber: formData.routingNumber,
          recipientName: formData.recipientName || 'External Beneficiary',
          amount: Number(formData.amount),
          remarks: formData.remarks
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      setSuccessReceipt(data.data);
      setShowConfirmModal(false);

      setAccounts(prev => prev.map(a => a.id === formData.fromAccountId ? { ...a, availableBalance: data.data.updatedBalance } : a));
    } catch (err) {
      setServerError(err.message);
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessReceipt(null);
    setFormData({
      fromAccountId: accounts[0]?.id || '',
      toAccountNumber: '',
      routingNumber: '',
      recipientName: '',
      amount: '',
      remarks: ''
    });
    setTouched({});
    setErrors({});
  };

  const PageHeading = a11yFailHeadings ? 'h5' : 'h2';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <PageHeading className="text-2xl font-bold text-slate-900">Fund Transfer & Payments</PageHeading>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Execute fast and secure electronic ACH and wire fund transfers.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-300 px-3 py-1 rounded-full font-mono text-slate-700">
          <Sliders className="w-3.5 h-3.5 text-orange-600" aria-hidden={a11yFailImages ? undefined : "true"} />
          <span>Locators: <strong className="text-slate-900 uppercase">{locatorMode}</strong></span>
        </div>
      </div>

      {serverError && (
        <div
          data-testid="transfer-server-error"
          role={a11yFailErrorAlerts ? undefined : "alert"}
          aria-live={a11yFailErrorAlerts ? undefined : "assertive"}
          className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-3 text-red-800 text-sm font-semibold"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Success Receipt State */}
      {successReceipt ? (
        <div
          data-testid="transfer-success-receipt"
          role="region"
          aria-label="Transfer Confirmation Receipt"
          className="card p-8 text-center bg-white border-2 border-emerald-300 shadow-xl"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-300">
            <Check className="w-8 h-8" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Transfer Completed Successfully!</h3>
          <p className="text-sm text-slate-600 mt-1">Transaction recorded to ledger and CloudWatch logs.</p>

          <div className="mt-6 max-w-md mx-auto bg-slate-50 rounded-xl p-5 border border-slate-300 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Reference Number:</span>
              <span className="font-mono font-bold text-slate-900" data-testid="receipt-ref-number">{successReceipt.referenceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Amount Sent:</span>
              <span className="font-bold text-emerald-700">${Number(successReceipt.amount).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Beneficiary Account:</span>
              <span className="font-mono font-bold text-slate-800">{successReceipt.recipientAccount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Updated Source Balance:</span>
              <span className="font-bold text-slate-900">${Number(successReceipt.updatedBalance).toFixed(2)} USD</span>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              data-testid="btn-transfer-another"
              onClick={resetForm}
              className="btn-primary"
            >
              Transfer Again
            </button>
          </div>
        </div>
      ) : (
        /* Transfer Form */
        <div className="card p-6 sm:p-8">
          <form onSubmit={handleReviewSubmit} noValidate>
            {/* 1. Source Account */}
            <div className="mb-6">
              {!a11yFailLabels && (
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor={sourceLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1. Select Source Account <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">id: #{sourceLoc.id}</span>
                </div>
              )}
              <select
                id={sourceLoc.id}
                name={sourceLoc.name}
                data-testid={sourceLoc.testId}
                value={formData.fromAccountId}
                onChange={(e) => handleChange('fromAccountId', e.target.value)}
                aria-label={a11yFailLabels ? undefined : "Source Bank Account"}
                aria-required={a11yFailLabels ? undefined : "true"}
                className="input-field"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountType} (•••• {acc.accountNumber.slice(-4)}) — Available: ${Number(acc.availableBalance).toFixed(2)}
                  </option>
                ))}
              </select>
              {touched.fromAccountId && errors.fromAccountId && (
                <p id="error-source-account" data-testid="error-source-account" className="field-error-text" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                  <span>{errors.fromAccountId}</span>
                </p>
              )}
            </div>

            {/* Quick Beneficiary Pickers */}
            {beneficiaries.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Quick Select Saved Beneficiary
                </p>
                <div className="flex flex-wrap gap-2">
                  {beneficiaries.map(ben => (
                    <button
                      key={ben.id}
                      type="button"
                      data-testid={`btn-quick-ben-${ben.id}`}
                      onClick={() => handleSelectBeneficiary(ben)}
                      className="text-xs bg-slate-100 hover:bg-orange-50 hover:border-orange-400 border border-slate-300 px-3 py-1.5 rounded-lg font-semibold text-slate-800 transition min-h-[36px]"
                      aria-label={`Select beneficiary ${ben.name}`}
                    >
                      {ben.name} ({ben.nickname || ben.bank_name})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Recipient Account Number & 3. Routing Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                {!a11yFailLabels && (
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor={targetLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      2. Recipient Account # <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">id: #{targetLoc.id}</span>
                  </div>
                )}
                <input
                  id={targetLoc.id}
                  name={targetLoc.name}
                  data-testid={targetLoc.testId}
                  type="text"
                  maxLength={12}
                  placeholder="10-12 numeric digits"
                  value={formData.toAccountNumber}
                  onChange={(e) => handleChange('toAccountNumber', e.target.value)}
                  aria-label={a11yFailLabels ? undefined : "Recipient Account Number"}
                  aria-required={a11yFailLabels ? undefined : "true"}
                  aria-invalid={a11yFailLabels ? undefined : (touched.toAccountNumber && errors.toAccountNumber ? "true" : "false")}
                  aria-describedby={!a11yFailLabels && touched.toAccountNumber && errors.toAccountNumber ? "error-target-account" : undefined}
                  className={`input-field ${touched.toAccountNumber && errors.toAccountNumber ? 'input-error' : ''}`}
                />
                {touched.toAccountNumber && errors.toAccountNumber && (
                  <p id="error-target-account" data-testid="error-target-account" className="field-error-text" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                    <span>{errors.toAccountNumber}</span>
                  </p>
                )}
              </div>

              <div>
                {!a11yFailLabels && (
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor={routingLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      3. Routing Number (ABA) <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">id: #{routingLoc.id}</span>
                  </div>
                )}
                <input
                  id={routingLoc.id}
                  name={routingLoc.name}
                  data-testid={routingLoc.testId}
                  type="text"
                  maxLength={9}
                  placeholder="9 numeric digits (e.g. 021000021)"
                  value={formData.routingNumber}
                  onChange={(e) => handleChange('routingNumber', e.target.value)}
                  aria-label={a11yFailLabels ? undefined : "Routing Transit Number"}
                  aria-required={a11yFailLabels ? undefined : "true"}
                  aria-invalid={a11yFailLabels ? undefined : (touched.routingNumber && errors.routingNumber ? "true" : "false")}
                  aria-describedby={!a11yFailLabels && touched.routingNumber && errors.routingNumber ? "error-routing-number" : undefined}
                  className={`input-field ${touched.routingNumber && errors.routingNumber ? 'input-error' : ''}`}
                />
                {touched.routingNumber && errors.routingNumber && (
                  <p id="error-routing-number" data-testid="error-routing-number" className="field-error-text" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                    <span>{errors.routingNumber}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Recipient Legal Name */}
            <div className="mb-6">
              {!a11yFailLabels && (
                <label htmlFor="input-recipient-name" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Recipient Legal Name
                </label>
              )}
              <input
                id="input-recipient-name"
                data-testid="input-recipient-name"
                type="text"
                placeholder="Beneficiary individual or entity name"
                value={formData.recipientName}
                onChange={(e) => handleChange('recipientName', e.target.value)}
                aria-label={a11yFailLabels ? undefined : "Recipient Legal Name"}
                className="input-field"
              />
            </div>

            {/* 4. Amount Field */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1.5">
                {!a11yFailLabels && (
                  <label htmlFor={amountLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    4. Transfer Amount ($ USD) <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                  </label>
                )}
                {selectedAccount && (
                  <span className="text-xs text-slate-600 font-medium">
                    Max Daily Limit: <strong className="text-slate-900">$10,000.00</strong>
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
                  min="1"
                  max="10000"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  aria-label={a11yFailLabels ? undefined : "Transfer Amount in USD"}
                  aria-required={a11yFailLabels ? undefined : "true"}
                  aria-invalid={a11yFailLabels ? undefined : (touched.amount && errors.amount ? "true" : "false")}
                  aria-describedby={!a11yFailLabels && touched.amount && errors.amount ? "error-transfer-amount" : undefined}
                  className={`input-field pl-8 font-bold text-lg ${touched.amount && errors.amount ? 'input-error' : ''}`}
                />
              </div>
              {touched.amount && errors.amount && (
                <p id="error-transfer-amount" data-testid="error-transfer-amount" className="field-error-text" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                  <span>{errors.amount}</span>
                </p>
              )}
            </div>

            {/* 5. Remarks */}
            <div className="mb-8">
              {!a11yFailLabels && (
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor={remarksLoc.id} className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    5. Payment Memo / Remarks <span className="text-red-600 font-bold" aria-hidden="true">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">id: #{remarksLoc.id}</span>
                </div>
              )}
              <input
                id={remarksLoc.id}
                name={remarksLoc.name}
                data-testid={remarksLoc.testId}
                type="text"
                maxLength={100}
                placeholder="Reason for payment (3-100 characters)"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                aria-label={a11yFailLabels ? undefined : "Payment Memo or Remarks"}
                aria-required={a11yFailLabels ? undefined : "true"}
                aria-invalid={a11yFailLabels ? undefined : (touched.remarks && errors.remarks ? "true" : "false")}
                aria-describedby={!a11yFailLabels && touched.remarks && errors.remarks ? "error-transfer-remarks" : undefined}
                className={`input-field ${touched.remarks && errors.remarks ? 'input-error' : ''}`}
              />
              {touched.remarks && errors.remarks && (
                <p id="error-transfer-remarks" data-testid="error-transfer-remarks" className="field-error-text" role="alert">
                  <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
                  <span>{errors.remarks}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id={submitLoc.id}
              name={submitLoc.name}
              data-testid={submitLoc.testId}
              type="submit"
              className="btn-primary w-full text-base font-bold shadow-md"
            >
              Review & Authorize Transfer
            </button>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div data-testid="modal-transfer-confirm" role="dialog" aria-modal="true" aria-labelledby="modal-confirm-title" className="modal-backdrop">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" aria-hidden="true" />
                <h3 id="modal-confirm-title" className="font-bold text-slate-900 text-lg">Authorize Transfer</h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-500 hover:text-slate-800 p-1 rounded-lg"
                aria-label="Close transfer authorization modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Debit Amount:</span>
                <span className="text-2xl font-extrabold text-slate-900">${Number(formData.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">From Account:</span>
                <span className="font-bold text-slate-800">•••• {selectedAccount?.accountNumber.slice(-4)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">To Account:</span>
                <span className="font-mono font-bold text-slate-800">{formData.toAccountNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Routing Number:</span>
                <span className="font-mono font-bold text-slate-800">{formData.routingNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Transfer Fee:</span>
                <span className="font-bold text-emerald-700">$0.00 (Free)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Memo:</span>
                <span className="italic font-medium text-slate-800">{formData.remarks}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                data-testid="btn-cancel-transfer"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary w-1/2"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="btn-confirm-transfer"
                disabled={loading}
                aria-busy={loading ? "true" : "false"}
                onClick={handleExecuteTransfer}
                className="btn-primary w-1/2"
              >
                {loading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
