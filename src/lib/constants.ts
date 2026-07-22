// Standalone (no Prisma/node-only imports) so this can be safely imported from
// edge middleware as well as regular server code.
export const SESSION_COOKIE = "verwovo_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
