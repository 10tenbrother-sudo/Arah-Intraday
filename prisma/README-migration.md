# SQLite → PostgreSQL cutover

The data layer moved from SQLite to PostgreSQL on 2026-09-24. `prisma/schema.prisma`
now targets `provider = "postgresql"` and the whole store was copied across. The
legacy file at `data/market_intelligence.sqlite` is left untouched as a rollback
source.

## How the data was moved

`scripts/migrate-sqlite-to-postgres.py` reads the SQLite file and emits plain SQL,
so the whole migration can be reviewed before it touches anything:

```bash
python3 scripts/migrate-sqlite-to-postgres.py --out /tmp/data.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/data.sql
```

It handles three things that a naive `INSERT ... SELECT` gets wrong:

1. **Insert order.** Tables are emitted parent-first, derived by parsing
   `@relation` targets from the Prisma schema. Alphabetical order fails because
   `AIAnalysis` precedes `MarketEvent`.
2. **Booleans.** SQLite stores them as `0`/`1`; Postgres `BOOLEAN` columns reject
   that, so the schema's declared column type drives the conversion to `TRUE`/`FALSE`.
3. **Orphans.** SQLite does not enforce foreign keys unless the pragma is on, so
   the store held 10 unreachable child rows (5 `UserPreferences`, 5
   `VerificationToken`) pointing at deleted users. Postgres rejects these, and
   nothing can read them, so they are dropped. The script prints how many.

`MarketPrice.seq` is `autoincrement`; because rows are inserted with explicit ids
the script ends with `setval` on the backing sequence, otherwise the next insert
collides.

## Verification performed

Row-level comparison of all 19 tables between SQLite and Postgres: every table
matched, and the only differences were the 10 orphan rows above, whose ids were
checked to be exactly the orphan set.

After the cutover the app was restarted against Postgres and driven through all
page routes and API endpoints. To confirm the running server really read from
Postgres, a `Source` row was renamed only in Postgres and the change appeared
through the API, then was reverted.

## Migration baseline

`prisma/migrations/0_init` mirrors the schema as it already existed. It was
recorded with `prisma migrate resolve --applied 0_init` rather than executed,
because the tables were already created by `prisma db push` beforehand. New
schema changes should use `prisma migrate dev` as normal.

## Rollback

Point `DATABASE_URL` back at `file:../data/market_intelligence.sqlite` and restore
`provider = "sqlite"` in `prisma/schema.prisma`. Re-run `prisma generate`. The
file was never written to after the cutover.
