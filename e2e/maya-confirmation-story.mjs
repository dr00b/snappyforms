// "Maya Requests Confirmation" — the presentation walkthrough, driven end to end
// through the real UI. Where demo-stories.mjs and shift-qr-story.mjs use
// throwaway guest identities, this one drives the *named seeded personas* the
// demo script calls for, in the order a presenter clicks them:
//
//   Maya (steps 1-8)     picks herself from "Explore the Demo", finds Northside
//                        Community Resource Center, requests verification for an
//                        activity, and signs out.
//   Northside (9-16)     signs in as the org admin, works the verification queue,
//                        confirms the record behind the acknowledgement checkbox,
//                        checks the Confirmed tab, and signs out.
//   Maya (17-21)         signs back in and finds the record under Confirmed.
//   The paper rail (22+) Maya fills a PA 1895 from that confirmed record, faxes
//                        it to her caseworker, and drafts the message asking for
//                        interoperability so the fax stops being necessary.
//
// Everything runs in ONE browser context, because the story is one presenter on
// one laptop signing in and out — sign-out actually has to clear the session for
// the next persona to be who they say they are, and this test would not catch
// that if each persona got a fresh context.
//
// A screenshot of every stage is written to SHOT_DIR (default ./screenshots).
//
//   BASE_URL=http://webapp:3000 node e2e/maya-confirmation-story.mjs        # docker/CI
//   BASE_URL=https://your-app.web.app node e2e/maya-confirmation-story.mjs  # live smoke
//
// Exits 0 if every check passes, 1 otherwise. Requires DEMO_MODE=true and
// NEXT_PUBLIC_DEMO_MODE=true (baked in at build) on the target, against a
// seeded database (npm run db:seed).

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

async function shot(page, name) {
  shotSeq += 1;
  const file = join(SHOT_DIR, `maya-${String(shotSeq).padStart(2, "0")}-${name}.png`);
  await page
    .screenshot({ path: file, fullPage: true })
    .catch((e) => console.log(`  (screenshot ${name} failed: ${e.message})`));
  console.log(`  📸 ${file}`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Maya is a SHARED seeded account with pre-existing records, and a presenter may
// have run this before against the same database. A unique title is what makes
// every assertion below refer to *this* run's record and no other.
const runId = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
const activityTitle = `Neighborhood meal delivery ${runId}`;
const titlePattern = new RegExp(escapeRegex(activityTitle), "i");

// The PA 1895 covers one Sunday–Saturday week and rejects records without a
// date, so the request has to carry one. Yesterday (UTC) is safely in the past
// and, being a single row, is trivially within one form week.
const activityDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const ACTIVITY_HOURS = "5";

/** "Explore the Demo" from the landing page — where every persona starts. */
async function exploreTheDemo(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  const explore = page.getByRole("link", { name: /Explore the Demo/i });
  await explore.waitFor({ timeout: NAV_TIMEOUT });
  await explore.click();
  await page.waitForURL(/\/login/, { timeout: NAV_TIMEOUT });
}

/** Pick a named seeded persona and land on their home screen. */
async function signInAs(page, personaPattern) {
  const persona = page.getByRole("button", { name: personaPattern });
  await persona.waitFor({ timeout: NAV_TIMEOUT });
  await persona.click();
  await page.waitForURL(/\/dashboard/, { timeout: NAV_TIMEOUT });
}

/** Settings → Sign out, and prove the session is actually gone. */
async function signOut(page, who) {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
  const signOutButton = page.getByRole("button", { name: /Sign out/i });
  await signOutButton.waitFor({ timeout: NAV_TIMEOUT });
  await signOutButton.click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: NAV_TIMEOUT });

  // The real proof of sign-out: a protected page must now bounce to /login.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
  check(`${who} is signed out (dashboard redirects to login)`, /\/login/.test(page.url()), page.url());
}

const browser = await chromium.launch();

