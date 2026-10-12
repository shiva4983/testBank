const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { createServiceLogger } = require('../shared/logger');
const { store, getErrorMessage } = require('../shared/db');
const { authenticateToken } = require('../shared/authMiddleware');

const app = express();
const PORT = process.env.PORT || 9003;
const logger = createServiceLogger('transaction-service');

app.use(cors());
app.use(express.json());

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}`;
  next();
});

// ============================================================================
// 1. FUND TRANSFER ENDPOINT
// ============================================================================
app.post('/api/v1/transactions/transfer', authenticateToken, (req, res) => {
  const { fromAccountId, toAccountNumber, routingNumber, recipientName, amount, remarks } = req.body;
  const correlationId = req.correlationId;
  const errors = [];

  logger.info('Processing fund transfer request', { correlationId, userId: req.user.id, fromAccountId, amount });

  // 1. Source Account Validation: Mandatory, String UUID
  if (!fromAccountId || typeof fromAccountId !== 'string' || fromAccountId.trim() === '') {
    errors.push({ field: 'fromAccountId', message: getErrorMessage('TRANSFERS', 'fromAccountId', 'MANDATORY') });
  } else {
    const sourceAccount = store.accounts.find(a => a.id === fromAccountId && a.user_id === req.user.id);
    if (!sourceAccount) {
      errors.push({ field: 'fromAccountId', message: getErrorMessage('TRANSFERS', 'fromAccountId', 'NOT_FOUND') });
    } else if (sourceAccount.status !== 'ACTIVE') {
      errors.push({ field: 'fromAccountId', message: getErrorMessage('TRANSFERS', 'fromAccountId', 'INACTIVE', { status: sourceAccount.status }) });
    }
  }
  const sourceAccount = store.accounts.find(a => a.id === fromAccountId && a.user_id === req.user.id);

  // 2. Beneficiary Account Validation: Mandatory, Numeric string, Size 10-12
  const strToAccount = String(toAccountNumber || '').trim();
  if (!toAccountNumber || strToAccount === '') {
    errors.push({ field: 'toAccountNumber', message: getErrorMessage('TRANSFERS', 'toAccountNumber', 'MANDATORY') });
  } else if (!/^\d+$/.test(strToAccount)) {
    errors.push({ field: 'toAccountNumber', message: getErrorMessage('TRANSFERS', 'toAccountNumber', 'TYPE_NUMERIC') });
  } else if (strToAccount.length < 10) {
    errors.push({ field: 'toAccountNumber', message: getErrorMessage('TRANSFERS', 'toAccountNumber', 'MIN_LENGTH', { min: 10, actual: strToAccount.length }) });
  } else if (strToAccount.length > 12) {
    errors.push({ field: 'toAccountNumber', message: getErrorMessage('TRANSFERS', 'toAccountNumber', 'MAX_LENGTH', { max: 12, actual: strToAccount.length }) });
  } else if (sourceAccount && sourceAccount.account_number === strToAccount) {
    errors.push({ field: 'toAccountNumber', message: getErrorMessage('TRANSFERS', 'toAccountNumber', 'SAME_ACCOUNT') });
  }

  // 3. Routing Number Validation: Mandatory, Numeric string, Size exactly 9
  const strRouting = String(routingNumber || '').trim();
  if (!routingNumber || strRouting === '') {
    errors.push({ field: 'routingNumber', message: getErrorMessage('TRANSFERS', 'routingNumber', 'MANDATORY') });
  } else if (!/^\d+$/.test(strRouting)) {
    errors.push({ field: 'routingNumber', message: getErrorMessage('TRANSFERS', 'routingNumber', 'TYPE_NUMERIC') });
  } else if (strRouting.length !== 9) {
    errors.push({ field: 'routingNumber', message: getErrorMessage('TRANSFERS', 'routingNumber', 'EXACT_LENGTH', { len: 9, actual: strRouting.length }) });
  }

  // 4. Amount Validation: Mandatory, Number, Size bounds $1.00 - $10,000.00
  let parsedAmount = 0;
  if (amount === undefined || amount === null || String(amount).trim() === '') {
    errors.push({ field: 'amount', message: getErrorMessage('TRANSFERS', 'amount', 'MANDATORY') });
  } else {
    parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !/^\d+(\.\d{1,2})?$/.test(String(amount).trim())) {
      errors.push({ field: 'amount', message: getErrorMessage('TRANSFERS', 'amount', 'TYPE_DECIMAL') });
    } else if (parsedAmount < 1.00) {
      errors.push({ field: 'amount', message: getErrorMessage('TRANSFERS', 'amount', 'MIN_BOUND', { min: '1.00' }) });
    } else if (parsedAmount > 10000.00) {
      errors.push({ field: 'amount', message: getErrorMessage('TRANSFERS', 'amount', 'MAX_BOUND', { max: '10,000.00' }) });
    } else if (sourceAccount && parsedAmount > Number(sourceAccount.available_balance)) {
      errors.push({
        field: 'amount',
        message: getErrorMessage('TRANSFERS', 'amount', 'INSUFFICIENT_FUNDS', { balance: Number(sourceAccount.available_balance).toFixed(2) })
      });
    }
  }

  // 5. Remarks Validation: Mandatory, String, Size 3 - 100
  if (remarks === undefined || remarks === null || typeof remarks !== 'string' || remarks.trim() === '') {
    errors.push({ field: 'remarks', message: getErrorMessage('TRANSFERS', 'remarks', 'MANDATORY') });
  } else if (remarks.trim().length < 3) {
    errors.push({ field: 'remarks', message: getErrorMessage('TRANSFERS', 'remarks', 'MIN_LENGTH', { min: 3, actual: remarks.trim().length }) });
  } else if (remarks.trim().length > 100) {
    errors.push({ field: 'remarks', message: getErrorMessage('TRANSFERS', 'remarks', 'MAX_LENGTH', { max: 100, actual: remarks.trim().length }) });
  }

  if (errors.length > 0) {
    logger.warn('Transfer rejected due to validation errors', { correlationId, errors });
    return res.status(400).json({
      success: false,
      message: 'Field validation error during transfer execution.',
      errors
    });
  }

  // Execute debit
  sourceAccount.balance = parseFloat((Number(sourceAccount.balance) - parsedAmount).toFixed(2));
  sourceAccount.available_balance = parseFloat((Number(sourceAccount.available_balance) - parsedAmount).toFixed(2));

  // Generate Reference Number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randSeq = Math.floor(1000 + Math.random() * 9000);
  const referenceNumber = `TXN-${dateStr}-${randSeq}`;

  const newTxn = {
    id: `tx-${Date.now()}`,
    reference_number: referenceNumber,
    from_account_id: sourceAccount.id,
    to_account_number: toAccountNumber,
    to_routing_number: routingNumber,
    recipient_name: recipientName || 'External Beneficiary',
    amount: parsedAmount,
    fee: 0.00,
    currency: 'USD',
    type: 'TRANSFER',
    status: 'COMPLETED',
    remarks: remarks.trim(),
    biller_id: null,
    correlation_id: correlationId,
    created_at: new Date().toISOString()
  };

  store.transactions.unshift(newTxn);

  logger.info('Transfer completed successfully', {
    correlationId,
    referenceNumber,
    fromAccount: sourceAccount.account_number,
    toAccount: toAccountNumber,
    amount: parsedAmount,
    newBalance: sourceAccount.available_balance
  });

  return res.status(201).json({
    success: true,
    message: 'Fund transfer executed successfully.',
    data: {
      referenceNumber: newTxn.reference_number,
      status: newTxn.status,
      amount: newTxn.amount,
      fee: newTxn.fee,
      sourceAccount: sourceAccount.account_number,
      recipientAccount: newTxn.to_account_number,
      updatedBalance: sourceAccount.available_balance,
      timestamp: newTxn.created_at
    }
  });
});

// ============================================================================
// 2. BILL PAYMENT SERVICES
// ============================================================================
app.get('/api/v1/bills/billers', authenticateToken, (req, res) => {
  res.json({ success: true, data: store.billers.filter(b => b.is_active) });
});

app.post('/api/v1/bills/pay', authenticateToken, (req, res) => {
  const { accountId, billerId, consumerNumber, dueDate, amount } = req.body;
  const correlationId = req.correlationId;
  const errors = [];

  logger.info('Processing utility bill payment', { correlationId, userId: req.user.id, billerId, amount });

  // 1. Account Validation: Mandatory, String UUID
  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    errors.push({ field: 'accountId', message: getErrorMessage('BILL_PAY', 'accountId', 'MANDATORY') });
  } else {
    const account = store.accounts.find(a => a.id === accountId && a.user_id === req.user.id);
    if (!account) {
      errors.push({ field: 'accountId', message: getErrorMessage('BILL_PAY', 'accountId', 'NOT_FOUND') });
    } else if (account.status !== 'ACTIVE') {
      errors.push({ field: 'accountId', message: getErrorMessage('BILL_PAY', 'accountId', 'INACTIVE', { status: account.status }) });
    }
  }
  const account = store.accounts.find(a => a.id === accountId && a.user_id === req.user.id);

  // 2. Biller Selection: Mandatory
  if (!billerId || typeof billerId !== 'string' || billerId.trim() === '') {
    errors.push({ field: 'billerId', message: getErrorMessage('BILL_PAY', 'billerId', 'MANDATORY') });
  }
  const biller = store.billers.find(b => b.id === billerId && b.is_active);
  if (billerId && !biller) {
    errors.push({ field: 'billerId', message: getErrorMessage('BILL_PAY', 'billerId', 'NOT_FOUND') });
  }

  // 3. Consumer Number: Mandatory, Alphanumeric string, Size 6-20, Regex
  const strConsumer = String(consumerNumber || '').trim();
  if (!consumerNumber || strConsumer === '') {
    errors.push({ field: 'consumerNumber', message: getErrorMessage('BILL_PAY', 'consumerNumber', 'MANDATORY') });
  } else if (strConsumer.length < 6) {
    errors.push({ field: 'consumerNumber', message: getErrorMessage('BILL_PAY', 'consumerNumber', 'MIN_LENGTH', { min: 6, actual: strConsumer.length }) });
  } else if (strConsumer.length > 20) {
    errors.push({ field: 'consumerNumber', message: getErrorMessage('BILL_PAY', 'consumerNumber', 'MAX_LENGTH', { max: 20, actual: strConsumer.length }) });
  } else if (biller && biller.consumer_regex) {
    const regex = new RegExp(biller.consumer_regex);
    if (!regex.test(strConsumer)) {
      errors.push({
        field: 'consumerNumber',
        message: getErrorMessage('BILL_PAY', 'consumerNumber', 'REGEX_MISMATCH', { billerName: biller.name, regex: biller.consumer_regex })
      });
    }
  }

  // 4. Amount Validation: Mandatory, Number, Size bounds min_amount to max_amount
  let parsedBillAmount = 0;
  if (amount === undefined || amount === null || String(amount).trim() === '') {
    errors.push({ field: 'amount', message: getErrorMessage('BILL_PAY', 'amount', 'MANDATORY') });
  } else {
    parsedBillAmount = Number(amount);
    if (isNaN(parsedBillAmount) || !/^\d+(\.\d{1,2})?$/.test(String(amount).trim())) {
      errors.push({ field: 'amount', message: getErrorMessage('BILL_PAY', 'amount', 'TYPE_DECIMAL') });
    } else if (biller && parsedBillAmount < biller.min_amount) {
      errors.push({ field: 'amount', message: getErrorMessage('BILL_PAY', 'amount', 'MIN_BOUND', { min: biller.min_amount.toFixed(2), billerName: biller.name }) });
    } else if (biller && parsedBillAmount > biller.max_amount) {
      errors.push({ field: 'amount', message: getErrorMessage('BILL_PAY', 'amount', 'MAX_BOUND', { max: biller.max_amount.toFixed(2), billerName: biller.name }) });
    } else if (account && parsedBillAmount > Number(account.available_balance)) {
      errors.push({
        field: 'amount',
        message: getErrorMessage('BILL_PAY', 'amount', 'INSUFFICIENT_FUNDS', { balance: Number(account.available_balance).toFixed(2) })
      });
    }
  }

  // 5. Due Date: Mandatory, Valid Date format
  if (!dueDate || String(dueDate).trim() === '') {
    errors.push({ field: 'dueDate', message: getErrorMessage('BILL_PAY', 'dueDate', 'MANDATORY') });
  } else if (isNaN(Date.parse(dueDate))) {
    errors.push({ field: 'dueDate', message: getErrorMessage('BILL_PAY', 'dueDate', 'INVALID_DATE') });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed for bill payment.', errors });
  }

  // Deduct balance
  account.balance = parseFloat((Number(account.balance) - parsedBillAmount).toFixed(2));
  account.available_balance = parseFloat((Number(account.available_balance) - parsedBillAmount).toFixed(2));

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randSeq = Math.floor(1000 + Math.random() * 9000);
  const referenceNumber = `BILL-${dateStr}-${randSeq}`;

  const newTxn = {
    id: `tx-${Date.now()}`,
    reference_number: referenceNumber,
    from_account_id: account.id,
    to_account_number: biller.biller_code,
    to_routing_number: null,
    recipient_name: biller.name,
    amount: parsedBillAmount,
    fee: 0.00,
    currency: 'USD',
    type: 'BILL_PAYMENT',
    status: 'COMPLETED',
    remarks: `Bill Payment - ${biller.name} (${consumerNumber})`,
    biller_id: biller.id,
    correlation_id: correlationId,
    created_at: new Date().toISOString()
  };

  store.transactions.unshift(newTxn);

  const billRecord = {
    id: `bp-${Date.now()}`,
    transaction_id: newTxn.id,
    user_id: req.user.id,
    biller_id: biller.id,
    consumer_number: consumerNumber,
    due_date: dueDate,
    paid_amount: parsedBillAmount,
    status: 'PAID',
    created_at: new Date().toISOString()
  };

  store.bill_payments.push(billRecord);

  logger.info('Bill payment successful', { correlationId, referenceNumber, biller: biller.name, amount: parsedBillAmount });

  return res.status(201).json({
    success: true,
    message: 'Bill paid successfully.',
    data: {
      referenceNumber: newTxn.reference_number,
      billerName: biller.name,
      amount: newTxn.amount,
      updatedBalance: account.available_balance,
      timestamp: newTxn.created_at
    }
  });
});

// ============================================================================
// 3. TRANSACTIONS & STATEMENT SEARCH
// ============================================================================
app.get('/api/v1/transactions', authenticateToken, (req, res) => {
  const { startDate, endDate, type, minAmount, maxAmount, search, page = 1, limit = 10 } = req.query;
  const errors = [];

  // Date Range Validations
  if (startDate && isNaN(Date.parse(startDate))) {
    errors.push({ field: 'startDate', message: getErrorMessage('STATEMENTS', 'startDate', 'INVALID_DATE') });
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    errors.push({ field: 'endDate', message: getErrorMessage('STATEMENTS', 'endDate', 'INVALID_DATE') });
  }
  if (startDate && endDate && !isNaN(Date.parse(startDate)) && !isNaN(Date.parse(endDate))) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s > e) {
      errors.push({ field: 'startDate', message: getErrorMessage('STATEMENTS', 'startDate', 'DATE_ORDER') });
    }
    const diffDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      errors.push({ field: 'endDate', message: getErrorMessage('STATEMENTS', 'endDate', 'MAX_SPAN', { days: diffDays }) });
    }
  }

  // Min/Max Amount Validations
  if (minAmount && isNaN(Number(minAmount))) {
    errors.push({ field: 'minAmount', message: getErrorMessage('STATEMENTS', 'minAmount', 'TYPE_NUMERIC') });
  } else if (minAmount && Number(minAmount) < 0) {
    errors.push({ field: 'minAmount', message: getErrorMessage('STATEMENTS', 'minAmount', 'NON_NEGATIVE') });
  }

  if (maxAmount && isNaN(Number(maxAmount))) {
    errors.push({ field: 'maxAmount', message: getErrorMessage('STATEMENTS', 'maxAmount', 'TYPE_NUMERIC') });
  } else if (maxAmount && Number(maxAmount) < 0) {
    errors.push({ field: 'maxAmount', message: getErrorMessage('STATEMENTS', 'maxAmount', 'NON_NEGATIVE') });
  }

  if (minAmount && maxAmount && !isNaN(Number(minAmount)) && !isNaN(Number(maxAmount))) {
    if (Number(minAmount) > Number(maxAmount)) {
      errors.push({ field: 'minAmount', message: getErrorMessage('STATEMENTS', 'minAmount', 'RANGE_ORDER') });
    }
  }

  if (search && String(search).length > 50) {
    errors.push({ field: 'search', message: getErrorMessage('STATEMENTS', 'search', 'MAX_LENGTH', { actual: String(search).length }) });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Invalid filter criteria.', errors });
  }

  // Find user accounts to filter transactions
  const userAccountIds = store.accounts.filter(a => a.user_id === req.user.id).map(a => a.id);

  let filtered = store.transactions.filter(t => userAccountIds.includes(t.from_account_id));

  if (type && type !== 'ALL') {
    filtered = filtered.filter(t => t.type === type);
  }
  if (startDate) {
    filtered = filtered.filter(t => new Date(t.created_at) >= new Date(startDate));
  }
  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    filtered = filtered.filter(t => new Date(t.created_at) <= e);
  }
  if (minAmount) {
    filtered = filtered.filter(t => Number(t.amount) >= Number(minAmount));
  }
  if (maxAmount) {
    filtered = filtered.filter(t => Number(t.amount) <= Number(maxAmount));
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      t =>
        (t.reference_number && t.reference_number.toLowerCase().includes(q)) ||
        (t.recipient_name && t.recipient_name.toLowerCase().includes(q)) ||
        (t.remarks && t.remarks.toLowerCase().includes(q))
    );
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const offset = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(offset, offset + limitNum);

  return res.json({
    success: true,
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    }
  });
});

// ============================================================================
// 4. STATEMENT EXPORT ENDPOINTS (CSV & PDF)
// ============================================================================

// Helper to filter transactions for export
function getFilteredTransactionsForUser(userId, query) {
  const { startDate, endDate, type, minAmount, maxAmount, search } = query;
  const userAccountIds = store.accounts.filter(a => a.user_id === userId).map(a => a.id);
  let transactions = store.transactions.filter(t => userAccountIds.includes(t.from_account_id));

  if (type && type !== 'ALL') {
    transactions = transactions.filter(t => t.type === type);
  }
  if (startDate) {
    transactions = transactions.filter(t => new Date(t.created_at) >= new Date(startDate));
  }
  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    transactions = transactions.filter(t => new Date(t.created_at) <= e);
  }
  if (minAmount) {
    transactions = transactions.filter(t => Number(t.amount) >= Number(minAmount));
  }
  if (maxAmount) {
    transactions = transactions.filter(t => Number(t.amount) <= Number(maxAmount));
  }
  if (search) {
    const q = String(search).toLowerCase();
    transactions = transactions.filter(
      t =>
        (t.reference_number && t.reference_number.toLowerCase().includes(q)) ||
        (t.recipient_name && t.recipient_name.toLowerCase().includes(q)) ||
        (t.remarks && t.remarks.toLowerCase().includes(q))
    );
  }
  return transactions;
}

// 4a. CSV Statement Export (Supports both /statement/export and /statement/export/csv)
const handleCsvExport = (req, res) => {
  const transactions = getFilteredTransactionsForUser(req.user.id, req.query);

  const headers = ['Reference Number', 'Date', 'Type', 'Amount (USD)', 'Status', 'Recipient', 'Remarks'];
  const rows = transactions.map(t => [
    t.reference_number,
    t.created_at.slice(0, 10),
    t.type,
    Number(t.amount).toFixed(2),
    t.status,
    `"${(t.recipient_name || '').replace(/"/g, '""')}"`,
    `"${(t.remarks || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const filename = `finapex-statement-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
};

