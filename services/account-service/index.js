const express = require('express');
const cors = require('cors');
const { createServiceLogger } = require('../shared/logger');
const { store } = require('../shared/db');
const { authenticateToken } = require('../shared/authMiddleware');

const app = express();
const PORT = process.env.PORT || 9002;
const logger = createServiceLogger('account-service');

app.use(cors());
app.use(express.json());

// Correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || `corr-${Date.now()}`;
  next();
});

// GET /api/v1/accounts
app.get('/api/v1/accounts', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userAccounts = store.accounts.filter(a => a.user_id === userId);

  const totalBalance = userAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

  logger.info('Fetched user accounts', {
    correlationId: req.correlationId,
    userId,
    accountCount: userAccounts.length,
    totalBalance
  });

  res.json({
    success: true,
    data: userAccounts.map(a => ({
      id: a.id,
      accountNumber: a.account_number,
      accountType: a.account_type,
      currency: a.currency,
      balance: a.balance,
      availableBalance: a.available_balance,
      status: a.status,
      dailyTransferLimit: a.daily_transfer_limit
    })),
    summary: {
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      currency: 'USD',
      activeAccounts: userAccounts.filter(a => a.status === 'ACTIVE').length
    }
  });
});

// GET /api/v1/accounts/:id
app.get('/api/v1/accounts/:id', authenticateToken, (req, res) => {
  const account = store.accounts.find(a => a.id === req.params.id && a.user_id === req.user.id);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found.' });
  }
  res.json({ success: true, data: account });
});

// GET /api/v1/accounts/beneficiaries
app.get('/api/v1/accounts/beneficiaries', authenticateToken, (req, res) => {
  const beneficiaries = store.beneficiaries.filter(b => b.user_id === req.user.id);
  res.json({ success: true, data: beneficiaries });
});

// POST /api/v1/accounts/beneficiaries
app.post('/api/v1/accounts/beneficiaries', authenticateToken, (req, res) => {
  const { name, accountNumber, routingNumber, bankName, nickname } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Beneficiary name must be at least 2 characters.' });
  }
  if (!accountNumber || !/^\d{10,12}$/.test(accountNumber)) {
    errors.push({ field: 'accountNumber', message: 'Account number must be 10-12 digits.' });
  }
  if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
    errors.push({ field: 'routingNumber', message: 'Routing number must be exactly 9 digits.' });
  }
  if (!bankName || bankName.trim().length < 2) {
    errors.push({ field: 'bankName', message: 'Bank name is required.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  const newBeneficiary = {
    id: `ben-${Date.now()}`,
    user_id: req.user.id,
    name: name.trim(),
    account_number: accountNumber,
    routing_number: routingNumber,
    bank_name: bankName.trim(),
    nickname: nickname ? nickname.trim() : null
  };

  store.beneficiaries.push(newBeneficiary);
  logger.info('Beneficiary created', { correlationId: req.correlationId, beneficiaryId: newBeneficiary.id });

  res.status(201).json({ success: true, data: newBeneficiary });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'account-service', status: 'HEALTHY', port: PORT, timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Account Service listening on port ${PORT}`);
  });
}

module.exports = app;
