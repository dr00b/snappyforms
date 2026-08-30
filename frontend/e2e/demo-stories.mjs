// End-to-end tests that codify the two live-demo user stories, driving the real
// UI in a real browser. Two isolated browser contexts play two different people
// who connect by QR — proving the multi-user model works (neither shares an
// account; they hand a shift to each other by scanning a code).
//
//   Story 1 — Beneficiary participant: joins as a guest participant and logs a
//             shift at the shared demo org ("Awaiting organization").
//   Story 2 — Authorizer: joins as a guest verifier, SCANS the participant's QR
//             (headless Chromium has no camera, so we use the page's built-in
//             "enter a handle" fallback — the same resolver a scan hits), opens
//             their profile, and confirms the shift. The participant then sees
//             it "Confirmed".
//
// A screenshot of every stage is written to SHOT_DIR (default ./screenshots) so
// the run doubles as a visual walkthrough of the demo.
//
// Runs against any deployment — the containerized stack or the live hosted site:
//
//   BASE_URL=http://webapp:3000 node e2e/demo-stories.mjs        # docker/CI
//   BASE_URL=https://your-app.web.app node e2e/demo-stories.mjs  # live smoke
//
// Exits 0 if every check passes, 1 otherwise. Requires DEMO_MODE=true and
// NEXT_PUBLIC_DEMO_MODE=true (baked in at build) on the target.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = process.env.SHOT_DIR ?? "screenshots";
const NAV_TIMEOUT = 20000;

mkdirSync(SHOT_DIR, { recursive: true });

