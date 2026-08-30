// End-to-end API test for the rotating shift QR workflow: an organization
// representative hosts a shift, a volunteer scans the QR the host is showing,
// and that scan alone produces a confirmed, signed activity record which fills
// the official PA 1895 form.
//
// Browserless, like smoke.mjs, but it drives two identities at once, so it
// keeps a cookie jar per actor instead of one module-level cookie. Assumes the
// app is serving at BASE_URL (default :3000) with DEMO_MODE=true and a
// migrated DB.
//
//   node shift-flow.mjs
//
// Exits 0 if every check passes, 1 otherwise.

import { PDFDocument } from "pdf-lib";

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

/** One actor's session: its own cookie jar, so host and volunteer never collide. */
function actor(name) {
  let cookie = "";
  return {
    name,
    async request(path, init = {}) {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
      });
      const pairs = (res.headers.getSetCookie?.() ?? [])
        .map((c) => c.split(";")[0])
        .filter(Boolean);
      if (pairs.length) cookie = pairs.join("; ");
      return res;
    },
    async json(path, init) {
      const res = await this.request(path, init);
      return { res, body: await res.json().catch(() => ({})) };
    },
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

/** The Saturday closing the week that contains `date`, in UTC — mirrors pa1895.ts. */
function expectedWeekEnding(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${d.getUTCFullYear()}`;
}

try {
  const host = actor("host");
  const volunteer = actor("volunteer");

  // 1. A representative joins the demo org and opens the host-a-shift flow.
  const { res: joinRes, body: join } = await host.json("/api/auth/demo-join", {
    method: "POST",
    body: JSON.stringify({ role: "authorizer", flow: "host-shift" }),
  });
  check("host joins the demo organization", joinRes.ok, `status ${joinRes.status}`);
  check("join returns the organization to host under", Boolean(join.organizationId));
  check(
    "host-shift flow redirects to the shift form",
    String(join.redirect ?? "").includes("/shifts/new"),
    join.redirect
  );

  // 2. The representative starts a shift. Three hours, community service —
  //    exactly what will land on the PA 1895 row.
  const { res: shiftRes, body: shiftBody } = await host.json(
    `/api/organizations/${join.organizationId}/shifts`,
    {
      method: "POST",
      body: JSON.stringify({
        title: "Community meal service",
        date: todayIso(),
        startTime: "09:00",
        endTime: "12:00",
        taskCategory: "COMMUNITY_SERVICE",
        contactPerson: "Dana Reyes",
        contactPhone: "555-0142",
      }),
    }
  );
  const shift = shiftBody.shift ?? {};
  check("host starts a shift", shiftRes.ok, `status ${shiftRes.status} ${JSON.stringify(shiftBody)}`);
  check("shift reports its declared hours", shift.totalHours === 3, String(shift.totalHours));
  check(
    "shift response never exposes the TOTP secret",
    !JSON.stringify(shiftBody).toLowerCase().includes("totpsecret"),
    JSON.stringify(shiftBody)
  );

  // 3. The host view fetches the code currently on screen.
  const { res: codeRes, body: code } = await host.json(`/api/opportunities/${shift.id}/code`);
  check("host can render the rotating code", codeRes.ok, `status ${codeRes.status}`);
  check("code is 8 digits", /^\d{8}$/.test(code.code ?? ""), code.code);
  check("code comes with a scannable QR image", String(code.dataUrl ?? "").startsWith("data:image/png"));
  check("code carries an expiry", Number.isFinite(Date.parse(code.expiresAt ?? "")), code.expiresAt);
  check("QR target embeds the code", String(code.targetUrl ?? "").includes(code.code), code.targetUrl);
  check(
    "code endpoint never exposes the secret",
    !JSON.stringify(code).toLowerCase().includes("totpsecret")
  );

  // The same code holds for the rest of its step, which is what lets several
  // volunteers scan the same displayed QR.
  const { body: codeAgain } = await host.json(`/api/opportunities/${shift.id}/code`);
  check("code is stable within its window", codeAgain.code === code.code, `${code.code} vs ${codeAgain.code}`);

  // 4. A volunteer who was never signed up scans it.
  const { res: volJoinRes } = await volunteer.json("/api/auth/demo-join", {
    method: "POST",
    body: JSON.stringify({ role: "participant" }),
  });
  check("volunteer joins as a participant", volJoinRes.ok, `status ${volJoinRes.status}`);

  const { res: previewRes, body: preview } = await volunteer.json(
    `/api/opportunities/${shift.id}/shift-preview?c=${code.code}`
  );
  check("volunteer previews the shift", previewRes.ok, `status ${previewRes.status}`);
  check("preview shows the shift title", preview.shift?.title === "Community meal service");
  check("preview shows who is signing", preview.shift?.contactPerson?.includes("Dana Reyes"));
  check("volunteer has not checked in yet", preview.alreadyCheckedIn === false);

  // A stale code reveals nothing.
  const staleCode = String((Number(code.code) + 1) % 1e8).padStart(8, "0");
  const { res: stalePreview } = await volunteer.json(
    `/api/opportunities/${shift.id}/shift-preview?c=${staleCode}`
  );
  check("preview refuses a wrong code", stalePreview.status === 401, `status ${stalePreview.status}`);

  // 5. The scan itself — this is the signature.
  const { res: confirmRes, body: confirmed } = await volunteer.json(
    `/api/opportunities/${shift.id}/scan-confirm`,
    { method: "POST", body: JSON.stringify({ code: code.code }) }
  );
  check("scan creates a record", confirmRes.ok, `status ${confirmRes.status} ${JSON.stringify(confirmed)}`);
  check("record is confirmed outright", confirmed.record?.status === "CONFIRMED", confirmed.record?.status);
  check("record carries the shift's hours", confirmed.record?.totalHours === 3);

  const recordId = confirmed.record?.id;

  // 6. It shows up as a confirmed record on the volunteer's own activity list.
  const { body: activity } = await volunteer.json("/api/activity?status=CONFIRMED");
  const listed = (activity.records ?? []).find((r) => r.id === recordId);
  check("record appears in the volunteer's confirmed activity", Boolean(listed));

  // 7. The host sees the check-in.
  const { body: checkins } = await host.json(`/api/opportunities/${shift.id}/checkins`);
  check(
    "host sees the volunteer checked in",
    (checkins.checkins ?? []).some((c) => c.activityRecordId === recordId),
    JSON.stringify(checkins.checkins ?? [])
  );

  // 8. Replaying the same code does not mint a second record.
  const { res: replayRes, body: replay } = await volunteer.json(
    `/api/opportunities/${shift.id}/scan-confirm`,
    { method: "POST", body: JSON.stringify({ code: code.code }) }
  );
  check("replaying the scan is rejected", replayRes.status === 409, `status ${replayRes.status}`);
  check("replay names the existing record", replay.error === "already_checked_in", replay.error);

  // 9. A different volunteer can still use the same displayed code — one QR,
  //    a whole group of volunteers.
  const second = actor("second volunteer");
  await second.json("/api/auth/demo-join", {
    method: "POST",
    body: JSON.stringify({ role: "participant" }),
  });
  const { res: secondRes, body: secondBody } = await second.json(
    `/api/opportunities/${shift.id}/scan-confirm`,
    { method: "POST", body: JSON.stringify({ code: code.code }) }
  );
  check(
    "a second volunteer can scan the same code",
    secondRes.ok && secondBody.record?.status === "CONFIRMED",
    `status ${secondRes.status} ${JSON.stringify(secondBody)}`
  );

  // 10. A wrong code is refused outright.
  const third = actor("third volunteer");
  await third.json("/api/auth/demo-join", {
    method: "POST",
    body: JSON.stringify({ role: "participant" }),
  });
  const { res: badRes, body: bad } = await third.json(
    `/api/opportunities/${shift.id}/scan-confirm`,
    { method: "POST", body: JSON.stringify({ code: staleCode }) }
  );
  check("a wrong code is rejected", badRes.status === 401, `status ${badRes.status}`);
  check("rejection says why", bad.error === "invalid_code", bad.error);

  // 11. The confirmed record fills the official PA 1895.
  const { res: genRes, body: generated } = await volunteer.json("/api/forms/generate", {
    method: "POST",
    body: JSON.stringify({ templateKey: "PA_1895", activityRecordIds: [recordId] }),
  });
  check("PA 1895 generates from the record", genRes.ok, `status ${genRes.status} ${JSON.stringify(generated)}`);

  const download = await volunteer.request(`/api/generated-forms/${generated.id}/download`);
  check("generated form downloads", download.ok, `status ${download.status}`);

  const pdf = await PDFDocument.load(await download.arrayBuffer());
  const form = pdf.getForm();
  const text = (name) => form.getTextField(name).getText() ?? "";

  const activityDate = isoDateOnly(confirmed.record.activityDate);
  const [year, month, day] = activityDate.split("-");

  check("form names the client", text("CLIENT NAME").length > 0, text("CLIENT NAME"));
  check(
    "form sets the week ending Saturday",
    text("Week ending Saturday") === expectedWeekEnding(activityDate),
    `${text("Week ending Saturday")} vs ${expectedWeekEnding(activityDate)}`
  );
  check("row 1 carries the shift date", text("DATERow1") === `${month}/${day}/${year}`, text("DATERow1"));
  check("row 1 carries the activity", text("TYPE OF ACTIVITYRow1") === "Community meal service");
  check(
    "row 1 carries the on-site contact",
    text("ACTIVITY CONTACT PERSON AND PHONE Row1").includes("Dana Reyes"),
    text("ACTIVITY CONTACT PERSON AND PHONE Row1")
  );
  check(
    "row 1 carries an authorized signature",
    text("AUTHORIZED ACTIVITY CONTACTS SIGNATURERow1").length > 0,
    text("AUTHORIZED ACTIVITY CONTACTS SIGNATURERow1")
  );
  check("row 1 carries the begin time", text("BEGIN TIMERow1") === "09:00", text("BEGIN TIMERow1"));
  check("row 1 carries the end time", text("END TIMERow1") === "12:00", text("END TIMERow1"));
  check("row 1 carries the hours", text("TOTAL DAILY HOURSRow1") === "3", text("TOTAL DAILY HOURSRow1"));
  check(
    "community service is the checked activity",
    form.getCheckBox("Community").isChecked()
  );
  check(
    "comments record how the rows were verified",
    text("COMMENTS").includes(recordId),
    text("COMMENTS")
  );
} catch (err) {
  failed++;
  console.log(`  ✗ unexpected error — ${err.stack ?? err.message}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
