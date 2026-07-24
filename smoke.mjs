// VERWOVO smoke test — verifies the app runs end-to-end against the remote
// Postgres DB. Browserless (uses Node's fetch) so it runs in CI/WSL without
// browser system libraries. Assumes the app is serving at BASE_URL (default
// :3000) with DEMO_MODE=true and a seeded DB (npm run db:seed).
//
//   node smoke.mjs
//
// Exits 0 if every check passes, 1 otherwise.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;
let cookie = ""; // session cookie captured at login, replayed on later requests

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Strip attributes (Path, HttpOnly, ...) and keep just the name=value pairs.
function collectCookies(res) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const pairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
  if (pairs.length) cookie = pairs.join("; ");
}

function authHeaders(extra = {}) {
  return cookie ? { Cookie: cookie, ...extra } : extra;
}

try {
  // 1. App is up: login page renders and advertises the demo login.
  const loginPage = await fetch(`${BASE_URL}/login`);
  const loginHtml = await loginPage.text();
  check("GET /login returns 200", loginPage.ok, `status ${loginPage.status}`);
  check("login page renders sign-in form", /Sign in/i.test(loginHtml));

  // 2. Demo login: real DB round-trip — reads the seeded user and writes a
  //    Session row to Postgres, returning a session cookie.
  const login = await fetch(`${BASE_URL}/api/auth/demo-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed: "maya" }),
  });
  collectCookies(login);
  const loginJson = await login.json().catch(() => ({}));
  check("POST /api/auth/demo-login returns 200", login.ok, `status ${login.status}`);
  check("login set a session cookie (Session persisted to Postgres)", cookie.length > 0);
  check("login response ok:true", loginJson.ok === true, JSON.stringify(loginJson));

  // 3. Authenticated dashboard renders the seeded participant's data.
  const dash = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders() });
  const dashHtml = await dash.text();
  check("GET /dashboard (authed) returns 200", dash.ok, `status ${dash.status}`);
  check("dashboard renders participant content", /Maya/i.test(dashHtml));

  // 4. Search API — exercises the case-insensitive `contains` fix. An upper-cased
  //    needle only matches on Postgres via mode:"insensitive".
  const search = await fetch(`${BASE_URL}/api/search?q=NORTHSIDE`, { headers: authHeaders() });
  check("GET /api/search returns 200", search.ok, `status ${search.status}`);
  const searchJson = await search.json().catch(() => ({}));
  const foundOrg = (searchJson.results ?? []).some(
    (r) => r.type === "organization" && /northside/i.test(r.displayName ?? ""),
  );
  check("case-insensitive search 'NORTHSIDE' → Northside org", foundOrg,
    JSON.stringify(searchJson.results ?? []));

  // 5. Opportunities API returns the expected shape.
  const opp = await fetch(`${BASE_URL}/api/opportunities`, { headers: authHeaders() });
  check("GET /api/opportunities returns 200", opp.ok, `status ${opp.status}`);
  const oppJson = await opp.json().catch(() => ({}));
  check("opportunities response has an array", Array.isArray(oppJson.opportunities));

  // 6. Public profile page (reads Handle + ParticipantProfile from Postgres).
  const profile = await fetch(`${BASE_URL}/u/maya-j`);
  const profileHtml = await profile.text();
  check("GET /u/maya-j returns 200", profile.ok, `status ${profile.status}`);
  check("public profile renders handle", /maya-j|Maya/i.test(profileHtml));
} catch (err) {
  failed++;
  console.log(`  ✗ unexpected error — ${err.message}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
