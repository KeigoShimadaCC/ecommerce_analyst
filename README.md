# Codex eCommerce Analyst

Codex eCommerce Analyst is a merchant analytics app. A store owner logs in, asks a plain-English question, and the server uses the Codex SDK to write and run a real analysis script against that merchant's snapshot. The saved result shows the answer, chart, generated code, command log, and a downloadable JSON proof artifact.

## Why Codex

This is not a chat-over-CSV demo. Codex is useful here because the task is code-shaped: inspect files, choose an analysis approach, write `analysis.py` or `analysis.mjs`, execute it in a constrained workspace, write `result.json`, and expose the code and command trail for review. The app validates the file result with its own Zod schema before persistence.

## Quick Start

```bash
npm --prefix web install
npm --prefix web run setup
PORT=3001 npm --prefix web run dev
```

Then open `http://localhost:3001`.

Demo credentials:

- `owner@aurora.example` / `demo-aurora-2026`
- `owner@harbor.example` / `demo-harbor-2026`

Useful commands:

```bash
npm --prefix web run setup
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test
npm --prefix web run build
```

Production-style local run:

```bash
npm --prefix web run build
cd web
PORT=3001 npm exec next start
```

## Reviewer Fast Path

If you only have five minutes, verify these:

1. Install and run:

   ```bash
   npm --prefix web install
   npm --prefix web run setup
   PORT=3001 npm --prefix web run dev
   ```

2. Log in:

   - `owner@aurora.example` / `demo-aurora-2026`

3. Main proof path:

   - Open the dashboard.
   - Ask: `Which region had the highest paid revenue in May 2026? Show the regional revenue bar chart and explain the gap to the runner-up.`
   - Confirm the saved result page shows a validated answer, chart, generated code, command log, and `Proof JSON` download.
   - Open history and confirm the saved result is reopenable.

4. Code proof:

   - Codex SDK boundary: `web/src/lib/codex/client.ts`
   - Prompt contract: `web/src/lib/codex/prompt.ts`
   - Engine, retry, fallback: `web/src/lib/codex/engine.ts`
   - Strict result schema: `web/src/lib/analysis/result.ts`
   - Proof artifact: `web/src/lib/analysis/proof-artifact.ts`

5. Quality gates:

   ```bash
   npm --prefix web run typecheck
   npm --prefix web run lint
   npm --prefix web run test
   npm --prefix web run build
   ```

## Environment

`npm --prefix web run setup` creates `web/.env` when needed and adds `DATABASE_URL="file:./dev.db"` if missing.

Runtime Codex env names:

- `CODEX_AUTH_MODE=ambient` by default
- `OPENAI_API_KEY=` only for API mode or failover
- `OPENAI_MODEL=gpt-5.5` for API mode
- `OPENAI_REASONING_EFFORT=low` for API mode

The recorded app-path proof used ambient CLI auth. API mode is supported by the resolver but was not exercised through the recorded login -> dashboard -> SDK -> result path.

## Architecture

```text
Login/session cookie
  -> dashboard ask form
  -> server action loads authenticated merchant id
  -> merchant-only snapshot directory
       data.json
       data.csv
       monthly_revenue.csv
       revenue_by_region.csv
       revenue_by_category.csv
       data_dictionary.md
  -> Codex SDK server-side thread
       workspace-write sandbox
       approval never
       network disabled
       120s global timeout
  -> generated analysis.py / analysis.mjs
  -> executed script writes result.json
  -> strict Zod validation
  -> SQLite persistence
  -> result page: answer, chart, generated code, command log, proof JSON
```

Key files:

- `web/src/lib/codex/snapshot.ts`
- `web/src/lib/codex/client.ts`
- `web/src/lib/codex/prompt.ts`
- `web/src/lib/codex/engine.ts`
- `web/src/lib/codex/work-trail.ts`
- `web/src/lib/analysis/result.ts`
- `web/src/lib/analysis/runs.ts`
- `web/src/lib/analysis/proof-artifact.ts`

## Proof Path

On a saved result page:

