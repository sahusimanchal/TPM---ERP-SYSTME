export type UserRole = 'owner' | 'manager' | 'admin' | 'operator' | 'viewer';
export type PortalRole = 'owner' | 'manager' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  businessId?: string;
  businessName?: string;
  isActive: boolean;
  avatarUrl?: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

export type BillCategory = 'cement' | 'rod' | 'daily';
export type BillStatus = 'draft' | 'posted' | 'voided';
export type BillPaymentStatus = 
  | 'unpaid' 
  | 'partially_paid' 
  | 'paid' 
  | 'legacy_paid_yes' 
  | 'legacy_paid_no' 
  | 'legacy_unspecified';

export interface Customer {
  id: string;
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  is_unidentified: boolean; // For 'UNKNOWN' customer
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  total_bills_amount: number;
  total_paid_amount: number;
  created_at: string;
}

export interface BillItem {
  id: string;
  bill_id: string;
  item_name: string;
  item_category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
}

export interface CementDetail {
  cement_type: string; // LNT, SUPPER, SHREE, MARBAL, ROOFON, etc.
  qty_bags: number;
  unit_rate: number;
  amount: number;
  legacy_paid_flag?: 'YES' | 'NO' | 'BLANK';
}

export interface RodDetail {
  rod_size: string; // 8mm, 10mm, 12mm, etc.
  qty_kg: number;
  rate_per_kg: number;
  amount: number;
}

export interface DailySaleDetail {
  item_type: string; // ELECTRIC, etc.
  amount: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  bill_category: BillCategory;
  bill_date: string | null; // YYYY-MM-DD
  due_date?: string | null;
  customer_id: string;
  customer_name: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: BillPaymentStatus;
  status: BillStatus;
  notes?: string;
  source_sheet?: string;
  is_imported: boolean;
  items: BillItem[];
  cement_details?: CementDetail;
  rod_details?: RodDetail;
  daily_details?: DailySaleDetail;
  created_at: string;
}

export type PaymentMode = 'CASH' | 'UPI' | 'CC UPI' | 'SBI' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  payment_receipt_number?: string;
  payment_date?: string | null;
  bill_id: string;
  bill_number: string;
  bill_date?: string | null;
  allocated_amount: number;
  allocated_by?: string;
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  receipt_number: string;
  payment_date: string | null; // YYYY-MM-DD
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_number?: string;
  notes?: string;
  unallocated_amount: number;
  status: 'posted' | 'voided';
  is_imported: boolean;
  allocations: PaymentAllocation[];
  created_at: string;
}

export type ReturnStatus = 'pending_review' | 'approved' | 'rejected' | 'voided';

export interface SalesReturn {
  id: string;
  return_number: string;
  original_bill_id?: string;
  original_bill_number?: string;
  customer_id: string;
  customer_name: string;
  return_date: string | null;
  item_type: string;
  amount: number | null; // Missing amounts stored as null
  reason?: string;
  status: ReturnStatus;
  is_verified: boolean;
  is_imported: boolean;
  created_at: string;
}

export type CashTransactionType = 'cash_given' | 'cash_received' | 'expense' | 'transfer';

export interface CashTransaction {
  id: string;
  transaction_type: CashTransactionType;
  transaction_date: string | null;
  recipient_name: string;
  customer_id?: string;
  category: string; // Godown, Shop Expense, Supplier, Staff, Rent, Transport, etc.
  amount: number;
  payment_mode: string;
  reference_number?: string;
  notes?: string;
  is_categorized: boolean;
  is_verified: boolean;
  is_imported: boolean;
  created_at: string;
}

export interface ImportSummary {
  batch_id: string;
  filename: string;
  imported_at: string;
  sheets: {
    sheet_name: string;
    total_rows: number;
    imported: number;
    warnings: number;
    errors: number;
    total_amount: number;
  }[];
}

export interface DashboardMetrics {
  gross_sales: number;
  approved_returns: number;
  net_sales: number;
  total_collections: number;
  outstanding_receivables: number;
  cash_outflows: number;
  cash_in_drawer: number;
  unverified_returns_count: number;
  unallocated_advances: number;
  data_quality_issues_count: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  actor: string;
  timestamp: string;
  notes: string;
}

export interface CementBrand {
  id: string;
  name: string;
  defaultRate: number;
  isActive: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface RodSize {
  id: string;
  size: string;
  defaultRate: number;
  isActive: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface PaymentModeOption {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  isSystem?: boolean;
}

export interface ExpenseCategoryOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BusinessProfile {
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  updatedAt?: string;
}


