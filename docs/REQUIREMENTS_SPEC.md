# FinApex Digital Banking Platform - Software Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Target Environment:** AWS (ECS/Fargate, RDS PostgreSQL, CloudWatch, S3 + CloudFront)  
**Architecture:** Micro-frontend (React Microapps) + Node.js Microservices + Relational Database (PostgreSQL)  
**Target Test Automation:** Testiva with AI Locator Self-Healing and Chaos Lab  

---

## 1. System Overview & Architecture

FinApex is an enterprise-grade digital banking micro-application suite built with:
- **Frontend Architecture:** Decoupled Microapp shell hosting 5 focused banking micro-modules (Authentication, Accounts, Transfers, Utility Bills, Transaction Statements).
- **Backend Architecture:** Node.js (Express) Microservices orchestrated through an API Gateway:
  - `API Gateway` (Port 5000): Ingress proxy, authentication verification, correlation ID injection (`x-correlation-id`), CloudWatch metrics logging, unified Swagger docs.
  - `Auth Service` (Port 5001): User registration, credentials validation, JWT issuance, password security enforcement.
  - `Account Service` (Port 5002): Checking/Savings accounts, balances, beneficiary directory.
  - `Transaction Service` (Port 5003): Funds transfer execution, bill payments, ledger tracking, statement generation.
- **Data Layer:** PostgreSQL Relational Database with ACID transactions, foreign keys, decimal precision (`NUMERIC(14,2)`), check constraints, and audit logging.
- **Observability:** Winston JSON loggers sending structured logs to AWS CloudWatch (`/aws/finapex/api-gateway`, `/aws/finapex/auth-service`, `/aws/finapex/account-service`, `/aws/finapex/transaction-service`).

---

## 2. Page & Functional Requirements

The system consists of **5 primary pages/modules**, each equipped with client-side and server-side value validations and explicit automated test locators.

### Page 1: Authentication & User Login (`/login`)
- **Purpose:** Secure customer entry into the banking portal.
- **Elements & Validations:**
  - **Username / Email:**
    - Type: String (Email or alphanumeric username)
    - Required: Yes
    - Pattern: Valid email syntax `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` OR username `^[a-zA-Z0-9_]{4,20}$`
    - Error Message: *"Enter a valid email address or username (4-20 alphanumeric characters)."*
  - **Password:**
    - Type: Password
    - Required: Yes
    - Complexity: Min 8 chars, at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character (`[!@#$%^&*(),.?":{}|<>]`)
    - Error Message: *"Password must contain at least 8 characters, including uppercase, lowercase, number, and special character."*
  - **Remember Me:** Boolean checkbox.
  - **Quick Test Persona Selector:** One-click test fixtures (`john.doe@bank.com`, `jane.smith@bank.com`) for Testiva test acceleration.

### Page 2: Accounts Dashboard & Financial Overview (`/dashboard`)
- **Purpose:** Consolidated balance views across Checking, Savings, and Credit accounts.
- **Elements & Validations:**
  - Summary metrics: Total Net Worth, Monthly Inflow, Monthly Outflow.
  - Account Card list showing: Account Number (masked `**** 1234`), Account Type, Available Balance, Status (ACTIVE / FROZEN).
  - Quick action routing to Transfer and Bill Pay modules with account context pre-population.

