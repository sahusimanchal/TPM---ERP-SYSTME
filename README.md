# THE PRAMOD MAHARAJ ENTERPRISES — Business ERP & Accounting System

A production-ready, full-stack Business Accounting & ERP web application designed and built for **The Pramod Maharaj Enterprises** (Building materials, cement brands, TMT steel rods, electrical & hardware daily billing).

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, and **Recharts**.

---

## 🌟 Highlights & Features

- **Executive Financial Dashboard**: Real-time Gross Sales, Approved Returns, Net Sales, Collections, Customer Receivables, Cash Drawer Balance, and Recharts Trend Visualizations.
- **Customer Master & Running Ledger**: 264 historical customer profiles, dedicated unidentified party support (`UNKNOWN` retail sales), running balances, and printable customer ledger statements.
- **Category-Specific Sales & Invoicing**:
  - **Cement Sales**: Volume by brand (`LNT`, `SUPPER`, `SHREE`, `MARBAL`, `ROOFON`, `PRIMIUM`, `DSP`, `CON. SPECIAL`), bag count, unit rates, and legacy paid flags.
  - **Rod / Steel Sales**: Rod sizes (`8mm`, `10mm`, `12mm`, `16mm`, `20mm`), decimal kilogram inputs, rate per kg.
  - **Daily / Electrical Sales**: Multi-line hardware & electrical goods billing.
  - **Collision-Safe Invoice Sequences**: `SE` (Cement), `RD` (Rod), `S` (Daily).
  - **Printable Tax Invoices**: Thermal / A4 receipt generation.
- **Collections & Payment Allocations**: Receipts tracking across payment modes (`CASH`, `UPI`, `CC UPI`, `SBI`, `BANK_TRANSFER`, `CHEQUE`), bill-level settlement mapping, and unallocated advance tracking.
- **Sales Returns Verification Gate**: Legacy returns flagged for review; strict double-entry rule preventing unverified returns from degrading net sales until approved.
- **Cash Outflows & Drawer Management**: Tracks cash disbursements with categorization workflow (Godown transfers, staff advances, shop expenses, rent, transport).
- **Excel Migration Wizard**: Upload `.xlsm` / `.xlsx` workbooks (e.g. `FINANCIAL 26 - 27 - OCT.xlsm`), dry-run preview, anomaly detector (missing dates/amounts), duplicate prevention, and strict exclusion of `Sheet1` & `Sheet3`.
- **Role-Based Security**: Live role switcher between **Owner**, **Manager**, and **Operator**.
- **Audit Trail**: Complete log of actions, entities, timestamps, and actors.
- **Indian Accounting Standard**: Standard INR formatting (₹, Lakhs/Crores grouping), Asia/Kolkata (IST) timezone handling, and DD-MM-YYYY display.

---

## 🚀 Quick Start (Local Setup)

### 1. Clone or Open the Repository
```bash
git clone https://github.com/your-username/tpm-erp.git
cd tpm-erp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🗄️ Database Schema & Supabase Setup

The database schema is defined in:
`supabase/migrations/20261106000000_init_schema.sql`

It contains 19 normalized PostgreSQL tables with UUID primary keys, check constraints, indexes, and Row Level Security (RLS) policies:
- `businesses`
- `profiles`
- `customers` & `customer_opening_balances`
- `bills` & `bill_items`
- `cement_details`, `rod_details`, `daily_sale_details`
- `payments` & `payment_allocations`
- `sales_returns` & `return_items`
- `cash_transactions` & `expense_categories`
- `audit_logs`
- `import_batches` & `import_rows`
- `business_settings`

---

## 📁 Project Structure

```
tpm-erp/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Executive Financial Dashboard
│   │   ├── customers/page.tsx     # Customer Directory & Ledger Statement
│   │   ├── sales/page.tsx         # Sales Register & Bill Browser
│   │   ├── sales/new/page.tsx     # Interactive Bill Generator (Cement/Rod/Daily)
│   │   ├── payments/page.tsx      # Payment Collections & Allocation
│   │   ├── returns/page.tsx       # Sales Returns Verification Gate
│   │   ├── cash-flow/page.tsx     # Cash Outflows & Categorization
│   │   ├── reports/page.tsx       # P&L and Brand Performance Reports
│   │   ├── import/page.tsx        # Excel Migration Wizard (.xlsm/.xlsx)
│   │   ├── settings/page.tsx      # Business Profile & Audit Trail
│   │   ├── globals.css            # Tailwind & Print Styles
│   │   └── layout.tsx             # Root Layout with Navigation
│   ├── components/layout/
│   │   ├── Header.tsx             # Top bar, Role Switcher & Reset
│   │   └── Sidebar.tsx            # Navigation Menu with Badges
│   ├── data/
│   │   └── seedData.json          # Historical October 2026 dataset
│   └── lib/
│       ├── storage.ts             # Financial Calculation & State Engine
│       ├── types.ts               # TypeScript Schema Definitions
│       └── utils.ts               # INR Currency & Date Formatters
├── supabase/
│   └── migrations/
│       └── 20261106000000_init_schema.sql  # Full PostgreSQL Migration DDL
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔒 Accounting Integrity Rules

1. **Gross Sales**: Total of valid posted sales invoices.
2. **Net Sales**: Gross sales minus approved/verified returns only.
3. **Customer Receivables**: Billed total minus payments credited and approved returns.
4. **Profit Margin**: Net sales minus cost of goods sold and verified operating expenses. Godown transfers and uncategorized cash disbursements are strictly segregated.
5. **Data Quality**: Missing amounts and dates in legacy imports are flagged for audit in dedicated queues and never silently defaulted to zero.

---

## 📄 License
Proprietary — Designed for **The Pramod Maharaj Enterprises**.
