import { z } from "zod";

export const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]{2,29}$/;

export const handleSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase().replace(/^@/, ""))
  .refine((v) => HANDLE_REGEX.test(v), {
    message: "Handles must be 3-30 characters: lowercase letters, numbers, and hyphens only.",
  });

export const identifierSchema = z.string().trim().min(3).max(120);

export const requestCodeSchema = z.object({
  identifier: identifierSchema,
  purpose: z.enum(["LOGIN", "MAGIC_LINK"]).default("LOGIN"),
});

export const verifyCodeSchema = z.object({
  identifier: identifierSchema,
  code: z.string().trim().length(6),
});

export const passwordLoginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1),
});

export const magicLinkConsumeSchema = z.object({
  token: z.string().min(10),
});

export const participantOnboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  handle: handleSchema,
  bio: z.string().trim().max(280).optional(),
});

export const organizationOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(["NONPROFIT", "BUSINESS", "GOVERNMENT", "OTHER"]),
  handle: handleSchema,
  primaryEmail: z.string().trim().email(),
  website: z.string().trim().url().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  addressLine1: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  state: z.string().trim().max(30).optional(),
  zip: z.string().trim().max(15).optional(),
  taxStatus: z.string().trim().max(60).optional(),
  einDemo: z.string().trim().max(20).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});

// --- Phase 2: Verification -----------------------------------------------

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined));

const optionalNumber = z.coerce.number().positive().optional();

export const activityFieldsSchema = z.object({
  category: z.enum(["WORK", "VOLUNTEER", "EDUCATION", "TRAINING", "COMMUNITY_SERVICE", "OTHER"]),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  activityDate: optionalDate,
  startTime: z.string().trim().max(10).optional(),
  endTime: z.string().trim().max(10).optional(),
  breakMinutes: optionalNumber,
  totalHours: optionalNumber,
  weeklyHours: optionalNumber,
  monthlyHours: optionalNumber,
  paidStatus: z.enum(["PAID", "UNPAID"]).optional(),
  locationType: z.enum(["IN_PERSON", "REMOTE"]).optional(),
  transportationProvided: z.boolean().optional().default(false),
  supervisorName: z.string().trim().max(100).optional(),
  supervisorTitle: z.string().trim().max(100).optional(),
  supportingNotes: z.string().trim().max(2000).optional(),
});

export const participantActivityRequestSchema = activityFieldsSchema.extend({
  organizationId: z.string().min(1),
  verifierMembershipId: z.string().min(1).optional(),
});

export const organizationActivityRecordSchema = activityFieldsSchema.extend({
  organizationId: z.string().min(1),
  participantHandle: handleSchema,
});

export const requestChangesSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export const disputeSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const resubmitSchema = activityFieldsSchema;

export const reviseSchema = activityFieldsSchema;

export const suspendMemberSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

// --- Phase 3: Documentation -----------------------------------------------

export const generateFormSchema = z.object({
  templateKey: z.enum(["MONTHLY_SUMMARY", "WORK_VERIFICATION", "EDUCATION_VERIFICATION", "PA_1895"]),
  activityRecordIds: z.array(z.string().min(1)).min(1).max(50),
});

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

export const createShareLinkSchema = z.object({
  resourceType: z.enum(["ACTIVITY_RECORD", "GENERATED_FORM"]),
  resourceId: z.string().min(1),
  expiresInHours: z.number().int().min(1).max(24 * 90),
  label: z.string().trim().max(120).optional(),
});

// --- Phase 3 follow-up: collaborative PA 1938 certification ---------------

export const pa1938ParticipantSchema = z.object({
  fullName: nonEmpty(120),
  dob: nonEmpty(20),
  address: nonEmpty(160),
  city: nonEmpty(60),
  state: nonEmpty(30),
  zip: nonEmpty(15),
});

export const pa1938AgencySchema = z.object({
  name: nonEmpty(120),
  phone: nonEmpty(30),
  address: nonEmpty(160),
  city: nonEmpty(60),
  state: nonEmpty(30),
  zip: nonEmpty(15),
});

