// PA 1895 end-to-end, focused on the multi-organization week.
//
// Run with: npm run smoke:pa1895   (app serving at BASE_URL, DEMO_MODE=true)
//
// shift-flow.mjs already covers the single-organization PA 1895: one shift, one
// row, one signature. This covers the case that form is actually designed for —
// PA 1895 signs every row separately, so a claimant's week can span several
// organizations, and each row has to carry its own contact and its own
// signature. That distinction is invisible in a single-org test, because one
// organization's name is correct in every field by coincidence.
//
// The summary forms are the opposite: they speak for one organization as a
// whole, so the multi-org rejection has to survive here too. That guard and the
// PA 1895 exemption are one branch in the API, and testing only the permissive
// side would let the strict side rot.

import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log("  ✓", name);
  } else {
    failed++;
    console.log("  ✗", name, detail ? `— ${detail}` : "");
  }
}

function actor() {
  let cookie = "";
  return {
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

/** A date in the same ISO week as today, so both rows share one week ending. */
function sameWeekIso() {
  const d = new Date();
  // Step back to Monday-ish without crossing the week boundary: if today is
  // Sunday the week already ended, so stay put.
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 1) return todayIso();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function suffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * An authorizer with an organization of their own. demo-join drops every guest
 * into one shared demo org, which is exactly the thing this test cannot use, so
 * each host onboards a fresh organization on top of that session.
 */
async function hostWithOwnOrg(label, contactPerson) {
  const host = actor();
  const { res: joinRes } = await host.json("/api/auth/demo-join", {
    method: "POST",
    body: JSON.stringify({ role: "authorizer", flow: "host-shift" }),
  });
  check(`${label}: joins the demo`, joinRes.ok, `status ${joinRes.status}`);

  const handle = `pa1895-${label.toLowerCase()}-${suffix()}`;
  const { res: orgRes, body: org } = await host.json("/api/onboarding/organization", {
    method: "POST",
    body: JSON.stringify({
      name: `${label} Community Services`,
      type: "NONPROFIT",
      handle,
      primaryEmail: `${handle}@example-demo.org`,
    }),
  });
  check(`${label}: creates its own organization`, orgRes.ok, `status ${orgRes.status} ${JSON.stringify(org).slice(0, 120)}`);

  return { host, organizationId: org.organization?.id ?? org.id, name: `${label} Community Services`, contactPerson };
}

/** Host a shift under `org` and have `volunteer` scan it. Returns the record id. */
async function hostAndScan(org, volunteer, { title, date, startTime, endTime }) {
  const { res: shiftRes, body: shift } = await org.host.json(
    `/api/organizations/${org.organizationId}/shifts`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        date,
        startTime,
        endTime,
        taskCategory: "COMMUNITY_SERVICE",
        contactPerson: org.contactPerson,
        contactPhone: "555-0100",
      }),
    }
  );
  const shiftId = (shift.shift ?? shift).id;
  check(
    `${org.name}: opens a shift`,
    shiftRes.ok && Boolean(shiftId),
    `status ${shiftRes.status} ${JSON.stringify(shift).slice(0, 140)}`
  );

  const { body: code } = await org.host.json(`/api/opportunities/${shiftId}/code`);
  check(`${org.name}: shows a rotating code`, /^\d{8}$/.test(code.code ?? ""), code.code);

  const { res: scanRes, body: scan } = await volunteer.json(
    `/api/opportunities/${shiftId}/scan-confirm`,
    { method: "POST", body: JSON.stringify({ code: code.code }) }
  );
  const recordId = scan.record?.id;
  check(
    `${org.name}: the scan signs a record`,
    scanRes.ok && Boolean(recordId) && scan.record?.status === "CONFIRMED",
    `status ${scanRes.status} ${JSON.stringify(scan).slice(0, 140)}`
  );

  return recordId;
}

