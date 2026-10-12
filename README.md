# FinApex Digital Banking Microapp & Microservices Platform

[![Architecture](https://img.shields.io/badge/Architecture-Microfrontend%20%2B%20Microservices-blue.svg)](#architecture)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb.svg)](#frontend)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green.svg)](#backend)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2015-336791.svg)](#database)
[![Cloud](https://img.shields.io/badge/Cloud-AWS%20ECS%20%2B%20CloudWatch-FF9900.svg)](#aws-cloudwatch)
[![Test Automation](https://img.shields.io/badge/Test%20Automation-Testiva%20Ready-success.svg)](#testiva-testing)

---

## 🚀 Live Services Status

| Service | Component | Local URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | React Microapp | [http://localhost:9004](http://localhost:9004) | 5-Page Banking UI with field validations |
| **Testiva Chaos Lab** | Admin Lab Page | [http://localhost:9004](http://localhost:9004) (Click "Testiva Lab") | Inject failures, latency, lag, & mutate locators |
| **API Gateway** | Node.js Gateway | [http://localhost:9000](http://localhost:9000) | Ingress routing, correlation ID injection |
| **Swagger UI Docs** | OpenAPI 3.0 | [http://localhost:9000/api-docs](http://localhost:9000/api-docs) | Interactive API sandbox |
| **Gateway Health** | Observability | [http://localhost:9000/health](http://localhost:9000/health) | ALB health check endpoint |
| **Auth Microservice** | Node.js Express | `http://localhost:9001` | JWT, Bcrypt, Login & Register validations |
| **Account Microservice**| Node.js Express | `http://localhost:9002` | Balances, Account listings, Beneficiaries |
| **Transaction Microservice**| Node.js Express | `http://localhost:9003` | Fund transfers, Bill payments, Statement query |

---

## 🧪 Testiva Chaos Lab & AI Locator Self-Healing Engine

Access the **Testiva Lab** from the top navigation bar or directly from the Login page:

### 1. Fake Failure Injection
- **Toggle Simulation:** Turn fake failure ON or OFF in real time.
- **Configurable Status Codes:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable.
- **Target Filtering:** Isolate to specific endpoints (e.g. `/api/v1/auth/login`, `/api/v1/transactions/transfer`, `/api/v1/bills/pay`, `/api/v1/accounts`) or apply globally.
- **Custom Error Message:** Specify custom simulated failure messages.
- **Live Trigger:** One-click button to execute a live test request and inspect the response.

### 2. API Response Latency Simulation
- Inject artificial delays (0ms, 500ms, 1500ms, 3000ms, 5000ms, up to 8000ms) on API Gateway responses.
- Allows testing Testiva explicit waits, request interceptors, and timeout threshold settings.

### 3. Page Render Slowdown Simulation
- Introduce artificial mount delays (0ms, 800ms, 2000ms, 4000ms) when navigating between microapp pages.
- Renders a pulsing loading indicator to verify Testiva DOM hydration wait stability.

### 4. Browser Console Telemetry Output
- Emits structured `console.log`, `console.warn`, and `console.error` logs with timestamps and `[Testiva Tracer]` prefixes.
- **Auto-Heartbeat:** Emits recurring logs every 3.5 seconds.
- **On-Demand Generators:** Buttons to emit bursts of `console.log`, `console.warn`, or `console.error` for Testiva log capture assertions.

### 5. Element Locator Mutation Engine (AI Self-Healing Test)
- **Standard Locators (v1):** Original predictable IDs and testids (e.g. `id="login-email"`, `data-testid="input-login-email"`).
- **Mutated Locators (v2):** Altered IDs and names (e.g. `id="usr_identity_v2"`, `name="credential_user"`, `data-testid="field-user-ident"`).
- **Custom Editable Locators:** Live interactive table where you can type ANY custom ID, name, or `data-testid` for fields across Login, Transfers, and Bill Pay.
- **Verification:** Run your existing Testiva tests without updating the script to verify that Testiva's AI engine automatically heals the selector and finds the element.

### 6. Accessibility (a11y) Testing & Non-Compliance Simulator
Test both positive (WCAG 2.1 AA Compliant) and negative (Violation) scenarios in Testiva Accessibility Audits:
- **Compliant Mode (Default):**
  - Text and UI contrast ratio >= 4.5:1 (high contrast slate on white).
  - Explicit `<label>` associations on all form elements.
  - Visible 3px blue focus rings on keyboard tab navigation (`:focus-visible`).
  - Skip-to-content bypass link (`.skip-link`).
  - Clean heading hierarchy (`h1` -> `h2` -> `h3`) and `role="alert"` dynamic error announcements.
- **Make Non-Compliant Mode:**
  - One-click button in **Testiva Lab** toggles deliberate WCAG violations:
    - **Color Contrast Failure (WCAG 1.4.3):** Faint gray text with ~1.6:1 contrast ratio.
    - **Missing Form Labels (WCAG 1.3.1):** Unlabeled input fields without `aria-label` or `htmlFor`.
    - **Suppressed Focus Ring (WCAG 2.4.7):** Removes focus indicators (`outline: none`) and hides the skip link.
    - **Broken Heading Order (WCAG 1.3.1):** Swaps headings to `h5` skipping heading levels.
    - **No ARIA Alerts (WCAG 4.1.3):** Dynamic errors omit `role="alert"` and `aria-live`.

### 7. Database-Driven Validation Rules & Error Message Editor
- **Decoupled Relational Error Messages:** All field constraints and error strings are stored in the `validation_rules` database table across modules (`AUTH`, `TRANSFERS`, `BILL_PAY`, `STATEMENTS`).
- **Live In-Memory & RDS Synchronization:** The Testiva Lab includes a dedicated **"DB Validation Rules & Errors"** tab with full module filtering and inline editing.
- **Dynamic Test Assertions:** Change any error message via the Testiva Lab UI or `PUT /api/v1/validation-rules/:id`, then submit the invalid form field to observe the backend immediately serving the customized error message drawn directly from the database table.

---

## 📁 Repository Deliverables Directory

All requested documents, specifications, and code are organized into dedicated folders:

```
sampleApp/
├── docs/
│   ├── REQUIREMENTS_SPEC.md       # Full SRS, Field Validation Matrix & Testiva Chaos Spec
│   ├── WIREFRAMES_AND_DESIGN.md   # Wireframes, Architecture, & Design System
│   ├── openapi.yaml               # Complete Swagger / OpenAPI 3.0 Specification
│   └── figma/                     # Complete Figma Design System & Testiva Assets
│       ├── figma-tokens.json      # DTCG / W3C standard tokens (colors, type, radii, shadows)
│       ├── FIGMA_DESIGN_SYSTEM.md # Figma-to-Testiva locator mapping & import guide
│       ├── figma-preview.html     # Standalone browser visual artboard previewer
│       └── screens/               # 1440px desktop Figma vector artboard frames (SVG)
│           ├── 01-login-screen.svg
│           ├── 02-dashboard-screen.svg
│           ├── 03-transfers-screen.svg
│           ├── 04-bill-payments-screen.svg
│           ├── 05-statements-screen.svg
│           └── 06-testiva-lab-screen.svg
├── database/
│   ├── schema.sql                 # PostgreSQL DDL (Tables, Foreign Keys, Checks, Indexes)
│   └── seed_data.sql              # Pre-populated DML test fixtures for Testiva
├── services/
│   ├── gateway/                   # API Gateway (Port 9000), Swagger UI & Chaos Middleware
│   ├── auth-service/              # Identity & Credentials Service (Port 9001)
│   ├── account-service/           # Account Balances & Directory (Port 9002)
│   ├── transaction-service/       # Transfers, Utility Bills & Ledger (Port 9003)
│   ├── shared/                    # Winston CloudWatch Logger, DB client, Auth middleware
│   ├── package.json               # Backend dependencies
│   ├── Dockerfile                 # Container image specification
│   ├── test-services.js           # Automated end-to-end backend verification test suite
│   └── start-all.js               # Concurrent microservices runner
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── TestivaContext.jsx   # State manager for Chaos, latency, logs & locator mutations
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Page 1: Login & MFA (Dynamic Testiva locators + autofill)
│   │   │   ├── DashboardPage.jsx    # Page 2: Accounts Overview & Portfolio metrics
│   │   │   ├── TransferPage.jsx     # Page 3: Fund Transfer Form & Confirmation modal
│   │   │   ├── BillPayPage.jsx      # Page 4: Utility Bill Payment with regex validation
│   │   │   ├── TransactionsPage.jsx # Page 5: Filterable Statement Ledger & CSV Export
│   │   │   └── AdminPage.jsx        # Admin Lab: Chaos, latency, slow render, & locator editor
│   │   ├── components/
│   │   │   └── Navbar.jsx           # Unified microapp header & Testiva Lab indicator
│   │   ├── App.jsx                  # Root Microapp shell with render lag simulation
│   │   └── index.css                # Custom UI styling with Figma design tokens
│   ├── package.json                 # Frontend dependencies (React 18, Vite, Lucide)
│   ├── nginx.conf                   # Production Nginx reverse-proxy configuration
│   └── Dockerfile                   # Multi-stage production container build
└── aws/
    ├── docker-compose.yml           # Local & AWS Docker orchestration (Postgres + Services)
    ├── cloudwatch-config.json       # AWS CloudWatch agent configuration
    ├── ecs-task-definition.json     # AWS ECS Fargate task definition with awslogs driver
    └── DEPLOYMENT_GUIDE.md          # Comprehensive AWS RDS, ECS & CloudWatch Guide
```

---

## 🔑 Pre-Configured Test Personas

Both accounts are pre-loaded with balances and available via **1-click autofill** on the Login Page:

| User Full Name | Username / Email | Password | Checking Balance | Savings Balance |
| :--- | :--- | :--- | :--- | :--- |
| **Johnathan Doe** | `john.doe@bank.com` | `Password123!` | **$14,250.75** | **$48,920.00** |
| **Jane Smith** | `jane.smith@bank.com` | `Password123!` | **$8,530.20** | **$0.00** |

---

## 🛡️ Field Validations & Negative Test Scenarios

The platform enforces strict client-side and server-side validation against all form inputs:

### 1. Authentication (`LoginPage.jsx`)
- **Email/Username:** Requires standard RFC 5322 email syntax or 4-20 alphanumeric characters.
- **Password:** Minimum 8 characters with at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol (`[!@#$%^&*...]`).

### 2. Fund Transfer (`TransferPage.jsx`)
- **Source Account:** Must be active with available balance > 0.
- **Target Account Number:** Validated against `^\d{10,12}$`. Rejected if identical to source account.
- **Routing Number:** Validated against `^\d{9}$` (ABA routing format).
- **Transfer Amount:** Bound to `$1.00 <= amount <= $10,000.00`. Rejected if exceeding source account balance.
- **Remarks:** 3 to 100 characters.

### 3. Utility Bill Payments (`BillPayPage.jsx`)
- **Biller Selection:** Electricity, Water, Fiber Internet, Mobile Recharge, Credit Card.
- **Consumer Number Format:** Dynamically validated against the selected provider's regex pattern (e.g. `^ELEC-[0-9]{6}$` for Consolidated Edison Power).
- **Bill Amount:** Enforces provider bounds (e.g. `$10.00` min to `$2,500.00` max for electricity) and balance checks.

### 4. Statement & Audit Explorer (`TransactionsPage.jsx`)
- **Date Range:** Rejects queries where `startDate > endDate` or date span exceeds 365 days.
- **Amount Range:** Validates `minAmount <= maxAmount`.
- **Export to CSV:** `GET /api/v1/transactions/statement/export/csv` generates structured CSV with quotes, headers, and transaction details.
- **Export to PDF:** `GET /api/v1/transactions/statement/export/pdf` dynamically streams a branded PDF document complete with bank letterhead, account summaries, zebra-striped transaction tables, and compliance regulatory notices.
- **Filter Query Propagation:** Both export endpoints accept all active table filters (`startDate`, `endDate`, `type`, `minAmount`, `maxAmount`, `search`) to export custom-scoped statements.

---

## ☁️ AWS CloudWatch Observability

All microservices emit structured JSON logs formatted for AWS CloudWatch:

```json
{
  "timestamp": "2026-10-09T09:30:21.947Z",
  "level": "INFO",
  "service": "api-gateway",
  "correlationId": "corr-c7b94a21-1256-42f0",
  "method": "POST",
  "path": "/api/v1/transactions/transfer",
  "statusCode": 201,
  "durationMs": 34.2
}
```

Dedicated Log Groups:
- `/aws/finapex/api-gateway`
- `/aws/finapex/auth-service`
- `/aws/finapex/account-service`
- `/aws/finapex/transaction-service`

See [aws/DEPLOYMENT_GUIDE.md](aws/DEPLOYMENT_GUIDE.md) for ECS Fargate deployment, ALB configuration, and CloudWatch Metric Filters.
