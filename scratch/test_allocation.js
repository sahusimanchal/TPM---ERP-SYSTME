/**
 * Automated Test Suite for Unallocated Payment Management and Bill Allocation
 * Tests:
 * 1. Customer has ₹77,600 outstanding across 2 bills (₹50,000 and ₹27,600).
 * 2. Customer makes unallocated payment of ₹48,800.
 * 3. Verify unallocated credit = ₹48,800, net outstanding = ₹28,800.
 * 4. Allocate ₹30,000 to Bill 1 and ₹18,800 to Bill 2.
 * 5. Verify unallocated credit = ₹0, remaining customer outstanding = ₹28,800.
 * 6. Verify Bill 1 is partially paid (due: ₹20,000) and Bill 2 is partially paid (due: ₹8,800).
 * 7. Allocate second payment of ₹20,000 to Bill 1 -> Bill 1 becomes 'paid' (multiple payments to one bill).
 * 8. Over-allocation prevention (exceeding payment credit or bill balance).
 * 9. Reversal of allocation -> restores credit and updates bill status back.
 * 10. Audit log entries created for allocations and reversals.
 * 11. Role authorization checks.
 */

// Mock localStorage & window in Node BEFORE importing storage
if (typeof window === "undefined") {
  const storage = {};
  global.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
  global.window = {
    dispatchEvent: () => {}
  };
}

const path = require("path");
const jiti = require("jiti")(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src")
  }
});

const {
  allocatePaymentToBills,
  reversePaymentAllocation,
  getBillSettlementInfo,
  getCustomerUnallocatedPayments,
  getCustomerOutstandingBills,
  calculateCustomerOutstanding,
  getAuditLogs,
  saveCustomers,
  saveBills,
  savePayments,
  saveReturns,
  setStoredUserRole,
  getPayments
} = jiti("./src/lib/storage.ts");

