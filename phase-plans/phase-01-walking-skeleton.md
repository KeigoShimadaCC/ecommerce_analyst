# Phase 01 — Walking Skeleton

This phase plan is maintained per `PLANS.md`.

## Purpose

Deliver the merchant path without the live SDK: login, rich seeded data, guarded dashboard, ask form, deterministic stub analysis, persisted history, and result rendering.

## Acceptance Criteria

- Custom session auth works with hashed passwords, signed httpOnly cookies, and server-side sessions.
- Seed creates at least two merchants, at least 10 products per merchant across at least three categories, at least 100 customers, at least four regions, at least 18 months of orders, at least 1,500 orders per merchant, and cost data for margins.
- Dashboard is guarded by authenticated merchant session and shows KPI tiles plus at least one trend chart on first paint.
- All read paths filter by authenticated `merchantId`.
- Ask form persists a deterministic stubbed analysis with answer, chart, generated-code placeholder, command-log placeholder, runtime metadata, attempts, and fallback status.
- History page/list can reopen a saved analysis.
- Known-answer correctness test asserts exact expected values for at least one pre-registered demo query against the deterministic seed.
- Empty-list and zero-value render tests do not leak literal `0`.
- Quality gates pass.
- `docs/phases/phase-01-report.md` records evidence and intended commits.

## Frozen Contracts

- Auth source of truth: authenticated session supplies `merchantId`; request input never supplies tenant identity.
- Stub analysis must persist in the same database shape the real engine will later use.
- React conditional rendering must use explicit comparisons, not truthy numeric checks.
- Tests must use isolated `file:./test.db`.

## North Star Acceptance Slice

Advances login/authorization, data persistence, rich demo data, dashboard visualizations, saved history, and known-answer correctness. Live SDK proof and proof-artifact download are out of scope.

## Lead-Owned Gate Checklist

- Review phase report.
- Clean `web/.next` if present.
- Run typecheck, lint, test, build independently.
- Run production server HTTP form-flow evidence if the orchestrator provides it; perform visual smoke if available.
- Run vendor-literal scans.
- Commit, tag `phase-01-complete`, and push.

## Phase-Level Workstreams

- Define Prisma schema and deterministic seed.
- Implement custom auth and session helpers.
- Implement guarded dashboard and seeded charts.
- Implement stub analysis submit/result/history flow.
- Add auth, tenant isolation, seed correctness, and rendering tests.
- Write phase report and any ADR required by non-obvious auth/data decisions.

## Owned Files

- `web/**`
- `docs/decisions/**`
- `docs/phases/phase-01-report.md`
- `phase-plans/phase-01-walking-skeleton.md`

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `phase-plans/phase-00-bootstrap.md`
- `phase-plans/phase-02-codex-engine.md`
- `phase-plans/phase-03-polish-and-proof.md`
- `phase-plans/phase-04-wow-and-submission.md`

## Orchestrator-Authored Atomic Task List

Launch-prompt restatement: this session is Tier 2 Phase Orchestrator for Phase 01. Scope is the walking skeleton only: rich deterministic seed data, custom session auth, guarded dashboard, deterministic stub analysis persistence, result/history rendering, tests, programmatic gates, and phase report. Orchestrator-owned writes are limited to this active phase plan, `docs/phases/phase-01-report.md`, and filled worker briefs if persisted. Forbidden files remain `NORTH_STAR.md`, `AGENTS.md`, `PLANS.md`, `RUNBOOK.md`, root `prompts/**`, and other phase plans. Definition of done is all Phase 01 acceptance criteria met, gates/evidence recorded, no forbidden-file touches, no git history operations, and deviations explicitly handed off.

Frozen Phase 01 route contract:
- `/login`: unauthenticated sign-in form; successful login creates a signed httpOnly session cookie backed by a server-side session row.
- `/logout`: clears the session cookie and expires/deletes the server-side session.
- `/dashboard`: guarded merchant dashboard; all reads derive `merchantId` from the authenticated session.
- `/dashboard` ask form or same-route server action: persists deterministic stub analysis for the authenticated merchant.
- `/analyses`: guarded history list for the authenticated merchant.
- `/analyses/[id]`: guarded saved result page; only opens analyses owned by the authenticated merchant.

Frozen Phase 01 data/result contract:
- Prisma models must support merchants, users, sessions, products, customers, regions, orders/order lines, and persisted analysis runs.
- Seed must create at least two merchants, at least 10 products per merchant across at least three categories, at least 100 customers, at least four regions, at least 18 months of orders with visible seasonality, at least 1,500 orders per merchant, and cost data for margin calculations.
- Demo credentials must be deterministic and documented in the phase report.
- Stub analysis rows must persist: question, validated answer payload, chart payload, generated-code placeholder, command-log placeholder, runtime metadata, attempts, fallback status, and timestamps.
- Known-answer coverage must assert exact values for: `For May 2026, show total revenue by region as a bar chart and recommend the region to focus next month.`

