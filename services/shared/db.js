const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;
let usePostgres = false;

if (process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGDATABASE)) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.PGHOST,
      port: process.env.PGPORT || 5432,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
    });
    usePostgres = true;
    console.log('[DB] PostgreSQL pool configured.');
  } catch (err) {
    console.warn('[DB] Failed initializing PostgreSQL pool, falling back to in-memory store:', err.message);
  }
}

// In-memory relational store matching database/schema.sql & seed_data.sql
const memoryStore = {
  users: [
    {
      id: 'usr-001',
      username: 'johndoe',
      email: 'john.doe@bank.com',
      password_hash: bcrypt.hashSync('Password123!', 10),
      full_name: 'Johnathan Doe',
      phone_number: '+1-555-0192',
      role: 'CUSTOMER',
      is_active: true
    },
    {
      id: 'usr-002',
      username: 'janesmith',
      email: 'jane.smith@bank.com',
      password_hash: bcrypt.hashSync('Password123!', 10),
      full_name: 'Jane Smith',
      phone_number: '+1-555-0188',
      role: 'CUSTOMER',
      is_active: true
    }
  ],
  accounts: [
    {
      id: 'acc-101',
      user_id: 'usr-001',
      account_number: '1002938471',
      account_type: 'CHECKING',
      currency: 'USD',
      balance: 14250.75,
      available_balance: 14250.75,
      status: 'ACTIVE',
      daily_transfer_limit: 10000.00
    },
    {
      id: 'acc-102',
      user_id: 'usr-001',
      account_number: '2004918239',
      account_type: 'SAVINGS',
      currency: 'USD',
      balance: 48920.00,
      available_balance: 48920.00,
      status: 'ACTIVE',
      daily_transfer_limit: 10000.00
    },
    {
      id: 'acc-103',
      user_id: 'usr-001',
      account_number: '3009182374',
      account_type: 'CREDIT',
      currency: 'USD',
      balance: 3400.50,
      available_balance: 3400.50,
      status: 'ACTIVE',
      daily_transfer_limit: 5000.00
    },
    {
      id: 'acc-201',
      user_id: 'usr-002',
      account_number: '1008827364',
      account_type: 'CHECKING',
      currency: 'USD',
      balance: 8530.20,
      available_balance: 8530.20,
      status: 'ACTIVE',
      daily_transfer_limit: 10000.00
    }
  ],
  beneficiaries: [
    {
      id: 'ben-001',
      user_id: 'usr-001',
      name: 'Alice Walker',
      account_number: '4491029384',
      routing_number: '021000021',
      bank_name: 'JPMorgan Chase',
      nickname: 'Sister Alice'
    },
    {
      id: 'ben-002',
      user_id: 'usr-001',
      name: 'Apex Landlords LLC',
      account_number: '8810293841',
      routing_number: '121000358',
      bank_name: 'Bank of America',
      nickname: 'Apartment Rent'
    },
    {
      id: 'ben-003',
      user_id: 'usr-001',
      name: 'Robert Davis',
      account_number: '9910293845',
      routing_number: '071000013',
      bank_name: 'Wells Fargo',
      nickname: 'Contractor'
    }
  ],
  billers: [
    {
      id: 'bil-001',
      name: 'Consolidated Edison Power',
      category: 'ELECTRICITY',
      biller_code: 'CONED-PWR',
      consumer_regex: '^ELEC-[0-9]{6}$',
      min_amount: 10.00,
      max_amount: 2500.00,
      is_active: true
    },
    {
      id: 'bil-002',
      name: 'Metropolitan Water District',
      category: 'WATER',
      biller_code: 'METRO-WTR',
      consumer_regex: '^WTR-[0-9]{5,7}$',
      min_amount: 5.00,
      max_amount: 1000.00,
      is_active: true
    },
    {
      id: 'bil-003',
      name: 'Verizon Fios Fiber',
      category: 'INTERNET',
      biller_code: 'VRZ-FBR',
      consumer_regex: '^[0-9]{10}$',
      min_amount: 20.00,
      max_amount: 1500.00,
      is_active: true
    },
    {
      id: 'bil-004',
      name: 'AT&T Wireless Services',
      category: 'MOBILE_RECHARGE',
      biller_code: 'ATT-MOB',
      consumer_regex: '^[0-9]{10}$',
      min_amount: 15.00,
      max_amount: 800.00,
      is_active: true
    },
    {
      id: 'bil-005',
      name: 'FinApex Platinum Card Services',
      category: 'CREDIT_CARD',
      biller_code: 'FIN-CC',
      consumer_regex: '^4[0-9]{15}$',
      min_amount: 25.00,
      max_amount: 5000.00,
      is_active: true
    }
  ],
  transactions: [
    {
      id: 'tx-001',
      reference_number: 'TXN-20261001-001',
      from_account_id: 'acc-101',
      to_account_number: '4491029384',
      to_routing_number: '021000021',
      recipient_name: 'Alice Walker',
      amount: 350.00,
      fee: 0.00,
      currency: 'USD',
      type: 'TRANSFER',
      status: 'COMPLETED',
      remarks: 'Birthday gift',
      biller_id: null,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 'tx-002',
      reference_number: 'TXN-20261003-002',
      from_account_id: 'acc-101',
      to_account_number: 'CONED-PWR',
      to_routing_number: null,
      recipient_name: 'Consolidated Edison Power',
      amount: 145.80,
      fee: 0.00,
      currency: 'USD',
      type: 'BILL_PAYMENT',
      status: 'COMPLETED',
      remarks: 'September Electricity Bill',
      biller_id: 'bil-001',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'tx-003',
      reference_number: 'TXN-20261004-003',
      from_account_id: 'acc-101',
      to_account_number: '8810293841',
      to_routing_number: '121000358',
      recipient_name: 'Apex Landlords LLC',
      amount: 2100.00,
      fee: 0.00,
      currency: 'USD',
      type: 'TRANSFER',
      status: 'COMPLETED',
      remarks: 'October Apartment Rent',
      biller_id: null,
      created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: 'tx-004',
      reference_number: 'TXN-20261006-004',
      from_account_id: 'acc-101',
      to_account_number: 'VRZ-FBR',
      to_routing_number: null,
      recipient_name: 'Verizon Fios Fiber',
      amount: 79.99,
      fee: 0.00,
      currency: 'USD',
      type: 'BILL_PAYMENT',
      status: 'COMPLETED',
      remarks: 'Gigabit Home Internet',
      biller_id: 'bil-003',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'tx-005',
      reference_number: 'TXN-20261008-005',
      from_account_id: 'acc-102',
      to_account_number: '1002938471',
      to_routing_number: null,
      recipient_name: 'Self Savings Transfer',
      amount: 1000.00,
      fee: 0.00,
      currency: 'USD',
      type: 'TRANSFER',
      status: 'COMPLETED',
      remarks: 'Monthly savings allocation',
      biller_id: null,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ],
  bill_payments: [
    {
      id: 'bp-001',
      transaction_id: 'tx-002',
      user_id: 'usr-001',
      biller_id: 'bil-001',
      consumer_number: 'ELEC-982341',
      due_date: '2026-10-25',
      paid_amount: 145.80,
      status: 'PAID',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'bp-002',
      transaction_id: 'tx-004',
      user_id: 'usr-001',
      biller_id: 'bil-003',
      consumer_number: '2125550192',
      due_date: '2026-10-30',
      paid_amount: 79.99,
      status: 'PAID',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],
  validation_rules: [
    // AUTH / LOGIN
    { id: 'vr-001', module: 'AUTH', field_name: 'email', rule_code: 'MANDATORY', error_message: 'Email or username is mandatory.', is_active: true },
    { id: 'vr-002', module: 'AUTH', field_name: 'email', rule_code: 'MIN_LENGTH', error_message: 'Identity string too short (minimum {min} characters required, received {actual}).', is_active: true },
    { id: 'vr-003', module: 'AUTH', field_name: 'email', rule_code: 'MAX_LENGTH', error_message: 'Identity string exceeds maximum acceptable length of {max} characters (received {actual}).', is_active: true },
    { id: 'vr-004', module: 'AUTH', field_name: 'email', rule_code: 'INVALID_FORMAT', error_message: 'Identity must be a valid RFC 5322 email address or alphanumeric username (4-20 chars).', is_active: true },
    { id: 'vr-005', module: 'AUTH', field_name: 'password', rule_code: 'MANDATORY', error_message: 'Password is mandatory.', is_active: true },
    { id: 'vr-006', module: 'AUTH', field_name: 'password', rule_code: 'MIN_LENGTH', error_message: 'Password must be at least {min} characters long (received {actual}).', is_active: true },
    { id: 'vr-007', module: 'AUTH', field_name: 'password', rule_code: 'MAX_LENGTH', error_message: 'Password exceeds maximum allowable length of {max} characters (received {actual}).', is_active: true },
    { id: 'vr-008', module: 'AUTH', field_name: 'password', rule_code: 'UPPERCASE', error_message: 'Password must contain at least 1 uppercase letter (A-Z).', is_active: true },
    { id: 'vr-009', module: 'AUTH', field_name: 'password', rule_code: 'LOWERCASE', error_message: 'Password must contain at least 1 lowercase letter (a-z).', is_active: true },
    { id: 'vr-010', module: 'AUTH', field_name: 'password', rule_code: 'DIGIT', error_message: 'Password must contain at least 1 numeric digit (0-9).', is_active: true },
    { id: 'vr-011', module: 'AUTH', field_name: 'password', rule_code: 'SPECIAL_CHAR', error_message: 'Password must contain at least 1 special character (!@#$%^&*...).', is_active: true },
    { id: 'vr-012', module: 'AUTH', field_name: 'credentials', rule_code: 'AUTH_FAILED', error_message: 'Invalid credentials. Please verify your email/username and password.', is_active: true },

    // TRANSFERS
    { id: 'vr-101', module: 'TRANSFERS', field_name: 'fromAccountId', rule_code: 'MANDATORY', error_message: 'Source account selection is mandatory.', is_active: true },
    { id: 'vr-102', module: 'TRANSFERS', field_name: 'fromAccountId', rule_code: 'NOT_FOUND', error_message: 'Source account not found or does not belong to your profile.', is_active: true },
    { id: 'vr-103', module: 'TRANSFERS', field_name: 'fromAccountId', rule_code: 'INACTIVE', error_message: 'Source account is {status}. Transfers are not permitted.', is_active: true },
    { id: 'vr-104', module: 'TRANSFERS', field_name: 'toAccountNumber', rule_code: 'MANDATORY', error_message: 'Beneficiary account number is mandatory.', is_active: true },
    { id: 'vr-105', module: 'TRANSFERS', field_name: 'toAccountNumber', rule_code: 'TYPE_NUMERIC', error_message: 'Beneficiary account number must contain numeric digits only (data type: numeric string).', is_active: true },
    { id: 'vr-106', module: 'TRANSFERS', field_name: 'toAccountNumber', rule_code: 'MIN_LENGTH', error_message: 'Beneficiary account number too short (minimum {min} digits required, received {actual}).', is_active: true },
    { id: 'vr-107', module: 'TRANSFERS', field_name: 'toAccountNumber', rule_code: 'MAX_LENGTH', error_message: 'Beneficiary account number too long (maximum {max} digits permitted, received {actual}).', is_active: true },
    { id: 'vr-108', module: 'TRANSFERS', field_name: 'toAccountNumber', rule_code: 'SAME_ACCOUNT', error_message: 'Destination account cannot be identical to the source account.', is_active: true },
    { id: 'vr-109', module: 'TRANSFERS', field_name: 'routingNumber', rule_code: 'MANDATORY', error_message: 'Routing number is mandatory.', is_active: true },
    { id: 'vr-110', module: 'TRANSFERS', field_name: 'routingNumber', rule_code: 'TYPE_NUMERIC', error_message: 'Routing number must contain numeric digits only (data type: numeric string).', is_active: true },
    { id: 'vr-111', module: 'TRANSFERS', field_name: 'routingNumber', rule_code: 'EXACT_LENGTH', error_message: 'Routing transit number must be exactly {len} digits (received {actual}).', is_active: true },
    { id: 'vr-112', module: 'TRANSFERS', field_name: 'amount', rule_code: 'MANDATORY', error_message: 'Transfer amount is mandatory.', is_active: true },
    { id: 'vr-113', module: 'TRANSFERS', field_name: 'amount', rule_code: 'TYPE_DECIMAL', error_message: 'Transfer amount must be a valid numeric currency value with up to 2 decimal places (data type: decimal).', is_active: true },
    { id: 'vr-114', module: 'TRANSFERS', field_name: 'amount', rule_code: 'MIN_BOUND', error_message: 'Transfer amount must be at least ${min} USD (minimum acceptable size).', is_active: true },
    { id: 'vr-115', module: 'TRANSFERS', field_name: 'amount', rule_code: 'MAX_BOUND', error_message: 'Transfer amount exceeds maximum per-transaction limit of ${max} USD.', is_active: true },
    { id: 'vr-116', module: 'TRANSFERS', field_name: 'amount', rule_code: 'INSUFFICIENT_FUNDS', error_message: 'Insufficient funds. Available balance is ${balance} USD.', is_active: true },
    { id: 'vr-117', module: 'TRANSFERS', field_name: 'remarks', rule_code: 'MANDATORY', error_message: 'Payment memo / remarks is mandatory.', is_active: true },
    { id: 'vr-118', module: 'TRANSFERS', field_name: 'remarks', rule_code: 'MIN_LENGTH', error_message: 'Remarks too short (minimum {min} characters required, received {actual}).', is_active: true },
    { id: 'vr-119', module: 'TRANSFERS', field_name: 'remarks', rule_code: 'MAX_LENGTH', error_message: 'Remarks exceeds maximum acceptable length of {max} characters (received {actual}).', is_active: true },

    // BILL PAY
    { id: 'vr-201', module: 'BILL_PAY', field_name: 'accountId', rule_code: 'MANDATORY', error_message: 'Debit account selection is mandatory.', is_active: true },
    { id: 'vr-202', module: 'BILL_PAY', field_name: 'accountId', rule_code: 'NOT_FOUND', error_message: 'Selected debit account is invalid or does not belong to your profile.', is_active: true },
    { id: 'vr-203', module: 'BILL_PAY', field_name: 'accountId', rule_code: 'INACTIVE', error_message: 'Debit account is {status}. Bill settlements are not permitted.', is_active: true },
    { id: 'vr-204', module: 'BILL_PAY', field_name: 'billerId', rule_code: 'MANDATORY', error_message: 'Utility provider / biller selection is mandatory.', is_active: true },
    { id: 'vr-205', module: 'BILL_PAY', field_name: 'billerId', rule_code: 'NOT_FOUND', error_message: 'Selected biller is inactive or not found in system directory.', is_active: true },
    { id: 'vr-206', module: 'BILL_PAY', field_name: 'consumerNumber', rule_code: 'MANDATORY', error_message: 'Consumer account / meter number is mandatory.', is_active: true },
    { id: 'vr-207', module: 'BILL_PAY', field_name: 'consumerNumber', rule_code: 'MIN_LENGTH', error_message: 'Consumer number too short (minimum {min} characters required, received {actual}).', is_active: true },
    { id: 'vr-208', module: 'BILL_PAY', field_name: 'consumerNumber', rule_code: 'MAX_LENGTH', error_message: 'Consumer number too long (maximum {max} characters permitted, received {actual}).', is_active: true },
    { id: 'vr-209', module: 'BILL_PAY', field_name: 'consumerNumber', rule_code: 'REGEX_MISMATCH', error_message: 'Consumer account format is invalid for {billerName}. Must match pattern: {regex} (e.g. ELEC-123456).', is_active: true },
    { id: 'vr-210', module: 'BILL_PAY', field_name: 'amount', rule_code: 'MANDATORY', error_message: 'Bill payment amount is mandatory.', is_active: true },
    { id: 'vr-211', module: 'BILL_PAY', field_name: 'amount', rule_code: 'TYPE_DECIMAL', error_message: 'Bill payment amount must be a valid positive number with up to 2 decimal places (data type: decimal).', is_active: true },
    { id: 'vr-212', module: 'BILL_PAY', field_name: 'amount', rule_code: 'MIN_BOUND', error_message: 'Payment amount below minimum acceptable limit of ${min} USD for {billerName}.', is_active: true },
    { id: 'vr-213', module: 'BILL_PAY', field_name: 'amount', rule_code: 'MAX_BOUND', error_message: 'Payment amount exceeds maximum acceptable limit of ${max} USD for {billerName}.', is_active: true },
    { id: 'vr-214', module: 'BILL_PAY', field_name: 'amount', rule_code: 'INSUFFICIENT_FUNDS', error_message: 'Insufficient available funds. Current account balance: ${balance} USD.', is_active: true },
    { id: 'vr-215', module: 'BILL_PAY', field_name: 'dueDate', rule_code: 'MANDATORY', error_message: 'Bill due date is mandatory.', is_active: true },
    { id: 'vr-216', module: 'BILL_PAY', field_name: 'dueDate', rule_code: 'INVALID_DATE', error_message: 'Bill due date must be a valid ISO calendar date (YYYY-MM-DD).', is_active: true },

    // STATEMENTS & AUDIT
    { id: 'vr-301', module: 'STATEMENTS', field_name: 'startDate', rule_code: 'INVALID_DATE', error_message: 'Start date must be a valid calendar date (YYYY-MM-DD).', is_active: true },
    { id: 'vr-302', module: 'STATEMENTS', field_name: 'startDate', rule_code: 'DATE_ORDER', error_message: 'Start date cannot be after End date.', is_active: true },
    { id: 'vr-303', module: 'STATEMENTS', field_name: 'endDate', rule_code: 'INVALID_DATE', error_message: 'End date must be a valid calendar date (YYYY-MM-DD).', is_active: true },
    { id: 'vr-304', module: 'STATEMENTS', field_name: 'endDate', rule_code: 'MAX_SPAN', error_message: 'Date range cannot exceed 365 days (selected range is {days} days).', is_active: true },
    { id: 'vr-305', module: 'STATEMENTS', field_name: 'minAmount', rule_code: 'TYPE_NUMERIC', error_message: 'Minimum amount must be a valid numeric dollar value.', is_active: true },
    { id: 'vr-306', module: 'STATEMENTS', field_name: 'minAmount', rule_code: 'NON_NEGATIVE', error_message: 'Minimum amount cannot be negative.', is_active: true },
    { id: 'vr-307', module: 'STATEMENTS', field_name: 'minAmount', rule_code: 'MAX_BOUND', error_message: 'Minimum amount exceeds allowable filter bound ($1,000,000).', is_active: true },
    { id: 'vr-308', module: 'STATEMENTS', field_name: 'minAmount', rule_code: 'RANGE_ORDER', error_message: 'Minimum amount cannot be greater than Maximum amount.', is_active: true },
    { id: 'vr-309', module: 'STATEMENTS', field_name: 'maxAmount', rule_code: 'TYPE_NUMERIC', error_message: 'Maximum amount must be a valid numeric dollar value.', is_active: true },
    { id: 'vr-310', module: 'STATEMENTS', field_name: 'maxAmount', rule_code: 'NON_NEGATIVE', error_message: 'Maximum amount cannot be negative.', is_active: true },
    { id: 'vr-311', module: 'STATEMENTS', field_name: 'maxAmount', rule_code: 'MAX_BOUND', error_message: 'Maximum amount exceeds allowable filter bound ($1,000,000).', is_active: true },
    { id: 'vr-312', module: 'STATEMENTS', field_name: 'search', rule_code: 'MAX_LENGTH', error_message: 'Search keyword cannot exceed 50 characters (entered {actual}).', is_active: true }
  ]
};

/**
 * Look up error message from validation_rules table and replace any {param} placeholders.
 * Fallbacks to default template if not found.
 */
function getErrorMessage(module, fieldName, ruleCode, params = {}) {
  const rule = memoryStore.validation_rules.find(
    r => r.module === module && r.field_name === fieldName && r.rule_code === ruleCode && r.is_active
  );

  let msg = rule ? rule.error_message : `Validation failed for ${fieldName} (${ruleCode}).`;

  // Interpolate {key} placeholders
  for (const [key, val] of Object.entries(params)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }

  return msg;
}

module.exports = {
  isPostgres: () => usePostgres,
  pool,
  store: memoryStore,
  getErrorMessage
};