export const pa1938ServiceSchema = z.object({
  startDate: nonEmpty(20),
  endDate: nonEmpty(20),
  transportationProvided: z.boolean().default(false),
  week1Hours: z.coerce.number().min(0).max(168),
  week2Hours: z.coerce.number().min(0).max(168),
  week3Hours: z.coerce.number().min(0).max(168),
  week4Hours: z.coerce.number().min(0).max(168),
  tasks: z.array(z.string().trim().max(200)).max(3),
});

export const createFormCertificationRequestSchema = z.object({
  participant: pa1938ParticipantSchema,
  agency: pa1938AgencySchema,
  service: pa1938ServiceSchema,
  organizationId: z.string().min(1),
  verifierMembershipId: z.string().min(1).optional(),
  sourceRecordId: z.string().min(1).optional(),
});

export const resubmitFormCertificationSchema = z.object({
  participant: pa1938ParticipantSchema,
  agency: pa1938AgencySchema,
  service: pa1938ServiceSchema,
});

export const certifyFormSchema = z.object({
  siteManagerName: nonEmpty(120),
  siteManagerTitle: nonEmpty(120),
  confirmationDate: nonEmpty(20),
  signature: nonEmpty(120),
  acknowledged: z.literal(true),
});

export const declineFormSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const finalizeFormSchema = z.object({
  ssnLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/)
    .optional()
    .or(z.literal("")),
});

// --- Phase 4: Organization model -------------------------------------------

const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export const claimDomainSchema = z.object({
  domain: z.string().trim().toLowerCase().regex(domainRegex, "Enter a valid domain, e.g. example.org"),
  allowAutoJoin: z.boolean().optional().default(false),
});

export const createLocationSchema = z.object({
  name: nonEmpty(120),
  addressLine1: z.string().trim().max(160).optional(),
  city: z.string().trim().max(60).optional(),
  state: z.string().trim().max(30).optional(),
  zip: z.string().trim().max(15).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const createOpportunitySchema = z.object({
  locationId: z.string().min(1).optional(),
  title: nonEmpty(120),
  description: z.string().trim().max(2000).optional(),
  date: z.string().trim().min(1),
  startTime: z.string().trim().max(10).optional(),
  endTime: z.string().trim().max(10).optional(),
  openings: z.coerce.number().int().min(1).max(1000).default(1),
  taskCategory: z.string().trim().max(60).optional(),
  contactPerson: z.string().trim().max(120).optional(),
  minimumAge: z.coerce.number().int().min(0).max(120).optional(),
  accessibilityInfo: z.string().trim().max(500).optional(),
  transportationInfo: z.string().trim().max(500).optional(),
  backgroundCheckRequired: z.boolean().optional().default(false),
  trainingRequired: z.boolean().optional().default(false),
  remoteOrInPerson: z.enum(["IN_PERSON", "REMOTE"]).default("IN_PERSON"),
});

// A hosted shift is a VolunteerOpportunity narrowed to what a PA 1895 row
// needs: a category the form recognises, an on-site contact, and real begin/end
// times (the hours on every record minted from its QR come from these).
export const hostShiftSchema = z.object({
  title: nonEmpty(120),
  description: z.string().trim().max(2000).optional(),
  date: z.string().trim().min(1),
  startTime: z.string().trim().regex(/^\d{1,2}:\d{2}$/, "Use HH:MM"),
  endTime: z.string().trim().regex(/^\d{1,2}:\d{2}$/, "Use HH:MM"),
  taskCategory: z.enum(["VOLUNTEER", "COMMUNITY_SERVICE"]).default("COMMUNITY_SERVICE"),
  contactPerson: nonEmpty(120),
  contactPhone: z.string().trim().max(30).optional(),
  remoteOrInPerson: z.enum(["IN_PERSON", "REMOTE"]).default("IN_PERSON"),
});

export const shiftScanConfirmSchema = z.object({
  code: z.string().trim().regex(/^\d{8}$/),
});

// --- Phase 5: Future integration demonstration ------------------------------

export const runBulkQuerySchema = z.object({
  benefitProgramId: nonEmpty(120),
});

// --- The paper rail: simulated fax + the advocacy prompt that follows it ------

export const sendFaxSchema = z.object({
  /** Which open case this submission is for; the destination fax comes from its agency. */
  participantCaseId: nonEmpty(120),
});

export const advocacyMessageSchema = z.object({
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
  body: nonEmpty(4000),
  faxTransmissionId: z.string().trim().max(120).optional(),
});
