import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, CreditCard, Send, Receipt, History, AlertCircle, RefreshCw } from 'lucide-react';
import { useTestiva } from '../context/TestivaContext';

export default function DashboardPage({ token, onNavigate }) {
  const { a11yFailImages, a11yFailHeadings, a11yFailErrorAlerts } = useTestiva();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({ totalBalance: 0, activeAccounts: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const accRes = await fetch('/api/v1/accounts', { headers });
      const accData = await accRes.json();
      if (!accRes.ok) throw new Error(accData.message || 'Failed loading accounts');

      setAccounts(accData.data || []);
      setSummary(accData.summary || { totalBalance: 0, activeAccounts: 0 });

      const txnRes = await fetch('/api/v1/transactions?limit=5', { headers });
      const txnData = await txnRes.json();
      if (txnRes.ok) {
        setRecentTxns(txnData.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const MainHeading = a11yFailHeadings ? 'h5' : 'h1';
  const SubHeading = a11yFailHeadings ? 'h6' : 'h2';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-700">Loading your banking portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome & Net Balance Banner */}
      <section aria-labelledby="portfolio-summary-heading" className="bg-gradient-to-r from-[#0B192C] to-[#1E3E62] rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span id="portfolio-summary-heading" className="inline-block text-xs font-bold tracking-wider uppercase bg-orange-500/20 text-orange-300 border border-orange-500/30 px-3 py-1 rounded-full mb-2">
              Portfolio Overview
            </span>
            <MainHeading className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="total-net-balance">
              ${summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-lg font-bold text-slate-300 ml-2">USD</span>
            </MainHeading>
            <p className="text-slate-200 text-sm mt-1 font-medium">
              Consolidated available balance across {accounts.length} active banking accounts
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              data-testid="btn-quick-transfer"
              onClick={() => onNavigate('transfers')}
              className="btn-primary text-sm px-5 py-2.5 shadow-md"
              aria-label="Send money via fund transfer"
            >
              <Send className="w-4 h-4" aria-hidden={a11yFailImages ? undefined : "true"} />
              <span>Send Money</span>
            </button>
            <button
              data-testid="btn-quick-billpay"
              onClick={() => onNavigate('bill-pay')}
              className="btn-secondary text-sm px-5 py-2.5 bg-white/10 text-white border-white/40 hover:bg-white/20"
              aria-label="Pay utility bills"
            >
              <Receipt className="w-4 h-4 text-orange-300" aria-hidden={a11yFailImages ? undefined : "true"} />
              <span>Pay Bills</span>
            </button>
            <button
              data-testid="btn-quick-statement"
              onClick={() => onNavigate('transactions')}
              className="btn-secondary text-sm px-5 py-2.5 bg-white/10 text-white border-white/40 hover:bg-white/20"
              aria-label="View transaction statements"
            >
              <History className="w-4 h-4 text-slate-200" aria-hidden={a11yFailImages ? undefined : "true"} />
              <span>Statements</span>
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role={a11yFailErrorAlerts ? undefined : "alert"}
          aria-live={a11yFailErrorAlerts ? undefined : "assertive"}
          className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-3 text-red-800 text-sm font-medium"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Account Cards Grid */}
      <section aria-labelledby="accounts-section-heading">
        <div className="flex items-center justify-between mb-4">
          <SubHeading id="accounts-section-heading" className="text-xl font-bold text-slate-900">
            Your Accounts
          </SubHeading>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 px-3 py-1 rounded-full">
            {accounts.length} Active Accounts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {accounts.map((acc, index) => (
            <article
              key={acc.id}
              data-testid={`card-account-${index}`}
              aria-label={`${acc.accountType} Account ending in ${acc.accountNumber.slice(-4)}`}
              className="card p-5 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#1E3E62]">
                  {acc.accountType === 'CHECKING' && <Wallet className="w-5 h-5" aria-hidden="true" />}
                  {acc.accountType === 'SAVINGS' && <CreditCard className="w-5 h-5 text-emerald-700" aria-hidden="true" />}
                  {acc.accountType === 'CREDIT' && <CreditCard className="w-5 h-5 text-purple-700" aria-hidden="true" />}
                </div>
                <span data-testid={`badge-status-${index}`} className={acc.status === 'ACTIVE' ? 'badge-active' : 'badge-frozen'}>
                  {acc.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {acc.accountType} ACCOUNT
                </p>
                <p className="text-xs font-mono font-medium text-slate-500 mt-0.5" data-testid={`acc-number-${index}`}>
                  •••• {acc.accountNumber.slice(-4)}
                </p>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-slate-900" data-testid={`acc-balance-${index}`}>
                    ${Number(acc.availableBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
                  <span>Daily Transfer Limit:</span>
                  <span className="font-bold text-slate-800">${Number(acc.dailyTransferLimit).toLocaleString()}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Recent Activity Table */}
      <section aria-labelledby="recent-activity-heading" className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 id="recent-activity-heading" className="text-lg font-bold text-slate-900">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-600">Real-time ledger events recorded across microservices</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-bold text-orange-700 hover:text-orange-900 flex items-center gap-1 focus:ring-2 focus:ring-orange-500 p-1 rounded"
            aria-label="View full statement history"
          >
            <span>View Full Statement</span>
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm" aria-label="Recent Account Transactions">
            <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4">Reference</th>
                <th scope="col" className="py-3 px-4">Recipient / Description</th>
                <th scope="col" className="py-3 px-4">Type</th>
                <th scope="col" className="py-3 px-4">Amount</th>
                <th scope="col" className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentTxns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500 text-sm">
                    No recent transactions found.
                  </td>
                </tr>
              ) : (
                recentTxns.map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 font-semibold">{tx.reference_number}</td>
                    <td className="py-3.5 px-4 text-slate-900">
                      <div className="font-bold">{tx.recipient_name || tx.to_account_number}</div>
                      <div className="text-xs text-slate-500">{tx.remarks}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      -${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="badge-active">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
