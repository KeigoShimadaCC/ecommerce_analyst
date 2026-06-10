# North Star — Codex eCommerce Analyst

**Ask your store anything. Codex writes and runs the code to answer it — and shows you the code.**

## The product

Codex eCommerce Analyst is a merchant analytics web app. A store owner logs in, sees their store's data, and asks a question in plain English ("Which category drove the most revenue last month? Plot daily sales.").

Instead of guessing, the app uses the Codex SDK programmatically: it writes a real analysis script, runs it against the merchant's data in a sandboxed per-request snapshot, iterates if the script errors, and returns a verified result — the answer, a chart, and the exact code Codex executed, side by side.

## The audience

The brief frames the audience as merchants at a major eCommerce platform. The reviewer audience is OpenAI's hiring team evaluating a Codex Development Engineer candidate. Optimize for both: build a product a merchant would use, with engineering legibility a Codex reviewer can grade. The two demands rhyme — both reward verifiable code over plausible chat.

## Why this has a wow factor (the pre-registered bar)

"Wow" must be specified before building, not discovered in review. The bar for this project is concrete:

- **Verifiably real, not a hallucination.** The answer comes from code that actually ran on the data, and the app shows that code and its execution trail next to the chart.
- **You watch Codex engineer, not chat.** The visible loop — pick a tool (Node for light aggregations, Python+pandas for heavier analysis), write the script, run it, read the output or error, iterate until correct — is a core feature, not polish.
- **Demo data is rich and realistic from day one.** The seed must support trends, seasonality, multiple product categories, customers, regions, and margins. Minimum targets: two demo merchants, ≥10 products per merchant in ≥3 categories, ≥100 customers, ≥4 regions, ≥18 months of orders with visible seasonality, ≥1,500 orders per merchant, both revenue and cost-of-goods (margins) computable. A toy seed disqualifies the demo by making every chart look fake.
- **The dashboard leads with visualizations.** KPI tiles plus at least one trend chart are visible on first paint. The result page leads with the verified answer plus its chart, with the generated-code and command-log panel directly beneath.
- **The proof uses the normal merchant path.** The final live proof is not an engine-only script: it must run through login → dashboard ask form → SDK turn → saved result page, with the generated-code and command-log panels visible on the page.
- **The Loom recording lands the assignment-critical point in under 60 seconds:** "Codex wrote real pandas, ran it in a sandbox against this merchant's data, and returned a verified result. Here's the code."
- **The demo has a measured cheap-query set.** The live demo path must include three bounded, chart-shaped questions that are expected to finish quickly and must be measured during development:
  1. `For May 2026, show total revenue by region as a bar chart and recommend the region to focus next month.`
  2. `For May 2026, show revenue by category as a bar chart.`
  3. `Show total revenue by month for the latest six months.`
  Each query must be tested against the live SDK path before submission and recorded with runtime, fallback status, attempt count, generated-code length, command-log length, and whether the chart was non-empty. Acceptance per query is **≤ 90 seconds measured on the live SDK path**, comfortably inside the 120-second hard timeout. If a query measures over 90 seconds, apply the re-phrasing protocol before accepting it: re-phrase once toward explicit aggregation language (name the metric, the grouping, the period, and the chart type in one sentence), re-measure, and pin whichever phrasing is faster as the recording query. Record both measurements. Broad compound questions are not demo-critical and are never the first live proof.
- **The result is portable.** The result view must offer a download button for the analysis deliverable. Preferred deliverable: a ZIP containing the original question, `result.json`, the generated analysis script/code, command log, lightweight metadata, and a snapshot of the data Codex saw for that run. If ZIP packaging is cut for time, a single JSON download is the MVP fallback, but it must still include the question, code, result, command log, metadata, and data snapshot; the README and demo must state the limitation honestly.

## Required elements (per the brief) → how this product satisfies them

