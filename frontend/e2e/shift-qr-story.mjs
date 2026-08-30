// End-to-end test for the low-touch volunteer story, driven through the real
// UI in a real browser. Where demo-stories.mjs covers the high-touch path (the
// participant logs a shift and an authorizer approves it afterwards), this
// covers the inverse: the organization hosts a shift, and the volunteer's scan
// IS the approval — nothing to chase afterwards.
//
//   Story — Host: joins as a guest verifier via "Host a shift", starts a shift,
//           and puts a rotating QR on screen.
//   Story — Volunteers: two separate guests open the QR's target (headless
//           Chromium has no camera, so we follow the page's own "Can't scan?
//           Open this link" fallback — the same URL the camera decodes), and
//           each confirms. One displayed code signs off a whole group.
//
// A screenshot of every stage is written to SHOT_DIR (default ./screenshots).
//
//   BASE_URL=http://webapp:3000 node e2e/shift-qr-story.mjs        # docker/CI
//   BASE_URL=https://your-app.web.app node e2e/shift-qr-story.mjs  # live smoke
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

/**
 * The QR encodes an absolute URL built from the app's own APP_BASE_URL, which
 * is the address a volunteer's phone would use — not necessarily the one this
 * test container can reach (in the Docker stack the app calls itself
 * "localhost:3000" while the tests reach it at "webapp:3000"). The scan is the
 * path and code; re-point the origin at whatever host we can actually reach.
 */
function reachable(scannedUrl) {
  const url = new URL(scannedUrl);
  return `${BASE_URL}${url.pathname}${url.search}`;
}

async function shot(page, name) {
  shotSeq += 1;
  const file = join(SHOT_DIR, `shift-${String(shotSeq).padStart(2, "0")}-${name}.png`);
  await page
    .screenshot({ path: file, fullPage: true })
    .catch((e) => console.log(`  (screenshot ${name} failed: ${e.message})`));
  console.log(`  📸 ${file}`);
}