try {
  console.log("\nA week split across two organizations");

  const keystone = await hostWithOwnOrg("Keystone", "Dana Reyes");
  const northside = await hostWithOwnOrg("Northside", "Priya Raman");
  const volunteer = actor();

  const { res: vRes } = await volunteer.json("/api/auth/demo-join", {
    method: "POST",
    body: JSON.stringify({ role: "participant" }),
  });
  check("volunteer joins as a participant", vRes.ok, `status ${vRes.status}`);

  const day = sameWeekIso();
  const recordA = await hostAndScan(keystone, volunteer, {
    title: "Community meal service",
    date: day,
    startTime: "09:00",
    endTime: "12:00",
  });
  const recordB = await hostAndScan(northside, volunteer, {
    title: "Food bank sorting",
    date: day,
    startTime: "13:00",
    endTime: "16:00",
  });

  check("the two records really are at different organizations", keystone.organizationId !== northside.organizationId);

  // --- the change under test -------------------------------------------------
  console.log("\nPA 1895 accepts the split week");

  const { res: genRes, body: generated } = await volunteer.json("/api/forms/generate", {
    method: "POST",
    body: JSON.stringify({ templateKey: "PA_1895", activityRecordIds: [recordA, recordB] }),
  });
  check(
    "a two-organization week generates instead of being refused",
    genRes.ok,
    `status ${genRes.status} ${JSON.stringify(generated).slice(0, 160)}`
  );
  assert.ok(genRes.ok, "cannot assert on the PDF if generation failed");

  const download = await volunteer.request(`/api/generated-forms/${generated.id}/download`);
  check("the generated form downloads", download.ok, `status ${download.status}`);

  const pdf = await PDFDocument.load(await download.arrayBuffer());
  const form = pdf.getForm();
  const text = (name) => form.getTextField(name).getText() ?? "";

  // Row order follows the records' dates and both share a day, so which
  // organization lands on row 1 is not something this test should pin down.
  const contacts = [
    text("ACTIVITY CONTACT PERSON AND PHONE Row1"),
    text("ACTIVITY CONTACT PERSON AND PHONE Row2"),
  ];
  const signatures = [
    text("AUTHORIZED ACTIVITY CONTACTS SIGNATURERow1"),
    text("AUTHORIZED ACTIVITY CONTACTS SIGNATURERow2"),
  ];
  const activities = [text("TYPE OF ACTIVITYRow1"), text("TYPE OF ACTIVITYRow2")];

  check("both rows are filled in", activities.every((a) => a.length > 0), activities.join(" | "));
  check(
    "both shifts appear, one per row",
    ["Community meal service", "Food bank sorting"].every((t) => activities.includes(t)),
    activities.join(" | ")
  );

  // The heart of it: before this change every row took its contact from a single
  // organization, so a split week silently attributed one org's shift to the other.
  check(
    "each row carries its own organization's contact person",
    contacts.some((c) => c.includes("Dana Reyes")) && contacts.some((c) => c.includes("Priya Raman")),
    contacts.join(" | ")
  );
  check(
    "the two rows do not share one contact",
    contacts[0] !== contacts[1],
    contacts.join(" | ")
  );
  check("every row is signed", signatures.every((s) => s.length > 0), signatures.join(" | "));

  const comments = text("COMMENTS");
  check(
    "the comments name both organizations",
    comments.includes("Keystone Community Services") && comments.includes("Northside Community Services"),
    comments
  );
  check("the comments still cite the record ids", comments.includes(recordA) && comments.includes(recordB), comments);

  // --- the guard that must not regress with it -------------------------------
  console.log("\nSummary forms still speak for one organization");

  const { res: summaryRes, body: summary } = await volunteer.json("/api/forms/generate", {
    method: "POST",
    body: JSON.stringify({ templateKey: "MONTHLY_SUMMARY", activityRecordIds: [recordA, recordB] }),
  });
  check(
    "a summary form refuses the same two-organization set",
    summaryRes.status === 400 && summary.error === "records_must_share_organization",
    `status ${summaryRes.status} ${JSON.stringify(summary)}`
  );

  const { res: singleOrgRes } = await volunteer.json("/api/forms/generate", {
    method: "POST",
    body: JSON.stringify({ templateKey: "MONTHLY_SUMMARY", activityRecordIds: [recordA] }),
  });
  check(
    "a summary form still accepts a single organization",
    singleOrgRes.ok,
    `status ${singleOrgRes.status}`
  );

  // --- the week guard is independent of the organization guard ---------------
  console.log("\nOne week is still one week");

  const lastWeek = new Date();
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 9);
  const staleRecord = await hostAndScan(keystone, volunteer, {
    title: "Previous week shift",
    date: lastWeek.toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "11:00",
  });

  const { res: spanRes, body: span } = await volunteer.json("/api/forms/generate", {
    method: "POST",
    body: JSON.stringify({ templateKey: "PA_1895", activityRecordIds: [recordA, staleRecord] }),
  });
  check(
    "PA 1895 still refuses rows from two different weeks",
    spanRes.status === 400 && span.error === "records_must_share_one_week",
    `status ${spanRes.status} ${JSON.stringify(span)}`
  );
} catch (error) {
  failed++;
  console.log("  ✗ threw:", error?.stack ?? error);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
