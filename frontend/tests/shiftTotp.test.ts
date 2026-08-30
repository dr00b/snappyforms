// Run with: npm run test:totp
//
// shiftTotp is pure, so this is where the time-dependent behaviour gets
// covered: the API-level test in shift-flow.mjs would have to sleep for a
// minute to see a code expire.

import assert from "node:assert/strict";
import {
  TOTP_DIGITS,
  TOTP_STEP_SECONDS,
  checkinCodeHash,
  codeForStep,
  currentCode,
  generateShiftSecret,
  stepForTime,
  verifyCode,
} from "../src/lib/shiftTotp";

const secret = generateShiftSecret();
const other = generateShiftSecret();
const now = 1_800_000_000_000; // fixed clock so every assertion is deterministic
const step = stepForTime(now);

let passed = 0;
function it(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("shiftTotp");

it("generates a 64-char hex secret", () => {
  assert.match(secret, /^[0-9a-f]{64}$/);
  assert.notEqual(secret, other);
});

it("produces zero-padded codes of the configured length", () => {
  // Many steps, so a code that would be short without padding gets exercised.
  for (let i = 0; i < 500; i++) {
    const code = codeForStep(secret, step + i);
    assert.equal(code.length, TOTP_DIGITS);
    assert.match(code, /^\d+$/);
  }
});

it("is deterministic per (secret, step) and differs across both", () => {
  assert.equal(codeForStep(secret, step), codeForStep(secret, step));
  assert.notEqual(codeForStep(secret, step), codeForStep(secret, step + 1));
  assert.notEqual(codeForStep(secret, step), codeForStep(other, step));
});

it("reports an expiry at the end of the current step", () => {
  const { code, step: s, expiresAtMs } = currentCode(secret, now);
  assert.equal(s, step);
  assert.equal(code, codeForStep(secret, step));
  assert.ok(expiresAtMs > now);
  assert.ok(expiresAtMs - now <= TOTP_STEP_SECONDS * 1000);
});

it("accepts the current code and the neighbouring steps", () => {
  for (const offset of [-1, 0, 1]) {
    const result = verifyCode(secret, codeForStep(secret, step + offset), now);
    assert.equal(result.ok, true, `offset ${offset} should verify`);
    assert.equal(result.ok && result.matchedStep, step + offset);
  }
});

it("rejects codes two steps out (a stale QR)", () => {
  for (const offset of [-2, 2, -10, 120]) {
    assert.equal(verifyCode(secret, codeForStep(secret, step + offset), now).ok, false);
  }
});

it("rejects a code minted from a different shift's secret", () => {
  assert.equal(verifyCode(secret, codeForStep(other, step), now).ok, false);
});

it("rejects malformed input without throwing", () => {
  for (const bad of ["", "1234", "abcdefgh", "123456789", "1234567 "]) {
    assert.equal(verifyCode(secret, bad, now).ok, false);
  }
});

it("hashes a check-in distinctly per shift, step, and code", () => {
  const base = checkinCodeHash("opp_1", step, "12345678");
  assert.match(base, /^[0-9a-f]{64}$/);
  assert.equal(base, checkinCodeHash("opp_1", step, "12345678"));
  assert.notEqual(base, checkinCodeHash("opp_2", step, "12345678"));
  assert.notEqual(base, checkinCodeHash("opp_1", step + 1, "12345678"));
  assert.notEqual(base, checkinCodeHash("opp_1", step, "87654321"));
});

console.log(`\n${passed} passed`);