### Page 3: Fund Transfer & Payment Form (`/transfers`)
- **Purpose:** Inter-account and third-party fund transfers with real-time balance and limit validations.
- **Elements & Validations:**
  - **Source Account (`fromAccountId`):**
    - Type: Dropdown Select
    - Required: Yes
    - Validation: Must be an ACTIVE account with available balance > 0.
  - **Recipient Account Number (`toAccountNumber`):**
    - Type: Text
    - Required: Yes
    - Length: 10 to 12 digits numeric (`^\d{10,12}$`).
    - Validation: Cannot be identical to the selected source account number.
    - Error Message: *"Recipient account must be a valid 10-12 digit account number different from source account."*
  - **Routing / Swift Code (`routingNumber`):**
    - Type: Text
    - Required: Yes
    - Format: Exactly 9 numeric digits (`^\d{9}$`) or 8-11 alphanumeric SWIFT code.
    - Error Message: *"Routing number must be exactly 9 numeric digits."*
  - **Transfer Amount (`amount`):**
    - Type: Numeric (2 decimal places)
    - Required: Yes
    - Minimum: `$1.00`
    - Maximum: `$10,000.00` (Per-transaction daily limit)
    - Balance Check: Must not exceed source account available balance.
    - Error Message: *"Transfer amount must be between $1.00 and $10,000.00 and cannot exceed available balance."*
  - **Payment Remarks / Memo (`remarks`):**
    - Type: Text
    - Required: Yes
    - Length: 3 to 100 characters, no dangerous script characters (`^[a-zA-Z0-9\s.,\-_]{3,100}$`).
    - Error Message: *"Remarks must be 3-100 alphanumeric characters."*
  - **Transfer Execution Modal:** Confirmation step showing source, destination, fee ($0.00), total debit, and an idempotency token to prevent duplicate debits.

### Page 4: Utility Bill Payment Form (`/bill-pay`)
- **Purpose:** Scheduled and immediate bill payments (Electricity, Water, Internet, Mobile, Credit Card).
- **Elements & Validations:**
  - **Source Account (`accountId`):**
    - Type: Dropdown Select
    - Required: Yes
  - **Biller Category (`billerCategory`):**
    - Dropdown: `ELECTRICITY`, `WATER`, `INTERNET`, `MOBILE_RECHARGE`, `CREDIT_CARD`.
  - **Biller Name (`billerId`):**
    - Dynamic dropdown populated based on category.
  - **Consumer / Account Number (`consumerNumber`):**
    - Type: Text
    - Pattern based on Biller (e.g., Electric: `ELEC-\d{6,8}`, Telecom: `\d{10}`).
    - Error Message: *"Consumer account number format is invalid for selected biller."*
  - **Bill Due Date (`dueDate`):**
    - Date picker (ISO-8601 `YYYY-MM-DD`). Cannot be older than 30 days past due.
  - **Bill Amount (`billAmount`):**
    - Numeric: `$5.00` to `$5,000.00`.
    - Error Message: *"Bill payment amount must be between $5.00 and $5,000.00."*
  - **Auto-Pay Toggle:** Boolean switch.

### Page 5: Transactions History & Statement Explorer (`/transactions`)
- **Purpose:** Searchable, filterable audit ledger of all debits and credits with CSV export capability.
- **Elements & Validations:**
  - **Date Range Filter (`startDate` & `endDate`):**
    - Validation: `startDate` <= `endDate`.
    - Range Limit: Max 365 days span.
    - Future Date Restriction: `endDate` cannot be in the future.
    - Error Message: *"Start date cannot be after end date, and range cannot exceed 365 days."*
  - **Transaction Type Filter (`type`):**
    - Select: `ALL`, `TRANSFER`, `BILL_PAYMENT`, `DEPOSIT`, `WITHDRAWAL`.
  - **Min & Max Amount Range (`minAmount`, `maxAmount`):**
    - Validation: `minAmount` >= 0; `maxAmount` >= `minAmount`.
  - **Status Filter:** `ALL`, `COMPLETED`, `PENDING`, `FAILED`.
  - **Search Query (`search`):** Search by recipient, transaction ID, or remark.
  - **Pagination Controls:** Items per page (10, 25, 50), page selector.
  - **Statement Export Button:** Generates downloadable CSV / PDF statement.

---

## 3. Comprehensive Field Validation Matrix (Test Automation Dictionary)

This table defines all field rules, mandatory checks, acceptable size limits, data types, exact error messages, and unified selectors for Testiva test automation:

| Page | Field Name | HTML / data-testid | Data Type | Mandatory | Acceptable Size / Bounds | Exact Error Message on Failure | Negative Test Cases |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Login** | Email / Username | `[data-testid="input-email"]` | String | **YES** | 4 to 100 characters | *"Email or username is mandatory."* / *"Invalid email format (e.g. user@example.com)"* / *"Username must be 4 to 20 alphanumeric characters."* | Empty, `ab`, `test@`, `a`.repeat(105), `<script>` |
| **Login** | Password | `[data-testid="input-password"]` | String | **YES** | 8 to 64 characters | *"Password is mandatory."* / *"Password must be at least 8 characters long."* / *"Password must contain at least 1 uppercase letter (A-Z)."* / *"Password must contain at least 1 numeric digit (0-9)."* / *"Password must contain at least 1 special character."* | Empty, `1234567`, `lowercaseonly1!`, `NO_LOWER_1!`, `NoDigits!`, `NoSpecial123` |
| **Transfers** | Source Account | `[data-testid="select-source-account"]` | UUID (String) | **YES** | 1 selection (UUID) | *"Source account selection is mandatory."* / *"Source account is INACTIVE. Transfers are not permitted."* | Unselected, inactive account |
| **Transfers** | Beneficiary Account # | `[data-testid="input-target-account"]` | Numeric String | **YES** | Exactly 10 to 12 digits | *"Beneficiary account number is mandatory."* / *"Recipient account number must contain numeric digits only (0-9)."* / *"Account number too short (minimum 10 digits required)."* / *"Account number too long (maximum 12 digits permitted)."* / *"Destination account cannot be identical to your source account."* | Empty, `123456`, `ABCD1234567`, `1234567890123`, same as source |
| **Transfers** | Routing Number | `[data-testid="input-routing-number"]` | Numeric String | **YES** | Exactly 9 digits | *"Routing number (ABA Transit) is mandatory."* / *"Routing number must contain numeric digits only (0-9)."* / *"Routing number must be exactly 9 digits."* | Empty, `12345`, `ABC123456`, `1234567890` |
| **Transfers** | Transfer Amount | `[data-testid="input-transfer-amount"]` | Decimal Number | **YES** | $1.00 to $10,000.00 (Max 2 decimals) | *"Transfer amount is mandatory."* / *"Transfer amount must be a valid numeric currency value with up to 2 decimal places."* / *"Transfer amount must be at least $1.00 USD (minimum acceptable size)."* / *"Transfer amount exceeds maximum limit of $10,000.00 USD per transaction."* / *"Insufficient available funds. Current balance is $X.XX."* | Empty, `0.00`, `-25.00`, `15000.00`, `12.345`, `> balance` |
| **Transfers** | Remarks / Memo | `[data-testid="input-transfer-remarks"]` | Text String | **YES** | 3 to 100 characters | *"Payment memo / remarks is mandatory."* / *"Remarks must be at least 3 characters long."* / *"Remarks cannot exceed 100 characters."* | Empty, `ok`, `a`.repeat(105) |
| **Bill Pay** | Debit Account | `[data-testid="select-bill-account"]` | UUID (String) | **YES** | 1 selection (UUID) | *"Source debit account is mandatory."* / *"Selected debit account is invalid or does not belong to your profile."* | Unselected, empty string |
| **Bill Pay** | Service Provider | `[data-testid="select-biller-provider"]` | String ID | **YES** | Valid biller ID | *"Biller / utility provider selection is mandatory."* / *"Selected biller is inactive or not found in system directory."* | Unselected, invalid ID |
| **Bill Pay** | Consumer Account # | `[data-testid="input-consumer-number"]` | Alphanumeric String | **YES** | 6 to 20 characters (Regex match) | *"Consumer account / meter number is mandatory."* / *"Consumer number too short (minimum 6 characters required)."* / *"Consumer number too long (maximum 20 characters permitted)."* / *"Format invalid for [Biller]. Must match pattern: [Regex]."* | Empty, `123`, `a`.repeat(25), regex mismatch |
| **Bill Pay** | Due Date | `[data-testid="input-bill-due-date"]` | Date String (ISO) | **YES** | Valid date YYYY-MM-DD | *"Bill due date is mandatory."* / *"Due date must be a valid calendar date format (YYYY-MM-DD)."* | Empty, `invalid-date` |
| **Bill Pay** | Bill Amount | `[data-testid="input-bill-amount"]` | Decimal Number | **YES** | Provider Min ($5-$15) to Max ($500-$5000) | *"Bill payment amount is mandatory."* / *"Bill payment amount must be a valid positive number with up to 2 decimal places."* / *"Payment amount below minimum acceptable limit of $X.XX USD."* / *"Payment amount exceeds maximum acceptable limit of $X.XX USD."* / *"Insufficient available account balance."* | Empty, `0.00`, `-10.00`, `< provider min`, `> provider max`, `> balance` |
| **Statements**| Start Date | `[data-testid="input-filter-start-date"]` | Date String (ISO) | **NO** | Valid date YYYY-MM-DD | *"Start date must be a valid calendar date (YYYY-MM-DD)."* / *"Start date cannot be after End date."* | `invalid-date`, `startDate > endDate` |
| **Statements**| End Date | `[data-testid="input-filter-end-date"]` | Date String (ISO) | **NO** | Valid date YYYY-MM-DD, Span <= 365 days | *"End date must be a valid calendar date (YYYY-MM-DD)."* / *"Date range cannot exceed 365 days."* | `invalid-date`, `range > 365 days` |
| **Statements**| Min Amount | `[data-testid="input-filter-min-amount"]` | Decimal Number | **NO** | >= $0.00 and <= $1,000,000.00 | *"Minimum amount must be a valid numeric dollar value."* / *"Minimum amount cannot be negative."* / *"Minimum amount cannot be greater than Maximum amount."* | `abc`, `-50.00`, `minAmount > maxAmount` |
| **Statements**| Max Amount | `[data-testid="input-filter-max-amount"]` | Decimal Number | **NO** | >= $0.00 and <= $1,000,000.00 | *"Maximum amount must be a valid numeric dollar value."* / *"Maximum amount cannot be negative."* | `abc`, `-100.00` |
| **Statements**| Search Keyword | `[data-testid="input-filter-search"]` | Text String | **NO** | Max 50 characters | *"Search keyword cannot exceed 50 characters."* | `a`.repeat(55) |

