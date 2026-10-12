# FinApex Figma Design System & Testiva Automated Testing Integration Guide

This directory contains production-ready Figma design system tokens, vector artboards (SVG frames), and architectural guides tailored specifically for **Testiva AI Automated Testing** (Visual Regression, AI Locator Self-Healing, Design-to-Test verification, and WCAG 2.1 AA Accessibility audits).

---

## 1. Directory Structure

```
docs/figma/
├── figma-tokens.json              # DTCG / W3C standard design tokens (colors, radii, shadows, type)
├── FIGMA_DESIGN_SYSTEM.md         # This specification and Testiva integration guide
├── figma-preview.html             # Standalone browser visual previewer for all screens & tokens
└── screens/                       # Standard 1440px desktop Figma vector artboards
    ├── 01-login-screen.svg        # Frame 1: Login & Multi-Factor Auth (1440x900)
    ├── 02-dashboard-screen.svg    # Frame 2: Core Banking Dashboard & Balances (1440x960)
    ├── 03-transfers-screen.svg    # Frame 3: Fund Transfer & Confirmation Modal (1440x960)
    ├── 04-bill-payments-screen.svg# Frame 4: Utility & Biller Payments (1440x960)
    ├── 05-statements-screen.svg   # Frame 5: Transaction Activity Ledger (1440x960)
    └── 06-testiva-lab-screen.svg  # Frame 6: Testiva Chaos, Locator & A11y Lab (1440x1024)
```

---

## 2. Importing Assets into Figma

