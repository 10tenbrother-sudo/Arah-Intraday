# AGENTS.md

## Project
Arah Market — Macro & FX Intelligence Terminal (React 19 + Vite + Express).
Metadata in `metadata.json`. Frontend `src/`, backend `server/`.

## Running locally
```bash
npm install --legacy-peer-deps   # required: vite@8 vs esbuild peer conflict
npx tsx server.ts                # dev entry (package.json "dev" script)
```
Server listens on port **3000** (hardcoded in `server.ts`). It serves the Vite
dev middleware in-process, so there is no separate frontend server.

To expose it on the sandbox work ports (12000/12001), forward 12000 -> 3000.
`socat` is not installed; a small Node TCP proxy works. The forward is not
persistent: recreate it after any container or session restart, otherwise the
public URL returns 502 while local port 3000 still answers.

## Environment
- `.env` (gitignored) supplies `GEMINI_API_KEY`. Without it the AI layer falls
  back to heuristic mode instead of calling Gemini.
- Set `APP_SECRET` (>= 32 chars) in `.env` to keep sessions across restarts.
  Without it `resolveSecret()` mints a random per-process secret, so every
  restart invalidates all JWTs and users are bounced to the login screen.
- The Gemini key is a live, working credential. Model names in
  `server/intelligence/gemini.ts` (`gemini-3.8-flash`, `gemini-3.1-flash-lite`)
  are real and correct for the current catalog — do not "fix" them. The primary
  model frequently returns 429 and the fallback 503; the engine's retry/failover
  and its deterministic grounded-synthesis fallback are working as intended, so
  those log lines are not a bug. As of the latest audit the key's quota is
  exhausted outright — every live call returns 429 before real generation — so
  roughly three quarters of `AIAnalysis` rows carry the deterministic template
  rather than a Gemini summary. That is a billing/quota limit on the key, not a
  code defect: raise the plan or swap in a key with headroom to restore coverage.
- Storage is SQLite via Prisma at `data/market_intelligence.sqlite` (data layer
  `server/db/database.ts`, client singleton `server/db/prisma.ts`, JSON codec
  `server/db/codec.ts`). Schema lives in `prisma/schema.prisma`; push changes
  with `npm run db:push`. The data layer is fully async - every call site awaits.
- `data/market_intelligence.db.json` is the retired file store. It is kept
  read-only for provenance; nothing writes it. Migrate it into SQLite with
  `npm run seed:sqlite` (add `--force` to overwrite an existing database). The
  migration dedupes ids and repairs dangling foreign keys, because the old file
  was pruned over time and contained orphans.
- The demo trader account is `trader@marketintel.pro`. Its password is seeded
  from `DEMO_USER_PASSWORD`, or a random one printed once when unset — the repo
  deliberately hardcodes no password. The account that already exists predates
  that hardening and its current password is one of the leaked values, so treat
  it as compromised and rotate it rather than trusting it.

## Package manager
The repo ships `bun.lock`, but bun is not installed here and the sandbox npm
prefix is not writable for global installs. `npm install --legacy-peer-deps`
is the working path. It generates `package-lock.json`, which is not part of the
repo's intended toolchain.

## GitHub access
`GITHUB_TOKEN` in this environment is a GitHub App installation token.
Fetching and cloning work, and as of the most recent session it is
**write-capable**: `git push` with the token in the URL succeeds and the refs
API returns 201. If a push starts failing with `Resource not accessible by
integration`, the installation's permissions were reduced again; fall back to
`git format-patch` so the user can apply the work manually.

## Conventions
- UI primitives live in `src/components/ui/` and follow shadcn/Radix patterns
  (see `components.json`); shared composites in `src/components/shared/`.
