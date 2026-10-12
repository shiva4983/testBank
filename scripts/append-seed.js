const fs = require('fs');
const path = require('path');

const dml = `
-- ============================================================================
-- 7. VALIDATION RULES & SYSTEM ERROR MESSAGES (DML)
-- Dynamic database-driven rule & error message dictionary
-- ============================================================================
INSERT INTO validation_rules (id, module, field_name, rule_code, error_message, is_active)
VALUES
  -- AUTH / LOGIN
  ('vr-001', 'AUTH', 'email', 'MANDATORY', 'Email or username is mandatory.', TRUE),
  ('vr-002', 'AUTH', 'email', 'MIN_LENGTH', 'Identity string too short (minimum {min} characters required, received {actual}).', TRUE),
  ('vr-003', 'AUTH', 'email', 'MAX_LENGTH', 'Identity string exceeds maximum acceptable length of {max} characters (received {actual}).', TRUE),
  ('vr-004', 'AUTH', 'email', 'INVALID_FORMAT', 'Identity must be a valid RFC 5322 email address or alphanumeric username (4-20 chars).', TRUE),
  ('vr-005', 'AUTH', 'password', 'MANDATORY', 'Password is mandatory.', TRUE),
  ('vr-006', 'AUTH', 'password', 'MIN_LENGTH', 'Password must be at least {min} characters long (received {actual}).', TRUE),
  ('vr-007', 'AUTH', 'password', 'MAX_LENGTH', 'Password exceeds maximum allowable length of {max} characters (received {actual}).', TRUE),
  ('vr-008', 'AUTH', 'password', 'UPPERCASE', 'Password must contain at least 1 uppercase letter (A-Z).', TRUE),
  ('vr-009', 'AUTH', 'password', 'LOWERCASE', 'Password must contain at least 1 lowercase letter (a-z).', TRUE),
  ('vr-010', 'AUTH', 'password', 'DIGIT', 'Password must contain at least 1 numeric digit (0-9).', TRUE),
  ('vr-011', 'AUTH', 'password', 'SPECIAL_CHAR', 'Password must contain at least 1 special character (!@#$%^&*...).', TRUE),
  ('vr-012', 'AUTH', 'credentials', 'AUTH_FAILED', 'Invalid credentials. Please verify your email/username and password.', TRUE),

  -- TRANSFERS
  ('vr-101', 'TRANSFERS', 'fromAccountId', 'MANDATORY', 'Source account selection is mandatory.', TRUE),
  ('vr-102', 'TRANSFERS', 'fromAccountId', 'NOT_FOUND', 'Source account not found or does not belong to your profile.', TRUE),
  ('vr-103', 'TRANSFERS', 'fromAccountId', 'INACTIVE', 'Source account is {status}. Transfers are not permitted.', TRUE),
  ('vr-104', 'TRANSFERS', 'toAccountNumber', 'MANDATORY', 'Beneficiary account number is mandatory.', TRUE),
  ('vr-105', 'TRANSFERS', 'toAccountNumber', 'TYPE_NUMERIC', 'Beneficiary account number must contain numeric digits only (data type: numeric string).', TRUE),
  ('vr-106', 'TRANSFERS', 'toAccountNumber', 'MIN_LENGTH', 'Beneficiary account number too short (minimum {min} digits required, received {actual}).', TRUE),
  ('vr-107', 'TRANSFERS', 'toAccountNumber', 'MAX_LENGTH', 'Beneficiary account number too long (maximum {max} digits permitted, received {actual}).', TRUE),
  ('vr-108', 'TRANSFERS', 'toAccountNumber', 'SAME_ACCOUNT', 'Destination account cannot be identical to the source account.', TRUE),
  ('vr-109', 'TRANSFERS', 'routingNumber', 'MANDATORY', 'Routing number is mandatory.', TRUE),
  ('vr-110', 'TRANSFERS', 'routingNumber', 'TYPE_NUMERIC', 'Routing number must contain numeric digits only (data type: numeric string).', TRUE),
  ('vr-111', 'TRANSFERS', 'routingNumber', 'EXACT_LENGTH', 'Routing transit number must be exactly {len} digits (received {actual}).', TRUE),
  ('vr-112', 'TRANSFERS', 'amount', 'MANDATORY', 'Transfer amount is mandatory.', TRUE),
  ('vr-113', 'TRANSFERS', 'amount', 'TYPE_DECIMAL', 'Transfer amount must be a valid numeric currency value with up to 2 decimal places (data type: decimal).', TRUE),
  ('vr-114', 'TRANSFERS', 'amount', 'MIN_BOUND', 'Transfer amount must be at least \${min} USD (minimum acceptable size).', TRUE),
  ('vr-115', 'TRANSFERS', 'amount', 'MAX_BOUND', 'Transfer amount exceeds maximum per-transaction limit of \${max} USD.', TRUE),
  ('vr-116', 'TRANSFERS', 'amount', 'INSUFFICIENT_FUNDS', 'Insufficient funds. Available balance is \${balance} USD.', TRUE),
  ('vr-117', 'TRANSFERS', 'remarks', 'MANDATORY', 'Payment memo / remarks is mandatory.', TRUE),
  ('vr-118', 'TRANSFERS', 'remarks', 'MIN_LENGTH', 'Remarks too short (minimum {min} characters required, received {actual}).', TRUE),
  ('vr-119', 'TRANSFERS', 'remarks', 'MAX_LENGTH', 'Remarks exceeds maximum acceptable length of {max} characters (received {actual}).', TRUE),

  -- BILL PAY
  ('vr-201', 'BILL_PAY', 'accountId', 'MANDATORY', 'Debit account selection is mandatory.', TRUE),
  ('vr-202', 'BILL_PAY', 'accountId', 'NOT_FOUND', 'Selected debit account is invalid or does not belong to your profile.', TRUE),
  ('vr-203', 'BILL_PAY', 'accountId', 'INACTIVE', 'Debit account is {status}. Bill settlements are not permitted.', TRUE),
  ('vr-204', 'BILL_PAY', 'billerId', 'MANDATORY', 'Utility provider / biller selection is mandatory.', TRUE),
  ('vr-205', 'BILL_PAY', 'billerId', 'NOT_FOUND', 'Selected biller is inactive or not found in system directory.', TRUE),
  ('vr-206', 'BILL_PAY', 'consumerNumber', 'MANDATORY', 'Consumer account / meter number is mandatory.', TRUE),
  ('vr-207', 'BILL_PAY', 'consumerNumber', 'MIN_LENGTH', 'Consumer number too short (minimum {min} characters required, received {actual}).', TRUE),
  ('vr-208', 'BILL_PAY', 'consumerNumber', 'MAX_LENGTH', 'Consumer number too long (maximum {max} characters permitted, received {actual}).', TRUE),
  ('vr-209', 'BILL_PAY', 'consumerNumber', 'REGEX_MISMATCH', 'Consumer account format is invalid for {billerName}. Must match pattern: {regex} (e.g. ELEC-123456).', TRUE),
  ('vr-210', 'BILL_PAY', 'amount', 'MANDATORY', 'Bill payment amount is mandatory.', TRUE),
  ('vr-211', 'BILL_PAY', 'amount', 'TYPE_DECIMAL', 'Bill payment amount must be a valid positive number with up to 2 decimal places (data type: decimal).', TRUE),
  ('vr-212', 'BILL_PAY', 'amount', 'MIN_BOUND', 'Payment amount below minimum acceptable limit of \${min} USD for {billerName}.', TRUE),
  ('vr-213', 'BILL_PAY', 'amount', 'MAX_BOUND', 'Payment amount exceeds maximum acceptable limit of \${max} USD for {billerName}.', TRUE),
  ('vr-214', 'BILL_PAY', 'amount', 'INSUFFICIENT_FUNDS', 'Insufficient available funds. Current account balance: \${balance} USD.', TRUE),
  ('vr-215', 'BILL_PAY', 'dueDate', 'MANDATORY', 'Bill due date is mandatory.', TRUE),
  ('vr-216', 'BILL_PAY', 'dueDate', 'INVALID_DATE', 'Bill due date must be a valid ISO calendar date (YYYY-MM-DD).', TRUE),

  -- STATEMENTS & AUDIT
  ('vr-301', 'STATEMENTS', 'startDate', 'INVALID_DATE', 'Start date must be a valid calendar date (YYYY-MM-DD).', TRUE),
  ('vr-302', 'STATEMENTS', 'startDate', 'DATE_ORDER', 'Start date cannot be after End date.', TRUE),
  ('vr-303', 'STATEMENTS', 'endDate', 'INVALID_DATE', 'End date must be a valid calendar date (YYYY-MM-DD).', TRUE),
  ('vr-304', 'STATEMENTS', 'endDate', 'MAX_SPAN', 'Date range cannot exceed 365 days (selected range is {days} days).', TRUE),
  ('vr-305', 'STATEMENTS', 'minAmount', 'TYPE_NUMERIC', 'Minimum amount must be a valid numeric dollar value.', TRUE),
  ('vr-306', 'STATEMENTS', 'minAmount', 'NON_NEGATIVE', 'Minimum amount cannot be negative.', TRUE),
  ('vr-307', 'STATEMENTS', 'minAmount', 'MAX_BOUND', 'Minimum amount exceeds allowable filter bound ($1,000,000).', TRUE),
  ('vr-308', 'STATEMENTS', 'minAmount', 'RANGE_ORDER', 'Minimum amount cannot be greater than Maximum amount.', TRUE),
  ('vr-309', 'STATEMENTS', 'maxAmount', 'TYPE_NUMERIC', 'Maximum amount must be a valid numeric dollar value.', TRUE),
  ('vr-310', 'STATEMENTS', 'maxAmount', 'NON_NEGATIVE', 'Maximum amount cannot be negative.', TRUE),
  ('vr-311', 'STATEMENTS', 'maxAmount', 'MAX_BOUND', 'Maximum amount exceeds allowable filter bound ($1,000,000).', TRUE),
  ('vr-312', 'STATEMENTS', 'search', 'MAX_LENGTH', 'Search keyword cannot exceed 50 characters (entered {actual}).', TRUE)
ON CONFLICT (id) DO UPDATE 
SET error_message = EXCLUDED.error_message, is_active = EXCLUDED.is_active;
`;

const target = path.join(__dirname, '..', 'database', 'seed_data.sql');
fs.appendFileSync(target, dml, 'utf8');
console.log('Appended validation rules seed records to seed_data.sql successfully.');
