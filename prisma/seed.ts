import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptCaseNumber, caseNumberLast4 } from "../src/lib/encryption";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "VerwovoDemo!1";

async function createUser(email: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      authMethods: {
        create: [
          { type: "PASSWORD", identifier: email, verifiedAt: new Date() },
          { type: "EMAIL_OTP", identifier: email, verifiedAt: new Date() },
        ],
      },
    },
  });
  return user;
}

async function createHandle(value: string, ownerType: "PARTICIPANT" | "ORGANIZATION", ownerId: string) {
  return prisma.handle.create({
    data: {
      value: value.toLowerCase(),
      displayValue: value,
      ownerType,
      participantProfileId: ownerType === "PARTICIPANT" ? ownerId : undefined,
      organizationId: ownerType === "ORGANIZATION" ? ownerId : undefined,
    },
  });
}

async function createQr(ownerType: "PARTICIPANT" | "ORGANIZATION", ownerId: string) {
  return prisma.qRIdentifier.create({
    data: {
      ownerType,
      participantProfileId: ownerType === "PARTICIPANT" ? ownerId : undefined,
      organizationId: ownerType === "ORGANIZATION" ? ownerId : undefined,
    },
  });
}

async function createParticipant(email: string, displayName: string, handle: string) {
  const user = await createUser(email);
  const profile = await prisma.participantProfile.create({
    data: { userId: user.id, displayName, searchable: true },
  });
  await createHandle(handle, "PARTICIPANT", profile.id);
  await createQr("PARTICIPANT", profile.id);
  return { user, profile };
}

async function createOrganization(opts: {
  name: string;
  type: string;
  primaryEmail: string;
  domain: string;
  handle: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}) {
  const org = await prisma.organization.create({
    data: {
      name: opts.name,
      type: opts.type,
      primaryEmail: opts.primaryEmail,
      domain: opts.domain,
      city: opts.city,
      state: opts.state,
      zip: opts.zip,
      phone: opts.phone,
      addressLine1: "100 Demo Street",
    },
  });
  await createHandle(opts.handle, "ORGANIZATION", org.id);
  await createQr("ORGANIZATION", org.id);
  return org;
}