try {
  // One presenter, one laptop, one browser — personas swap by signing in and out.
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT);

  // ---- Maya: steps 1-8 -----------------------------------------------------
  console.log("\nMaya — requests verification from Northside (steps 1-8)");

  // 1. Explore the demo.
  await exploreTheDemo(page);
  const mayaButton = page.getByRole("button", { name: /Maya Johnson/i });
  await mayaButton.waitFor({ timeout: NAV_TIMEOUT });
  check("1. 'Explore the Demo' leads to the persona picker", (await mayaButton.count()) > 0);
  await shot(page, "demo-persona-picker");

  // 2-3. Select Maya Johnson → her home screen.
  await signInAs(page, /Maya Johnson/i);
  const mayaHome = (await page.textContent("body")) ?? "";
  check("2-3. Maya Johnson lands on her home screen", mayaHome.includes("Maya Johnson"), page.url());
  check("3. home screen shows Maya's handle", mayaHome.includes("@maya-j"));
  await shot(page, "maya-home");

  // 4. Search for an organization (the alternative to scanning its QR — headless
  //    Chromium has no camera, and both routes land on the same org profile).
  const findOrg = page.getByRole("link", { name: /Find an organization/i });
  await findOrg.waitFor({ timeout: NAV_TIMEOUT });
  check("4. home screen offers 'Find an organization'", (await findOrg.count()) > 0);
  await findOrg.click();
  await page.waitForURL(/\/search/, { timeout: NAV_TIMEOUT });

  await page.getByPlaceholder(/Search handles, people, or organizations/i).fill("Northside");
  const orgResult = page.getByRole("link", { name: /Northside Community Resource Center/i });
  await orgResult.waitFor({ timeout: NAV_TIMEOUT });
  check("4. searching finds Northside Community Resource Center", (await orgResult.count()) > 0);
  await shot(page, "maya-search-northside");

  // 5. Select the organization.
  await orgResult.first().click();
  await page.waitForURL(/\/o\/northside-center/, { timeout: NAV_TIMEOUT });
  const orgBody = (await page.textContent("body")) ?? "";
  check("5. Northside's profile opens", orgBody.includes("Northside Community Resource Center"), page.url());
  await shot(page, "maya-org-profile");

  // 6. Request verification.
  const requestVerification = page.getByRole("link", { name: /Request verification/i });
  await requestVerification.waitFor({ timeout: NAV_TIMEOUT });
  check("6. the org profile offers 'Request verification'", (await requestVerification.count()) > 0);
  await requestVerification.click();
  await page.waitForURL(/\/activity\/new/, { timeout: NAV_TIMEOUT });

  // The org came through on the URL, so the form should already be scoped to it
  // rather than asking Maya to search for Northside a second time.
  const formBody = () => page.textContent("body").then((t) => t ?? "");
  check(
    "6. the request form is pre-scoped to Northside",
    (await formBody()).includes("Northside Community Resource Center"),
    page.url()
  );

  // 7. Complete the form and submit.
  await page.getByPlaceholder(/Weekend food pantry volunteer/i).fill(activityTitle);
  await page.locator('input[type="date"]').first().fill(activityDate);
  await page.locator('input[type="number"]').first().fill(ACTIVITY_HOURS);
  await shot(page, "maya-request-form");

  await page.getByRole("button", { name: /Submit request/i }).click();
  // /activity/new matches a naive /activity/[^/]+$ too — exclude it explicitly
  // or this resolves against the form's own URL before the redirect lands.
  await page.waitForURL(
    (u) => /\/activity\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"),
    { timeout: NAV_TIMEOUT }
  );
  const recordUrl = page.url();

  // The detail page fetches after mount, so wait for content before asserting.
  const recordHeading = page.getByRole("heading", { name: titlePattern });
  await recordHeading.waitFor({ timeout: NAV_TIMEOUT });
  check("7. the request is created and shown to Maya", (await recordHeading.count()) > 0, recordUrl);

  const awaiting = page.getByText(/awaiting organization/i).first();
  await awaiting.waitFor({ timeout: NAV_TIMEOUT });
  check("7. it starts out 'Awaiting organization'", (await awaiting.count()) > 0);
  await shot(page, "maya-request-submitted");

  // 8. Sign out.
  await signOut(page, "8. Maya");
  await shot(page, "maya-signed-out");

  // ---- Northside admin: steps 9-16 ----------------------------------------
  console.log("\nNorthside admin — confirms the record (steps 9-16)");

  // 9-10. Explore the demo → Northside Admin.
  await exploreTheDemo(page);
  await signInAs(page, /Northside Admin/i);
  const adminHome = (await page.textContent("body")) ?? "";
  check("9-10. Northside Admin lands on the org home screen", adminHome.includes("Northside Community Resource Center"), page.url());
  check("10. the admin is identified as an org admin", /ADMIN/.test(adminHome));
  await shot(page, "admin-home");

  // 11. Verification queue.
  const queueLink = page.getByRole("link", { name: /Verification queue/i });
  await queueLink.waitFor({ timeout: NAV_TIMEOUT });
  check("11. the home screen offers the verification queue", (await queueLink.count()) > 0);
  await queueLink.click();
  await page.waitForURL(/\/activity/, { timeout: NAV_TIMEOUT });
  await shot(page, "admin-queue");

  // 12. Open the record awaiting the organization — matched by this run's unique
  //     title, so a queue shared with other demo runs can't misdirect the click.
  const queuedRecord = page.getByRole("link", { name: titlePattern });
  await queuedRecord.waitFor({ timeout: NAV_TIMEOUT });
  check("12. Maya's request is waiting in the queue", (await queuedRecord.count()) > 0, activityTitle);
  await queuedRecord.first().click();
  await page.waitForURL(
    (u) => /\/activity\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"),
    { timeout: NAV_TIMEOUT }
  );

  // 13. Review the details, then open the confirm panel.
  await page.getByRole("heading", { name: titlePattern }).waitFor({ timeout: NAV_TIMEOUT });
  const reviewBody = (await page.textContent("body")) ?? "";
  check("13. the admin sees the hours Maya entered", reviewBody.includes(`${ACTIVITY_HOURS}`), reviewBody.slice(0, 200));
  check("13. the admin sees who the record belongs to", reviewBody.includes("Maya Johnson"));
  await shot(page, "admin-review-record");

  const confirmButtons = page.getByRole("button", { name: /^Confirm Record$/i });
  await confirmButtons.first().click();

  // 14. The acknowledgement gates the confirm — assert the gate, don't just tick it.
  const acknowledge = page.getByRole("checkbox");
  await acknowledge.waitFor({ timeout: NAV_TIMEOUT });
  const submitConfirm = confirmButtons.last();
  check("14. confirming is blocked until the box is checked", await submitConfirm.isDisabled());

  await acknowledge.check();
  check("14. checking the box enables 'Confirm Record'", await submitConfirm.isEnabled());
  await shot(page, "admin-confirm-panel");

  await submitConfirm.click();

  // The panel closes and the record reloads as Confirmed.
  const confirmedBadge = page.getByText(/^Confirmed$/i).first();
  await confirmedBadge.waitFor({ timeout: NAV_TIMEOUT });
  check("14. the record is now Confirmed", (await confirmedBadge.count()) > 0);
  await shot(page, "admin-record-confirmed");

  // 15. Back → Confirmed tab.
  await page.getByRole("link", { name: /Back/i }).first().click();
  await page.waitForURL(/\/activity$/, { timeout: NAV_TIMEOUT });
  await page.getByRole("tab", { name: /^Confirmed$/i }).click();

  const adminConfirmedEntry = page.getByRole("link", { name: titlePattern });
  await adminConfirmedEntry.waitFor({ timeout: NAV_TIMEOUT });
  check("15. the record appears on the org's Confirmed tab", (await adminConfirmedEntry.count()) > 0);
  await shot(page, "admin-confirmed-tab");

  // 16. Sign out.
  await signOut(page, "16. the Northside admin");

  // ---- Maya again: steps 17-21 --------------------------------------------
  console.log("\nMaya — sees the confirmed record (steps 17-21)");

  // 17-18. Explore the demo → Maya Johnson.
  await exploreTheDemo(page);
  await signInAs(page, /Maya Johnson/i);

  // 19. Activity.
  const activityLink = page.getByRole("link", { name: /Activity records/i });
  await activityLink.waitFor({ timeout: NAV_TIMEOUT });
  await activityLink.click();
  await page.waitForURL(/\/activity$/, { timeout: NAV_TIMEOUT });

  // Nothing should be waiting on Maya — the organization already acted.
  const needsActionBody = (await page.textContent("body")) ?? "";
  check(
    "19. the confirmed record is not sitting in Maya's 'Needs action'",
    !needsActionBody.includes(activityTitle)
  );

  // 20-21. Confirmed tab → the new record from Northside.
  await page.getByRole("tab", { name: /^Confirmed$/i }).click();
  const mayaConfirmedEntry = page.getByRole("link", { name: titlePattern });
  await mayaConfirmedEntry.waitFor({ timeout: NAV_TIMEOUT });
  check("20-21. Maya sees the record under Confirmed", (await mayaConfirmedEntry.count()) > 0);
  check(
    "21. it is attributed to Northside Community Resource Center",
    ((await mayaConfirmedEntry.first().textContent()) ?? "").includes("Northside Community Resource Center")
  );
  await shot(page, "maya-confirmed-tab");

  // ---- The paper rail: PA 1895, fax, advocacy ------------------------------
  console.log("\nMaya — turns the confirmed record into a PA 1895 and faxes it");

  await page.goto(`${BASE_URL}/forms`, { waitUntil: "networkidle" });
  await page.getByTestId("template-PA_1895").waitFor({ timeout: NAV_TIMEOUT });
  await page.getByTestId("choose-PA_1895").click();

  // Only this run's record — the PA 1895 covers a single Sunday–Saturday week,
  // and Maya's seeded history spans several.
  const recordOption = page.getByTestId("record-option").filter({ hasText: activityTitle });
  await recordOption.waitFor({ timeout: NAV_TIMEOUT });
  check("22. the confirmed record is offered as a PA 1895 row", (await recordOption.count()) > 0);
  await recordOption.getByRole("checkbox").check();
  await shot(page, "maya-pa1895-select");

  await page.getByTestId("generate-form").click();
  await page.getByTestId("form-ready").waitFor({ timeout: NAV_TIMEOUT });
  check("22. the PA 1895 is generated", (await page.getByTestId("download-form").count()) > 0);
  await shot(page, "maya-pa1895-ready");

  // 23. Fax it to the caseworker.
  await page.getByTestId("open-fax").click();
  const destination = page.getByTestId("fax-destination");
  await destination.waitFor({ timeout: NAV_TIMEOUT });
  const destinationText = (await destination.textContent()) ?? "";
  check(
    "23. the fax panel offers Maya's open case as a destination",
    /Demonstration County Assistance Office/i.test(destinationText),
    destinationText
  );
  check("23. the case number is masked in the destination list", /XXXX-\d{4}/.test(destinationText), destinationText);
  await shot(page, "maya-fax-panel");

  await page.getByTestId("send-fax").click();
  await page.getByTestId("fax-receipt").waitFor({ timeout: NAV_TIMEOUT });
  const confirmationNumber = ((await page.getByTestId("fax-confirmation").textContent()) ?? "").trim();
  check("23. the fax returns a confirmation number", /^FX-[A-Z2-9]{6}$/.test(confirmationNumber), confirmationNumber);

  const receiptText = (await page.getByTestId("fax-receipt").textContent()) ?? "";
  check("23. the receipt names the destination", /Demonstration County Assistance Office/i.test(receiptText));
  // The page count is the form's own length plus the cover sheet, so assert the
  // cover is counted rather than a total that moves when DHS revises the form.
  const pageCount = Number((receiptText.match(/(\d+) \(including cover sheet\)/) ?? [])[1]);
  check("23. the receipt counts the cover sheet on top of the form", pageCount >= 2, receiptText);
  check(
    "23. the receipt is honest that nothing was really sent",
    /Simulated transmission/i.test(receiptText)
  );
  await shot(page, "maya-fax-receipt");

  // What "went over the wire" must be a real, openable PDF — cover sheet + form.
  const faxHref = await page.getByTestId("download-fax").getAttribute("href");
  const faxResponse = await page.request.get(`${BASE_URL}${faxHref}`);
  const faxBody = await faxResponse.body();
  check("23. the transmitted bundle downloads", faxResponse.ok(), String(faxResponse.status()));
  check(
    "23. the bundle is a PDF",
    faxResponse.headers()["content-type"] === "application/pdf" && faxBody.subarray(0, 4).toString() === "%PDF",
    faxResponse.headers()["content-type"]
  );
  check("23. the bundle is larger than an empty page", faxBody.length > 1000, `${faxBody.length} bytes`);

  // 24. The advocacy ask that the fax sets up.
  console.log("\nMaya — asks for the interoperability that would delete the fax");
  await page.getByTestId("open-advocacy").click();
  const messageBody = page.getByTestId("advocacy-body");
  await messageBody.waitFor({ timeout: NAV_TIMEOUT });

  const draft = await messageBody.inputValue();
  check("24. the message is pre-drafted", draft.length > 200, `${draft.length} chars`);
  check("24. the draft names the interoperability ask", /interoperability/i.test(draft));
  check("24. the draft cites the fax Maya just had to send", /fax/i.test(draft));
  check("24. the draft keeps consent central", /consent/i.test(draft));
  check("24. the draft is signed by Maya, not a placeholder", /Maya Johnson/.test(draft), draft.slice(-120));

  await page.getByTestId("advocacy-zip").fill("17101");
  await shot(page, "maya-advocacy-draft");

  await page.getByTestId("send-advocacy").click();
  await page.getByTestId("advocacy-sent").waitFor({ timeout: NAV_TIMEOUT });
  const sentText = (await page.getByTestId("advocacy-sent").textContent()) ?? "";
  check("24. the message is saved", /Message drafted/i.test(sentText));
  check(
    "24. it is honest that nothing reached a congressional office",
    /not delivered to any congressional office/i.test(sentText),
    sentText
  );
  await shot(page, "maya-advocacy-saved");
} catch (err) {
  failed++;
  console.log(`  ✗ unexpected error — ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`Screenshots in ${SHOT_DIR}/`);
process.exit(failed === 0 ? 0 : 1);