- **Login / authorization** → custom session auth (hashed passwords, signed httpOnly cookies, server-side session table) with strict per-merchant data isolation in every read path.
- **Data persistence** → SQLite via Prisma: merchants, seeded store data (products, customers, orders, regions, margins), and full analysis history per merchant (question, generated code, command log, runtime, result, chart, attempts, fallback status).
- **Meaningful tests** → auth and tenant-isolation tests (a merchant cannot read another's data), result-schema validation tests, engine happy-path and bounded-retry-then-fallback and timeout tests via an injectable runner, deterministic analysis correctness on a fixed seed, and **at least one known-answer correctness test**: because the seed is deterministic, the expected values for the pre-registered demo queries (e.g., the May 2026 revenue-by-region totals and the leading region) are computable in advance and asserted exactly. Schema validity proves execution succeeded; the known-answer test proves the answer is right.
- **Programmatic Codex** → the Codex SDK is invoked server-side per analysis request, in a sandboxed per-request workdir holding only the requesting merchant's data, returning a file-based result validated against an own Zod schema. The app never shells out to the Codex CLI from runtime code.

## Core flow

Login → seeded store dashboard with KPIs and a trend chart → ask a question through the dashboard form → "Codex is writing code" indicator → Codex writes and runs analysis code (sandboxed, on a per-request data snapshot, no network, hard timeout) → Zod-validated result (answer + chart data + generated code + command log) → rendered as chart + answer + visible code → saved to history → revisit any past analysis with its code and result intact.

The saved result also exposes a download action so the merchant/reviewer can take the verified analysis artifact away from the app. The preferred artifact is a ZIP containing the original question, validated result, generated script/code, command log, lightweight metadata, and the per-request data snapshot Codex saw.

## Architecture (high level)

- **App:** Next.js (App Router) + TypeScript, in `web/`.
- **Persistence:** SQLite + Prisma, migrations in `web/prisma/migrations/`.
- **Auth:** minimal custom session (scrypt or bcrypt for passwords, HMAC-signed httpOnly cookie, server-side session table, injectable session repository for testability).
- **Codex engine:** server module in `web/src/lib/codex/` and `web/src/lib/analysis/` that per request:
  1. snapshots the merchant's rows to a temp `mkdtemp` directory as `data.json` plus `data.csv`, and additionally writes small pre-aggregated summary files — `monthly_revenue.csv`, `revenue_by_region.csv`, `revenue_by_category.csv` (each ≤ a few KB, computed from the same rows at snapshot time). The summaries exist so common questions never require scanning the full order history.
  2. invokes the Codex SDK with a prompt that includes the result-contract shape and a data dictionary, explicitly tells the model to prefer the pre-aggregated summary files when they can answer the question, and to avoid reading the full `data.json` (the raw files exist for questions the summaries cannot answer), with `sandboxMode: "workspace-write"`, `approvalPolicy: "never"`, and network disabled,
  3. reads `result.json`, validates it against the centralized Zod schema, retries with a corrective turn on validation failure (bounded to 2 attempts) — but skips the corrective turn and falls back immediately if fewer than 40 seconds remain in the 120-second envelope (a retry launched into an exhausted budget is a guaranteed timeout and a slower failure than an honest fallback), falls back to a schema-valid stub on timeout or unrecoverable failure,
  4. persists the validated result with its generated code and command log.
- **Charts:** Recharts, rendered in the frontend from validated chart payloads.
- **Result contract** (locked, lives in `web/src/lib/analysis/result.ts`):

```ts
ResultSchema = {
  answer:     string,           // required
  table?:     Row[],            // optional rows
  chart?:     {                 // optional chart
    type: 'bar' | 'line' | 'pie',
    data: { label: string, value: number }[]
  },
  notes?:     string,           // optional explanatory notes
  // captured by the app, not by the model:
  generatedCode: string,        // what Codex wrote
  commandLog:    CommandEntry[],// what Codex ran
  runtimeMs:     number,
  attempts:      number,
  fallback:      boolean
}
```

The model-emitted portion (answer/table/chart/notes) uses `.strict()` Zod parsing so unexpected top-level keys are caught. The app captures the other fields itself; they are not the model's responsibility.

## Engineering principles (the non-negotiables)

- **Never a broken UX.** Validate every Codex output; fall back gracefully on timeout or invalid output; bound runtime with a hard timeout. The user never sees a stack trace.
- **Per-tenant isolation by construction.** Codex only ever sees a per-request snapshot directory containing one merchant's rows. Codex is never given a database connection.
- **Read-only analytics core.** The runtime engine reads and computes; it does not write back. If a future feature mutates state, it must follow the rules in AGENTS.md.
- **Two layers of Codex, clearly separated.** Build-time CLI vs runtime SDK; runtime code never shells out to the CLI.
- **Build-time effort is role-scoped and logged.** Lead judgment uses the most reasoning, phase orchestration uses high reasoning, and focused workers default lower; the harness must not inherit a personal global setting silently.
- **Documentation in the same phase as the work.** Stale docs are worse than missing ones.
- **Atomic Conventional Commits.** The commit log is part of the submission and should read as a portfolio narrative.
- **Zero references to any agent tooling vendor** anywhere in the repo (files, docs, comments, filenames, commit messages, co-author trailers).

## Milestones (4-hour focused build)

Times below are focused Codex build time for this project shape. Pre-build (NORTH_STAR.md, AGENTS.md, phase plans, harness, spike) happens before the clock starts.

**Pre-build harness smoke (before P0, before the clock starts):** inspect the active Codex CLI config and environment, then launch one throwaway one-line `scripts/codex-run.sh` session and confirm a complete ledger row lands in `logs/sessions/ledger.tsv` — timestamp, label, role, model, reasoning effort, exit code, wall-clock seconds, and summed `input_tokens`+`output_tokens`. Token extractors that grep for `total_tokens` instead of summing `input_tokens + output_tokens` silently log `NA`; a `read`-under-`set -e` can silently drop rows; a missing model/effort column silently inherits global config. All three are invisible until a real session runs. Do not start P0 until the measurement chokepoint is proven to record.

- **P0 — Bootstrap:** scaffold Next.js + Prisma + Vitest + Recharts, set up the venv (pandas), generate phase plans, ADR 0001 (stack), all quality gates green. ~20 min.
- **P1 — Walking skeleton:** custom session auth, seeded store data (matching the wow bar above), guarded dashboard, deterministic stubbed analysis end-to-end (login → ask → canned result persisted → shown), history. ~50 min.
- **P2 — Codex engine:** real Codex SDK integration with the snapshot/client/prompt/engine modules, centralized Zod result contract, injectable runner, bounded retry with corrective turn, graceful fallback, generated-code and command-log panels, mock-runner tests. ~30 min (after spike retires the risk).
- **Verify:** run `npm run build` (not just typecheck), one real live turn with a new question, visual smoke. ~15 min.
- **P3 — Polish:** `npm run setup`, root README citing the engine files and containing a "Why Codex" section (what the SDK does that a chat call cannot: writes and executes real code against real data with a verifiable trail), a short architecture overview (diagram or tight prose: request → snapshot → SDK → validation → persistence), and a rollout-posture paragraph (read-only analytics core, per-tenant snapshot isolation, no network, hard timeout — and what approval-gated write actions would require), demo script, ADR for the engine design, any bug fixes the live turn exposed. ~25 min.
- **Wow upgrade:** exactly one — richer seed data refinement OR a second insight chart on the dashboard. Pick one you can finish. ~30 min.
- **Rehearse and record:** reseed, walk the click path, pre-warm the session, record the 5-minute Loom. ~30 min.
- **Hotfix buffer:** reserved against overruns. ~30 min.

Total target: 230 min focused build + 30 min Loom inside a 4-hour window with a multi-day overall budget for hotfixes and submission packaging.

## Honestly deferred / out of scope

Marking these explicitly so the README and the Loom don't promise them:

- **Live streaming progress** via `runStreamed()`. The buffered path is more reliable for a recorded demo; streaming is the obvious next enhancement.
- **Action-taking** (safe catalog mutations). Stretch goal at the original brief level; deferred to keep the analytics core strictly read-only.
- **Multi-turn analysis conversations.** Each analysis is a fresh request.
- **Token-cost extraction surfaced in the UI.** The harness measures tokens; the UI does not yet display per-analysis cost.

## Definition of done

All required elements working end-to-end; every quality gate green (typecheck, lint, test, build); at least one known-answer correctness test asserts exact expected values computed from the fixed seed for a pre-registered demo query; one real end-to-end live SDK turn demonstrably ran through the normal app path at submission with a new question (not in the test suite) and a non-empty generated-code panel — the SDK integration is the assignment, so it is proven live at the close, not only per-phase; the README cites the exact engine files (`snapshot.ts`, `client.ts`, `prompt.ts`, `engine.ts`, `result.ts`) and includes "Why Codex", "Architecture", and rollout-posture sections; a 5-minute Loom recorded; ADRs document the stack choice and the engine design; the analysis history shows generated code and command logs for past analyses; demo merchant credentials are documented; one focused phase tag per completed phase.

Submission-specific DoD: the three cheap demo queries above have live measurements recorded, at least one passes non-fallback with a non-empty chart and generated code, and the result page includes a deliverable download button (ZIP preferred; JSON fallback explicitly documented if used).

Optional (record as deferred if cut): a committed `proof/<analysis-id>/` bundle from one real live turn — question, generated code, `result.json`, command log, and a snapshot manifest — so the assignment-critical claim is inspectable without running the app.
