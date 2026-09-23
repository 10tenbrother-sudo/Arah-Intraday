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
`socat` is not installed; a small Node TCP proxy works.

## Environment
- `.env` (gitignored) supplies `GEMINI_API_KEY`. Without it the AI layer falls
  back to heuristic mode instead of calling Gemini.
- The Gemini key is a live, working credential. Model names in
  `server/intelligence/gemini.ts` (`gemini-3.8-flash`, `gemini-3.1-flash-lite`)
  are real and correct for the current catalog — do not "fix" them. The primary
  model frequently returns 429 and the fallback 503; the engine's retry/failover
  and its deterministic grounded-synthesis fallback are working as intended, so
  those log lines are not a bug.
- Storage is a single JSON file at `data/market_intelligence.db.json` (file-based
  relational engine in `server/db/database.ts`). It mutates on every run, so
  revert it before committing unrelated changes.
- Seeded demo login: `trader@marketintel.pro` / `Trader123!`
  (`server/auth/authService.ts`).

## Package manager
The repo ships `bun.lock`, but bun is not installed here and the sandbox npm
prefix is not writable for global installs. `npm install --legacy-peer-deps`
is the working path. It generates `package-lock.json`, which is not part of the
repo's intended toolchain.

## GitHub access
`GITHUB_TOKEN` in this environment is a GitHub App installation token with
**read-only** access (`x-oauth-scopes` empty; writes return
`Resource not accessible by integration`). Fetching and cloning work; pushing,
opening PRs, and creating issues do not. Produce a patch with
`git format-patch` for the user to apply when write access is unavailable.

## Conventions
- UI primitives live in `src/components/ui/` and follow shadcn/Radix patterns
  (see `components.json`); shared composites in `src/components/shared/`.
- Class merging goes through `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge).
- Design skills from the taste-skill bundle are installed under `.agents/skills/`.
