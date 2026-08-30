// SnappyForms browser smoke test (Playwright + real Chromium). Designed to run in the
// official Playwright container (see docker/Dockerfile.pw), which carries every
// browser system library — so nothing needs installing on the host.
//
// Drives the actual UI: clicks the client-rendered demo-login button, walks to the
// dashboard, and exercises the Postgres-backed search/opportunities/profile flows.
//
//   BASE_URL=http://app:3000 node pw-smoke.mjs
//
// Exits 0 if every check passes, 1 otherwise.

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newContext().then((c) => c.newPage());

try {
  // 1. Login page renders the client-side demo-login buttons (needs a real browser
  //    + hydration — this is exactly what the browserless test can't verify).
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  const demoBtn = page.getByRole("button", { name: /Maya Johnson/ });
  await demoBtn.waitFor({ timeout: 15000 });
  check("demo-login button renders (client component hydrated)", await demoBtn.count() > 0);

  // 2. Clicking it logs in (writes a Session row to Postgres) and routes to the dashboard.
  await demoBtn.first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  check("demo login → /dashboard (session persisted to Postgres)", /\/dashboard/.test(page.url()));

  // 3. Dashboard shows the seeded participant's data.
  const dashText = (await page.textContent("body")) ?? "";
  check("dashboard renders participant content", /Maya/i.test(dashText));

  // 4. Search API via the authenticated browser context — verifies the case-insensitive
  //    `contains` fix (upper-cased needle only matches on Postgres via mode:insensitive).
  const searchRes = await page.request.get(`${BASE_URL}/api/search?q=NORTHSIDE`);
  check("GET /api/search returns 200", searchRes.ok(), `status ${searchRes.status()}`);
  const searchJson = await searchRes.json().catch(() => ({}));
  const foundOrg = (searchJson.results ?? []).some(
    (r) => r.type === "organization" && /northside/i.test(r.displayName ?? ""),
  );
  check("case-insensitive search 'NORTHSIDE' → Northside org", foundOrg,
    JSON.stringify(searchJson.results ?? []));

  // 5. Opportunities API returns the expected shape.
  const oppRes = await page.request.get(`${BASE_URL}/api/opportunities`);
  check("GET /api/opportunities returns 200", oppRes.ok(), `status ${oppRes.status()}`);
  const oppJson = await oppRes.json().catch(() => ({}));
  check("opportunities response has an array", Array.isArray(oppJson.opportunities));

  // 6. A public profile page renders (reads Handle + ParticipantProfile from Postgres).
  const profile = await page.goto(`${BASE_URL}/u/maya-j`, { waitUntil: "networkidle" });
  check("public profile /u/maya-j returns 200", profile?.ok() ?? false, `status ${profile?.status()}`);
} catch (err) {
  failed++;
  console.log(`  ✗ unexpected error — ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
