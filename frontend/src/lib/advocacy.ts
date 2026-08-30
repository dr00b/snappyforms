// The advocacy prompt that follows a simulated fax: having just watched a
// participant fax paper to prove hours a computer already verified, the demo
// offers the obvious next question — why is this still the process?
//
// Demonstration only. There is no representative lookup service behind this and
// nothing is transmitted. The recipient is deliberately an unnamed district
// office rather than any real member of Congress, so nothing here can be
// mistaken for correspondence with, or on behalf of, an actual official.

export type PlaceholderRecipient = {
  name: string;
  office: string;
};

/**
 * A stable stand-in district derived from the ZIP itself, so the same ZIP always
 * produces the same placeholder. This is arithmetic on a string, not a lookup —
 * it intentionally does not correspond to real congressional districts.
 */
export function placeholderRecipient(zip: string): PlaceholderRecipient {
  const district = (Number(zip.slice(-3)) % 18) + 1;
  return {
    name: "Office of the U.S. Representative",
    office: `District ${district} constituent services (sample office — demonstration only)`,
  };
}

export function defaultAdvocacyBody(opts: {
  senderName: string;
  agencyName: string;
  programName: string | null;
  formName: string;
}): string {
  const program = opts.programName ? ` for ${opts.programName}` : "";
  return [
    "Dear Representative,",
    "",
    `I am writing as a constituent about how work and volunteer hours are verified${program}.`,
    "",
    `To keep my benefits, I have to document my hours to ${opts.agencyName}. Those hours were ` +
      `already confirmed electronically by the organization I volunteered with — the ` +
      `verification exists, it is timestamped, and the organization stands behind it. ` +
      `But to get it to my caseworker, I still had to print it onto a ${opts.formName} and fax it.`,
    "",
    "Every program asks for the same underlying facts in a different format, and none of them " +
      "can accept a verification another program has already accepted. The result is that " +
      "people spend hours re-proving things that were never in dispute, and county offices " +
      "spend staff time re-keying paper that arrived by fax.",
    "",
    "I am asking you to support interoperability requirements for federal benefits programs, " +
      "so that verified information can move between programs electronically, with the " +
      "participant's explicit consent and the ability to revoke it at any time. Specifically:",
    "",
    "  - A common format for work and volunteer participation verification across programs.",
    "  - A requirement that agencies accept verification a participant has already obtained, " +
      "rather than demanding it be re-collected in a program-specific form.",
    "  - Participant consent and revocation as the control on any data sharing, not agency " +
      "discretion.",
    "",
    "The technology to do this is not the hard part. The requirement is.",
    "",
    "Thank you for your time.",
    "",
    opts.senderName,
  ].join("\n");
}
