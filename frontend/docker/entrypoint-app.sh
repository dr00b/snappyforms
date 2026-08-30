#!/bin/sh
# App container startup: apply migrations, then seed only when the database is
# empty. Seeding is not idempotent (unique emails), so re-seeding a persisted
# volume would fail — this keeps container restarts safe.
set -e

npx prisma migrate deploy

USER_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(c=>{process.stdout.write(String(c));return p.\$disconnect();}).catch(()=>{process.stdout.write('0');});")

if [ "$USER_COUNT" = "0" ]; then
  echo "Empty database — seeding demo data."
  npx prisma db seed
else
  echo "Database already has $USER_COUNT users — skipping seed."
fi

exec npx next start -p 3000 -H 0.0.0.0
