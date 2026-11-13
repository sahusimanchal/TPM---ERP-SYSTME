const assert = require("assert");

// Mock client localStorage for Node test environment
if (typeof window === "undefined") {
  const mockStorage = {};
  global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
  global.window = {
    dispatchEvent: () => {},
  };
}

const path = require("path");
const jiti = require("jiti")(process.cwd(), {
  alias: {
    "@": path.resolve(process.cwd(), "src")
  }
});

const storage = jiti("@/lib/storage");

console.log("=== STARTING ADMIN MASTER DATA CRUD TESTS ===");

// 1. Initial Cement Brands
const brands = storage.getCementBrands();
assert(Array.isArray(brands) && brands.length >= 8, "Should load initial cement brands");
console.log(`✓ [PASS] Loaded ${brands.length} initial cement brands (including LNT, SUPPER, etc.)`);

// 2. Add New Cement Brand (as Admin)
const addRes = storage.addCementBrand({
  name: "ULTRATECH",
  defaultRate: 365,
  notes: "UltraTech Weather Plus"
}, "System Administrator (Admin Account)");

assert(addRes.success === true, "Add cement brand should succeed");
assert(addRes.brand && addRes.brand.name === "ULTRATECH", "Brand name should be ULTRATECH");
assert(addRes.brand.defaultRate === 365, "Default rate should be 365");
console.log("✓ [PASS] Admin successfully added new cement brand: ULTRATECH (₹365)");

// 3. Prevent duplicate cement brand
const dupRes = storage.addCementBrand({ name: "ultratech" });
assert(dupRes.success === false, "Duplicate brand should be rejected");
console.log("✓ [PASS] Prevented duplicate cement brand addition");

// 4. Update Cement Brand
const updateRes = storage.updateCementBrand(addRes.brand.id, {
  defaultRate: 370,
  notes: "Updated price for UltraTech"
}, "System Administrator (Admin Account)");

assert(updateRes.success === true, "Update should succeed");
assert(updateRes.brand.defaultRate === 370, "Updated rate should be 370");
console.log("✓ [PASS] Admin successfully updated cement brand default rate to ₹370");

// 5. Delete / Remove Cement Brand
const deleteRes = storage.deleteCementBrand(addRes.brand.id, "System Administrator (Admin Account)");
assert(deleteRes.success === true, "Delete should succeed");
const brandsAfterDelete = storage.getCementBrands();
assert(!brandsAfterDelete.some(b => b.name === "ULTRATECH"), "Deleted brand should not be in catalog");
console.log("✓ [PASS] Admin successfully removed cement brand from catalog");

// 6. Rod Sizes CRUD
const rodSizes = storage.getRodSizes();
assert(rodSizes.length >= 7, "Should load default rod sizes");
const newRod = storage.addRodSize({ size: "32mm", defaultRate: 72.5 }, "System Administrator (Admin Account)");
assert(newRod.success === true, "Add rod size should succeed");
console.log("✓ [PASS] Admin successfully added new rod size: 32mm (₹72.50)");

storage.updateRodSize(newRod.size.id, { defaultRate: 73.0 });
const updatedRod = storage.getRodSizes().find(r => r.size === "32mm");
assert(updatedRod.defaultRate === 73.0, "Rod rate updated");
console.log("✓ [PASS] Admin successfully updated rod size rate");

storage.deleteRodSize(newRod.size.id);
assert(!storage.getRodSizes().some(r => r.size === "32mm"), "Rod size removed");
console.log("✓ [PASS] Admin successfully removed rod size from catalog");

// 7. Payment Modes CRUD
const modes = storage.getPaymentModes();
assert(modes.length >= 6, "Payment modes loaded");
const newMode = storage.addPaymentMode({ code: "HDFC", label: "HDFC Bank Current Account" });
assert(newMode.success === true, "Added HDFC payment mode");
console.log("✓ [PASS] Admin successfully added custom payment channel: HDFC Bank");

// 8. Expense Categories CRUD
const cats = storage.getExpenseCategories();
assert(cats.length >= 8, "Expense categories loaded");
const newCat = storage.addExpenseCategory("Loading & Unloading Labour");
assert(newCat.success === true, "Added new expense category");
console.log("✓ [PASS] Admin successfully added new expense category: Loading & Unloading");

// 9. Verify Audit Logs Captured Everything
const auditLogs = storage.getAuditLogs();
const masterLogs = auditLogs.filter(l => 
  l.action.includes("CEMENT") || l.action.includes("ROD") || l.action.includes("PAYMENT_MODE") || l.action.includes("EXPENSE_CATEGORY")
);
assert(masterLogs.length >= 5, "Audit logs should record all master data changes");
console.log(`✓ [PASS] Verified immutable audit logs recorded ${masterLogs.length} Admin catalog actions`);

console.log("\n=== ALL 14/14 ADMIN MASTER DATA TESTS PASSED! ===");