---

## 4. Observability & AWS CloudWatch Specifications

All microservices write structured JSON log events directly streamable to AWS CloudWatch Logs:

```json
{
  "timestamp": "2026-10-09T09:30:00.123Z",
  "level": "info",
  "service": "transaction-service",
  "environment": "production",
  "correlationId": "req-9b8f2a1c-34d1-4e78",
  "userId": "usr_99812",
  "action": "EXECUTE_TRANSFER",
  "details": {
    "fromAccount": "ACC-1002341",
    "toAccount": "ACC-9982312",
    "amount": 250.00,
    "currency": "USD",
    "status": "SUCCESS"
  },
  "durationMs": 42
}
```

### Log Groups Structure in CloudWatch:
- `/aws/finapex/api-gateway`
- `/aws/finapex/auth-service`
- `/aws/finapex/account-service`
- `/aws/finapex/transaction-service`

### CloudWatch Metric Filters:
1. `TransferFailureCount` (Filter pattern: `{ $.service = "transaction-service" && $.level = "error" }`)
2. `AuthenticationFailureCount` (Filter pattern: `{ $.service = "auth-service" && $.action = "LOGIN_FAILED" }`)
3. `ApiResponseLatency` (Metric extraction from `$.durationMs`)

---

## 5. Testiva Chaos Engineering & Locator Self-Healing Specifications

FinApex includes a built-in **Testiva Chaos Lab** (`/admin`) designed specifically to test Testiva's resilience, error handling, timeout management, and AI Locator Self-Healing:

### 5.1 Simulated Fake Failures
- Allows testing negative assertion workflows and error boundaries.
- **Configurable Status Codes:** HTTP 400, 401, 403, 404, 500, 502, 503.
- **Target Filtering:** Can isolate failures to specific routes (`/auth/login`, `/transactions/transfer`, `/bills/pay`, `/accounts`) or apply globally.
- **Custom Error Payloads:** Simulates upstream network dropouts, database pool exhaustion, or service timeouts.

### 5.2 Artificial API Latency & Slow Page Render
- **API Response Delay:** Configurable from 0ms to 8,000ms. Verifies Testiva explicit waits, request interceptors, and timeout budgets.
- **Slow Page Render:** Simulates client-side render lag / hydration delay (up to 4,000ms) with a visual indicator to verify element presence waiting mechanisms in Testiva.