Atomic tasks:

1. **Data Schema And Deterministic Seed**
   - Owned files: `web/prisma/schema.prisma`, `web/scripts/setup.mjs`, `web/src/lib/config/database.ts`, `web/src/lib/data/**`, `web/src/lib/analytics/**`, seed-focused tests under `web/src/**/*.test.ts`.
   - Forbidden files: all phase forbidden files; UI route files under `web/src/app/**` except adding seed-independent test fixtures if strictly necessary; auth files under `web/src/lib/auth/**`.
   - Estimate: 20 minutes.
   - Parallelizable: no; this freezes the schema and seed contract for downstream workers.
   - Definition of done: `npm --prefix web run setup` creates/updates `web/.env`, pushes Prisma schema, seeds deterministic demo data, prints demo credentials and cardinalities; tests assert seed cardinalities and exact May 2026 revenue-by-region known answer; no production DB client is imported by tests outside the isolated test setup.

2. **Custom Session Auth**
   - Owned files: `web/src/lib/auth/**`, `web/src/app/login/**`, `web/src/app/logout/**`, `web/src/middleware.ts`, auth-focused tests under `web/src/**/*.test.ts`.
   - Forbidden files: all phase forbidden files; seed generator internals except type imports; dashboard/result/history route implementations.
   - Estimate: 20 minutes.
   - Parallelizable: starts after Task 1 schema exists; then independent of Task 3 UI data aggregations.
   - Definition of done: passwords are hashed with Node crypto, sessions are server-side records, cookies are signed and httpOnly, expired/missing sessions redirect to `/login`, logout invalidates the session, and tests cover successful login, rejected login, session expiration, logout, and merchant isolation source of truth.

3. **Dashboard Data And Guarded First Paint**
   - Owned files: `web/src/lib/dashboard/**`, `web/src/components/**`, `web/src/app/dashboard/**`, `web/src/app/page.tsx`, `web/src/app/globals.css`, dashboard/render tests under `web/src/**/*.test.ts`.
   - Forbidden files: all phase forbidden files; auth internals except imports; analysis persistence internals except imports.
   - Estimate: 20 minutes.
   - Parallelizable: starts after Tasks 1 and 2 expose seed/auth contracts; independent of result-detail rendering once shared components are stable.
   - Definition of done: authenticated dashboard shows KPI tiles and at least one trend chart on first paint, unauthenticated requests are guarded, all reads accept/derive only session merchant identity, and render tests cover empty arrays and zero values without literal `0` leakage.

4. **Stub Analysis Submit, History, And Result Pages**
   - Owned files: `web/src/lib/analysis/**`, `web/src/app/analyses/**`, `web/src/app/dashboard/**` ask action/form integration, `web/src/components/**` analysis panels, `web/src/app/globals.css`, analysis-flow tests under `web/src/**/*.test.ts`.
   - Forbidden files: all phase forbidden files; seed generator internals except imports; auth internals except imports.
   - Estimate: 25 minutes.
   - Parallelizable: starts after Tasks 1 and 2; coordinate with Task 3 if both touch shared dashboard/components files.
   - Definition of done: ask form persists deterministic stub analysis with the frozen data/result contract, saved result pages render answer/chart/generated-code/command-log panels, history lists only the authenticated merchant's runs, cross-merchant access is rejected, and tests cover result reopening plus empty/zero states.

5. **Walking-Skeleton Integration Tests And Polish**
   - Owned files: `web/src/**/*.test.ts`, `web/vitest.setup.ts`, `web/vitest.config.ts`, small fixes in `web/src/**` only when required to make previously dispatched code meet the phase contract.
   - Forbidden files: all phase forbidden files; no schema or seed-contract changes unless escalated back to the orchestrator.
   - Estimate: 15 minutes.
   - Parallelizable: no; runs after implementation tasks.
   - Definition of done: Phase 01 test coverage includes auth, tenant isolation, seed cardinalities, known-answer correctness, guarded dashboard rendering, saved-result reopening, and no numeric falsy render leaks; local gates run as far as practical before the verification worker.

6. **Verification / QA Gate**
   - Owned files: no source edits unless returning BLOCKED; may write gate notes only through handoff.
   - Forbidden files: all phase forbidden files and all application files.
   - Estimate: 15 minutes.
   - Parallelizable: no; review gate only after implementation.
   - Definition of done: cleans `web/.next` with Node `fs.rm` if present, runs setup, typecheck, lint, test, and build independently; starts `next start` on an available port, produces HTTP evidence for login page, credentialed session, guarded dashboard, ask/result/history route flow or documents a server-action limitation with strongest route evidence; no `next dev` evidence.

