// Static form-template reference data (spec section 8's "form eligibility mapping").
// Not a DB table in this prototype — see the Phase 3 plan for why.

export type FormTemplateKey =
  | "PA_1895"
  | "PA_1938"
  | "MONTHLY_SUMMARY"
  | "WORK_VERIFICATION"
  | "EDUCATION_VERIFICATION";

export type FormTemplate = {
  key: FormTemplateKey;
  name: string;
  description: string;
  sourceCategories: string[];
  certificationLanguage: string;
  requiresParticipantApproval: boolean;
  requiresOrganizationConfirmation: boolean;
  renewalPeriodDays: number | null;
  supportingDocuments: string[];
  isGuidedWizard: boolean;
};

const GENERIC_CERTIFICATION =
  "This summary reflects records confirmed by the listed organization through SnappyForms.";

// Order matters: this is the order the forms list renders in, and PA 1895 —
// the form the QR shift flow fills end to end — leads.
export const FORM_TEMPLATES: Record<FormTemplateKey, FormTemplate> = {
  PA_1895: {
    key: "PA_1895",
    name: "PA 1895 Employment and Training Weekly Activity Verification",
    description:
      "Fills the official PA 1895 form for one Sunday–Saturday week, one row per confirmed shift.",
    sourceCategories: ["VOLUNTEER", "COMMUNITY_SERVICE"],
    certificationLanguage:
      "Each row on this form corresponds to an activity record the listed organization confirmed at the shift, by displaying a rotating code the participant scanned in person.",
    // The organization already signed each row at the shift, so there is no
    // second certification round trip — that is the point of the QR flow.
    requiresParticipantApproval: false,
    requiresOrganizationConfirmation: true,
    renewalPeriodDays: 7,
    supportingDocuments: ["Confirmed volunteer or community-service records from a single week"],
    isGuidedWizard: false,
  },
  PA_1938: {
    key: "PA_1938",
    name: "PA 1938 Community Service / Volunteer Verification (demonstration)",
    description:
      "A guided demonstration of Pennsylvania's PA 1938 community-service verification form.",
    sourceCategories: ["VOLUNTEER", "COMMUNITY_SERVICE"],
    certificationLanguage:
      "I confirm that I am authorized to provide this information for the organization and that the information entered is accurate to the best of my knowledge.",
    requiresParticipantApproval: true,
    requiresOrganizationConfirmation: true,
    renewalPeriodDays: 30,
    supportingDocuments: ["A confirmed volunteer or community-service activity record"],
    isGuidedWizard: true,
  },
  MONTHLY_SUMMARY: {
    key: "MONTHLY_SUMMARY",
    name: "Generic Monthly Volunteer Summary",
    description: "A summary of confirmed volunteer / community-service hours.",
    sourceCategories: ["VOLUNTEER", "COMMUNITY_SERVICE"],
    certificationLanguage: GENERIC_CERTIFICATION,
    requiresParticipantApproval: false,
    requiresOrganizationConfirmation: true,
    renewalPeriodDays: 30,
    supportingDocuments: [],
    isGuidedWizard: false,
  },
  WORK_VERIFICATION: {
    key: "WORK_VERIFICATION",
    name: "Generic Work Activity Verification",
    description: "A summary of confirmed paid or unpaid work activity.",
    sourceCategories: ["WORK"],
    certificationLanguage: GENERIC_CERTIFICATION,
    requiresParticipantApproval: false,
    requiresOrganizationConfirmation: true,
    renewalPeriodDays: null,
    supportingDocuments: [],
    isGuidedWizard: false,
  },
  EDUCATION_VERIFICATION: {
    key: "EDUCATION_VERIFICATION",
    name: "Generic Education or Training Attendance Verification",
    description: "A summary of confirmed education or training attendance.",
    sourceCategories: ["EDUCATION", "TRAINING"],
    certificationLanguage: GENERIC_CERTIFICATION,
    requiresParticipantApproval: false,
    requiresOrganizationConfirmation: true,
    renewalPeriodDays: null,
    supportingDocuments: [],
    isGuidedWizard: false,
  },
};

export const FORM_TEMPLATE_LIST = Object.values(FORM_TEMPLATES);

export function getFormTemplate(key: string): FormTemplate | undefined {
  return FORM_TEMPLATES[key as FormTemplateKey];
}
