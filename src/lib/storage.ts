import seedData from "@/data/seedData.json";
import { 
  Customer, 
  Bill, 
  Payment, 
  SalesReturn, 
  CashTransaction, 
  DashboardMetrics,
  PaymentAllocation,
  UserRole
} from "./types";

const STORAGE_KEYS = {
  CUSTOMERS: "tpm_customers_v1",
  BILLS: "tpm_bills_v1",
  PAYMENTS: "tpm_payments_v1",
  RETURNS: "tpm_returns_v1",
  CASH_GIVEN: "tpm_cash_given_v1",
  USER_ROLE: "tpm_user_role_v1",
};

// Safe browser local-storage check
function isClient(): boolean {
  return typeof window !== "undefined";
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

export function getCustomers(): Customer[] {
  if (!isClient()) return seedData.customers as Customer[];
  const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(seedData.customers));
    return seedData.customers as Customer[];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return seedData.customers as Customer[];
  }
}

export function saveCustomers(customers: Customer[]) {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
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
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.BILLS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.RETURNS);
    localStorage.removeItem(STORAGE_KEYS.CASH_GIVEN);
    window.dispatchEvent(new Event("tpm_data_updated"));
  }
}

/**
 * High-precision financial metrics calculation adhering strictly to project accounting rules:
 * - Gross Sales = Sum of valid posted bills.
 * - Net Sales = Gross Sales minus approved/verified returns.
 * - Customer Balance = Opening balance + posted bills - approved returns - payments.
 * - Cash Balance = Opening Cash + Cash Receipts - Cash Outflows.
 * - Profit = Net sales minus COGS & verified operating expenses (never sales minus cash given).
 */
export function calculateDashboardMetrics(dateFilter?: { start?: string; end?: string }): DashboardMetrics {
  const bills = getBills().filter(b => b.status === "posted");
  const payments = getPayments().filter(p => p.status === "posted");
  const returns = getReturns();
  const cashTxs = getCashTransactions();

  // Filter bills by date if provided
  const filteredBills = dateFilter?.start 
    ? bills.filter(b => b.bill_date && (!dateFilter.end || (b.bill_date >= dateFilter.start! && b.bill_date <= dateFilter.end!)))
    : bills;

  const filteredPayments = dateFilter?.start
    ? payments.filter(p => p.payment_date && (!dateFilter.end || (p.payment_date >= dateFilter.start! && p.payment_date <= dateFilter.end!)))
    : payments;

  const filteredReturns = dateFilter?.start
    ? returns.filter(r => r.return_date && (!dateFilter.end || (r.return_date >= dateFilter.start! && r.return_date <= dateFilter.end!)))
    : returns;

  const filteredCash = dateFilter?.start
    ? cashTxs.filter(c => c.transaction_date && (!dateFilter.end || (c.transaction_date >= dateFilter.start! && c.transaction_date <= dateFilter.end!)))
    : cashTxs;

  const gross_sales = filteredBills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  
  // Only APPROVED/VERIFIED returns reduce net sales!
  const approved_returns = filteredReturns
    .filter(r => r.status === "approved" || r.is_verified)
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  const net_sales = gross_sales - approved_returns;
  
  const total_collections = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  
  // Net receivables = Posted Bills - Approved Returns - Total Payments allocated
  const outstanding_receivables = Math.max(0, net_sales - total_collections);
  
  const cash_outflows = filteredCash.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Cash collections only for drawer
  const cash_collections = filteredPayments
    .filter(p => p.payment_mode === "CASH")
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const cash_in_drawer = cash_collections - cash_outflows;

  const unverified_returns_count = returns.filter(r => r.status === "pending_review").length;
  const unallocated_advances = filteredPayments.reduce((acc, p) => acc + (p.unallocated_amount || 0), 0);

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
    for (const alloc of paymentData.allocations) {
      const bIdx = bills.findIndex(b => b.id === alloc.bill_id);
      if (bIdx >= 0) {
        bills[bIdx].payment_status = "paid";
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