7. **Docs / Phase Report**
   - Owned files: `docs/phases/phase-01-report.md`, living sections of `phase-plans/phase-01-walking-skeleton.md`.
   - Forbidden files: all phase forbidden files and all application files.
   - Estimate: 10 minutes.
   - Parallelizable: no; requires verification evidence.
   - Definition of done: phase report includes launch-prompt fidelity, worker summaries, files changed, demo credentials, route map, seed cardinalities, known-answer coverage, HTTP evidence, gate outcomes, deviations, intended atomic commit breakdown, and Lead-owned remaining checks.

## Progress

- [x] 2026-06-10 — Orchestrator read required docs and froze Phase 01 route/data/result/auth contracts.
- [x] 2026-06-10 — Orchestrator appended atomic task list for worker dispatch.
- [x] 2026-06-10 — Task 1 data/schema/seed worker completed with setup, seed cardinalities, and exact May 2026 known-answer tests passing.
- [x] 2026-06-10 — Task 2 auth worker completed custom password/session/cookie/logout flow with focused auth tests passing.
- [x] 2026-06-10 — Task 3 dashboard worker completed guarded first paint with KPI tiles, trend chart, and render tests.
- [x] 2026-06-10 — Task 4 analysis/history worker completed deterministic stub submit/result/history flow with focused analysis tests.
- [x] 2026-06-10 — Task 5 integration-test worker fixed shared SQLite test locking and passed full test, typecheck, and lint gates.
- [x] 2026-06-10 — Task 6 verification/QA worker passed setup, typecheck, lint, test, build, and production-server HTTP evidence.
- [x] 2026-06-10 — Task 7 docs/reporting worker completed `docs/phases/phase-01-report.md` and finalized these living sections.

## Decision Log

- 2026-06-10 — Decision: keep Phase 01 on deterministic stub analysis only and route saved outputs through the same persisted `AnalysisRun` shape that P2 will fill. Rationale: this satisfies the walking skeleton while preserving the North Star proof panels for the later live SDK engine.
- 2026-06-10 — Decision: run implementation mostly serially despite available subagents. Rationale: schema, auth, and route contracts are tightly coupled at this scaffold stage; premature parallel edits to `web/src/app/**` would increase integration risk inside a short phase.
- 2026-06-10 — Decision: use contained `node:sqlite` helpers for Phase 01 runtime reads/writes instead of Prisma Client calls. Rationale: workers found Prisma 7 Client construction requires a driver adapter not present in this scaffold; schema remains Prisma-owned and `db push` validates it, while adding dependency/config changes was outside the current atomic tasks.

## Surprises & Discoveries

- 2026-06-10 — `web/.next` already exists before Phase 01 gates; verification must remove it with Node `fs.rm` before typecheck per AGENTS.md.
- 2026-06-10 — Existing scaffold has only `Merchant` and a minimal `AnalysisRun`; Phase 01 requires a schema expansion before auth/dashboard workers can proceed.
- 2026-06-10 — Amended UI worker ownership to include `web/src/app/globals.css`; the runnable dashboard/result surfaces need shared styling and the file is inside Phase 01's `web/**` ownership.
- 2026-06-10 — Full Vitest initially failed with SQLite `database is locked` when seed and auth suites shared `web/test.db`; integration worker isolated those suites onto per-suite temporary database files and full tests passed afterward.
- 2026-06-10 — `web/package.json` has no `start` script; verification served the production build with `PORT=3001 npm exec next start` and completed HTTP route evidence. Record as a Phase 01 deviation for Lead review rather than changing package scripts after gates.
- 2026-06-10 — Raw Server Action POSTs worked for HTTP evidence but logged missing-origin warnings; production route evidence still completed.
- 2026-06-10 — Turbopack emitted a non-failing warning about an unexpected NFT file during production build.

## Outcomes & Retrospective

- Phase 01 acceptance criteria are met for the deterministic walking skeleton: login, guarded dashboard, seeded analytics, deterministic stub analysis submission, saved result detail, and analysis history all work through the normal app routes.
- Final sandbox evidence passed: setup, typecheck, lint, test (8 files / 23 tests), build, and authenticated production-server HTTP checks on `http://localhost:3001`.
- Live SDK proof is intentionally out of scope until P2+; Phase 01 persisted the result/code/command-log shape that the later engine will fill.
- Lead-owned remaining checks: vendor-literal scans, optional independent gate reruns, visual smoke, atomic commits, `phase-01-complete` tag, and push.