### Method 1: Direct SVG Import (Fastest & Native Vector)
1. Open your Figma Desktop App or browser at [figma.com](https://figma.com).
2. Create a new design file named **`FinApex Banking Microapp`**.
3. Drag and drop all `.svg` files from `docs/figma/screens/` directly onto the canvas.
4. Figma automatically parses each SVG into editable **Frames**, **Text layers**, **Vector shapes**, and preserves layer groups:
   - All layer IDs in the SVG (e.g. `id="input-email"`, `id="btn-login"`) are preserved as **Figma Layer Names**.
   - These layer names match 1:1 with the application's React DOM `data-testid` and element attributes.

### Method 2: Importing Design Tokens into Figma
1. Install a Figma token management plugin such as **Tokens Studio for Figma** or use Figma's native **Variables** panel.
2. Open the plugin / Variables settings.
3. Select **Import** → Choose [`docs/figma/figma-tokens.json`](file:///c:/Users/vsiva/sampleApp/docs/figma/figma-tokens.json).
4. The following collections will automatically populate:
   - **Color Modes**: Primary Blue (`#1D4ED8`), Slate (`#0F172A`), Status Green (`#059669`), Error Crimson (`#E11D48`), etc.
   - **Typography**: Inter weights (400, 500, 600, 700), font sizes (12px to 28px).
   - **Border Radii**: 4px (sm), 8px (md), 12px (lg), 16px (xl).
   - **Elevation Shadows**: Level 1 (sm), Level 2 (md), Level 3 (lg), and Dark Mode glows.

---

## 3. Testiva Design-to-Test Mapping Table

Testiva reads Figma artboard layer hierarchies to generate assertions, detect visual regressions, and verify locator selectors against the live DOM.

| Screen | Figma Artboard / Layer | React DOM `data-testid` / Selector | Purpose in Testiva |
|---|---|---|---|
| **01-Login** | `input-email` | `[data-testid="input-email"]` / `#login-email` | Baseline login credential entry |
| **01-Login** | `input-password` | `[data-testid="input-password"]` / `#login-password` | Password masked input verification |
| **01-Login** | `btn-login` | `[data-testid="btn-login"]` / `#btn-submit-login` | Primary form submit trigger |
| **01-Login** | `badge-wcag` | `[data-testid="badge-wcag"]` | WCAG 2.1 AA badge visual check |
| **02-Dashboard** | `stat-checking-balance` | `[data-testid="balance-checking"]` | Dynamic data assertions ($14,250.75) |
| **02-Dashboard** | `stat-savings-balance` | `[data-testid="balance-savings"]` | Dynamic data assertions ($42,890.10) |
| **02-Dashboard** | `btn-quick-transfer` | `[data-testid="btn-quick-transfer"]` | Navigation event trigger |
| **03-Transfers** | `select-source-account` | `[data-testid="select-source-account"]` | Source account dropdown select |
| **03-Transfers** | `select-beneficiary` | `[data-testid="select-beneficiary"]` | Beneficiary validation selection |
| **03-Transfers** | `input-transfer-amount`| `[data-testid="input-transfer-amount"]`| Transfer amount limit boundary test |
| **03-Transfers** | `btn-submit-transfer` | `[data-testid="btn-submit-transfer"]` | Triggers review modal |
| **03-Transfers** | `modal-confirm-transfer`| `[data-testid="modal-confirm-transfer"]`| Modal focus trap verification |
| **04-Bill Pay** | `select-provider` | `[data-testid="select-provider"]` | Service provider picker |
| **04-Bill Pay** | `input-consumer-id` | `[data-testid="input-consumer-id"]` | Utility meter account # field |
| **04-Bill Pay** | `btn-submit-bill` | `[data-testid="btn-submit-bill"]` | Bill payment execution |
| **05-Statements**| `input-search` | `[data-testid="input-search"]` | Real-time ledger filter input |
| **05-Statements**| `btn-export-csv` | `[data-testid="btn-export-csv"]` | File download blob assertion |
| **05-Statements**| `table-head` | `[data-testid="table-ledger-head"]` | Accessible sortable table headers |
| **06-Testiva Lab**| `control-latency` | `[data-testid="slider-latency"]` | Chaos network lag simulation |
| **06-Testiva Lab**| `control-fail-rate` | `[data-testid="slider-fault-rate"]` | Synthetic HTTP 500 fault rate |
| **06-Testiva Lab**| `radio-schema-mutated`| `[data-testid="radio-schema-mutated"]`| AI Locator Self-Healing mutation toggle |
| **06-Testiva Lab**| `toggle-master-a11y` | `[data-testid="toggle-master-a11y"]` | Flips WCAG AA to non-compliant state |

---

## 4. Testing AI Locator Self-Healing with Testiva

When running automated test suites in Testiva:

1. **Step 1 (Record / Baseline)**:
   - Run your Testiva automated test against `http://localhost:9004` while Testiva Lab is set to **Baseline Standard**.
   - Testiva records the original selectors (e.g. `id="login-email"`).
2. **Step 2 (Mutate the DOM)**:
   - Navigate to `/admin` (Testiva Lab).
   - Under **Locator Self-Healing**, select **Mutated Schema v2** or **CSS-in-JS Obfuscated** and click **Apply DOM Mutations**.
   - The DOM elements now have mutated attributes (e.g. `id="usr_auth_mail_v2"`).
3. **Step 3 (Execute Self-Healing Assertion)**:
   - Re-run the automated suite in Testiva.
   - **Expected Outcome**: Testiva recognizes that the original ID has changed, consults its visual/DOM semantic tree and Figma reference coordinate model, locates the input element, self-heals the test step without failing, and logs a self-healing notice in the test execution report.

---

## 5. Testing WCAG 2.1 AA Accessibility with Testiva

1. **Compliant Baseline**:
   - Axe-core / Testiva Accessibility scans on default pages will produce **0 critical violations** (proper 4.5:1 text contrast, visible `:focus-visible` blue rings, semantic `<label>` associations, proper `aria-labelledby` modal dialogs).
2. **Non-Compliant Mode Injection**:
   - In Testiva Lab (`/admin`), switch **Master A11y Standard** to **Non-Compliant**.
   - Choose specific violations:
     - *Degrade Color Contrast*: Text contrast drops to `#94A3B8` on light gray (~2.1:1).
     - *Strip Labels*: `<label>` elements are unlinked (`htmlFor` stripped).
     - *Disable Keyboard Focus*: Focus rings are suppressed (`outline: none`).
     - *Break Heading Hierarchy*: Screen skips `<h1>` directly to `<h4>`.
     - *Strip ARIA*: Roles (`role="dialog"`, `aria-modal`) removed.
   - Run Testiva Accessibility Scanner to observe automatic detection and classification of WCAG criteria failures (e.g. WCAG 1.4.3, WCAG 1.3.1, WCAG 2.4.7).

---

## 6. How to View the Artboards in the Browser

Open [`docs/figma/figma-preview.html`](file:///c:/Users/vsiva/sampleApp/docs/figma/figma-preview.html) in your browser:
```powershell
# Open in your default browser on Windows
Start-Process "docs\figma\figma-preview.html"
```
This interactive viewer lets you switch between all 6 artboards, preview the design token palette, inspect layer hierarchies, and see the exact Testiva locator mappings.
