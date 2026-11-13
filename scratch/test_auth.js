/**
 * Automated Verification Suite for Role-Based Login & Security
 * Tests:
 * 1. Owner successfully logs in through Owner Login (/owner-login).
 * 2. Manager successfully logs in through Manager Login (/manager-login).
 * 3. Admin successfully logs in through Admin Login (/admin-login).
 * 4. Manager attempting Owner Login is rejected (Cross-Role Prevention).
 * 5. Owner attempting Admin Login is rejected (Cross-Role Prevention).
 * 6. Admin attempting Manager Login is rejected (Cross-Role Prevention).
 * 7. Invalid password rejected.
 * 8. Invalid email/username rejected.
 * 9. Password recovery functions.
 * 10. Audit logs created for logins, logouts, and password recovery.
 * 11. Sign out clears session.
 */

// Mock browser global environment for Node
if (typeof window === "undefined") {
  const cookieJar = {};
  global.document = {
    get cookie() {
      return Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; ");
    },
    set cookie(val) {
      const parts = val.split(";")[0].split("=");
      const key = parts[0].trim();
      const value = decodeURIComponent(parts.slice(1).join("="));
      if (val.includes("expires=Thu, 01 Jan 1970")) {
        delete cookieJar[key];
      } else {
        cookieJar[key] = value;
      }
    }
  };
  const storage = {};
  global.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
  global.window = {
    dispatchEvent: () => {},
    location: { origin: "http://localhost:3000" }
  };
}

const path = require("path");
const jiti = require("jiti")(process.cwd());

const {
  signInWithPortal,
  signOutUser,
  requestPasswordReset,
  getClientSession,
  ENTERPRISE_USERS,
  AUTH_COOKIE_NAME
} = jiti("./src/lib/auth.ts");

const { getAuditLogs, getStoredUserRole } = jiti("./src/lib/storage.ts");

async function runAuthTests() {
  console.log("=== STARTING AUTHENTICATION & RBAC SECURITY TESTS ===\n");
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

  // SCENARIO 1: Owner successfully logs in through Owner Login
  const ownerRes = await signInWithPortal({
    emailOrUsername: "owner@pramodmaharaj.in",
    password: "Password@123",
    portalRole: "owner",
    rememberMe: true
  });
  assert(ownerRes.success === true, "Scenario 1: Owner logs in successfully through Owner Login");
  assert(ownerRes.user.role === "owner", "Scenario 1: User role is verified as 'owner'");
  assert(getStoredUserRole() === "owner", "Scenario 1: Storage role synchronized to 'owner'");
  assert(getClientSession() !== null, "Scenario 1: Active session cookie is established");

  // SCENARIO 2: Manager successfully logs in through Manager Login
  const managerRes = await signInWithPortal({
    emailOrUsername: "manager@pramodmaharaj.in",
    password: "Password@123",
    portalRole: "manager",
    rememberMe: false
  });
  assert(managerRes.success === true, "Scenario 2: Manager logs in successfully through Manager Login");
  assert(managerRes.user.role === "manager", "Scenario 2: User role is verified as 'manager'");
  assert(getStoredUserRole() === "manager", "Scenario 2: Storage role synchronized to 'manager'");

  // SCENARIO 3: Admin successfully logs in through Admin Login
  const adminRes = await signInWithPortal({
    emailOrUsername: "admin@pramodmaharaj.in",
    password: "Password@123",
    portalRole: "admin",
    rememberMe: true
  });
  assert(adminRes.success === true, "Scenario 3: Admin logs in successfully through Admin Login");
  assert(adminRes.user.role === "admin", "Scenario 3: User role is verified as 'admin'");
  assert(adminRes.redirectTo === "/settings", "Scenario 3: Admin directed to Settings / Admin Dashboard");

  // SCENARIO 4: Manager attempting Owner Login is REJECTED
  const managerAtOwnerRes = await signInWithPortal({
    emailOrUsername: "manager@pramodmaharaj.in",
    password: "Password@123",
    portalRole: "owner"
  });
  assert(managerAtOwnerRes.success === false, "Scenario 4: Manager attempting Owner Login is strictly rejected");
  assert(managerAtOwnerRes.error.includes("Access Denied"), "Scenario 4: Clear Access Denied error returned");
  assert(managerAtOwnerRes.error.includes("Manager"), "Scenario 4: Error informs user of their actual 'Manager' role");

  // SCENARIO 5: Owner attempting Admin Login is REJECTED
  const ownerAtAdminRes = await signInWithPortal({
    emailOrUsername: "owner@pramodmaharaj.in",
    password: "Password@123",
    portalRole: "admin"
  });
  assert(ownerAtAdminRes.success === false, "Scenario 5: Owner attempting Admin Login is strictly rejected");
  assert(ownerAtAdminRes.error.includes("Access Denied"), "Scenario 5: Clear Access Denied error returned");
  assert(ownerAtAdminRes.error.includes("Owner"), "Scenario 5: Error informs user of their actual 'Owner' role");

  // SCENARIO 6: Admin attempting Manager Login is REJECTED
  const adminAtManagerRes = await signInWithPortal({
    emailOrUsername: "admin@pramodmaharaj.in",
    password: "Password@123",
    portalRole: "manager"
  });
  assert(adminAtManagerRes.success === false, "Scenario 6: Admin attempting Manager Login is strictly rejected");
  assert(adminAtManagerRes.error.includes("Access Denied"), "Scenario 6: Clear Access Denied error returned");

  // SCENARIO 7: Invalid password rejected
  const badPasswordRes = await signInWithPortal({
    emailOrUsername: "owner@pramodmaharaj.in",
    password: "WrongPassword999",
    portalRole: "owner"
  });
  assert(badPasswordRes.success === false, "Scenario 7: Invalid password is rejected");
  assert(badPasswordRes.error.includes("Invalid password"), "Scenario 7: Descriptive error message returned");

  // SCENARIO 8: Invalid email / unknown user rejected
  const unknownUserRes = await signInWithPortal({
    emailOrUsername: "intruder@unknown.com",
    password: "Password@123",
    portalRole: "owner"
  });
  assert(unknownUserRes.success === false, "Scenario 8: Unknown user identity is rejected");

  // SCENARIO 9: Password recovery works
  const resetRes = await requestPasswordReset("owner@pramodmaharaj.in");
  assert(resetRes.success === true, "Scenario 9: Password reset request accepted for valid account");
  assert(resetRes.message.includes("sent to owner@pramodmaharaj.in"), "Scenario 9: Confirmation message returned");

  // SCENARIO 10: Sign out clears session
  await signOutUser();
  const sessionAfterSignOut = getClientSession();
  assert(sessionAfterSignOut === null, "Scenario 10: Sign out completely clears active session cookie");

  // SCENARIO 11: Audit Trail Verification
  const logs = getAuditLogs();
  const loginLogs = logs.filter(l => l.action === "USER_LOGIN");
  const logoutLogs = logs.filter(l => l.action === "USER_LOGOUT");
  const resetLogs = logs.filter(l => l.action === "PASSWORD_RESET_REQUEST");

  assert(loginLogs.length >= 3, "Scenario 11: Audit log captured all authentications");
  assert(logoutLogs.length >= 1, "Scenario 11: Audit log captured sign out event");
  assert(resetLogs.length >= 1, "Scenario 11: Audit log captured password recovery attempt");

  console.log(`\n=== ALL ${passed}/${total} AUTHENTICATION & SECURITY TESTS PASSED! ===`);
}

runAuthTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

