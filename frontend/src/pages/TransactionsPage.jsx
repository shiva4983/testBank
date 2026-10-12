import React, { useState, useEffect } from 'react';
import { Download, FileText, Filter, Search, RotateCcw, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { useTestiva } from '../context/TestivaContext';

export default function TransactionsPage({ token }) {
  const { a11yFailImages, a11yFailHeadings, a11yFailErrorAlerts } = useTestiva();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'ALL',
    minAmount: '',
    maxAmount: '',
    search: ''
  });
  const [filterError, setFilterError] = useState('');
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

  const validateFilters = () => {
    const errors = {};

    // 1. Start Date (Date format, not future > 1 year)
    if (filters.startDate) {
      if (isNaN(Date.parse(filters.startDate))) {
        errors.startDate = 'Start date must be a valid calendar date (YYYY-MM-DD).';
      }
    }

    // 2. End Date (Date format)
    if (filters.endDate) {
      if (isNaN(Date.parse(filters.endDate))) {
        errors.endDate = 'End date must be a valid calendar date (YYYY-MM-DD).';
      }
    }

    // 3. Date Range Comparison & Max Span (365 days)
    if (filters.startDate && filters.endDate && !errors.startDate && !errors.endDate) {
      const s = new Date(filters.startDate);
      const e = new Date(filters.endDate);
      if (s > e) {
        errors.startDate = 'Start date cannot be after End date.';
      }
      const days = (e - s) / (1000 * 60 * 60 * 24);
      if (days > 365) {
        errors.endDate = `Date range cannot exceed 365 days (selected range is ${Math.round(days)} days).`;
      }
    }

    // 4. Min Amount: Number, non-negative, acceptable size <= 1,000,000
    if (filters.minAmount !== '') {
      const min = Number(filters.minAmount);
      if (isNaN(min)) {
        errors.minAmount = 'Minimum amount must be a valid numeric dollar value.';
      } else if (min < 0) {
        errors.minAmount = 'Minimum amount cannot be negative.';
      } else if (min > 1000000) {
        errors.minAmount = 'Minimum amount exceeds allowable filter bound ($1,000,000).';
      }
    }

    // 5. Max Amount: Number, non-negative, acceptable size <= 1,000,000
    if (filters.maxAmount !== '') {
      const max = Number(filters.maxAmount);
      if (isNaN(max)) {
        errors.maxAmount = 'Maximum amount must be a valid numeric dollar value.';
      } else if (max < 0) {
        errors.maxAmount = 'Maximum amount cannot be negative.';
      } else if (max > 1000000) {
        errors.maxAmount = 'Maximum amount exceeds allowable filter bound ($1,000,000).';
      }
    }

    // 6. Min/Max comparison
    if (filters.minAmount !== '' && filters.maxAmount !== '' && !errors.minAmount && !errors.maxAmount) {
      if (Number(filters.minAmount) > Number(filters.maxAmount)) {
        errors.minAmount = 'Minimum amount cannot be greater than Maximum amount.';
      }
    }

    // 7. Search Keyword: Acceptable size <= 50 characters
    if (filters.search && filters.search.length > 50) {
      errors.search = `Search keyword cannot exceed 50 characters (entered ${filters.search.length}).`;
    }

    setFieldErrors(errors);
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setFilterError(Object.values(errors)[0]);
      return false;
    }

    setFilterError('');
    return true;
  };

  const fetchTransactions = async (page = 1) => {
    if (!validateFilters()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10'
      });

      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
      if (filters.minAmount) params.append('minAmount', filters.minAmount);
      if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
      if (filters.search) params.append('search', filters.search);

      const res = await fetch(`/api/v1/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.data || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err) {
      setFilterError('Error loading statement transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [token]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: 'ALL',
      minAmount: '',
      maxAmount: '',
      search: ''
    });
    setFilterError('');
    setTimeout(() => fetchTransactions(1), 50);
  };

  const buildFilterQueryParams = () => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters.minAmount) params.append('minAmount', filters.minAmount);
    if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
    if (filters.search) params.append('search', filters.search);
    return params.toString();
  };

  const handleExportCSV = async () => {
    try {
      const q = buildFilterQueryParams();
      const url = `/api/v1/transactions/statement/export/csv${q ? `?${q}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `finapex-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed downloading statement CSV: ' + err.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      const q = buildFilterQueryParams();
      const url = `/api/v1/transactions/statement/export/pdf${q ? `?${q}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export PDF');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `finapex-statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed downloading statement PDF: ' + err.message);
    }
  };

  const PageHeading = a11yFailHeadings ? 'h5' : 'h2';

  return (
    <div className="space-y-6">
      {/* Page Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeading className="text-2xl font-bold text-slate-900">Statements & Audit Ledger</PageHeading>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Real-time multi-account audit logs and compliance transaction statements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            data-testid="btn-export-csv"
            onClick={handleExportCSV}
            className="btn-secondary text-sm px-3.5 py-2 font-bold"
            aria-label="Export transaction statement as CSV file"
          >
            <Download className="w-4 h-4 text-emerald-600" aria-hidden={a11yFailImages ? undefined : "true"} />
            <span>Export CSV</span>
          </button>
          <button
            data-testid="btn-export-pdf"
            onClick={handleExportPDF}
            className="btn-primary text-sm px-3.5 py-2 font-bold bg-blue-700 hover:bg-blue-800 text-white inline-flex items-center gap-2"
            aria-label="Export transaction statement as PDF document"
          >
            <FileText className="w-4 h-4 text-white" aria-hidden={a11yFailImages ? undefined : "true"} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <section aria-label="Statement Search and Filters" className="card p-5 bg-white">
        <form onSubmit={handleApplyFilter} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
            {/* Start Date */}
            <div>
              <label htmlFor="filter-start-date" className="block text-xs font-bold uppercase text-slate-700 mb-1">From Date</label>
              <input
                id="filter-start-date"
                data-testid="input-filter-start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(p => ({ ...p, startDate: e.target.value }))}
                aria-label="Filter transactions from start date"
                className="input-field text-xs py-2 min-h-[38px]"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="filter-end-date" className="block text-xs font-bold uppercase text-slate-700 mb-1">To Date</label>
              <input
                id="filter-end-date"
                data-testid="input-filter-end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(p => ({ ...p, endDate: e.target.value }))}
                aria-label="Filter transactions up to end date"
                className="input-field text-xs py-2 min-h-[38px]"
              />
            </div>

            {/* Transaction Type */}
            <div>
              <label htmlFor="filter-type" className="block text-xs font-bold uppercase text-slate-700 mb-1">Type</label>
              <select
                id="filter-type"
                data-testid="select-filter-type"
                value={filters.type}
                onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
                aria-label="Filter by transaction type"
                className="input-field text-xs py-2 min-h-[38px]"
              >
                <option value="ALL">All Types</option>
                <option value="TRANSFER">Transfers</option>
                <option value="BILL_PAYMENT">Bill Payments</option>
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label htmlFor="filter-min-amount" className="block text-xs font-bold uppercase text-slate-700 mb-1">Min ($)</label>
              <input
                id="filter-min-amount"
                data-testid="input-filter-min-amount"
                type="number"
                placeholder="0.00"
                value={filters.minAmount}
                onChange={(e) => setFilters(p => ({ ...p, minAmount: e.target.value }))}
                aria-label="Filter minimum dollar amount"
                className="input-field text-xs py-2 min-h-[38px]"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label htmlFor="filter-max-amount" className="block text-xs font-bold uppercase text-slate-700 mb-1">Max ($)</label>
              <input
                id="filter-max-amount"
                data-testid="input-filter-max-amount"
                type="number"
                placeholder="10,000"
                value={filters.maxAmount}
                onChange={(e) => setFilters(p => ({ ...p, maxAmount: e.target.value }))}
                aria-label="Filter maximum dollar amount"
                className="input-field text-xs py-2 min-h-[38px]"
              />
            </div>

            {/* Keyword Search */}
            <div>
              <label htmlFor="filter-search" className="block text-xs font-bold uppercase text-slate-700 mb-1">Search</label>
              <input
                id="filter-search"
                data-testid="input-filter-search"
                type="text"
                maxLength={50}
                placeholder="Ref # or memo"
                value={filters.search}
                onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                aria-label="Search by reference number or memo"
                className="input-field text-xs py-2 min-h-[38px]"
              />
            </div>
          </div>

          {/* Validation Error Banner */}
          {filterError && (
            <div
              data-testid="filter-error-banner"
              role={a11yFailErrorAlerts ? undefined : "alert"}
              aria-live={a11yFailErrorAlerts ? undefined : "assertive"}
              className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-xs text-red-800 font-bold"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" aria-hidden="true" />
              <span>{filterError}</span>
            </div>
          )}

          {/* Filter Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              data-testid="btn-filter-reset"
              onClick={handleResetFilters}
              className="btn-secondary text-xs px-3.5 py-1.5 min-h-[36px]"
              aria-label="Reset all search filters"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
            <button
              type="submit"
              data-testid="btn-filter-apply"
              className="btn-primary text-xs px-4 py-1.5 min-h-[36px]"
              aria-label="Apply statement search filters"
            >
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </section>

      {/* Ledger Table */}
      <section aria-label="Transaction Audit Records" className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="table-transactions" aria-label="Transaction Audit Records">
            <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4">Reference Number</th>
                <th scope="col" className="py-3 px-4">Timestamp</th>
                <th scope="col" className="py-3 px-4">Recipient / Details</th>
                <th scope="col" className="py-3 px-4">Type</th>
                <th scope="col" className="py-3 px-4 text-right">Amount (USD)</th>
                <th scope="col" className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600 text-sm font-semibold">
                    Filtering transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-sm" data-testid="empty-transactions-notice">
                    No transactions matched your selected criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={tx.id || idx} data-testid={`row-tx-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800">
                      {tx.reference_number}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{tx.recipient_name || tx.to_account_number}</div>
                      <div className="text-xs text-slate-500">{tx.remarks}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      -${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={tx.status === 'COMPLETED' ? 'badge-active' : 'badge-frozen'}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <nav aria-label="Transaction Pagination" className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
          <div>
            Showing <strong className="font-bold text-slate-900">{transactions.length}</strong> of{' '}
            <strong className="font-bold text-slate-900">{pagination.total}</strong> records
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="btn-page-prev"
              disabled={pagination.page <= 1}
              onClick={() => fetchTransactions(pagination.page - 1)}
              aria-label="Previous page of transactions"
              className="p-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 min-h-[36px]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span>
              Page <strong data-testid="page-current" className="font-bold text-slate-900">{pagination.page}</strong> of{' '}
              <strong data-testid="page-total" className="font-bold text-slate-900">{pagination.totalPages}</strong>
            </span>
            <button
              data-testid="btn-page-next"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchTransactions(pagination.page + 1)}
              aria-label="Next page of transactions"
              className="p-2 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-100 min-h-[36px]"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </section>
    </div>
  );
}