function runTests() {
  console.log("=== STARTING UNALLOCATED PAYMENT & ALLOCATION TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Set role as owner
  setStoredUserRole("owner");

  // Setup test customer
  const testCustomer = {
    id: "cust-test-01",
    name: "SHREE BALAJI ENTERPRISES",
    code: "CUST-0999",
    opening_balance: 0,
    current_balance: 77600,
    total_bills_amount: 77600,
    total_paid_amount: 0,
    is_unidentified: false,
    is_active: true,
    created_at: new Date().toISOString()
  };
  saveCustomers([testCustomer]);

  // Setup 2 test bills
  const bill1 = {
    id: "bill-test-01",
    bill_number: "SE-TEST-001",
    bill_category: "cement",
    bill_date: "2026-11-01",
    customer_id: testCustomer.id,
    customer_name: testCustomer.name,
    subtotal: 50000,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 50000,
    payment_status: "unpaid",
    status: "posted",
    items: [],
    created_at: "2026-11-01T10:00:00Z"
  };

  const bill2 = {
    id: "bill-test-02",
    bill_number: "RD-TEST-002",
    bill_category: "rod",
    bill_date: "2026-11-02",
    customer_id: testCustomer.id,
    customer_name: testCustomer.name,
    subtotal: 27600,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 27600,
    payment_status: "unpaid",
    status: "posted",
    items: [],
    created_at: "2026-11-02T10:00:00Z"
  };
  saveBills([bill1, bill2]);

  // Setup payment of ₹48,800 unallocated
  const payment1 = {
    id: "pay-test-01",
    receipt_number: "RCP-TEST-001",
    payment_date: "2026-11-05",
    customer_id: testCustomer.id,
    customer_name: testCustomer.name,
    amount: 48800,
    payment_mode: "CASH",
    reference_number: "REF-001",
    unallocated_amount: 48800,
    status: "posted",
    is_imported: false,
    allocations: [],
    created_at: "2026-11-05T10:00:00Z"
  };
  savePayments([payment1]);
  saveReturns([]);

  // Check initial state
  const initialUnallocated = getCustomerUnallocatedPayments(testCustomer.id);
  assert(initialUnallocated.length === 1, "Customer has 1 unallocated payment");
  assert(initialUnallocated[0].unallocated_amount === 48800, "Unallocated credit equals ₹48,800");

  const initialOutstanding = calculateCustomerOutstanding();
  const custRow = initialOutstanding.rows.find(r => r.customer_id === testCustomer.id);
  assert(custRow && custRow.outstanding === 28800, "Customer outstanding is ₹28,800 (₹77,600 - ₹48,800)");
  assert(custRow && custRow.unallocated_credits === 48800, "Customer unallocated credit is ₹48,800");

  // TEST 1: Allocate ₹30,000 to Bill 1 and ₹18,800 to Bill 2 (One payment across multiple bills)
  const allocRes = allocatePaymentToBills({
    payment_id: payment1.id,
    allocations: [
      { bill_id: bill1.id, allocated_amount: 30000 },
      { bill_id: bill2.id, allocated_amount: 18800 }
    ],
    notes: "Settling cement and rod supply"
  });

  assert(allocRes.success === true, "allocatePaymentToBills returned success");
  assert(allocRes.allocated_total === 48800, "Allocated total is exactly ₹48,800");

  // Verify Payment state
  const updatedUnallocated = getCustomerUnallocatedPayments(testCustomer.id);
  assert(updatedUnallocated.length === 0, "Unallocated payment credit is now ₹0 (all allocated)");

  // Verify Bill 1 settlement & status
  const bill1Settlement = getBillSettlementInfo(bill1.id);
  assert(bill1Settlement.allocated_payments_amount === 30000, "Bill 1 allocated payment is ₹30,000");
  assert(bill1Settlement.remaining_balance === 20000, "Bill 1 remaining balance is ₹20,000");
  assert(bill1Settlement.payment_status === "partially_paid", "Bill 1 status is 'partially_paid'");

  // Verify Bill 2 settlement & status
  const bill2Settlement = getBillSettlementInfo(bill2.id);
  assert(bill2Settlement.allocated_payments_amount === 18800, "Bill 2 allocated payment is ₹18,800");
  assert(bill2Settlement.remaining_balance === 8800, "Bill 2 remaining balance is ₹8,800");
  assert(bill2Settlement.payment_status === "partially_paid", "Bill 2 status is 'partially_paid'");

  // Verify Customer Outstanding after allocation (MUST STILL BE ₹28,800, NO DOUBLE COUNTING!)
  const postAllocOutstanding = calculateCustomerOutstanding();
  const custRowAfter = postAllocOutstanding.rows.find(r => r.customer_id === testCustomer.id);
  assert(custRowAfter.outstanding === 28800, "Customer outstanding remains ₹28,800 (no double counting)");
  assert(custRowAfter.unallocated_credits === 0, "Unallocated credit is now ₹0");
  assert(custRowAfter.total_bills === 77600, "Total bills remains ₹77,600");
  assert(custRowAfter.payments_allocated === 48800, "Payments allocated is ₹48,800");

  // TEST 2: Multiple payments to one bill
  // Record second payment of ₹20,000 and allocate to Bill 1 to fully settle it
  const payment2 = {
    id: "pay-test-02",
    receipt_number: "RCP-TEST-002",
    payment_date: "2026-11-06",
    customer_id: testCustomer.id,
    customer_name: testCustomer.name,
    amount: 20000,
    payment_mode: "UPI",
    reference_number: "UPI-REF-002",
    unallocated_amount: 20000,
    status: "posted",
    is_imported: false,
    allocations: [],
    created_at: "2026-11-06T10:00:00Z"
  };
  const allPays = getPayments();
  allPays.push(payment2);
  savePayments(allPays);

  const allocRes2 = allocatePaymentToBills({
    payment_id: payment2.id,
    allocations: [{ bill_id: bill1.id, allocated_amount: 20000 }]
  });
  assert(allocRes2.success === true, "Second payment of ₹20,000 allocated to Bill 1");

  const bill1FinalSettlement = getBillSettlementInfo(bill1.id);
  assert(bill1FinalSettlement.allocated_payments_amount === 50000, "Bill 1 total allocated is now ₹50,000 (from 2 payments)");
  assert(bill1FinalSettlement.remaining_balance === 0, "Bill 1 remaining balance is ₹0");
  assert(bill1FinalSettlement.payment_status === "paid", "Bill 1 status updated to 'paid'");
  assert(bill1FinalSettlement.allocations.length === 2, "Bill 1 has 2 allocation records from 2 distinct receipts");

  // TEST 3: Validation - Over-allocation bounds
  // Try to allocate more than remaining balance on Bill 2 (remaining balance is ₹8,800)
  const payment3 = {
    id: "pay-test-03",
    receipt_number: "RCP-TEST-003",
    payment_date: "2026-11-07",
    customer_id: testCustomer.id,
    customer_name: testCustomer.name,
    amount: 15000,
    payment_mode: "CASH",
    unallocated_amount: 15000,
    status: "posted",
    is_imported: false,
    allocations: [],
    created_at: "2026-11-07T10:00:00Z"
  };
  allPays.push(payment3);
  savePayments(allPays);

  const overAllocBillRes = allocatePaymentToBills({
    payment_id: payment3.id,
    allocations: [{ bill_id: bill2.id, allocated_amount: 10000 }] // exceeds ₹8,800 remaining
  });
  assert(overAllocBillRes.success === false, "Over-allocation exceeding bill remaining balance prevented");

  // Try to allocate more than payment available unallocated credit
  const overAllocCreditRes = allocatePaymentToBills({
    payment_id: payment3.id,
    allocations: [{ bill_id: bill2.id, allocated_amount: 25000 }] // exceeds ₹15,000 payment amount
  });
  assert(overAllocCreditRes.success === false, "Over-allocation exceeding available payment credit prevented");

  // TEST 4: Reversal of an allocation with audit log
  // Reverse the ₹18,800 allocation from payment 1 to Bill 2
  const p1WithAlloc = getPayments().find(p => p.id === payment1.id);
  const allocToReverse = p1WithAlloc.allocations.find(a => a.bill_id === bill2.id);
  assert(allocToReverse !== undefined, "Found allocation of ₹18,800 to Bill 2");

  const revRes = reversePaymentAllocation({
    payment_id: payment1.id,
    allocation_id: allocToReverse.id,
    reason: "Incorrect bill allocated by operator"
  });
  assert(revRes.success === true, "reversePaymentAllocation returned success");

  // Verify Payment 1 unallocated restored to ₹18,800
  const p1AfterRev = getPayments().find(p => p.id === payment1.id);
  assert(p1AfterRev.unallocated_amount === 18800, "Payment 1 unallocated credit restored to ₹18,800");

  // Verify Bill 2 status restored to 'unpaid'
  const bill2AfterRev = getBillSettlementInfo(bill2.id);
  assert(bill2AfterRev.allocated_payments_amount === 0, "Bill 2 allocated amount restored to ₹0");
  assert(bill2AfterRev.remaining_balance === 27600, "Bill 2 remaining balance restored to ₹27,600");
  assert(bill2AfterRev.payment_status === "unpaid", "Bill 2 payment status restored to 'unpaid'");

  // TEST 5: Verify Audit Log
  const logs = getAuditLogs();
  const revLog = logs.find(l => l.action === "ALLOCATION_REVERSAL");
  assert(revLog !== undefined, "Audit log contains ALLOCATION_REVERSAL entry");
  assert(revLog.notes.includes("Incorrect bill allocated by operator"), "Audit log notes contain reversal reason");
  assert(revLog.actor.includes("Owner"), "Audit log identifies authorized actor");

  const allocLog = logs.find(l => l.action === "PAYMENT_ALLOCATION");
  assert(allocLog !== undefined, "Audit log contains PAYMENT_ALLOCATION entry");

  // TEST 6: Role Authorization
  setStoredUserRole("operator");
  const unauthorizedAlloc = allocatePaymentToBills({
    payment_id: payment3.id,
    allocations: [{ bill_id: bill2.id, allocated_amount: 5000 }]
  });
  assert(unauthorizedAlloc.success === false, "Operator role blocked from allocating payments");
  assert(unauthorizedAlloc.error.includes("Only Owner or Manager"), "Clear authorization error returned to operator");

  console.log(`\n=== ALL ${passed}/${total} TESTS PASSED SUCCESSFULLY! ===`);
}

runTests();
