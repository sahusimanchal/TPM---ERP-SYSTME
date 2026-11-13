import seedData from "../data/seedData.json";
import { 
  Customer, 
  Bill, 
  Payment, 
  SalesReturn, 
  CashTransaction, 
  DashboardMetrics,
  PaymentAllocation,
  UserRole,
  BillCategory,
  AuditLog,
  CementBrand,
  RodSize,
  PaymentModeOption,
  ExpenseCategoryOption,
  BusinessProfile
} from "./types";
import { DateRange, isDateInRange } from "./period";

const STORAGE_KEYS = {
  CUSTOMERS: "tpm_customers_v4",
  BILLS: "tpm_bills_v4",
  PAYMENTS: "tpm_payments_v4",
  RETURNS: "tpm_returns_v4",
  CASH_GIVEN: "tpm_cash_given_v4",
  USER_ROLE: "tpm_user_role_v1",
  AUDIT_LOGS: "tpm_audit_logs_v1",
  CEMENT_BRANDS: "tpm_cement_brands_v1",
  ROD_SIZES: "tpm_rod_sizes_v1",
  PAYMENT_MODES: "tpm_payment_modes_v1",
  EXPENSE_CATEGORIES: "tpm_expense_categories_v1",
  BUSINESS_PROFILE: "tpm_business_profile_v1",
};

// Safe browser local-storage check
function isClient(): boolean {
  return typeof window !== "undefined";
}

// Clean up old cached versions from browser localStorage
if (isClient()) {
  try {
    const oldKeys = [
      "tpm_customers_v1", "tpm_bills_v1", "tpm_payments_v1", "tpm_returns_v1", "tpm_cash_given_v1",
      "tpm_customers_v2", "tpm_bills_v2", "tpm_payments_v2", "tpm_returns_v2", "tpm_cash_given_v2",
      "tpm_customers_v3", "tpm_bills_v3", "tpm_payments_v3", "tpm_returns_v3", "tpm_cash_given_v3",
    ];
    oldKeys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore in server context
  }
}

export function getStoredUserRole(): UserRole {
  if (!isClient()) return "owner";
  return (localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole) || "owner";
}

export function setStoredUserRole(role: UserRole) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    action: "IMPORT",
    entity: "FINANCIAL 26 - 27 - OCT.xlsm",
    actor: "Pramod Maharaj (Owner)",
    timestamp: "2026-11-06 22:51:35",
    notes: "Imported 551 bills, 284 payments, 22 returns, 49 cash transactions. Sheet1 and Sheet3 excluded."
  },
  {
    id: "log-2",
    action: "INIT_SCHEMA",
    entity: "PostgreSQL Database",
    actor: "System Administrator",
    timestamp: "2026-11-06 23:04:45",
    notes: "Created 19 normalized tables with RLS policies and decimal precision constraints."
  },
  {
    id: "log-3",
    action: "VERIFICATION_GATE",
    entity: "Sales Returns & Cash Outflows",
    actor: "System Policy",
    timestamp: "2026-11-06 23:05:00",
    notes: "Flagged 12 returns with missing amounts and 23 outflows with missing dates for review."
  }
];