- Class merging goes through `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge).
- Design skills from the taste-skill bundle are installed under `.agents/skills/`.
- The UI reads in one language: English. Server-generated strings
  (`server/intelligence/arahMarketEngine.ts`, report/modal builders, log and
  error messages) count as UI copy. Indonesian text is only acceptable as
  ingested third-party news content, never as authored product strings.
- `IntradayMarketMapEngine` prose fields (drivers, catalysts) are not rendered
  anywhere; only `overall_bias` and `confidence` reach the client via
  `MarketDataGrid`. Do not spend time translating unrendered prose.
- Persistence is SQLite via Prisma. `DATABASE_URL` defaults to
  `file:../data/market_intelligence.sqlite`; `data/market_intelligence.db.json`
  is the legacy store kept only as a fallback when Prisma is unreachable.

## Market Bias vs Overview (single-source rule)
The server dossier (`/api/intelligence/arah-market` -> `ArahMarketTodayData`)
owns the market regime and every per-pair entry plan. The client must not
derive a second opinion:

- `ArahMarketView.tsx` (tab `arah_market` / "Market Bias") is the only
  surface that renders entry setups, including `intradayPlan.invalidationTrigger`
  and `intradayPlan.warningNote`.
- `ExecutiveMarketBrief.tsx` (Overview) is a macro conclusion only. It reads
  `globalRegime` from the dossier (passed from `App.tsx`) and renders no trade
  grid. Do not re-add a local `bullishCount`/`bearishCount` regime or hardcoded
  calls like "Long US100 & G8 Divergence Pairs" - they contradicted the server.

## TradingView symbol contract
`onOpenChart` accepts either a raw ticker (`US100`, `XAUUSD`) or a `tv_symbol`.
`resolveSymbolToTVMeta` in `TradingViewChartModal.tsx` maps both, because
`PRIMARY_INSTRUMENTS` has explicit `US100`/`XAUUSD` entries and the market
payload carries `tv_symbol`. Passing a raw ticker is safe; it does not break
the chart.

## Data fidelity rules in `arahMarketEngine.ts`
Only these feeds exist: DXY, US10Y, six FX pairs, US100/US30/US500, XAUUSD, BTC,
plus the 1-10 currency strength feed. There is **no** 2Y yield, TIPS, Bund, or
JGB feed. Consequences to respect when editing:

- Do not synthesise an instrument that is not fed. A `US10Y - US02Y` curve
  slope was previously fabricated as `0.14 - dxyChange * 0.30`, which made the
  "US Yield Curve Slope" spread a restatement of DXY. It was removed.
- `us10yChangeBps = us10yPrice * us10yChange` converts the feed's percent
  change into basis points (a 3.05% move on 5.1% is ~15.6bps). `changeSessionBps`
  values used to be hardcoded literals (3.2/4.5/5.1/2.8); they are now real.
- The currency strength feed is a 1-10 scale whose live basket average runs
  near 4.0, well below its midpoint. Never test it against a fixed cut such as
  `usdScore > 5.2`: that skews every downstream bias. Compare against the
  basket average (`usdVsBasket`).
- `fundScore` / `interScore` / `paScore` are not read anywhere, and
  `priceAction.structure` is not rendered. They are diagnostics only, so a
  wrong value there has no user-visible effect.

Verification tip: signal output can be compared deterministically by stubbing
`db.getAllMarketPrices` / `getCurrencyStrength` / `getAllEvents` /
`getEconomicEvents` and calling `ArahMarketEngine.getArahMarketToday()` under
`npx tsx` over a frozen JSON snapshot.

## Signal calibration evidence (backtest of 2026-07 -> 2026-09)

`backtest.ts` replays the real engine over 12 instruments of 15m Yahoo Finance
bars (fetched automatically into `/tmp/bt`, resampled to 1h/4h). It is the
reference when anyone proposes changing a threshold. Measured results:

- Directional edge over 4 horizons (15m/1h/6h/24h forward, 15m and 1h bars,
  106k-153k samples) is ~zero: hit rate 46.9-49.3% against an "always long"
  benchmark of 49.6-51.7%. `corr(engineBiasSign, forwardReturn)` = 0.021-0.038.
  **The engine has no measurable forecasting skill; do not claim it does.**
  The apparent 60-90% hit rates seen on a single live session are directional
  beta from a one-sided tape, not skill.
- `HIGH_CONVICTION` is not an edge signal. Before the pillar fix it was *worse*
  than no filter at the 24h horizon (45.0% vs 51.7% benchmark). After removing
  the duplicate pillar (see below) it is still 45.6% vs 51.7%. The label now
  reads "3/3 ALIGNED" and carries an explicit `warningNote` telling the user it
  is context, not a trigger. Do not reintroduce action language for it.
- The currency-strength pillar must NOT be voted into the confluence count. For
  an FX pair `fundBias` is already a function of the same two strength scores
  (base minus quote) at a tighter threshold (0.1 vs 0.4), so the two pillars were
  mathematically incapable of disagreeing: "4 pillars" was really 3. Voting both
  counted one signal twice. CS still functions as a veto through
  `hasCsDivergence`. Removing it moved ~10pp of pairs from 3/3 to 2/3 and
  rebalanced per-pair direction (USDJPY went 1794 bull / 1269 bear -> 0 / 950),
  with no change to aggregate hit rate.
- Deliberately left uncalibrated: `directionalBias` thresholds, the XAUUSD
  neutral band, and the CS `netDiff` 0.4 cut. Tuning them against 70 days of one
  regime would be curve-fitting, and the backtest cannot yet tell a real edge
  from momentum. Do not tune them without new evidence.
- `NEUTRAL_CHOP` is assigned a NEUTRAL bias and is excluded from hit stats, so
  its ~15% share is inert, not informative.
- Per-pair at 15m-24h (post-fix), the remaining pairs are heavily USD-driven and
  add little timing information: USDCAD 1368 bull / 1339 bear; AUDUSD
  1015/1170. So the 15m `directionalBias` direction is largely the sign of the
  preceding 24h move - trade momentum, not a forecast.
- `IntradayMarketMapEngine` is not independent evidence either, for a different
  reason. Its `fundamentalScore` is piecewise-constant: several symbols are bare
  literals (BTC `65`, US100 `55`, US30 `70`, and three at `-30`/`-35`/`-40`),
  and the rest branch on a single currency-strength threshold with a wide dead
  zone (e.g. XAUUSD `usdStrength < 5.0 ? 75 : 45`, EUR `> 6.0 ? 50 : < 4.0 ? -45
  : -10`). `confidence` is a hardcoded literal in 15 places. Only
  `priceActionScore` varies continuously with data. The `top_drivers` /
  `today_key_catalyst` strings are fixed prose that does not branch on the
  actual feeds, so treat the whole view as template text with a live price, not
  as analysis.

Regenerating: `npx tsx backtest.ts` (delete `/tmp/bt` to refetch). The harness
takes ~90s and is not wired into `npm run build`.

## Authentication and secrets

The auth surface had account-takeover holes that are now closed. Do not
reintroduce the patterns below; the regression suite at
`/tmp/verify_security.py` (rerun it after touching auth) covers them.

- `APP_SECRET` signs session JWTs. Production refuses to boot without it. There
  is deliberately no fixed development fallback: the previous constant was in
  the repo, so anyone could forge an ADMIN token. Without the env var a random
  per-process secret is used and sessions do not survive a restart.
- Password reset always requires a token. Never add an email-only or
  `directReset` path — it let any caller overwrite any account's password.
- Verification, reset and magic-link URLs are never echoed in API responses
  unless `AUTH_DEV_LINK_ECHO=true` (ignored in production). This exists only for
  local work without SMTP.
- `firebase-login` verifies the Firebase ID token and ignores `email`/`uid` in
  the request body. The body is attacker-controlled; only the signed token
  proves identity.
- Registration grants `USER`/`FREE` only. Admin rights come from the admin API or
  `ADMIN_EMAILS` at startup, and `ADMIN_EMAILS` promotes existing accounts only —
  it never creates one.
- `toPublicUser()` strips `password_hash`, `salt` and billing fields. Every auth
  response must go through it.
- Rate limiting lives in `server/middleware/rateLimit.ts`. It is an in-process
  fixed-window counter, so it is per-instance and resets on restart; it needs a
  shared store if the app is ever scaled horizontally.

Bootstrap credentials: the seed creates the first admin only on an empty
database, using `ADMIN_INITIAL_PASSWORD` or a random password printed once. The
old hardcoded `Admin123!@#` is gone from the repo.