async function addMember(orgId: string, email: string, displayName: string, role: "ADMIN" | "MEMBER") {
  const user = await createUser(email);
  const membership = await prisma.organizationMembership.create({
    data: { organizationId: orgId, userId: user.id, displayName, role, status: "ACTIVE" },
  });
  return { user, membership };
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding SnappyForms demo data...");

  // Participant: Maya Johnson
  const maya = await createParticipant("maya.johnson@example-demo.org", "Maya Johnson", "maya-j");

  // Organization: Northside Community Resource Center
  const northside = await createOrganization({
    name: "Northside Community Resource Center",
    type: "NONPROFIT",
    primaryEmail: "hello@northside-center-demo.org",
    domain: "northside-center-demo.org",
    handle: "northside-center",
    city: "Harrisburg",
    state: "PA",
    zip: "17101",
    phone: "555-010-2000",
  });
  const renee = await addMember(northside.id, "renee@northside-center-demo.org", "Renee Okafor", "ADMIN");
  const devon = await addMember(northside.id, "devon@northside-center-demo.org", "Devon Price", "MEMBER");
  const alicia = await addMember(northside.id, "alicia@northside-center-demo.org", "Alicia Nguyen", "MEMBER");

  // Business: Keystone Neighborhood Services
  const keystone = await createOrganization({
    name: "Keystone Neighborhood Services",
    type: "BUSINESS",
    primaryEmail: "info@keystone-services-demo.com",
    domain: "keystone-services-demo.com",
    handle: "keystone-services",
    city: "Lancaster",
    state: "PA",
    zip: "17602",
    phone: "555-010-3000",
  });
  const sam = await addMember(keystone.id, "sam@keystone-services-demo.com", "Sam Whitfield", "ADMIN");
  await addMember(keystone.id, "jordan@keystone-services-demo.com", "Jordan Blake", "MEMBER");
  await addMember(keystone.id, "priya@keystone-services-demo.com", "Priya Patel", "MEMBER");

  // --- Phase 2 demo activity records (spec section 19) -----------------

  // Two confirmed volunteer records for Maya at Northside.
  const confirmed1 = await prisma.activityRecord.create({
    data: {
      participantProfileId: maya.profile.id,
      organizationId: northside.id,
      verifierMembershipId: renee.membership.id,
      initiatedBy: "PARTICIPANT",
      category: "VOLUNTEER",
      title: "Weekend food pantry volunteer",
      description: "Sorted and distributed groceries at the Saturday food pantry.",
      activityDate: daysAgo(30),
      totalHours: 4,
      paidStatus: "UNPAID",
      locationType: "IN_PERSON",
      status: "CONFIRMED",
      createdAt: daysAgo(31),
    },
  });
  await prisma.recordConfirmation.create({
    data: { activityRecordId: confirmed1.id, confirmedByUserId: renee.user.id, action: "CONFIRMED" },
  });

  const confirmed2 = await prisma.activityRecord.create({
    data: {
      participantProfileId: maya.profile.id,
      organizationId: northside.id,
      verifierMembershipId: devon.membership.id,
      initiatedBy: "PARTICIPANT",
      category: "VOLUNTEER",
      title: "Community garden cleanup",
      description: "Weeded and mulched the community garden beds.",
      activityDate: daysAgo(16),
      totalHours: 3,
      paidStatus: "UNPAID",
      locationType: "IN_PERSON",
      transportationProvided: true,
      status: "CONFIRMED",
      createdAt: daysAgo(17),
    },
  });
  await prisma.recordConfirmation.create({
    data: { activityRecordId: confirmed2.id, confirmedByUserId: devon.user.id, action: "CONFIRMED" },
  });

  // One pending work record at Keystone, awaiting Sam's review.
  const pendingWork = await prisma.activityRecord.create({
    data: {
      participantProfileId: maya.profile.id,
      organizationId: keystone.id,
      verifierMembershipId: sam.membership.id,
      initiatedBy: "PARTICIPANT",
      category: "WORK",
      title: "Seasonal warehouse associate",
      description: "Part-time shift work during the holiday season.",
      activityDate: daysAgo(3),
      totalHours: 9,
      paidStatus: "PAID",
      locationType: "IN_PERSON",
      status: "AWAITING_ORGANIZATION",
      createdAt: daysAgo(3),
    },
  });

  // One record with changes requested at Northside.
  const changesRequested = await prisma.activityRecord.create({
    data: {
      participantProfileId: maya.profile.id,
      organizationId: northside.id,
      verifierMembershipId: alicia.membership.id,
      initiatedBy: "PARTICIPANT",
      category: "COMMUNITY_SERVICE",
      title: "After-school tutoring",
      description: "Helped run the after-school homework club.",
      activityDate: daysAgo(9),
      totalHours: 2,
      paidStatus: "UNPAID",
      locationType: "IN_PERSON",
      status: "CHANGES_REQUESTED",
      createdAt: daysAgo(10),
    },
  });
  await prisma.recordConfirmation.create({
    data: {
      activityRecordId: changesRequested.id,
      confirmedByUserId: alicia.user.id,
      action: "CHANGES_REQUESTED",
      message: "Could you confirm the exact start and end times for this session?",
    },
  });

  // A Keystone record flagged for overlapping hours with the pending work record above.
  const overlapping = await prisma.activityRecord.create({
    data: {
      participantProfileId: maya.profile.id,
      organizationId: keystone.id,
      verifierMembershipId: sam.membership.id,
      initiatedBy: "ORGANIZATION",
      category: "WORK",
      title: "Inventory count shift",
      description: "Assisted with the quarterly inventory count.",
      activityDate: daysAgo(3),
      totalHours: 6,
      paidStatus: "PAID",
      locationType: "IN_PERSON",
      status: "CONFIRMED",
      createdAt: daysAgo(3),
    },
  });
  await prisma.recordConfirmation.create({
    data: { activityRecordId: overlapping.id, confirmedByUserId: sam.user.id, action: "CONFIRMED" },
  });
  await prisma.fraudReviewFlag.create({
    data: {
      activityRecordId: overlapping.id,
      type: "OVERLAPPING",
      message: "Needs review: this participant has another activity logged on the same date.",
    },
  });

  // --- Phase 4 demo data (organization model) ---------------------------

  // Northside: verified domain with auto-join on, so new members with a
  // matching email land PENDING immediately and can start verifying.
  await prisma.organizationDomain.create({
    data: {
      organizationId: northside.id,
      domain: "northside-center-demo.org",
      status: "VERIFIED",
      verificationToken: "snappyforms-verify=seeded-northside-token",
      allowAutoJoin: true,
      verifiedAt: daysAgo(20),
    },
  });

  // Jamie auto-joined Northside and already confirmed one record, but an
  // admin hasn't ratified that first approval yet — demos the "Needs
  // ratification" queue on the Members tab.
  const jamie = await addMember(northside.id, "jamie@northside-center-demo.org", "Jamie Rivera", "MEMBER");
  await prisma.organizationMembership.update({ where: { id: jamie.membership.id }, data: { status: "PENDING" } });

  const jamieConfirmed = await prisma.activityRecord.create({
    data: {
      participantProfileId: maya.profile.id,
      organizationId: northside.id,
      verifierMembershipId: jamie.membership.id,
      initiatedBy: "PARTICIPANT",
      category: "VOLUNTEER",
      title: "Clothing drive sorting",
      description: "Sorted donated winter clothing for distribution.",
      activityDate: daysAgo(2),
      totalHours: 3,
      paidStatus: "UNPAID",
      locationType: "IN_PERSON",
      status: "CONFIRMED",
      createdAt: daysAgo(2),
    },
  });
  await prisma.recordConfirmation.create({
    data: { activityRecordId: jamieConfirmed.id, confirmedByUserId: jamie.user.id, action: "CONFIRMED" },
  });
  await prisma.organizationMembership.update({
    where: { id: jamie.membership.id },
    data: {
      firstApprovalTargetType: "ACTIVITY_RECORD",
      firstApprovalTargetId: jamieConfirmed.id,
      firstApprovalAt: daysAgo(2),
    },
  });

  // Keystone: verified domain with auto-join off, so a new matching member
  // lands REQUESTED — demos the "Join requests" queue.
  await prisma.organizationDomain.create({
    data: {
      organizationId: keystone.id,
      domain: "keystone-services-demo.com",
      status: "VERIFIED",
      verificationToken: "snappyforms-verify=seeded-keystone-token",
      allowAutoJoin: false,
      verifiedAt: daysAgo(15),
    },
  });
  const taylor = await createUser("taylor@keystone-services-demo.com");
  await prisma.organizationMembership.create({
    data: {
      organizationId: keystone.id,
      userId: taylor.id,
      displayName: "Taylor Reed",
      role: "MEMBER",
      status: "REQUESTED",
    },
  });

  // A location and an upcoming opportunity at Northside.
  const mainCenter = await prisma.organizationLocation.create({
    data: {
      organizationId: northside.id,
      name: "Northside Main Center",
      addressLine1: "100 Demo Street",
      city: "Harrisburg",
      state: "PA",
      zip: "17101",
      phone: "555-010-2000",
      qrIdentifier: { create: { ownerType: "LOCATION" } },
    },
  });

  await prisma.volunteerOpportunity.create({
    data: {
      organizationId: northside.id,
      locationId: mainCenter.id,
      createdByUserId: renee.user.id,
      title: "Weekend Food Pantry Volunteer",
      description: "Help sort and distribute groceries for neighborhood families.",
      date: daysFromNow(5),
      startTime: "09:00",
      endTime: "12:00",
      openings: 5,
      taskCategory: "Food service",
      contactPerson: "Renee Okafor",
      remoteOrInPerson: "IN_PERSON",
      qrIdentifier: { create: { ownerType: "OPPORTUNITY" } },
    },
  });

  // --- Phase 5 demo data (future integration demonstration) -------------

  const dcao = await prisma.agency.create({
    data: {
      name: "Demonstration County Assistance Office",
      county: "Demonstration County",
      addressLine1: "200 County Services Way",
      city: "Harrisburg",
      state: "PA",
      zip: "17101",
      phone: "555-010-4000",
    },
  });

  const dcaoAdminUser = await createUser("dcao-admin@example-demo.org");
  await prisma.agencyMembership.create({
    data: {
      agencyId: dcao.id,
      userId: dcaoAdminUser.id,
      displayName: "Dana Whitfield",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const tanf = await prisma.benefitProgram.create({
    data: {
      agencyId: dcao.id,
      code: "TANF",
      name: "Temporary Assistance for Needy Families",
      description: "Cash assistance with a monthly work-participation requirement.",
      requiredHoursPerMonth: 80,
    },
  });
  const snapEt = await prisma.benefitProgram.create({
    data: {
      agencyId: dcao.id,
      code: "SNAP_ET",
      name: "SNAP Employment & Training",
      description: "Supplemental nutrition assistance work/training requirement.",
      requiredHoursPerMonth: 30,
    },
  });

  // Case A: consented — hours visible to the agency immediately.
  const caseARaw = "DCAO-2024-04821";
  const caseA = await prisma.participantCase.create({
    data: {
      participantProfileId: maya.profile.id,
      agencyId: dcao.id,
      benefitProgramId: tanf.id,
      caseNumberEncrypted: encryptCaseNumber(caseARaw),
      caseNumberLast4: caseNumberLast4(caseARaw),
      status: "OPEN",
    },
  });
  await prisma.consent.create({
    data: {
      participantCaseId: caseA.id,
      grantedByUserId: maya.user.id,
    },
  });

  // Case B: no consent yet — demo the live grant flow from /consent.
  const caseBRaw = "DCAO-2024-07734";
  const caseB = await prisma.participantCase.create({
    data: {
      participantProfileId: maya.profile.id,
      agencyId: dcao.id,
      benefitProgramId: snapEt.id,
      caseNumberEncrypted: encryptCaseNumber(caseBRaw),
      caseNumberLast4: caseNumberLast4(caseBRaw),
      status: "OPEN",
    },
  });

  const DEMO_API_SECRET = "demo-agency-secret-123";
  const apiClient = await prisma.aPIClient.create({
    data: {
      agencyId: dcao.id,
      name: "Demo eligibility system",
      clientId: "demo-dcao-eligibility-system",
      clientSecretHash: await bcrypt.hash(DEMO_API_SECRET, 10),
      scopes: JSON.stringify(["cases:verification:read"]),
      status: "ACTIVE",
    },
  });

  console.log("Done. Demo password for every seeded account:", DEMO_PASSWORD);
  console.log("Demo handles: @maya-j, @northside-center, @keystone-services");
  console.log("Seeded activity records:", [
    confirmed1.id,
    confirmed2.id,
    pendingWork.id,
    changesRequested.id,
    overlapping.id,
    jamieConfirmed.id,
  ]);
  console.log("Seeded agency:", dcao.name, dcao.id);
  console.log("Seeded agency admin login:", "dcao-admin@example-demo.org", DEMO_PASSWORD);
  console.log("Seeded cases:", { consented: caseA.id, unconsented: caseB.id });
  console.log(
    "Seeded API client — clientId:",
    apiClient.clientId,
    "secret:",
    DEMO_API_SECRET
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