export function getAuditLogs(): AuditLog[] {
  if (!isClient()) return INITIAL_AUDIT_LOGS;
  const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveAuditLogs(logs: AuditLog[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addAuditLog(entry: {
  action: string;
  entity: string;
  actor?: string;
  notes: string;
}): AuditLog {
  const currentLogs = getAuditLogs();
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  
  const role = getStoredUserRole();
  const defaultActor = role === "owner" ? "Pramod Maharaj (Owner)" : role === "manager" ? "Manager" : role === "admin" ? "System Administrator (Admin Account)" : "Operator";

  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: entry.action,
    entity: entry.entity,
    actor: entry.actor || defaultActor,
    timestamp,
    notes: entry.notes,
  };

  const updated = [newLog, ...currentLogs];
  saveAuditLogs(updated);
  return newLog;
}

export function getCustomers(): Customer[] {
  if (!isClient()) return (seedData.customers || []) as Customer[];
  const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(seedData.customers || []));
    return (seedData.customers || []) as Customer[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return (seedData.customers || []) as Customer[];
  }
}

export function saveCustomers(customers: Customer[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function createCustomer(data: {
  name: string;
  phone?: string;
  address?: string;
  opening_balance?: number;
  is_unidentified?: boolean;
}): Customer {
  const customers = getCustomers();
  const opBal = data.opening_balance || 0;
  const newCust: Customer = {
    id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: data.name.trim().toUpperCase(),
    code: `CUST-${(customers.length + 1).toString().padStart(4, "0")}`,
    phone: data.phone?.trim() || "",
    address: data.address?.trim() || "Bhubaneswar / Khordha",
    is_unidentified: data.is_unidentified || false,
    is_active: true,
    opening_balance: opBal,
    current_balance: opBal,
    total_bills_amount: 0,
    total_paid_amount: 0,
    created_at: new Date().toISOString()
  };
  const updated = [newCust, ...customers];
  saveCustomers(updated);
  return newCust;
}

export function getBills(): Bill[] {
  if (!isClient()) return seedData.bills as unknown as Bill[];
  const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(seedData.bills));
    return seedData.bills as unknown as Bill[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.bills as unknown as Bill[];
  }
}

export function saveBills(bills: Bill[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getPayments(): Payment[] {
  if (!isClient()) return seedData.payments as unknown as Payment[];
  const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(seedData.payments));
    return seedData.payments as unknown as Payment[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.payments as unknown as Payment[];
  }
}

export function savePayments(payments: Payment[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getReturns(): SalesReturn[] {
  if (!isClient()) return seedData.returns as unknown as SalesReturn[];
  const raw = localStorage.getItem(STORAGE_KEYS.RETURNS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(seedData.returns));
    return seedData.returns as unknown as SalesReturn[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.returns as unknown as SalesReturn[];
  }
}

export function saveReturns(returns: SalesReturn[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function getCashTransactions(): CashTransaction[] {
  if (!isClient()) return seedData.cash_given as unknown as CashTransaction[];
  const raw = localStorage.getItem(STORAGE_KEYS.CASH_GIVEN);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CASH_GIVEN, JSON.stringify(seedData.cash_given));
    return seedData.cash_given as unknown as CashTransaction[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.cash_given as unknown as CashTransaction[];
  }
}

export function saveCashTransactions(txs: CashTransaction[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CASH_GIVEN, JSON.stringify(txs));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function resetAllDataToSeed() {
  if (isClient()) {
    const keysToRemove = [
      "tpm_customers_v1", "tpm_bills_v1", "tpm_payments_v1", "tpm_returns_v1", "tpm_cash_given_v1",
      "tpm_customers_v2", "tpm_bills_v2", "tpm_payments_v2", "tpm_returns_v2", "tpm_cash_given_v2",
      "tpm_customers_v3", "tpm_bills_v3", "tpm_payments_v3", "tpm_returns_v3", "tpm_cash_given_v3",
      STORAGE_KEYS.CUSTOMERS, STORAGE_KEYS.BILLS, STORAGE_KEYS.PAYMENTS, STORAGE_KEYS.RETURNS, STORAGE_KEYS.CASH_GIVEN, STORAGE_KEYS.AUDIT_LOGS,
      STORAGE_KEYS.CEMENT_BRANDS, STORAGE_KEYS.ROD_SIZES, STORAGE_KEYS.PAYMENT_MODES, STORAGE_KEYS.EXPENSE_CATEGORIES,
      STORAGE_KEYS.BUSINESS_PROFILE
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function clearAllData() {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CASH_GIVEN, JSON.stringify([]));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

/* ------------------------------------------------------------------ */
/*  Shared accounting rules (single source of truth for all reports)  */
/* ------------------------------------------------------------------ */

const MONEY_EPSILON = 0.005;

/** A return reduces sales / customer balances only once approved or verified, and never if voided/rejected. */
export function isApprovedReturn(r: SalesReturn): boolean {
  if (r.status === "voided" || r.status === "rejected") return false;
  return r.status === "approved" || r.is_verified === true;
}

export type CollectionBucket = "cash" | "upi" | "bank" | "other";

/** Map stored payment modes to report buckets */
export function getCollectionBucket(mode: string | null | undefined): CollectionBucket {
  const m = (mode || "").toUpperCase().trim();
  if (m === "CASH") return "cash";
  if (m === "UPI" || m === "CC UPI" || m.includes("UPI")) return "upi";
  if (m === "SBI" || m === "BANK_TRANSFER" || m === "BANK" || m === "CHEQUE" || m === "NEFT" || m === "RTGS" || m === "IMPS") return "bank";
  return "other";
}

export interface SalesBreakdown {
  cement: number;
  rod: number;
  daily: number;
  cement_count: number;
  rod_count: number;
  daily_count: number;
  gross_sales: number;
  approved_returns: number;
  net_sales: number;
  bills: Bill[];
  returns: SalesReturn[];
}

/** Sales are filtered by bill date; approved returns by return date. Voided/draft bills are excluded. */
export function calculateSalesBreakdown(dateFilter?: DateRange): SalesBreakdown {
  const bills = getBills().filter(b => b.status === "posted" && isDateInRange(b.bill_date, dateFilter));
  const returns = getReturns().filter(r => isApprovedReturn(r) && isDateInRange(r.return_date, dateFilter));

  const sumCat = (cat: BillCategory) =>
    bills.filter(b => b.bill_category === cat).reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const countCat = (cat: BillCategory) => bills.filter(b => b.bill_category === cat).length;

  const cement = sumCat("cement");
  const rod = sumCat("rod");
  const daily = sumCat("daily");
  const gross_sales = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const approved_returns = returns.reduce((acc, r) => acc + (r.amount || 0), 0);

  return {
    cement,
    rod,
    daily,
    cement_count: countCat("cement"),
    rod_count: countCat("rod"),
    daily_count: countCat("daily"),
    gross_sales,
    approved_returns,
    net_sales: gross_sales - approved_returns,
    bills,
    returns,
  };
}

export interface CollectionsBreakdown {
  total: number;
  cash: number;
  upi: number;
  bank: number;
  other: number;
  count: number;
  payments: Payment[];
}

/**
 * Collections are independent of sales: filtered strictly by actual payment date,
 * regardless of which (possibly older) bill they settle. Each receipt is counted once.
 */
export function calculateCollectionsBreakdown(dateFilter?: DateRange): CollectionsBreakdown {
  const seen = new Set<string>();
  const payments: Payment[] = [];
  for (const p of getPayments()) {
    if (p.status !== "posted") continue;
    if (!isDateInRange(p.payment_date, dateFilter)) continue;
    const key = p.id || p.receipt_number;
    if (seen.has(key)) continue; // never count the same receipt twice
    seen.add(key);
    payments.push(p);
  }

  const result: CollectionsBreakdown = { total: 0, cash: 0, upi: 0, bank: 0, other: 0, count: payments.length, payments };
  for (const p of payments) {
    const amt = p.amount || 0;
    result.total += amt;
    result[getCollectionBucket(p.payment_mode)] += amt;
  }
  return result;
}

export type CustomerPaymentStatus = "unpaid" | "partially_paid" | "paid" | "advance" | "no_activity";

export interface CustomerOutstandingRow {
  customer_id: string;
  customer_name: string;
  code?: string;
  phone?: string;
  is_linked: boolean; // false when transactions reference a party missing from the customer master
  opening_balance: number;
  total_bills: number;
  bill_count: number;
  approved_returns: number;
  payments_allocated: number;
  unallocated_credits: number;
  total_payments: number;
  /** Opening + Bills - Approved Returns - Payments Allocated to Bills */
  bill_receivable: number;
  /** bill_receivable - unallocated credits (matches the customer running ledger) */
  net_balance: number;
  outstanding: number; // positive balance (receivable)
  advance: number; // negative balance shown separately as customer credit / advance
  open_bill_amount: number;
  unpaid_bills: number;
  partially_paid_bills: number;
  paid_bills: number;
  categories: BillCategory[];
  status: CustomerPaymentStatus;
  last_activity?: string;
}

export interface OutstandingSummary {
  as_of?: string;
  rows: CustomerOutstandingRow[];
  total_outstanding: number;
  total_advances: number;
  total_unallocated_credits: number;
  total_unpaid_amount: number;
  unpaid_bills_count: number;
  partially_paid_bills_count: number;
  paid_bills_count: number;
  customers_with_dues: number;
}

/**
 * Customer outstanding as of a given date (inclusive), using ALL historical transactions up to that date.
 *
 *   Bill Receivable = Opening Balance + Posted Bills - Approved Returns - Payments Allocated to Bills
 *   Net Balance     = Bill Receivable - Unallocated Payment Credits
 *
 * Unallocated payments are never auto-allocated to bills: bill-level unpaid amounts use only explicit
 * allocations, while the customer's net balance still recognises the money received (as on the ledger).
 * Positive net balances are receivables; negative ones are reported separately as customer advances.
 */
export function calculateCustomerOutstanding(asOfDate?: string): OutstandingSummary {
  const range: DateRange | undefined = asOfDate ? { end: asOfDate } : undefined;
  const customers = getCustomers();
  const bills = getBills().filter(b => b.status === "posted" && isDateInRange(b.bill_date, range));
  const payments = getPayments().filter(p => p.status === "posted" && isDateInRange(p.payment_date, range));
  const returns = getReturns().filter(r => isApprovedReturn(r) && isDateInRange(r.return_date, range));

  const rowsById = new Map<string, CustomerOutstandingRow>();
  const idByName = new Map<string, string>();

  const newRow = (id: string, name: string, linked: boolean, c?: Customer): CustomerOutstandingRow => ({
    customer_id: id,
    customer_name: name,
    code: c?.code,
    phone: c?.phone,
    is_linked: linked,
    opening_balance: c?.opening_balance || 0,
    total_bills: 0,
    bill_count: 0,
    approved_returns: 0,
    payments_allocated: 0,
    unallocated_credits: 0,
    total_payments: 0,
    bill_receivable: 0,
    net_balance: 0,
    outstanding: 0,
    advance: 0,
    open_bill_amount: 0,
    unpaid_bills: 0,
    partially_paid_bills: 0,
    paid_bills: 0,
    categories: [],
    status: "no_activity",
  });

  for (const c of customers) {
    if (rowsById.has(c.id)) continue;
    rowsById.set(c.id, newRow(c.id, c.name, true, c));
    if (!idByName.has(c.name)) idByName.set(c.name, c.id);
  }

  // Each transaction is assigned to exactly ONE customer (id match first, then name) so nothing is double counted.
  const rowFor = (customerId: string, customerName: string): CustomerOutstandingRow => {
    if (customerId && rowsById.has(customerId)) return rowsById.get(customerId)!;
    const byName = idByName.get(customerName);
    if (byName) return rowsById.get(byName)!;
    const key = `unlinked:${customerName || customerId || "UNKNOWN"}`;
    if (!rowsById.has(key)) {
      rowsById.set(key, newRow(key, customerName || "UNKNOWN PARTY", false));
    }
    return rowsById.get(key)!;
  };

  const touch = (row: CustomerOutstandingRow, date?: string | null) => {
    if (date && (!row.last_activity || date > row.last_activity)) row.last_activity = date;
  };

  // Per-bill settlement tracking (explicit allocations + returns linked to that bill)
  const billSettled = new Map<string, number>();

  for (const b of bills) {
    const row = rowFor(b.customer_id, b.customer_name);
    row.total_bills += b.total_amount || 0;
    row.bill_count += 1;
    if (!row.categories.includes(b.bill_category)) row.categories.push(b.bill_category);
    touch(row, b.bill_date);
    billSettled.set(b.id, 0);
  }

  for (const r of returns) {
    const row = rowFor(r.customer_id, r.customer_name);
    row.approved_returns += r.amount || 0;
    touch(row, r.return_date);
    if (r.original_bill_id && billSettled.has(r.original_bill_id)) {
      billSettled.set(r.original_bill_id, billSettled.get(r.original_bill_id)! + (r.amount || 0));
    }
  }

  const seenPayments = new Set<string>();
  for (const p of payments) {
    const key = p.id || p.receipt_number;
    if (seenPayments.has(key)) continue;
    seenPayments.add(key);

    const row = rowFor(p.customer_id, p.customer_name);
    const amount = p.amount || 0;
    const allocated = Math.min(
      amount,
      (p.allocations || []).reduce((acc, a) => acc + (a.allocated_amount || 0), 0)
    );
    row.total_payments += amount;
    row.payments_allocated += allocated;
    row.unallocated_credits += amount - allocated;
    touch(row, p.payment_date);

    for (const a of p.allocations || []) {
      if (billSettled.has(a.bill_id)) {
        billSettled.set(a.bill_id, billSettled.get(a.bill_id)! + (a.allocated_amount || 0));
      }
    }
  }

  const summary: OutstandingSummary = {
    as_of: asOfDate,
    rows: [],
    total_outstanding: 0,
    total_advances: 0,
    total_unallocated_credits: 0,
    total_unpaid_amount: 0,
    unpaid_bills_count: 0,
    partially_paid_bills_count: 0,
    paid_bills_count: 0,
    customers_with_dues: 0,
  };

  for (const b of bills) {
    const row = rowFor(b.customer_id, b.customer_name);
    const total = b.total_amount || 0;
    const settled = billSettled.get(b.id) || 0;
    const open = Math.max(0, total - settled);
    row.open_bill_amount += open;
    if (open <= MONEY_EPSILON) row.paid_bills += 1;
    else if (settled > MONEY_EPSILON) row.partially_paid_bills += 1;
    else row.unpaid_bills += 1;
  }

  rowsById.forEach((row) => {
    row.bill_receivable = row.opening_balance + row.total_bills - row.approved_returns - row.payments_allocated;
    row.net_balance = row.bill_receivable - row.unallocated_credits;
    row.outstanding = row.net_balance > MONEY_EPSILON ? row.net_balance : 0;
    row.advance = row.net_balance < -MONEY_EPSILON ? -row.net_balance : 0;

    const credits = row.approved_returns + row.total_payments;
    const hasActivity = row.bill_count > 0 || credits > 0 || Math.abs(row.opening_balance) > MONEY_EPSILON;
    if (!hasActivity) row.status = "no_activity";
    else if (row.advance > 0) row.status = "advance";
    else if (row.outstanding <= 0) row.status = "paid";
    else if (credits > MONEY_EPSILON) row.status = "partially_paid";
    else row.status = "unpaid";

    summary.rows.push(row);
    summary.total_outstanding += row.outstanding;
    summary.total_advances += row.advance;
    summary.total_unallocated_credits += row.unallocated_credits;
    summary.total_unpaid_amount += row.open_bill_amount;
    summary.unpaid_bills_count += row.unpaid_bills;
    summary.partially_paid_bills_count += row.partially_paid_bills;
    summary.paid_bills_count += row.paid_bills;
    if (row.outstanding > 0) summary.customers_with_dues += 1;
  });

  summary.rows.sort((a, b) => b.outstanding - a.outstanding || b.advance - a.advance);
  return summary;
}

/**
 * High-precision financial metrics calculation adhering strictly to project accounting rules:
 * - Gross Sales = Sum of valid posted bills.
 * - Net Sales = Gross Sales minus approved/verified returns.
 * - Customer Balance = Opening balance + posted bills - approved returns - payments.
 * - Cash Balance = Opening Cash + Cash Receipts - Cash Outflows.
 * - Profit = Net sales minus COGS & verified operating expenses (never sales minus cash given).
 */
export function calculateDashboardMetrics(dateFilter?: DateRange): DashboardMetrics {
  const bills = getBills().filter(b => b.status === "posted");
  const payments = getPayments().filter(p => p.status === "posted");
  const returns = getReturns();
  const cashTxs = getCashTransactions();

  // Sales (bill date) and collections (payment date) share the same rules as the reports
  const sales = calculateSalesBreakdown(dateFilter);
  const collections = calculateCollectionsBreakdown(dateFilter);

  const filteredCash = cashTxs.filter(c => isDateInRange(c.transaction_date, dateFilter));

  const gross_sales = sales.gross_sales;
  
  // Only APPROVED/VERIFIED returns reduce net sales!
  const approved_returns = sales.approved_returns;

  const net_sales = sales.net_sales;
  
  const total_collections = collections.total;
  
  // Customer receivables are a point-in-time balance as of the period end date
  // (opening balance + bills - approved returns - payments, aggregated per customer),
  // not "period sales minus period collections".
  const outstanding = calculateCustomerOutstanding(dateFilter?.end);
  const outstanding_receivables = outstanding.total_outstanding;
  
  const cash_outflows = filteredCash.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Cash collections only for drawer
  const cash_collections = collections.cash;
  const cash_in_drawer = cash_collections - cash_outflows;

  const unverified_returns_count = returns.filter(r => r.status === "pending_review").length;
  const unallocated_advances = outstanding.total_unallocated_credits;

  // Data quality issues: missing dates in payments/cash, missing amounts in daily/returns
  const missing_dates_count = payments.filter(p => !p.payment_date).length + cashTxs.filter(c => !c.transaction_date).length;
  const missing_amounts_count = bills.filter(b => b.total_amount === 0).length + returns.filter(r => r.amount === null).length;
  const data_quality_issues_count = missing_dates_count + missing_amounts_count;

  return {
    gross_sales,
    approved_returns,
    net_sales,
    total_collections,
    outstanding_receivables,
    cash_outflows,
    cash_in_drawer,
    unverified_returns_count,
    unallocated_advances,
    data_quality_issues_count
  };
}

/**
 * Add a new bill with atomic customer ledger balance adjustment
 */
export function createBill(newBill: Omit<Bill, "id" | "created_at">): Bill {
  const bills = getBills();
  const customers = getCustomers();

  const billId = `bill-${Date.now()}`;
  const bill: Bill = {
    ...newBill,
    id: billId,
    created_at: new Date().toISOString()
  };

  bills.unshift(bill);
  saveBills(bills);

  // Update customer balance
  const custIndex = customers.findIndex(c => c.id === bill.customer_id);
  if (custIndex >= 0) {
    customers[custIndex].total_bills_amount += bill.total_amount;
    customers[custIndex].current_balance += bill.total_amount;
    saveCustomers(customers);
  }

  return bill;
}

/**
 * Record a payment and optionally allocate to specific bills
 */
export function recordPayment(paymentData: {
  customer_id: string;
  customer_name: string;
  payment_date: string;
  amount: number;
  payment_mode: any;
  reference_number?: string;
  notes?: string;
  allocations?: { bill_id: string; bill_number: string; allocated_amount: number }[];
}): Payment {
  const payments = getPayments();
  const bills = getBills();
  const customers = getCustomers();

  const totalAllocated = (paymentData.allocations || []).reduce((acc, a) => acc + a.allocated_amount, 0);
  const unallocated = Math.max(0, paymentData.amount - totalAllocated);

  const paymentId = `pay-${Date.now()}`;
  const receiptNo = `RCP-${new Date().getFullYear()}-${(payments.length + 1).toString().padStart(4, "0")}`;

  const payment: Payment = {
    id: paymentId,
    receipt_number: receiptNo,
    payment_date: paymentData.payment_date,
    customer_id: paymentData.customer_id,
    customer_name: paymentData.customer_name,
    amount: paymentData.amount,
    payment_mode: paymentData.payment_mode,
    reference_number: paymentData.reference_number,
    notes: paymentData.notes,
    unallocated_amount: unallocated,
    status: "posted",
    is_imported: false,
    allocations: (paymentData.allocations || []).map(a => ({
      id: `alloc-${Date.now()}-${Math.random()}`,
      payment_id: paymentId,
      bill_id: a.bill_id,
      bill_number: a.bill_number,
      allocated_amount: a.allocated_amount,
      created_at: new Date().toISOString()
    })),
    created_at: new Date().toISOString()
  };

  payments.unshift(payment);
  savePayments(payments);

  // Update allocated bills status
  if (paymentData.allocations && paymentData.allocations.length > 0) {
    let updatedBills = false;
    const allReturns = getReturns().filter(r => isApprovedReturn(r));
    for (const alloc of paymentData.allocations) {
      const bIdx = bills.findIndex(b => b.id === alloc.bill_id);
      if (bIdx >= 0) {
        const settlement = getBillSettlementInfo(alloc.bill_id, payments, allReturns);
        bills[bIdx].payment_status = settlement.payment_status;
        updatedBills = true;
      }
    }
    if (updatedBills) {
      saveBills(bills);
    }
  }

  // Update customer balance
  const cIdx = customers.findIndex(c => c.id === paymentData.customer_id);
  if (cIdx >= 0) {
    customers[cIdx].total_paid_amount += paymentData.amount;
    customers[cIdx].current_balance -= paymentData.amount;
    saveCustomers(customers);
  }

  return payment;
}

/* ------------------------------------------------------------------ */
/*  Payment Allocation & Bill Settlement Management                   */
/* ------------------------------------------------------------------ */

export interface BillAllocationDetail {
  allocation_id: string;
  payment_id: string;
  payment_receipt_number: string;
  payment_date: string | null;
  payment_mode: string;
  allocated_amount: number;
  allocated_by?: string;
  allocated_at: string;
  notes?: string;
}

export interface BillSettlementInfo {
  bill_id: string;
  bill_number: string;
  total_amount: number;
  allocated_payments_amount: number;
  approved_returns_amount: number;
  total_settled_amount: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  allocations: BillAllocationDetail[];
}

/**
 * Calculate the exact settled amount and remaining balance for a given bill,
 * combining all posted payment allocations and approved sales returns.
 */
export function getBillSettlementInfo(
  billId: string,
  allPayments?: Payment[],
  allReturns?: SalesReturn[]
): BillSettlementInfo {
  const bills = getBills();
  const bill = bills.find(b => b.id === billId);
  const billNumber = bill?.bill_number || "";
  const totalAmount = bill?.total_amount || 0;

  const payments = allPayments || getPayments().filter(p => p.status === "posted");
  const returns = allReturns || getReturns().filter(r => isApprovedReturn(r));

  let allocatedPaymentsAmount = 0;
  const allocations: BillAllocationDetail[] = [];

  for (const p of payments) {
    if (p.status !== "posted") continue;
    for (const alloc of p.allocations || []) {
      if (alloc.bill_id === billId) {
        allocatedPaymentsAmount += alloc.allocated_amount || 0;
        allocations.push({
          allocation_id: alloc.id,
          payment_id: p.id,
          payment_receipt_number: p.receipt_number,
          payment_date: p.payment_date,
          payment_mode: p.payment_mode,
          allocated_amount: alloc.allocated_amount,
          allocated_by: alloc.allocated_by,
          allocated_at: alloc.created_at,
          notes: alloc.notes,
        });
      }
    }
  }

  let approvedReturnsAmount = 0;
  for (const r of returns) {
    if (r.original_bill_id === billId && isApprovedReturn(r)) {
      approvedReturnsAmount += r.amount || 0;
    }
  }

  const totalSettledAmount = allocatedPaymentsAmount + approvedReturnsAmount;
  const remainingBalance = Math.max(0, totalAmount - totalSettledAmount);

  let paymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
  if (remainingBalance <= MONEY_EPSILON) {
    paymentStatus = 'paid';
  } else if (totalSettledAmount > MONEY_EPSILON) {
    paymentStatus = 'partially_paid';
  } else {
    paymentStatus = 'unpaid';
  }

  return {
    bill_id: billId,
    bill_number: billNumber,
    total_amount: totalAmount,
    allocated_payments_amount: allocatedPaymentsAmount,
    approved_returns_amount: approvedReturnsAmount,
    total_settled_amount: totalSettledAmount,
    remaining_balance: remainingBalance,
    payment_status: paymentStatus,
    allocations,
  };
}

/**
 * Retrieve all posted payments for a customer that have unallocated credit remaining (> ₹0.01).
 */
export function getCustomerUnallocatedPayments(customerIdOrName: string): Payment[] {
  const payments = getPayments().filter(p => p.status === "posted");
  const target = (customerIdOrName || "").trim().toUpperCase();

  return payments.filter(p => {
    const matchId = p.customer_id === customerIdOrName;
    const matchName = (p.customer_name || "").trim().toUpperCase() === target;
    if (!matchId && !matchName) return false;

    const allocated = (p.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
    const unallocated = Math.max(0, (p.amount || 0) - allocated);
    return unallocated > MONEY_EPSILON;
  });
}

/**
 * Retrieve all posted bills for a customer that have an outstanding remaining balance (> ₹0.01).
 */
export function getCustomerOutstandingBills(
  customerIdOrName: string
): (Bill & BillSettlementInfo)[] {
  const bills = getBills().filter(b => b.status === "posted");
  const payments = getPayments().filter(p => p.status === "posted");
  const returns = getReturns().filter(r => isApprovedReturn(r));
  const target = (customerIdOrName || "").trim().toUpperCase();

  const custBills = bills.filter(b => {
    const matchId = b.customer_id === customerIdOrName;
    const matchName = (b.customer_name || "").trim().toUpperCase() === target;
    return matchId || matchName;
  });

  const list: (Bill & BillSettlementInfo)[] = [];
  for (const b of custBills) {
    const settlement = getBillSettlementInfo(b.id, payments, returns);
    if (settlement.remaining_balance > MONEY_EPSILON) {
      list.push({
        ...b,
        ...settlement,
      });
    }
  }

  list.sort((a, b) => (a.bill_date || "").localeCompare(b.bill_date || ""));
  return list;
}

export interface AllocationItemRequest {
  bill_id: string;
  allocated_amount: number;
  notes?: string;
}

export interface AllocationResult {
  success: boolean;
  error?: string;
  allocated_total?: number;
  payment?: Payment;
  audit_log?: AuditLog;
}

/**
 * Atomic Payment Allocation Transaction:
 * Links an existing customer payment to one or more outstanding bills.
 * - Enforces role authorization (Owner or Manager).
 * - Validates available unallocated credit on the payment.
 * - Validates remaining unpaid balance on each bill.
 * - Updates payment allocations and unallocated_amount.
 * - Automatically updates bill payment_status ('paid', 'partially_paid', 'unpaid').
 * - Writes immutable audit log entry.
 * - Never creates a duplicate payment.
 * - Never counts allocated payments twice in customer outstanding.
 */
export function allocatePaymentToBills(params: {
  payment_id: string;
  allocations: AllocationItemRequest[];
  notes?: string;
}): AllocationResult {
  const role = getStoredUserRole();
  if (role !== "owner" && role !== "manager") {
    return {
      success: false,
      error: "Authorization required: Only Owner or Manager can allocate payments."
    };
  }

  const payments = getPayments();
  const payIdx = payments.findIndex(p => p.id === params.payment_id);
  if (payIdx === -1) {
    return { success: false, error: "Payment receipt not found." };
  }
  const payment = payments[payIdx];
  if (payment.status !== "posted") {
    return { success: false, error: "Cannot allocate a voided payment." };
  }

  const currentAllocated = (payment.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
  const availableUnallocated = Math.max(0, payment.amount - currentAllocated);

  const validRequests = (params.allocations || []).filter(a => (a.allocated_amount || 0) > MONEY_EPSILON);
  if (validRequests.length === 0) {
    return { success: false, error: "Please enter an allocation amount greater than ₹0." };
  }

  const requestedTotal = validRequests.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  if (requestedTotal > availableUnallocated + MONEY_EPSILON) {
    return {
      success: false,
      error: `Requested allocation (₹${requestedTotal.toFixed(2)}) exceeds available payment unallocated credit (₹${availableUnallocated.toFixed(2)}).`
    };
  }

  const bills = getBills();
  const returns = getReturns().filter(r => isApprovedReturn(r));

  for (const req of validRequests) {
    const bill = bills.find(b => b.id === req.bill_id);
    if (!bill) {
      return { success: false, error: `Bill not found for ID: ${req.bill_id}` };
    }
    if (bill.status !== "posted") {
      return { success: false, error: `Cannot allocate to non-posted bill ${bill.bill_number}.` };
    }
    if (
      bill.customer_id !== payment.customer_id &&
      bill.customer_name.trim().toUpperCase() !== payment.customer_name.trim().toUpperCase()
    ) {
      return {
        success: false,
        error: `Bill ${bill.bill_number} belongs to a different customer (${bill.customer_name}).`
      };
    }

    const settlement = getBillSettlementInfo(bill.id, payments, returns);
    if (req.allocated_amount > settlement.remaining_balance + MONEY_EPSILON) {
      return {
        success: false,
        error: `Allocation of ₹${req.allocated_amount.toFixed(2)} exceeds remaining balance on Bill #${bill.bill_number} (₹${settlement.remaining_balance.toFixed(2)}).`
      };
    }
  }

  // Atomic Execution
  const actorName = role === "owner" ? "Pramod Maharaj (Owner)" : "Manager";
  const nowIso = new Date().toISOString();
  if (!payment.allocations) payment.allocations = [];

  const allocationDescriptions: string[] = [];

  for (const req of validRequests) {
    const bill = bills.find(b => b.id === req.bill_id)!;
    const allocItem: PaymentAllocation = {
      id: `alloc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      payment_id: payment.id,
      payment_receipt_number: payment.receipt_number,
      payment_date: payment.payment_date,
      bill_id: bill.id,
      bill_number: bill.bill_number,
      bill_date: bill.bill_date || undefined,
      allocated_amount: req.allocated_amount,
      allocated_by: actorName,
      notes: req.notes || params.notes,
      created_at: nowIso,
    };
    payment.allocations.push(allocItem);
    allocationDescriptions.push(`₹${req.allocated_amount.toFixed(2)} to Bill #${bill.bill_number}`);
  }

  const newTotalAllocated = payment.allocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  payment.unallocated_amount = Math.max(0, payment.amount - newTotalAllocated);
  payments[payIdx] = payment;
  savePayments(payments);

  // Update status for all affected bills
  for (const req of validRequests) {
    const bIdx = bills.findIndex(b => b.id === req.bill_id);
    if (bIdx >= 0) {
      const updatedSettlement = getBillSettlementInfo(bills[bIdx].id, payments, returns);
      bills[bIdx].payment_status = updatedSettlement.payment_status;
    }
  }
  saveBills(bills);

  // Audit Log
  const auditEntry = addAuditLog({
    action: "PAYMENT_ALLOCATION",
    entity: `Payment ${payment.receipt_number} (${payment.customer_name})`,
    actor: actorName,
    notes: `Allocated total ₹${requestedTotal.toFixed(2)}: ${allocationDescriptions.join("; ")}.${params.notes ? ` Notes: ${params.notes}` : ""}`
  });

  return {
    success: true,
    allocated_total: requestedTotal,
    payment,
    audit_log: auditEntry
  };
}

/**
 * Reverse an incorrect payment allocation:
 * - Enforces role authorization (Owner or Manager).
 * - Restores unallocated amount to the payment.
 * - Recalculates affected bill's payment_status ('unpaid', 'partially_paid', 'paid').
 * - Logs audit trail with reversal reason.
 */
export function reversePaymentAllocation(params: {
  payment_id: string;
  allocation_id: string;
  reason?: string;
}): { success: boolean; error?: string; audit_log?: AuditLog } {
  const role = getStoredUserRole();
  if (role !== "owner" && role !== "manager") {
    return {
      success: false,
      error: "Authorization required: Only Owner or Manager can reverse payment allocations."
    };
  }

  const payments = getPayments();
  const payIdx = payments.findIndex(p => p.id === params.payment_id);
  if (payIdx === -1) {
    return { success: false, error: "Payment not found." };
  }
  const payment = payments[payIdx];

  const allocIdx = (payment.allocations || []).findIndex(a => a.id === params.allocation_id);
  if (allocIdx === -1) {
    return { success: false, error: "Allocation record not found." };
  }

  const allocation = payment.allocations[allocIdx];
  const billId = allocation.bill_id;
  const billNumber = allocation.bill_number;
  const reversedAmount = allocation.allocated_amount;

  payment.allocations.splice(allocIdx, 1);
  const totalAllocatedNow = payment.allocations.reduce((s, a) => s + (a.allocated_amount || 0), 0);
  payment.unallocated_amount = Math.max(0, payment.amount - totalAllocatedNow);
  payments[payIdx] = payment;
  savePayments(payments);

  const bills = getBills();
  const returns = getReturns().filter(r => isApprovedReturn(r));
  const bIdx = bills.findIndex(b => b.id === billId);
  if (bIdx >= 0) {
    const updatedSettlement = getBillSettlementInfo(billId, payments, returns);
    bills[bIdx].payment_status = updatedSettlement.payment_status;
    saveBills(bills);
  }

  const actorName = role === "owner" ? "Pramod Maharaj (Owner)" : "Manager";
  const auditEntry = addAuditLog({
    action: "ALLOCATION_REVERSAL",
    entity: `Payment ${payment.receipt_number} ➔ Bill #${billNumber}`,
    actor: actorName,
    notes: `Reversed allocation of ₹${reversedAmount.toFixed(2)} from Receipt #${payment.receipt_number} to Bill #${billNumber}.${params.reason ? ` Reason: ${params.reason}` : ""}`
  });

  return { success: true, audit_log: auditEntry };
}

/* ------------------------------------------------------------------ */
/*  Master Data Catalogs & Admin Configuration Management             */
/* ------------------------------------------------------------------ */

export const INITIAL_CEMENT_BRANDS: CementBrand[] = [
  { id: "cb-1", name: "LNT", defaultRate: 340, isActive: true, notes: "L&T UltraTech OPC / PPC" },
  { id: "cb-2", name: "SUPPER", defaultRate: 345, isActive: true, notes: "Supper Cement Bags" },
  { id: "cb-3", name: "SHREE", defaultRate: 330, isActive: true, notes: "Shree Jung Rodhak" },
  { id: "cb-4", name: "MARBAL", defaultRate: 335, isActive: true, notes: "Marble special blend" },
  { id: "cb-5", name: "ROOFON", defaultRate: 360, isActive: true, notes: "Roofon concrete ready" },
  { id: "cb-6", name: "PRIMIUM", defaultRate: 350, isActive: true, notes: "Premium grade bags" },
  { id: "cb-7", name: "DSP", defaultRate: 380, isActive: true, notes: "Dalmia DSP high strength" },
  { id: "cb-8", name: "CON. SPECIAL", defaultRate: 375, isActive: true, notes: "Construction special formula" },
];

export const INITIAL_ROD_SIZES: RodSize[] = [
  { id: "rs-1", size: "8mm", defaultRate: 71.0, isActive: true, notes: "Fe 550D TMT Rebar" },
  { id: "rs-2", size: "10mm", defaultRate: 70.0, isActive: true, notes: "Fe 550D TMT Rebar" },
  { id: "rs-3", size: "12mm", defaultRate: 68.0, isActive: true, notes: "Fe 550D TMT Rebar" },
  { id: "rs-4", size: "16mm", defaultRate: 68.0, isActive: true, notes: "Fe 550D Structural Rebar" },
  { id: "rs-5", size: "20mm", defaultRate: 69.0, isActive: true, notes: "Heavy Foundation Rod" },
  { id: "rs-6", size: "25mm", defaultRate: 70.0, isActive: true, notes: "Heavy Foundation Rod" },
  { id: "rs-7", size: "Binding Wire", defaultRate: 75.0, isActive: true, notes: "GI / Annealed Wire" },
];

export const INITIAL_PAYMENT_MODES: PaymentModeOption[] = [
  { id: "pm-1", code: "CASH", label: "Cash Payment", isActive: true, isSystem: true },
  { id: "pm-2", code: "UPI", label: "UPI (PhonePe / GooglePay / QR)", isActive: true, isSystem: true },
  { id: "pm-3", code: "CC UPI", label: "Credit Card UPI", isActive: true, isSystem: false },
  { id: "pm-4", code: "SBI", label: "SBI Current Account", isActive: true, isSystem: false },
  { id: "pm-5", code: "BANK_TRANSFER", label: "Bank Transfer (NEFT / RTGS)", isActive: true, isSystem: true },
  { id: "pm-6", code: "CHEQUE", label: "Cheque Clearing", isActive: true, isSystem: false },
];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
  { id: "ec-1", name: "Shop Expense", isActive: true },
  { id: "ec-2", name: "Godown Transfer", isActive: true },
  { id: "ec-3", name: "Supplier Payment", isActive: true },
  { id: "ec-4", name: "Staff Salary/Advance", isActive: true },
  { id: "ec-5", name: "Transport / Auto", isActive: true },
  { id: "ec-6", name: "Shop Rent", isActive: true },
  { id: "ec-7", name: "Electricity / Power", isActive: true },
  { id: "ec-8", name: "Uncategorized Outflow", isActive: true },
];

/* ---------------- CEMENT BRANDS CRUD ---------------- */

export function getCementBrands(): CementBrand[] {
  if (!isClient()) return INITIAL_CEMENT_BRANDS;
  const raw = localStorage.getItem(STORAGE_KEYS.CEMENT_BRANDS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CEMENT_BRANDS, JSON.stringify(INITIAL_CEMENT_BRANDS));
    return INITIAL_CEMENT_BRANDS;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CEMENT_BRANDS;
  } catch {
    return INITIAL_CEMENT_BRANDS;
  }
}

export function saveCementBrands(brands: CementBrand[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CEMENT_BRANDS, JSON.stringify(brands));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addCementBrand(
  data: { name: string; defaultRate?: number; notes?: string },
  actor?: string
): { success: boolean; brand?: CementBrand; error?: string } {
  const name = (data.name || "").trim().toUpperCase();
  if (!name) {
    return { success: false, error: "Cement brand name is required." };
  }

  const brands = getCementBrands();
  if (brands.some(b => b.name.toUpperCase() === name)) {
    return { success: false, error: `Cement brand "${name}" already exists.` };
  }

  const newBrand: CementBrand = {
    id: `cb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    defaultRate: Number(data.defaultRate) || 0,
    isActive: true,
    notes: data.notes?.trim() || "",
    updatedAt: new Date().toISOString(),
  };

  brands.push(newBrand);
  saveCementBrands(brands);

  addAuditLog({
    action: "ADD_CEMENT_BRAND",
    entity: `Cement Brand: ${name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Configured new cement brand "${name}" with default rate ₹${newBrand.defaultRate}/bag.`,
  });

  return { success: true, brand: newBrand };
}

export function updateCementBrand(
  id: string,
  updates: Partial<Pick<CementBrand, "name" | "defaultRate" | "isActive" | "notes">>,
  actor?: string
): { success: boolean; brand?: CementBrand; error?: string } {
  const brands = getCementBrands();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) {
    return { success: false, error: "Cement brand not found." };
  }

  const oldBrand = brands[idx];
  const newName = updates.name ? updates.name.trim().toUpperCase() : oldBrand.name;

  if (updates.name && newName !== oldBrand.name && brands.some(b => b.id !== id && b.name.toUpperCase() === newName)) {
    return { success: false, error: `Another cement brand named "${newName}" already exists.` };
  }

  const updatedBrand: CementBrand = {
    ...oldBrand,
    name: newName,
    defaultRate: updates.defaultRate !== undefined ? Number(updates.defaultRate) : oldBrand.defaultRate,
    isActive: updates.isActive !== undefined ? updates.isActive : oldBrand.isActive,
    notes: updates.notes !== undefined ? updates.notes.trim() : oldBrand.notes,
    updatedAt: new Date().toISOString(),
  };

  brands[idx] = updatedBrand;
  saveCementBrands(brands);

  addAuditLog({
    action: "UPDATE_CEMENT_BRAND",
    entity: `Cement Brand: ${updatedBrand.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated brand "${oldBrand.name}"${newName !== oldBrand.name ? ` to "${newName}"` : ""}. Rate: ₹${updatedBrand.defaultRate}, Status: ${updatedBrand.isActive ? "Active" : "Inactive"}.`,
  });

  return { success: true, brand: updatedBrand };
}

export function deleteCementBrand(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const brands = getCementBrands();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) {
    return { success: false, error: "Cement brand not found." };
  }

  const brandToDelete = brands[idx];
  brands.splice(idx, 1);
  saveCementBrands(brands);

  addAuditLog({
    action: "REMOVE_CEMENT_BRAND",
    entity: `Cement Brand: ${brandToDelete.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed cement brand "${brandToDelete.name}" from active catalog.`,
  });

  return { success: true };
}

/* ---------------- ROD / STEEL SIZES CRUD ---------------- */

export function getRodSizes(): RodSize[] {
  if (!isClient()) return INITIAL_ROD_SIZES;
  const raw = localStorage.getItem(STORAGE_KEYS.ROD_SIZES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ROD_SIZES, JSON.stringify(INITIAL_ROD_SIZES));
    return INITIAL_ROD_SIZES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ROD_SIZES;
  } catch {
    return INITIAL_ROD_SIZES;
  }
}

export function saveRodSizes(sizes: RodSize[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.ROD_SIZES, JSON.stringify(sizes));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addRodSize(
  data: { size: string; defaultRate?: number; notes?: string },
  actor?: string
): { success: boolean; size?: RodSize; error?: string } {
  const size = (data.size || "").trim();
  if (!size) {
    return { success: false, error: "Rod size specification is required." };
  }

  const sizes = getRodSizes();
  if (sizes.some(s => s.size.toLowerCase() === size.toLowerCase())) {
    return { success: false, error: `Rod size "${size}" already exists.` };
  }

  const newSize: RodSize = {
    id: `rs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    size,
    defaultRate: Number(data.defaultRate) || 0,
    isActive: true,
    notes: data.notes?.trim() || "",
    updatedAt: new Date().toISOString(),
  };

  sizes.push(newSize);
  saveRodSizes(sizes);

  addAuditLog({
    action: "ADD_ROD_SIZE",
    entity: `Rod Size: ${size}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Added rod specification "${size}" with default rate ₹${newSize.defaultRate}/Kg.`,
  });

  return { success: true, size: newSize };
}

export function updateRodSize(
  id: string,
  updates: Partial<Pick<RodSize, "size" | "defaultRate" | "isActive" | "notes">>,
  actor?: string
): { success: boolean; size?: RodSize; error?: string } {
  const sizes = getRodSizes();
  const idx = sizes.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, error: "Rod size not found." };
  }

  const old = sizes[idx];
  const newSizeName = updates.size ? updates.size.trim() : old.size;

  if (updates.size && newSizeName.toLowerCase() !== old.size.toLowerCase() && sizes.some(s => s.id !== id && s.size.toLowerCase() === newSizeName.toLowerCase())) {
    return { success: false, error: `Another rod specification named "${newSizeName}" already exists.` };
  }

  const updated: RodSize = {
    ...old,
    size: newSizeName,
    defaultRate: updates.defaultRate !== undefined ? Number(updates.defaultRate) : old.defaultRate,
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
    notes: updates.notes !== undefined ? updates.notes.trim() : old.notes,
    updatedAt: new Date().toISOString(),
  };

  sizes[idx] = updated;
  saveRodSizes(sizes);

  addAuditLog({
    action: "UPDATE_ROD_SIZE",
    entity: `Rod Size: ${updated.size}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated rod size "${old.size}". Rate: ₹${updated.defaultRate}/Kg, Status: ${updated.isActive ? "Active" : "Inactive"}.`,
  });

  return { success: true, size: updated };
}

export function deleteRodSize(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const sizes = getRodSizes();
  const idx = sizes.findIndex(s => s.id === id);
  if (idx === -1) {
    return { success: false, error: "Rod size not found." };
  }

  const deleted = sizes[idx];
  sizes.splice(idx, 1);
  saveRodSizes(sizes);

  addAuditLog({
    action: "REMOVE_ROD_SIZE",
    entity: `Rod Size: ${deleted.size}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed rod size "${deleted.size}" from catalog.`,
  });

  return { success: true };
}

/* ---------------- PAYMENT MODES CRUD ---------------- */

export function getPaymentModes(): PaymentModeOption[] {
  if (!isClient()) return INITIAL_PAYMENT_MODES;
  const raw = localStorage.getItem(STORAGE_KEYS.PAYMENT_MODES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_MODES, JSON.stringify(INITIAL_PAYMENT_MODES));
    return INITIAL_PAYMENT_MODES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PAYMENT_MODES;
  } catch {
    return INITIAL_PAYMENT_MODES;
  }
}

export function savePaymentModes(modes: PaymentModeOption[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_MODES, JSON.stringify(modes));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addPaymentMode(
  data: { code: string; label: string },
  actor?: string
): { success: boolean; mode?: PaymentModeOption; error?: string } {
  const code = (data.code || "").trim().toUpperCase();
  const label = (data.label || "").trim();
  if (!code || !label) {
    return { success: false, error: "Payment mode code and display label are required." };
  }

  const modes = getPaymentModes();
  if (modes.some(m => m.code === code)) {
    return { success: false, error: `Payment mode code "${code}" already exists.` };
  }

  const newMode: PaymentModeOption = {
    id: `pm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code,
    label,
    isActive: true,
    isSystem: false,
  };

  modes.push(newMode);
  savePaymentModes(modes);

  addAuditLog({
    action: "ADD_PAYMENT_MODE",
    entity: `Payment Mode: ${code}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Configured new payment channel "${label}" [${code}].`,
  });

  return { success: true, mode: newMode };
}

export function updatePaymentMode(
  id: string,
  updates: Partial<Pick<PaymentModeOption, "label" | "isActive">>,
  actor?: string
): { success: boolean; mode?: PaymentModeOption; error?: string } {
  const modes = getPaymentModes();
  const idx = modes.findIndex(m => m.id === id);
  if (idx === -1) {
    return { success: false, error: "Payment mode not found." };
  }

  const old = modes[idx];
  const updated: PaymentModeOption = {
    ...old,
    label: updates.label ? updates.label.trim() : old.label,
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
  };

  modes[idx] = updated;
  savePaymentModes(modes);

  addAuditLog({
    action: "UPDATE_PAYMENT_MODE",
    entity: `Payment Mode: ${updated.code}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated payment channel "${updated.code}" (${updated.label}). Active: ${updated.isActive}.`,
  });

  return { success: true, mode: updated };
}

export function deletePaymentMode(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const modes = getPaymentModes();
  const idx = modes.findIndex(m => m.id === id);
  if (idx === -1) {
    return { success: false, error: "Payment mode not found." };
  }

  const deleted = modes[idx];
  if (deleted.isSystem) {
    return { success: false, error: `System payment mode "${deleted.code}" cannot be deleted. You can deactivate it instead.` };
  }

  modes.splice(idx, 1);
  savePaymentModes(modes);

  addAuditLog({
    action: "REMOVE_PAYMENT_MODE",
    entity: `Payment Mode: ${deleted.code}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Removed custom payment channel "${deleted.code}".`,
  });

  return { success: true };
}

/* ---------------- EXPENSE CATEGORIES CRUD ---------------- */

export function getExpenseCategories(): ExpenseCategoryOption[] {
  if (!isClient()) return INITIAL_EXPENSE_CATEGORIES;
  const raw = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(INITIAL_EXPENSE_CATEGORIES));
    return INITIAL_EXPENSE_CATEGORIES;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EXPENSE_CATEGORIES;
  } catch {
    return INITIAL_EXPENSE_CATEGORIES;
  }
}

export function saveExpenseCategories(cats: ExpenseCategoryOption[]): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(cats));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

export function addExpenseCategory(
  name: string,
  actor?: string
): { success: boolean; category?: ExpenseCategoryOption; error?: string } {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { success: false, error: "Category name is required." };
  }

  const cats = getExpenseCategories();
  if (cats.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: `Expense category "${trimmed}" already exists.` };
  }

  const newCat: ExpenseCategoryOption = {
    id: `ec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: trimmed,
    isActive: true,
  };

  cats.push(newCat);
  saveExpenseCategories(cats);

  addAuditLog({
    action: "ADD_EXPENSE_CATEGORY",
    entity: `Category: ${trimmed}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Configured new cash outflow category "${trimmed}".`,
  });

  return { success: true, category: newCat };
}

export function updateExpenseCategory(
  id: string,
  updates: Partial<Pick<ExpenseCategoryOption, "name" | "isActive">>,
  actor?: string
): { success: boolean; category?: ExpenseCategoryOption; error?: string } {
  const cats = getExpenseCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) {
    return { success: false, error: "Expense category not found." };
  }

  const old = cats[idx];
  const newName = updates.name ? updates.name.trim() : old.name;

  if (updates.name && newName.toLowerCase() !== old.name.toLowerCase() && cats.some(c => c.id !== id && c.name.toLowerCase() === newName.toLowerCase())) {
    return { success: false, error: `Another expense category named "${newName}" already exists.` };
  }

  const updated: ExpenseCategoryOption = {
    ...old,
    name: newName,
    isActive: updates.isActive !== undefined ? updates.isActive : old.isActive,
  };

  cats[idx] = updated;
  saveExpenseCategories(cats);

  addAuditLog({
    action: "UPDATE_EXPENSE_CATEGORY",
    entity: `Category: ${updated.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Updated expense category "${old.name}" to "${updated.name}". Active: ${updated.isActive}.`,
  });

  return { success: true, category: updated };
}

export function deleteExpenseCategory(
  id: string,
  actor?: string
): { success: boolean; error?: string } {
  const cats = getExpenseCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) {
    return { success: false, error: "Expense category not found." };
  }

  const deleted = cats[idx];
  cats.splice(idx, 1);
  saveExpenseCategories(cats);

  addAuditLog({
    action: "REMOVE_EXPENSE_CATEGORY",
    entity: `Category: ${deleted.name}`,
    actor: actor || "System Administrator (Admin Account)",
    notes: `Permanently removed expense category "${deleted.name}".`,
  });

  return { success: true };
}

/* ---------------- BUSINESS PROFILE CRUD ---------------- */

export function getBusinessProfile(): BusinessProfile {
  const fallback: BusinessProfile = {
    name: seedData.business.name,
    gstin: seedData.business.gstin,
    phone: seedData.business.phone,
    email: seedData.business.email,
    address: seedData.business.address,
  };

  if (!isClient()) return fallback;

  const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS_PROFILE);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || fallback.name,
      gstin: parsed.gstin || fallback.gstin,
      phone: parsed.phone || fallback.phone,
      email: parsed.email || fallback.email,
      address: parsed.address || fallback.address,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return fallback;
  }
}

export function saveBusinessProfile(
  profile: Partial<BusinessProfile>,
  actor?: string
): BusinessProfile {
  const current = getBusinessProfile();
  const updated: BusinessProfile = {
    name: (profile.name !== undefined ? profile.name : current.name).trim(),
    gstin: (profile.gstin !== undefined ? profile.gstin : current.gstin).trim().toUpperCase(),
    phone: (profile.phone !== undefined ? profile.phone : current.phone).trim(),
    email: (profile.email !== undefined ? profile.email : current.email).trim(),
    address: (profile.address !== undefined ? profile.address : current.address).trim(),
    updatedAt: new Date().toISOString(),
  };

  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.BUSINESS_PROFILE, JSON.stringify(updated));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }

  addAuditLog({
    action: "UPDATE_BUSINESS_PROFILE",
    entity: updated.name,
    actor: actor || "Owner / Administrator",
    notes: `Updated business profile: Phone: ${updated.phone}, Address: ${updated.address}, GSTIN: ${updated.gstin}, Email: ${updated.email}`,
  });

  return updated;
}