app.get('/api/v1/transactions/statement/export', authenticateToken, handleCsvExport);
app.get('/api/v1/transactions/statement/export/csv', authenticateToken, handleCsvExport);

// 4b. PDF Statement Export
app.get('/api/v1/transactions/statement/export/pdf', authenticateToken, (req, res) => {
  const correlationId = req.correlationId;
  const user = store.users.find(u => u.id === req.user.id);
  const userAccounts = store.accounts.filter(a => a.user_id === req.user.id);
  const transactions = getFilteredTransactionsForUser(req.user.id, req.query);

  logger.info('Generating PDF Statement', { correlationId, userId: req.user.id, count: transactions.length });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const filename = `finapex-statement-${new Date().toISOString().slice(0, 10)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Document Styling Colors
  const primaryBlue = '#1D4ED8';
  const darkNavy = '#0F172A';
  const textMuted = '#64748B';
  const lineBorder = '#E2E8F0';

  // --- HEADER SECTION ---
  doc.rect(40, 40, 515, 60).fill('#F8FAFC');
  doc.fillColor(primaryBlue).fontSize(22).font('Helvetica-Bold').text('FinApex', 55, 52);
  doc.fillColor(darkNavy).fontSize(10).font('Helvetica').text('DIGITAL BANKING PLATFORM', 55, 78);

  doc.fillColor(darkNavy).fontSize(14).font('Helvetica-Bold').text('ACCOUNT STATEMENT', 360, 52, { align: 'right' });
  doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 360, 72, { align: 'right' });
  doc.text(`Ref: STM-${Date.now().toString().slice(-8)}`, 360, 85, { align: 'right' });

  // --- CUSTOMER & ACCOUNT DETAILS ---
  doc.moveDown(2);
  const detailY = 115;
  doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('ACCOUNT HOLDER', 45, detailY);
  doc.fillColor(darkNavy).fontSize(11).font('Helvetica-Bold').text(user ? user.full_name : 'Valued Customer', 45, detailY + 12);
  doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(user ? user.email : '', 45, detailY + 26);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('PRIMARY ACCOUNT', 220, detailY);
  const primaryAcc = userAccounts[0];
  doc.fillColor(darkNavy).fontSize(10).font('Helvetica-Bold').text(primaryAcc ? `${primaryAcc.type} (...${primaryAcc.account_number.slice(-4)})` : 'Checking', 220, detailY + 12);
  doc.fillColor(textMuted).fontSize(9).font('Helvetica').text(`Available Balance: $${primaryAcc ? Number(primaryAcc.available_balance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}`, 220, detailY + 26);

  doc.fillColor(textMuted).fontSize(8).font('Helvetica-Bold').text('STATEMENT PERIOD', 400, detailY);
  const periodText = (req.query.startDate || req.query.endDate)
    ? `${req.query.startDate || 'Beginning'} to ${req.query.endDate || 'Present'}`
    : 'All Time Activity';
  doc.fillColor(darkNavy).fontSize(9).font('Helvetica').text(periodText, 400, detailY + 12);
  doc.fillColor(textMuted).fontSize(8).text(`Total Records: ${transactions.length}`, 400, detailY + 26);

  // Divider Line
  doc.strokeColor(lineBorder).lineWidth(1).moveTo(40, 160).lineTo(555, 160).stroke();

  // --- TRANSACTIONS TABLE HEADER ---
  let tableY = 175;
  doc.rect(40, tableY, 515, 24).fill('#0F172A');
  doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
  doc.text('DATE', 48, tableY + 7);
  doc.text('REFERENCE', 110, tableY + 7);
  doc.text('DESCRIPTION / BENEFICIARY', 200, tableY + 7);
  doc.text('TYPE', 370, tableY + 7);
  doc.text('STATUS', 440, tableY + 7);
  doc.text('AMOUNT (USD)', 490, tableY + 7, { width: 60, align: 'right' });

  tableY += 24;

  // --- TABLE ROWS ---
  if (transactions.length === 0) {
    tableY += 15;
    doc.fillColor(textMuted).fontSize(10).font('Helvetica-Oblique').text('No transactions found matching the specified statement filter.', 48, tableY, { align: 'center', width: 500 });
  } else {
    transactions.forEach((tx, idx) => {
      // Page break check
      if (tableY > 740) {
        doc.addPage();
        tableY = 45;
        // Repeat mini header on new page
        doc.rect(40, tableY, 515, 20).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('DATE', 48, tableY + 6);
        doc.text('REFERENCE', 110, tableY + 6);
        doc.text('DESCRIPTION / BENEFICIARY', 200, tableY + 6);
        doc.text('TYPE', 370, tableY + 6);
        doc.text('STATUS', 440, tableY + 6);
        doc.text('AMOUNT (USD)', 490, tableY + 6, { width: 60, align: 'right' });
        tableY += 20;
      }

      // Alternate row zebra tint
      if (idx % 2 === 1) {
        doc.rect(40, tableY, 515, 24).fill('#F8FAFC');
      }

      doc.fillColor(darkNavy).fontSize(8).font('Helvetica');
      doc.text(tx.created_at.slice(0, 10), 48, tableY + 7);
      doc.fillColor(textMuted).text(tx.reference_number || 'TXN-000', 110, tableY + 7);

      const desc = tx.remarks || tx.recipient_name || 'Standard Transaction';
      doc.fillColor(darkNavy).font('Helvetica-Bold').text(desc.length > 32 ? desc.substring(0, 30) + '...' : desc, 200, tableY + 7);

      doc.fillColor(textMuted).font('Helvetica').text(tx.type || 'TX', 370, tableY + 7);

      // Status indicator
      const statusColor = tx.status === 'COMPLETED' ? '#059669' : '#D97706';
      doc.fillColor(statusColor).font('Helvetica-Bold').text(tx.status || 'DONE', 440, tableY + 7);

      // Amount format (+/- or debit)
      const numAmt = Number(tx.amount);
      const isCredit = tx.type === 'DEPOSIT';
      const amtStr = (isCredit ? '+$' : '-$') + numAmt.toFixed(2);
      const amtColor = isCredit ? '#059669' : '#0F172A';
      doc.fillColor(amtColor).font('Helvetica-Bold').text(amtStr, 490, tableY + 7, { width: 60, align: 'right' });

      // Row underline
      doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(40, tableY + 24).lineTo(555, tableY + 24).stroke();

      tableY += 24;
    });
  }

  // --- FOOTER & COMPLIANCE ---
  const footerY = 780;
  doc.strokeColor(lineBorder).lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();
  doc.fillColor(textMuted).fontSize(7).font('Helvetica').text(
    'FinApex Digital Bank, N.A. Member FDIC. Equal Housing Lender. Transactions recorded in this statement are subject to verification and regulatory review. For inquiries, contact support@finapex.bank or call 1-800-FIN-APEX.',
    40,
    footerY + 8,
    { width: 515, align: 'center' }
  );

  doc.end();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'transaction-service', status: 'HEALTHY', port: PORT, timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Transaction Service listening on port ${PORT}`);
  });
}

module.exports = app;
