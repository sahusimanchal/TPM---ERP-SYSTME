-- ==============================================================================
-- THE PRAMOD MAHARAJ ENTERPRISES - BUSINESS ERP & ACCOUNTING SYSTEM
-- INITIAL MIGRATION: COMPLETE SCHEMA WITH RLS, CONSTRAINTS & INDEXES
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. BUSINESSES (MULTI-TENANCY / SINGLE BUSINESS BASE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    gstin VARCHAR(15),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Bhubaneswar',
    state VARCHAR(100) DEFAULT 'Odisha',
    state_code VARCHAR(10) DEFAULT '21',
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. USER PROFILES & ROLES
-- ==============================================================================
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'operator');

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'operator',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. CUSTOMERS & OPENING BALANCES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15),
    is_unidentified BOOLEAN NOT NULL DEFAULT false, -- True for UNKNOWN customer
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_customer_business_name UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS public.customer_opening_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    as_of_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    balance_type VARCHAR(20) NOT NULL CHECK (balance_type IN ('receivable', 'payable')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_customer_opening_balance UNIQUE (customer_id, as_of_date)
);

-- ==============================================================================
-- 4. BILLS & SALES
-- ==============================================================================
CREATE TYPE bill_category AS ENUM ('cement', 'rod', 'daily');
CREATE TYPE bill_status AS ENUM ('draft', 'posted', 'voided');
CREATE TYPE bill_payment_status AS ENUM (
    'unpaid',
    'partially_paid',
    'paid',
    'legacy_paid_yes',
    'legacy_paid_no',
    'legacy_unspecified'
);

CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    bill_number VARCHAR(100) NOT NULL,
    bill_category bill_category NOT NULL,
    bill_date DATE, -- Can be null for legacy unverified dates
    due_date DATE,
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_status bill_payment_status NOT NULL DEFAULT 'unpaid',
    status bill_status NOT NULL DEFAULT 'posted',
    notes TEXT,
    source_sheet VARCHAR(50),
    is_imported BOOLEAN NOT NULL DEFAULT false,
    import_row_id UUID,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_bill_number UNIQUE (business_id, bill_category, bill_number)
);

CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(100) NOT NULL,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 1.000,
    unit VARCHAR(50) NOT NULL DEFAULT 'UNIT',
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Specific details tables for specialized domains
CREATE TABLE IF NOT EXISTS public.cement_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.bill_items(id) ON DELETE SET NULL,
    cement_type VARCHAR(100) NOT NULL, -- LNT, SUPPER, SHREE, MARBAL, ROOFON, etc.
    qty_bags NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit_type VARCHAR(50) DEFAULT 'BAGS',
    unit_rate NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    legacy_paid_flag VARCHAR(10), -- 'YES', 'NO', 'BLANK'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.rod_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.bill_items(id) ON DELETE SET NULL,
    rod_size VARCHAR(100) NOT NULL, -- 8mm, 10mm, 12mm, etc.
    qty_kg NUMERIC(15,3) NOT NULL DEFAULT 0.000,
    unit_type VARCHAR(50) DEFAULT 'KG',
    rate_per_kg NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.daily_sale_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.bill_items(id) ON DELETE SET NULL,
    item_type VARCHAR(100) NOT NULL DEFAULT 'ELECTRIC',
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. PAYMENTS RECEIVED & BILL ALLOCATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(100) NOT NULL,
    payment_date DATE, -- Can be null for historical unverified records
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    payment_mode VARCHAR(50) NOT NULL, -- CASH, UPI, CC UPI, SBI, CHEQUE, etc.
    reference_number VARCHAR(100),
    notes TEXT,
    unallocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'voided')),
    is_imported BOOLEAN NOT NULL DEFAULT false,
    import_row_id UUID,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_receipt_no UNIQUE (business_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(15,2) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. SALES RETURNS
-- ==============================================================================
CREATE TYPE return_status AS ENUM ('pending_review', 'approved', 'rejected', 'voided');

CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    original_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
    return_number VARCHAR(100) NOT NULL,
    return_date DATE, -- Can be null for legacy unverified returns
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    status return_status NOT NULL DEFAULT 'pending_review',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_imported BOOLEAN NOT NULL DEFAULT false,
    import_row_id UUID,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_return_number UNIQUE (business_id, return_number)
);

CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(100) NOT NULL,
    quantity NUMERIC(15,3) NOT NULL DEFAULT 1.000,
    unit VARCHAR(50) NOT NULL DEFAULT 'UNIT',
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. EXPENSES & CASH TRANSACTIONS (CASH GIVEN / OUTFLOWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_expense_category_code UNIQUE (business_id, code)
);

CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('cash_given', 'cash_received', 'expense', 'transfer')),
    transaction_date DATE, -- Can be null for unverified legacy records
    recipient_name VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'CASH',
    reference_number VARCHAR(100),
    notes TEXT,
    is_categorized BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_imported BOOLEAN NOT NULL DEFAULT false,
    import_row_id UUID,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. AUDIT LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, VOID, APPROVE, REJECT, IMPORT, REVERSAL
    entity_type VARCHAR(50) NOT NULL, -- bill, payment, return, customer, cash_given, setting
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. IMPORT BATCHES & AUDIT ROWS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64),
    sheet_names TEXT[] NOT NULL,
    total_rows_detected INTEGER NOT NULL DEFAULT 0,
    imported_rows_count INTEGER NOT NULL DEFAULT 0,
    skipped_rows_count INTEGER NOT NULL DEFAULT 0,
    error_rows_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'dry_run')),
    summary_json JSONB,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.import_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
    sheet_name VARCHAR(50) NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    parsed_data JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('imported', 'flagged_warning', 'error', 'skipped', 'pending')),
    error_message TEXT,
    target_table VARCHAR(50),
    target_id UUID,
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_import_batch_sheet_row UNIQUE (batch_id, sheet_name, row_number)
);

