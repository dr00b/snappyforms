// Static OpenAPI description of the simulated agency-integration API — a plain
// object literal (not a table), same static-config precedent as formTemplates.ts.
// Served as-is from GET /api/agency-api/v1/openapi.json.
export const agencyApiOpenapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SnappyForms Agency Integration API (demonstration)",
    version: "1.0.0",
    description:
      "Simulated read-only API a benefits agency's eligibility system could call to check " +
      "whether a participant has met a program's verified-activity-hours requirement, gated " +
      "by the participant's consent. Demonstration only — not a real production API.",
  },
  servers: [{ url: "/api/agency-api/v1" }],
  paths: {
    "/cases/{caseId}/verification": {
      post: {
        summary: "Check a case's confirmed hours against its program's requirement",
        parameters: [
          {
            name: "caseId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "x-snappyforms-client-id",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "x-snappyforms-client-secret",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Verification result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    caseReference: { type: "string", example: "•••• 4821" },
                    hoursConfirmed: { type: "number" },
                    hoursRequired: { type: "number", nullable: true },
                    meetsRequirement: { type: "boolean", nullable: true },
                    windowStart: { type: "string", format: "date-time" },
                    windowEnd: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid client credentials" },
          "403": {
            description: "Client lacks the required scope, or the participant has not granted consent",
          },
          "404": { description: "Case not found for this client's agency" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
  },
} as const;