`data/*.db.json` is gitignored because it holds per-user password hashes. A
tracked copy was readable in the public repo, and because the seed's passwords
were also in the source, two ADMIN accounts could be logged into by anyone who
cloned it. That file is now a runtime artifact only — an empty database is
seeded on first boot. Do not commit it again.

Rotating the exposed credentials is an operator action, not something the code
can do: the affected password hashes remain in git history, and anything derived
from them is still valid until the passwords change. The accounts that were
seeded with known passwords (`admin@marketintel.pro`, `trader@marketintel.pro`,
`wildanmn1933@gmail.com`) should have their passwords reset, and `APP_SECRET`
should be set to a fresh value so existing session tokens stop verifying.

`scripts/rotate-compromised-credentials.ts` (`npx tsx
scripts/rotate-compromised-credentials.ts`, or `npm run
security:rotate-credentials`) automates that rotation. It compares live hashes
against the leaked file to find accounts that are *still* exposed, revokes any
leaked verification token that is still usable, and prints one-time reset links.
It is dry-run by default and only writes with `--apply`, so it can be reviewed
before it touches the database.

Verified state as of the last rotation audit: all eight accounts still carried
the leaked hash, so all eight are compromised, and all ten leaked verification
tokens had already been consumed, so no takeover was live through that path.

## Pushing to this repository

The `GITHUB_TOKEN` supplied to agents is write-capable for this repo, so
`git push` with the token embedded in the URL works:

```
git push "https://${GITHUB_TOKEN}@github.com/10tenbrother-sudo/Arah-Intraday.git" <branch>
```

Never push to `main` directly. Work lands through a branch and a pull request.
The stored remote URL may carry an expired token and hang on a password prompt;
set it per-command as above when that happens.

## Telegram channel handles

`@` is part of how handles are stored (`@name`). The admin add-channel route
accepts a plain name, `@name`, or a `t.me`/`telegram.me` link, and always
persists the canonical `@name` form. Rejecting link-shaped input at the door
matters: a pasted URL once produced a row keyed
`@https://t.me/SM_News_24h`, which never scraped and re-logged a redirect
warning every cycle, filling half the server log. Both scrapers now run stored
handles through `extractHandle` and skip rows that are not valid handles.