### 5.3 Browser Console Telemetry Output
- Emits structured `console.log`, `console.warn`, and `console.error` messages tagged with `[Testiva Tracer]` timestamps.
- Enables validation of Testiva browser console error log capture and alert thresholds.

### 5.4 AI Locator Self-Healing Engine
- **Mode 1 (Standard v1):** Standard predictable IDs and testids (e.g., `id="login-email"`).
- **Mode 2 (Mutated v2):** Altered element IDs, names, and testids (e.g., `id="usr_identity_v2"`, `name="credential_user"`, `data-testid="field-user-ident"`).
- **Mode 3 (Custom Editable):** Testers can dynamically customize and rename element IDs and names in real time to verify that Testiva heals the selector and continues executing tests without failure.

### 5.5 Accessibility (a11y) Testing & Non-Compliance Simulation Engine
The application provides dual-state accessibility behavior specifically designed for automated accessibility scanners (e.g., Testiva a11y scanner, axe-core, Lighthouse):
- **Compliant Mode (Default - WCAG 2.1 AA Compliant):**
  - **Contrast Ratio:** Text and buttons maintain high contrast ratio >= 4.5:1 (e.g. #0F172A on #FFFFFF is 16:1).
  - **Form Labels:** Explicit `<label htmlFor="...">` associated with all input fields, plus `aria-label`, `aria-required`, and `aria-describedby`.
  - **Focus Visible:** Distinct 3px solid `#2563EB` focus outline on `:focus-visible` with 2px offset.
  - **Skip Link:** Accessible bypass link (`<a href="#main-content" class="skip-link">`) allowing keyboard users to bypass header navigation blocks.
  - **Heading Hierarchy:** Strictly sequential headings (`h1` -> `h2` -> `h3`).
  - **Touch Targets:** Minimum 44x44px for buttons and touch targets.
  - **Live Error Alerts:** Error banners equipped with `role="alert"` and `aria-live="assertive"`.
- **Non-Compliant Mode (Accessible via Testiva Lab):**
  - **Color Contrast Failure (WCAG 1.4.3):** Drops text contrast to ~1.6:1 (#A0AEC0 on #FFFFFF), triggering contrast violations.
  - **Missing Form Labels (WCAG 1.3.1, 4.1.2):** Strips `<label>` associations and `aria-label` attributes, creating unlabeled inputs.
  - **Suppressed Focus Ring (WCAG 2.4.7, 2.4.1):** Injects `outline: none !important` and removes the skip-to-content link.
  - **Broken Heading Order (WCAG 1.3.1):** Replaces `h1` with `h5` or unsemantic divs.
  - **Suppressed ARIA-Live (WCAG 4.1.3):** Removes `role="alert"` from dynamic error notifications.

### 5.6 Database-Driven Validation Rules & Error Messages (`validation_rules`)
To verify dynamic data-driven validation tests in Testiva, all validation constraints and corresponding error messages are decoupled from application code and stored in the `validation_rules` relational database table:
- **Relational Schema:** `validation_rules(id, module, field_name, rule_code, error_message, is_active, created_at, updated_at)`.
- **Dynamic Retrieval:** Microservices query the table on every request using `getErrorMessage(module, field, ruleCode, params)`.
- **Template Placeholders:** Error message templates support dynamic runtime token replacement (e.g., `{min}`, `{max}`, `{actual}`, `{balance}`).
- **Runtime Admin CRUD:** In the Testiva Lab under **DB Validation Rules & Errors**, QA automation engineers can modify any error message live via `PUT /api/v1/validation-rules/:id`. When tests trigger a validation failure, the backend immediately renders the customized error message returned from the database table.

---

## 6. Export Capabilities (PDF & CSV Statements)
Under the Statements module (`/statements`), users and automated tests can export transaction history:
- **CSV Export:** `GET /api/v1/transactions/statement/export/csv` generates structured RFC 4180 CSV text streams with custom date range and type filtering.
- **PDF Export:** `GET /api/v1/transactions/statement/export/pdf` synthesizes a downloadable binary PDF document featuring official FinApex bank branding, account summary, and transaction ledger.