// A unique title so these assertions can't match another attendee's shift.
const shiftTitle = `Food pantry shift ${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

const browser = await chromium.launch();

try {
  // ---- The host puts a rotating QR on screen ------------------------------
  console.log("\nHost — starts a shift and shows its rotating QR");
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  hostPage.setDefaultTimeout(NAV_TIMEOUT);

  await hostPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  const hostShift = hostPage.getByTestId("join-host-shift");
  await hostShift.waitFor({ timeout: 15000 });
  check("login page offers 'Host a shift'", (await hostShift.count()) > 0);
  await shot(hostPage, "host-login");

  await hostShift.click();
  await hostPage.waitForURL(/\/shifts\/new/, { timeout: NAV_TIMEOUT });
  check("host lands on the shift form", /\/shifts\/new/.test(hostPage.url()));

  await hostPage.getByRole("textbox").first().fill(shiftTitle);
  await shot(hostPage, "host-shift-form");
  await hostPage.getByTestId("start-shift").click();

  // /shifts/new matches a naive /shifts/[^/]+$ too, so exclude it explicitly or
  // this resolves before the redirect and captures the form's URL.
  await hostPage.waitForURL(
    (u) => /\/shifts\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"),
    { timeout: NAV_TIMEOUT }
  );
  const shiftUrl = hostPage.url();

  const qr = hostPage.getByTestId("shift-qr");
  await qr.waitFor({ timeout: NAV_TIMEOUT });
  check("host sees a QR code for the shift", (await qr.count()) > 0);

  const shownCode = (await hostPage.getByTestId("shift-code").textContent()) ?? "";
  check("host sees the 8-digit code alongside it", /^\d{8}$/.test(shownCode.trim()), shownCode);

  const countdown = (await hostPage.getByTestId("shift-countdown").textContent()) ?? "";
  check("host sees how long the code lasts", /refreshes in \d+s/i.test(countdown), countdown);
  await shot(hostPage, "host-rotating-qr");

  // The link the QR encodes — following it is exactly what a camera scan does.
  const scanUrl = await hostPage.getByTestId("shift-open-link").getAttribute("href");
  check("the QR encodes a shift check-in link", /\/shift\/[^/]+\?c=\d{8}$/.test(scanUrl ?? ""), String(scanUrl));
  check("the link carries the code on display", String(scanUrl).endsWith(shownCode.trim()), String(scanUrl));

  // ---- A volunteer scans it ------------------------------------------------
  console.log("\nVolunteer — scans the QR and is signed off on the spot");
  const volunteerContext = await browser.newContext(); // separate person, separate session
  const volPage = await volunteerContext.newPage();
  volPage.setDefaultTimeout(NAV_TIMEOUT);

  await volPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await volPage.getByRole("button", { name: /Join as a participant/i }).click();
  await volPage.waitForURL(/\/activity\/new/, { timeout: NAV_TIMEOUT });
  check("volunteer has their own guest identity", /\/activity\/new/.test(volPage.url()));

  // Scanning: open what the QR points at.
  await volPage.goto(reachable(scanUrl), { waitUntil: "networkidle" });
  const confirmButton = volPage.getByTestId("confirm-shift");
  await confirmButton.waitFor({ timeout: NAV_TIMEOUT });
  const previewBody = (await volPage.textContent("body")) ?? "";
  check("volunteer sees the shift they are confirming", previewBody.includes(shiftTitle));
  check("volunteer is told why this counts as a signature", /only valid for a few seconds/i.test(previewBody));
  await shot(volPage, "volunteer-confirm-prompt");

  await confirmButton.click();
  const confirmedNote = volPage.getByTestId("shift-confirmed");
  await confirmedNote.waitFor({ timeout: NAV_TIMEOUT });
  const confirmedText = (await confirmedNote.textContent()) ?? "";
  check("the scan alone signs the record", /signed by the organization/i.test(confirmedText), confirmedText);
  await shot(volPage, "volunteer-confirmed");

  // The record is genuinely confirmed on the volunteer's own activity list.
  // "Needs action" is the default tab and should be empty — nothing to chase is
  // the whole point — so the shift has to be under "Confirmed".
  await volPage.goto(`${BASE_URL}/activity`, { waitUntil: "networkidle" });
  const needsActionBody = (await volPage.textContent("body")) ?? "";
  check(
    "nothing is waiting on the volunteer to chase",
    !needsActionBody.includes(shiftTitle),
    "shift showed up under Needs action"
  );

  await volPage.getByRole("tab", { name: /^Confirmed$/i }).click();
  const listedShift = volPage.getByText(shiftTitle, { exact: false }).first();
  await listedShift.waitFor({ timeout: NAV_TIMEOUT }).catch(() => {});
  check("shift is listed under Confirmed", (await listedShift.count()) > 0);
  await shot(volPage, "volunteer-activity-confirmed");

  // ---- A second volunteer uses the same displayed code ---------------------
  console.log("\nSecond volunteer — the same QR serves the whole group");
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  secondPage.setDefaultTimeout(NAV_TIMEOUT);

  await secondPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await secondPage.getByRole("button", { name: /Join as a participant/i }).click();
  await secondPage.waitForURL(/\/activity\/new/, { timeout: NAV_TIMEOUT });

  // Re-read the link in case the code rotated while the first volunteer worked.
  // The host view polls, so wait on the element rather than network idle.
  await hostPage.reload({ waitUntil: "domcontentloaded" });
  await hostPage.getByTestId("shift-open-link").waitFor({ timeout: NAV_TIMEOUT });
  const freshScanUrl = await hostPage.getByTestId("shift-open-link").getAttribute("href");

  await secondPage.goto(reachable(freshScanUrl), { waitUntil: "networkidle" });
  await secondPage.getByTestId("confirm-shift").click();
  await secondPage.getByTestId("shift-confirmed").waitFor({ timeout: NAV_TIMEOUT });
  check("a second volunteer is signed off from the same shift", true);
  await shot(secondPage, "second-volunteer-confirmed");

  // ---- The host watches them arrive ---------------------------------------
  console.log("\nHost — sees who has signed in");
  await hostPage.goto(shiftUrl, { waitUntil: "domcontentloaded" });
  const countLabel = hostPage.getByTestId("checkin-count");
  await countLabel.waitFor({ timeout: NAV_TIMEOUT }).catch(async () => {
    await shot(hostPage, "host-checkins-missing");
    console.log(`  (host page showed: ${((await hostPage.textContent("body")) ?? "").slice(0, 300)})`);
  });
  await hostPage
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="checkin-count"]');
        return el && Number((el.textContent ?? "").trim().split(" ")[0]) >= 2;
      },
      { timeout: NAV_TIMEOUT }
    )
    .catch(() => {});
  const countText = (await countLabel.textContent()) ?? "";
  check("host sees both volunteers signed in", /^[2-9]\d* signed in/.test(countText.trim()), countText);
  await shot(hostPage, "host-checkins");
} catch (err) {
  failed++;
  console.log(`  ✗ unexpected error — ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`Screenshots in ${SHOT_DIR}/`);
process.exit(failed === 0 ? 0 : 1);