-- ==============================================================================
-- 10. BUSINESS SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_setting_key UNIQUE (business_id, setting_key)
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM REPORTING & LOOKUP SPEED
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_business ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(business_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_is_unidentified ON public.customers(business_id, is_unidentified);

CREATE INDEX IF NOT EXISTS idx_bills_business_date ON public.bills(business_id, bill_date);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_category ON public.bills(business_id, bill_category);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(business_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON public.bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_number ON public.bills(bill_number);

CREATE INDEX IF NOT EXISTS idx_cement_details_bill ON public.cement_details(bill_id);
CREATE INDEX IF NOT EXISTS idx_cement_details_type ON public.cement_details(cement_type);

CREATE INDEX IF NOT EXISTS idx_payments_business_date ON public.payments(business_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_mode ON public.payments(payment_mode);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_bill ON public.payment_allocations(bill_id);

CREATE INDEX IF NOT EXISTS idx_returns_business_date ON public.sales_returns(business_id, return_date);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON public.sales_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.sales_returns(status, is_verified);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON public.cash_transactions(business_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON public.cash_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_status ON public.cash_transactions(is_categorized, is_verified);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cement_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rod_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sale_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's business_id
CREATE OR REPLACE FUNCTION public.current_user_business_id()
RETURNS UUID AS $$
    SELECT business_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies for businesses
CREATE POLICY "Users can view own business" ON public.businesses
    FOR SELECT USING (id = public.current_user_business_id());

CREATE POLICY "Owners can update own business" ON public.businesses
    FOR UPDATE USING (id = public.current_user_business_id() AND public.current_user_role() = 'owner');

-- Policies for profiles
CREATE POLICY "Users can view profiles in own business" ON public.profiles
    FOR SELECT USING (business_id = public.current_user_business_id());

CREATE POLICY "Owners can manage profiles in own business" ON public.profiles
    FOR ALL USING (business_id = public.current_user_business_id() AND public.current_user_role() = 'owner');

-- Policies for customers
CREATE POLICY "Users can view customers in own business" ON public.customers
    FOR SELECT USING (business_id = public.current_user_business_id());

CREATE POLICY "Users can create/update customers in own business" ON public.customers
    FOR ALL USING (business_id = public.current_user_business_id());

-- Policies for bills
CREATE POLICY "Users can view bills in own business" ON public.bills
    FOR SELECT USING (business_id = public.current_user_business_id());

CREATE POLICY "Operators and Managers can insert bills" ON public.bills
    FOR INSERT WITH CHECK (business_id = public.current_user_business_id());

CREATE POLICY "Owners and Managers can update bills" ON public.bills
    FOR UPDATE USING (
        business_id = public.current_user_business_id() AND 
        public.current_user_role() IN ('owner', 'manager')
    );

-- Policies for payments
CREATE POLICY "Users can view payments in own business" ON public.payments
    FOR SELECT USING (business_id = public.current_user_business_id());

CREATE POLICY "Users can insert payments in own business" ON public.payments
    FOR INSERT WITH CHECK (business_id = public.current_user_business_id());

CREATE POLICY "Owners and Managers can manage payments" ON public.payments
    FOR UPDATE USING (
        business_id = public.current_user_business_id() AND 
        public.current_user_role() IN ('owner', 'manager')
    );

-- Policies for sales returns
CREATE POLICY "Users can view returns in own business" ON public.sales_returns
    FOR SELECT USING (business_id = public.current_user_business_id());

CREATE POLICY "Users can create returns" ON public.sales_returns
    FOR INSERT WITH CHECK (business_id = public.current_user_business_id());

CREATE POLICY "Owners and Managers can approve/modify returns" ON public.sales_returns
    FOR UPDATE USING (
        business_id = public.current_user_business_id() AND 
        public.current_user_role() IN ('owner', 'manager')
    );

-- Policies for cash transactions
CREATE POLICY "Users can view cash transactions" ON public.cash_transactions
    FOR SELECT USING (business_id = public.current_user_business_id());

CREATE POLICY "Users can insert cash transactions" ON public.cash_transactions
    FOR INSERT WITH CHECK (business_id = public.current_user_business_id());

CREATE POLICY "Owners and Managers can verify/categorize cash transactions" ON public.cash_transactions
    FOR UPDATE USING (
        business_id = public.current_user_business_id() AND 
        public.current_user_role() IN ('owner', 'manager')
    );

-- Policies for audit logs (Read-only for owner/manager, write via triggers/server)
CREATE POLICY "Owners can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        business_id = public.current_user_business_id() AND 
        public.current_user_role() IN ('owner', 'manager')
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (business_id = public.current_user_business_id());

-- Policies for import batches (Owner only)
CREATE POLICY "Owners can manage import batches" ON public.import_batches
    FOR ALL USING (
        business_id = public.current_user_business_id() AND 
        public.current_user_role() = 'owner'
    );

CREATE POLICY "Owners can manage import rows" ON public.import_rows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.import_batches b
            WHERE b.id = batch_id 
              AND b.business_id = public.current_user_business_id()
              AND public.current_user_role() = 'owner'
        )
    );
