# VERWOVO app image — Next.js 14 + Prisma, built and served entirely in-container.
# Prisma Client is generated inside the image so its engine matches this platform.
FROM node:22-bookworm-slim

WORKDIR /app

# openssl is required by Prisma's query engine; ca-certificates for TLS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# NEXT_PUBLIC_* vars are inlined at build time, so the demo flag must be present
# during `next build` (not just at runtime).
ENV NEXT_PUBLIC_DEMO_MODE=true \
    NEXT_TELEMETRY_DISABLED=1

# Install dependencies from a clean lockfile (dev deps included — the seed runs via tsx).
COPY package.json package-lock.json ./
RUN npm ci

# App source + Prisma schema/migrations.
COPY . .

# Generate the Prisma client and compile the app.
RUN npx prisma generate && npm run build

EXPOSE 3000

# At startup: apply migrations, seed only if the DB is empty, then serve.
# (Seeding is not idempotent, so restarts against a persisted volume must not re-seed.)
CMD ["sh", "docker/entrypoint-app.sh"]
