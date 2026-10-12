-- ============================================================================
-- FinApex Digital Banking Platform - Seed Data (DML)
-- Pre-populated test fixtures for Testiva Automation & Local Dev
-- Default Password for all test users: Password123!
-- ============================================================================

-- 1. USERS
INSERT INTO users (id, username, email, password_hash, full_name, phone_number, role, is_active)
VALUES 
  ('usr-001', 'johndoe', 'john.doe@bank.com', '$2a$10$wN1FwO6y6N1i.2LhO8k56OQJqUfZ76NfZy6Bmz0X7E5/X29oE6uqu', 'Johnathan Doe', '+1-555-0192', 'CUSTOMER', TRUE),
  ('usr-002', 'janesmith', 'jane.smith@bank.com', '$2a$10$wN1FwO6y6N1i.2LhO8k56OQJqUfZ76NfZy6Bmz0X7E5/X29oE6uqu', 'Jane Smith', '+1-555-0188', 'CUSTOMER', TRUE),
  ('usr-003', 'bankadmin', 'admin@bank.com', '$2a$10$wN1FwO6y6N1i.2LhO8k56OQJqUfZ76NfZy6Bmz0X7E5/X29oE6uqu', 'FinApex System Admin', '+1-555-0100', 'ADMIN', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. ACCOUNTS
INSERT INTO accounts (id, user_id, account_number, account_type, currency, balance, available_balance, status, daily_transfer_limit)
VALUES 
  ('acc-101', 'usr-001', '1002938471', 'CHECKING', 'USD', 14250.75, 14250.75, 'ACTIVE', 10000.00),
  ('acc-102', 'usr-001', '2004918239', 'SAVINGS', 'USD', 48920.00, 48920.00, 'ACTIVE', 10000.00),
  ('acc-103', 'usr-001', '3009182374', 'CREDIT', 'USD', 3400.50, 3400.50, 'ACTIVE', 5000.00),
  ('acc-201', 'usr-002', '1008827364', 'CHECKING', 'USD', 8530.20, 8530.20, 'ACTIVE', 10000.00)
ON CONFLICT (id) DO NOTHING;

-- 3. BENEFICIARIES (Saved contacts for fast transfers)
INSERT INTO beneficiaries (id, user_id, name, account_number, routing_number, bank_name, nickname)
VALUES
  ('ben-001', 'usr-001', 'Alice Walker', '4491029384', '021000021', 'JPMorgan Chase', 'Sister Alice'),
  ('ben-002', 'usr-001', 'Apex Landlords LLC', '8810293841', '121000358', 'Bank of America', 'Apartment Rent'),
  ('ben-003', 'usr-001', 'Robert Davis', '9910293845', '071000013', 'Wells Fargo', 'Contractor')
ON CONFLICT (id) DO NOTHING;

-- 4. BILLERS (Utility companies)
INSERT INTO billers (id, name, category, biller_code, consumer_regex, min_amount, max_amount, is_active)
VALUES
  ('bil-001', 'Consolidated Edison Power', 'ELECTRICITY', 'CONED-PWR', '^ELEC-[0-9]{6}$', 10.00, 2500.00, TRUE),
  ('bil-002', 'Metropolitan Water District', 'WATER', 'METRO-WTR', '^WTR-[0-9]{5,7}$', 5.00, 1000.00, TRUE),
  ('bil-003', 'Verizon Fios Fiber', 'INTERNET', 'VRZ-FBR', '^[0-9]{10}$', 20.00, 1500.00, TRUE),
  ('bil-004', 'AT&T Wireless Services', 'MOBILE_RECHARGE', 'ATT-MOB', '^[0-9]{10}$', 15.00, 800.00, TRUE),
  ('bil-005', 'FinApex Platinum Card Services', 'CREDIT_CARD', 'FIN-CC', '^4[0-9]{15}$', 25.00, 5000.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. TRANSACTIONS (Historical sample data for Statement Page)
INSERT INTO transactions (id, reference_number, from_account_id, to_account_number, to_routing_number, recipient_name, amount, fee, currency, type, status, remarks, biller_id, failure_reason, correlation_id, created_at)
VALUES
  ('tx-001', 'TXN-20261001-001', 'acc-101', '4491029384', '021000021', 'Alice Walker', 350.00, 0.00, 'USD', 'TRANSFER', 'COMPLETED', 'Birthday gift', NULL, NULL, 'req-seed-001', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  ('tx-002', 'TXN-20261003-002', 'acc-101', 'CONED-PWR', NULL, 'Consolidated Edison Power', 145.80, 0.00, 'USD', 'BILL_PAYMENT', 'COMPLETED', 'September Electricity Bill', 'bil-001', NULL, 'req-seed-002', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('tx-003', 'TXN-20261004-003', 'acc-101', '8810293841', '121000358', 'Apex Landlords LLC', 2100.00, 0.00, 'USD', 'TRANSFER', 'COMPLETED', 'October Apartment Rent', NULL, NULL, 'req-seed-003', CURRENT_TIMESTAMP - INTERVAL '4 days'),
  ('tx-004', 'TXN-20261006-004', 'acc-101', 'VRZ-FBR', NULL, 'Verizon Fios Fiber', 79.99, 0.00, 'USD', 'BILL_PAYMENT', 'COMPLETED', 'Gigabit Home Internet', 'bil-003', NULL, 'req-seed-004', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('tx-005', 'TXN-20261008-005', 'acc-102', '1002938471', NULL, 'Self Savings Transfer', 1000.00, 0.00, 'USD', 'TRANSFER', 'COMPLETED', 'Monthly savings allocation', NULL, NULL, 'req-seed-005', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 6. BILL PAYMENTS
INSERT INTO bill_payments (id, transaction_id, user_id, biller_id, consumer_number, due_date, paid_amount, status, created_at)
VALUES
  ('bp-001', 'tx-002', 'usr-001', 'bil-001', 'ELEC-982341', CURRENT_DATE - INTERVAL '3 days', 145.80, 'PAID', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('bp-002', 'tx-004', 'usr-001', 'bil-003', '2125550192', CURRENT_DATE + INTERVAL '10 days', 79.99, 'PAID', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

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
  ('vr-114', 'TRANSFERS', 'amount', 'MIN_BOUND', 'Transfer amount must be at least ${min} USD (minimum acceptable size).', TRUE),
  ('vr-115', 'TRANSFERS', 'amount', 'MAX_BOUND', 'Transfer amount exceeds maximum per-transaction limit of ${max} USD.', TRUE),
  ('vr-116', 'TRANSFERS', 'amount', 'INSUFFICIENT_FUNDS', 'Insufficient funds. Available balance is ${balance} USD.', TRUE),
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
  ('vr-212', 'BILL_PAY', 'amount', 'MIN_BOUND', 'Payment amount below minimum acceptable limit of ${min} USD for {billerName}.', TRUE),
  ('vr-213', 'BILL_PAY', 'amount', 'MAX_BOUND', 'Payment amount exceeds maximum acceptable limit of ${max} USD for {billerName}.', TRUE),
  ('vr-214', 'BILL_PAY', 'amount', 'INSUFFICIENT_FUNDS', 'Insufficient available funds. Current account balance: ${balance} USD.', TRUE),
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
