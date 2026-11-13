const assert = require("assert");

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

console.log("=== STARTING BUSINESS PROFILE PERSISTENCE TESTS ===");

// 1. Initial Profile
const initial = storage.getBusinessProfile();
assert(initial.name, "Should have default business name");
assert(initial.phone, "Should have default phone");
assert(initial.address, "Should have default address");
console.log(`✓ [PASS] Initial Business Profile loaded: ${initial.name}, ${initial.address}`);

// 2. Save Custom Profile with new Address & Phone
const customAddress = "Plot No. 45, Industrial Estate, Cuttack Road, Bhubaneswar 751010";
const customPhone = "+91 98610 99999 / +91 94370 55555";
const customGSTIN = "21ABCDE1234F1Z9";
const customEmail = "admin@pramodmaharaj.in";

const updated = storage.saveBusinessProfile({
  name: "THE PRAMOD MAHARAJ ENTERPRISES",
  address: customAddress,
  phone: customPhone,
  gstin: customGSTIN,
  email: customEmail
}, "Pramod Maharaj (Owner)");

assert(updated.address === customAddress, "Address should be updated");
assert(updated.phone === customPhone, "Phone should be updated");
assert(updated.gstin === customGSTIN, "GSTIN should be updated");
console.log("✓ [PASS] saveBusinessProfile returned updated profile data");

// 3. Verify Persistence on next read
const reloaded = storage.getBusinessProfile();
assert(reloaded.address === customAddress, "Reloaded address must match saved custom address");
assert(reloaded.phone === customPhone, "Reloaded phone must match saved custom phone");
assert(reloaded.gstin === customGSTIN, "Reloaded GSTIN must match saved custom GSTIN");
assert(reloaded.email === customEmail, "Reloaded email must match saved custom email");
console.log("✓ [PASS] Verified persistent storage: address and phone successfully retained!");

// 4. Verify Audit Log
const logs = storage.getAuditLogs();
const profileLog = logs.find(l => l.action === "UPDATE_BUSINESS_PROFILE");
assert(profileLog, "Audit log entry must be created for UPDATE_BUSINESS_PROFILE");
assert(profileLog.notes.includes(customPhone), "Audit log notes should include new phone");
console.log("✓ [PASS] Verified immutable audit trail recorded business profile change");

console.log("\n=== ALL 4/4 BUSINESS PROFILE TESTS PASSED! ===");