let passed = 0;
let failed = 0;
let shotSeq = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Save a full-page screenshot for this stage, numbered in demo order. */
async function shot(page, name) {
  shotSeq += 1;
  const file = join(SHOT_DIR, `${String(shotSeq).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch((e) => console.log(`  (screenshot ${name} failed: ${e.message})`));
  console.log(`  📸 ${file}`);
}

// A unique title so the authorizer confirms exactly this shift, even if other
// attendees' records share the queue — this is the concurrency proof.
const shiftTitle = `Community garden shift ${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

const browser = await chromium.launch();

try {
  // ---- Story 1: beneficiary participant logs a shift ----------------------
  console.log("\nStory 1 — beneficiary participant logs a shift");
  const participant = await browser.newContext();
  const pPage = await participant.newPage();
  pPage.setDefaultTimeout(NAV_TIMEOUT);

  await pPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  const joinAsParticipant = pPage.getByRole("button", { name: /Join as a participant/i });
  await joinAsParticipant.waitFor({ timeout: 15000 });
  check("login page offers 'Join as a participant'", (await joinAsParticipant.count()) > 0);
  await shot(pPage, "participant-login");

  // Capture the guest's handle from the join response so the authorizer can
  // "scan" it later.
  const [joinResp] = await Promise.all([
    pPage.waitForResponse((r) => r.url().includes("/api/auth/demo-join") && r.request().method() === "POST"),
    joinAsParticipant.click(),
  ]);
  const participantHandle = (await joinResp.json()).handle;
  check("participant is provisioned a unique guest handle", Boolean(participantHandle), String(participantHandle));

  // Ephemeral participant is dropped on the pre-scoped shift form for the demo org.
  await pPage.waitForURL(/\/activity\/new/, { timeout: NAV_TIMEOUT });
  const titleInput = pPage.getByPlaceholder(/Weekend food pantry volunteer/i);
  await titleInput.waitFor();
  await titleInput.fill(shiftTitle);
  // The form's <label>s aren't associated with inputs, so target the only
  // visible number field (Total hours). Category/paid/location default sensibly.
  await pPage.locator('input[type="number"]').first().fill("4");
  await shot(pPage, "participant-log-shift");
  await pPage.getByRole("button", { name: /Submit request/i }).click();

  // Wait for the post-submit navigation to the record page — note /activity/new
  // itself matches a naive /activity/[^/]+ regex, so exclude it explicitly.
  await pPage.waitForURL((u) => /\/activity\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"), {
    timeout: NAV_TIMEOUT,
  });
  // The record page is a client component that fetches after mount ("Loading..."),
  // so wait for the actual content before asserting.
  const shownTitle = pPage.getByText(shiftTitle, { exact: false }).first();
  await shownTitle.waitFor({ timeout: NAV_TIMEOUT }).catch(() => {});
  check("shift is created and shown to the participant", (await shownTitle.count()) > 0, pPage.url());

  const awaiting = pPage.getByText(/awaiting organization/i).first();
  await awaiting.waitFor({ timeout: NAV_TIMEOUT }).catch(() => {});
  check("shift starts 'Awaiting organization'", (await awaiting.count()) > 0);
  await shot(pPage, "participant-shift-awaiting");

  // ---- Story 2: authorizer scans the participant's QR and confirms --------
  console.log("\nStory 2 — authorizer scans the QR and authorizes the shift");
  const authorizer = await browser.newContext(); // separate person, separate session
  const aPage = await authorizer.newPage();
  aPage.setDefaultTimeout(NAV_TIMEOUT);

  await aPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  const joinAsAuthorizer = aPage.getByRole("button", { name: /Join as an authorizer/i });
  await joinAsAuthorizer.waitFor({ timeout: 15000 });
  check("login page offers 'Join as an authorizer'", (await joinAsAuthorizer.count()) > 0);
  await shot(aPage, "authorizer-login");

  // Authorizer lands on the QR scanner (Scan Code tab).
  await joinAsAuthorizer.click();
  await aPage.waitForURL(/\/qr/, { timeout: NAV_TIMEOUT });
  check("authorizer lands on the QR scanner", /\/qr/.test(aPage.url()));
  await shot(aPage, "authorizer-scanner");

  // "Scan" the participant: the Scan Code tab's manual fallback hits the exact
  // same resolver a camera scan does, and works headlessly.
  const handleInput = aPage.getByPlaceholder("@handle");
  await handleInput.waitFor({ timeout: NAV_TIMEOUT });
  await handleInput.fill(participantHandle);
  await aPage.getByRole("button", { name: /^Go$/ }).click();

  // Resolves to the participant's profile, which surfaces the shift they logged.
  await aPage.waitForURL(new RegExp(`/u/${participantHandle}`), { timeout: NAV_TIMEOUT });
  const reviewLink = aPage.getByRole("link", { name: new RegExp(shiftTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
  await reviewLink.waitFor({ timeout: NAV_TIMEOUT });
  check("scanned participant's pending shift appears on their profile", (await reviewLink.count()) > 0);
  await shot(aPage, "authorizer-scanned-profile");

  await reviewLink.first().click();
  await aPage.waitForURL(/\/activity\/[^/]+$/, { timeout: NAV_TIMEOUT });

  // Confirm flow: open the confirm panel, acknowledge, confirm.
  await aPage.getByRole("button", { name: /Confirm Record/i }).first().click();
  await aPage.getByRole("checkbox").check();
  await shot(aPage, "authorizer-confirm-panel");
  await aPage.getByRole("button", { name: /Confirm Record/i }).last().click();

  await aPage.getByText(/confirmed/i).first().waitFor({ timeout: NAV_TIMEOUT });
  const aBody = (await aPage.textContent("body")) ?? "";
  check("authorizer confirms the scanned shift → 'Confirmed'", /confirmed/i.test(aBody));
  await shot(aPage, "authorizer-confirmed");

  // ---- The handshake: participant sees their shift confirmed --------------
  console.log("\nHandshake — participant sees the confirmation");
  await pPage.reload({ waitUntil: "networkidle" });
  const pBodyAfter = (await pPage.textContent("body")) ?? "";
  check("participant now sees their shift 'Confirmed'", /confirmed/i.test(pBodyAfter), pBodyAfter.slice(0, 200));
  await shot(pPage, "participant-sees-confirmed");
} catch (err) {
  failed++;
  console.log(`  ✗ unexpected error — ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`Screenshots in ${SHOT_DIR}/`);
process.exit(failed === 0 ? 0 : 1);
