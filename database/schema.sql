-- ============================================================================
-- FinApex Digital Banking Platform - Relational Database Schema (DDL)
-- Engine: PostgreSQL 14+ (Compatible with AWS RDS PostgreSQL / Aurora)
-- ============================================================================

-- Clean up existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS bill_payments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS billers CASCADE;
DROP TABLE IF EXISTS beneficiaries CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'AUDITOR')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================================
-- 2. ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE accounts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(16) UNIQUE NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('CHECKING', 'SAVINGS', 'INVESTMENT', 'CREDIT')),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    available_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0.00),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'DORMANT', 'CLOSED')),
    daily_transfer_limit NUMERIC(14, 2) DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);

-- ============================================================================
-- 3. BENEFICIARIES TABLE (Saved transfer recipients)
-- ============================================================================
CREATE TABLE beneficiaries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_number VARCHAR(16) NOT NULL,
    routing_number VARCHAR(9) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id);

-- ============================================================================
-- 4. BILLERS TABLE (Utility providers)
-- ============================================================================
CREATE TABLE billers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('ELECTRICITY', 'WATER', 'INTERNET', 'MOBILE_RECHARGE', 'CREDIT_CARD', 'MUNICIPAL_TAX')),
    biller_code VARCHAR(20) UNIQUE NOT NULL,
    consumer_regex VARCHAR(100) DEFAULT '^[a-zA-Z0-9-]{6,16}$',
    min_amount NUMERIC(10, 2) DEFAULT 5.00,
    max_amount NUMERIC(10, 2) DEFAULT 5000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. TRANSACTIONS TABLE (Double-entry / Audit Ledger)
-- ============================================================================
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    reference_number VARCHAR(30) UNIQUE NOT NULL,
    from_account_id VARCHAR(36) REFERENCES accounts(id) ON DELETE SET NULL,
    to_account_number VARCHAR(16) NOT NULL,
    to_routing_number VARCHAR(9),
    recipient_name VARCHAR(100),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
    fee NUMERIC(10, 2) DEFAULT 0.00 CHECK (fee >= 0.00),
    currency VARCHAR(3) DEFAULT 'USD',
    type VARCHAR(30) NOT NULL CHECK (type IN ('TRANSFER', 'BILL_PAYMENT', 'DEPOSIT', 'WITHDRAWAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
    remarks VARCHAR(255) NOT NULL,
    biller_id VARCHAR(36) REFERENCES billers(id) ON DELETE SET NULL,
    failure_reason VARCHAR(255),
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_from_acc ON transactions(from_account_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_reference ON transactions(reference_number);

-- ============================================================================
-- 6. BILL PAYMENTS TABLE (Detailed utility payment logs)
-- ============================================================================
CREATE TABLE bill_payments (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    biller_id VARCHAR(36) NOT NULL REFERENCES billers(id),
    consumer_number VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    paid_amount NUMERIC(14, 2) NOT NULL CHECK (paid_amount > 0.00),
    status VARCHAR(20) DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bill_payments_user_id ON bill_payments(user_id);
CREATE INDEX idx_bill_payments_biller_id ON bill_payments(biller_id);

-- ============================================================================
-- 7. AUDIT LOGS TABLE (For Security & AWS CloudWatch Cross-Reference)
-- ============================================================================
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    correlation_id VARCHAR(64) NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_correlation_id ON audit_logs(correlation_id);
CREATE INDEX idx_audit_service_name ON audit_logs(service_name);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- 8. VALIDATION RULES & ERROR MESSAGES TABLE
-- ============================================================================
CREATE TABLE validation_rules (
    id VARCHAR(36) PRIMARY KEY,
    module VARCHAR(50) NOT NULL,          -- e.g. AUTH, TRANSFERS, BILL_PAY, STATEMENTS
    field_name VARCHAR(50) NOT NULL,      -- e.g. email, password, toAccountNumber, amount
    rule_code VARCHAR(50) NOT NULL,       -- e.g. MANDATORY, MIN_LENGTH, MAX_LENGTH, REGEX, TYPE
    error_message TEXT NOT NULL,          -- Parameterized or formatted message
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rule_field_code UNIQUE (module, field_name, rule_code)
);

CREATE INDEX idx_validation_rules_module ON validation_rules(module);
CREATE INDEX idx_validation_rules_field ON validation_rules(field_name);
CREATE INDEX idx_validation_rules_code ON validation_rules(rule_code);