- The answer and chart are rendered from validated persisted payloads.
- The generated-code panel shows the script Codex wrote.
- The command-log panel shows executed commands and output.
- `Proof JSON` downloads `/analyses/<analysis-id>/proof`.

The JSON proof artifact includes the question, answer payload, chart payload, generated code, command log, runtime metadata, attempts, fallback status, and a data snapshot payload. The snapshot in the artifact is regenerated at download time from the authenticated merchant's current database rows; it is not the original temporary SDK directory.

## Recorded Evidence

Phase 02 final live proof:

- Normal app path: login -> dashboard ask -> real SDK turn -> saved result -> history reopen
- Question: `Which region had the highest paid revenue in May 2026? Show the regional revenue bar chart and explain the gap to the runner-up.`
- Runtime: 53,637 ms
- Attempts: 1
- Fallback: false
- Generated code length: 2,614
- Command log length: 4,617
- Chart: non-empty, `currency_cents`, West `236640`

Phase 03 finish:

- Result chart was changed to a compact horizontal bar list with visible currency values.
- Proof JSON artifact route and result-page link were added.
- Focused analysis tests passed, including proof artifact and chart rendering coverage.
- Production visual check on port 3001 verified the saved result chart, generated-code panel, command-log panel, and authenticated proof JSON download for `analysis-678fddc6-62bc-456b-ab32-f4522fcacf99`.
- Final local gates passed: typecheck, lint, clean full test, build, and runtime shell-out scan. The build keeps the known Turbopack tracing warning.

Final submission live proof:

- Normal app path: login -> dashboard ask form -> real SDK turn -> persisted result page -> history list -> proof JSON download.
- Question: `For May 2026, show paid revenue by category as a bar chart and recommend which category to feature next month.`
- Analysis ID: `analysis-f3e6e047-e5c4-4947-a24e-be16da543030`
- Runtime: 47,901 ms
- Attempts: 1
- Fallback: false
- Generated code length: 2,105
- Command log length: 5,547
- Chart: non-empty, `currency_cents`, `Home:267840|Coffee:264720|Apparel:177840|Beauty:106560`
- Proof JSON: authenticated download succeeded with question, result payloads, generated code, command log, runtime metadata, and six regenerated snapshot files.

## Shipped vs Deferred

| Area | Shipped | Deferred |
| --- | --- | --- |
| Codex integration | Server-side Codex SDK, per-merchant snapshot, generated script, command log, validated `result.json` | Streaming SDK progress UI |
| Auth | Demo login, signed httpOnly cookie, server-side sessions, merchant-scoped access | Production identity provider or SSO |
| Persistence | SQLite via Prisma, seeded merchant data, saved analysis history | Hosted database and migration hardening |
| Proof | JSON proof artifact with question, result payloads, generated code, command log, runtime metadata, regenerated snapshot contents | ZIP artifact and original runtime temp snapshot persistence |
| Safety | Read-only analytics, no runtime network access, approval policy `never`, 120-second timeout, fallback path | Approval-gated write actions |
| API mode | Resolver supports API mode | Recorded app-path proof used ambient auth, not API mode |

## Rollout Posture

This is a read-only analytics core. Codex receives only a per-request merchant snapshot, not a database connection. Runtime SDK calls disable network access, run with approval policy `never`, and have a 120-second global timeout with schema-valid fallback. Future write actions, such as catalog edits or pricing changes, should require explicit approval gates, audit review, and eval coverage before rollout.

Recommended rollout path:

1. Pilot with read-only analytics for one merchant cohort.
2. Track runtime, fallback rate, generated-code presence, command-log presence, and known-answer evals.
3. Add approval-gated write actions only after the read-only workflow is trusted.
4. Keep per-tenant snapshot isolation and proof artifacts as audit requirements.

## Limitations

- The app-path proof used ambient auth; API app-path proof was not run.
- Proof JSON uses a regenerated download-time snapshot rather than persisting the original SDK temp directory.
- The build currently passes with a Turbopack tracing warning.
- No streaming SDK progress UI is shipped; the form shows immediate loading and a 15-second still-considering state.
- No optional wow upgrade was attempted after P2; finishing work prioritized reliability, proof, README, and submission evidence.
