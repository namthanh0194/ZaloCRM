# Prisma production baseline

Use this procedure only when the production schema already exists but Prisma migration history is missing or empty.

## Safety requirements

1. Create and verify a PostgreSQL backup before continuing.
2. Run the command inside the backend container or with the production `DATABASE_URL` configured.
3. Always run dry-run first.
4. Never baseline a version when the schema validation reports missing tables or columns.

## Baseline release 3.4.0

Dry-run:

```bash
cd backend
npm run db:baseline -- --version=3.4.0
```

The approved cutoff is `20260625010000_lead_notify_ack`. If the report is correct, apply the baseline:

```bash
cd backend
npm run db:baseline -- --version=3.4.0 --apply --confirm=BASELINE_3.4.0
```

The script uses `prisma migrate resolve --applied`; it does not execute historical SQL. After baselining, verify:

```bash
npx prisma migrate status
```

Only migrations newer than the 3.4.0 cutoff should remain pending. Apply them through the system-upgrade page or with `npx prisma migrate deploy`.
