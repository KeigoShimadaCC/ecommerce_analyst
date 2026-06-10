# Phase 00 — Bootstrap

This phase plan is maintained per `PLANS.md`.

## Purpose

Create the runnable project foundation: Next.js app, TypeScript, Prisma, Vitest, Recharts, Python venv for pandas analyses, base quality gates, and ADR 0001 for the stack.

## Acceptance Criteria

- `web/` exists with a Next.js App Router TypeScript app.
- Prisma is installed and configured for SQLite.
- Vitest is configured but isolated from the production database.
- Recharts is installed for later chart rendering.
- `.venv/` exists with pandas available for runtime analysis scripts.
- `web/.env.example` documents `DATABASE_URL`, `CODEX_AUTH_MODE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_REASONING_EFFORT=low`.
- `npm --prefix web run typecheck`, `lint`, `test`, and `build` pass.
- `docs/decisions/0001-stack.md` records the stack choice.
- `docs/phases/phase-00-report.md` records evidence and intended commits.

## Frozen Contracts

- App directory: `web/`.
- Package manager: npm.
- Commands must match `AGENTS.md`.
- Runtime SDK packages must be dependencies by P2, but P0 may install them early if it simplifies configuration.
- Test DB isolation is mandatory from first test setup.

## North Star Acceptance Slice

Advances the base app and code-quality criteria. Cheap-query measurement, live SDK proof, and proof-artifact download are out of scope for this phase.

## Lead-Owned Gate Checklist

- Review phase report.
- Clean `web/.next` if present.
- Run typecheck, lint, test, build independently.
- Run vendor-literal scans.
- Commit, tag `phase-00-complete`, and push.

## Phase-Level Workstreams

- Scaffold `web/` with Next.js App Router, TypeScript, ESLint, Vitest, and Recharts.
- Add Prisma with SQLite and a safe test DB setup.
- Add `.env.example` and setup scripts.
- Create `.venv/` and document Python analysis path.
- Write ADR 0001 and phase report.

## Owned Files

- `web/**`
- `.gitignore`
- `docs/decisions/0001-stack.md`
- `docs/phases/phase-00-report.md`
- `phase-plans/phase-00-bootstrap.md`

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `phase-plans/phase-01-walking-skeleton.md`
- `phase-plans/phase-02-codex-engine.md`
- `phase-plans/phase-03-polish-and-proof.md`
- `phase-plans/phase-04-wow-and-submission.md`

## Orchestrator-Authored Atomic Task List

Contract frozen by the Phase 00 orchestrator on June 10 2026:

- App directory: `web/`.
- Package manager: npm, with `package-lock.json` required.
- Required scripts in `web/package.json`: `dev`, `build`, `typecheck`, `lint`, `test`, `setup`.
- Persistence foundation: Prisma configured for SQLite with a safe placeholder schema, migrations/generated-client path, and setup path that later phases can extend.
- Test isolation: Vitest must use an isolated `file:./test.db` path through `vitest.global-setup.ts`; tests must not import a production DB client.
- Python analyses: root `.venv/` with pandas installed; `.venv/` ignored by git.
- Phase gates: clean `web/.next` before typecheck if present, then run typecheck, lint, test, and build.
- Parallelism: execute serially. The tasks share dependency and configuration surfaces, so serial execution is lower-risk than worktree parallelism for this bootstrap phase.

### Task 1 — Web scaffold and dependency baseline

- Owned files: `web/**`.
- Forbidden files: all phase forbidden files, `.gitignore`, `docs/**`, and `phase-plans/**`.
- Estimate: 15 minutes.
- Parallelizable: no; creates the app/package baseline consumed by later tasks.
- Definition of done: Next.js App Router TypeScript scaffold exists in `web/`; npm dependencies are installed; `package-lock.json` exists; Recharts, Prisma, Vitest, and TypeScript/ESLint tooling are available; `web/package.json` exposes the required scripts; a minimal App Router page builds without relying on future-phase auth or data.

### Task 2 — Prisma and isolated Vitest setup

- Owned files: `web/**`.
- Forbidden files: all phase forbidden files, `.gitignore`, `docs/**`, and `phase-plans/**`.
- Estimate: 15 minutes.
- Parallelizable: no; depends on Task 1 package/config baseline.
- Definition of done: Prisma is configured for SQLite with a safe placeholder schema; `npm --prefix web run setup` can prepare/generate the local database path for later phases; Vitest uses an isolated test database through `vitest.global-setup.ts`; at least one production-code test verifies the isolated test DB configuration without importing a production DB client.

### Task 3 — Environment template, ignore rules, and Python analysis venv

- Owned files: `.gitignore`, `web/**`.
- Forbidden files: all phase forbidden files, `docs/**`, and `phase-plans/**`.
- Estimate: 10 minutes.
- Parallelizable: no; depends on the package and Prisma paths created by Tasks 1 and 2.
- Definition of done: `web/.env.example` documents `DATABASE_URL`, `CODEX_AUTH_MODE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_REASONING_EFFORT=low`; `.gitignore` ignores `.venv/`, SQLite databases, local env files, and build artifacts; root `.venv/` exists and `.venv/bin/python` can import pandas.

### Task 4 — Verification / QA gate

- Owned files: none unless returning BLOCKED with a defect brief.
- Forbidden files: all tracked files unless the orchestrator dispatches a follow-up implementation task.
- Estimate: 10 minutes.
- Parallelizable: no; runs after implementation tasks.
- Definition of done: run the exact gate sequence from the launch prompt, report pass/fail evidence for typecheck, lint, test, and build, and verify no forbidden files were touched and no git history operation was attempted.

### Task 5 — Documentation and phase report

- Owned files: `docs/decisions/0001-stack.md`, `docs/phases/phase-00-report.md`.
- Forbidden files: all phase forbidden files, `web/**`, `.gitignore`, and sibling docs not listed as owned.
- Estimate: 10 minutes.
- Parallelizable: no; runs after QA evidence exists.
- Definition of done: ADR 0001 records the stack decision; the phase report restates the launch contract, summarizes worker handoffs and gates, records deviations/surprises, lists intended atomic commits, and calls out Lead-owned remaining checks.

## Progress

- [x] (June 10 2026) Required steering docs and active phase plan read.
- [x] (June 10 2026) Phase contract frozen: app directory, npm, required scripts, Prisma/SQLite, isolated Vitest database, pandas venv, and gate order.
- [x] (June 10 2026) Orchestrator-authored atomic task list appended.
- [x] (June 10 2026) Dispatch Task 1 worker and review handoff: web scaffold/dependencies created, `npm install`, typecheck, lint, test, and build passed; only `web/**` edited.
- [x] (June 10 2026) Dispatch Task 2 worker and review handoff: Prisma SQLite setup and Vitest isolated test DB added under `web/**`; setup, typecheck, and test passed.
- [x] (June 10 2026) Dispatch Task 3 worker and review handoff: env template added, ignore rules verified, `.venv/bin/python` imported pandas 3.0.3.
- [x] (June 10 2026) Dispatch Task 4 QA worker and review handoff: typecheck, lint, test, and build passed; acceptance checks verified; no files staged.
- [x] (June 10 2026) Dispatch Task 5 docs/reporting worker and review handoff: ADR 0001 and phase report written under owned docs paths.
- [x] (June 10 2026) Finalize living sections and phase report.

## Decision Log

- Decision: Execute Phase 00 serially rather than in parallel.
  Rationale: bootstrap tasks share dependency, package, Prisma, and test configuration surfaces; serial execution avoids overlapping writes while staying inside the phase estimate.
  Date: June 10 2026.
  Author: Phase 00 orchestrator.

## Surprises & Discoveries

- npm initially attempted to use a user-level cache path with permission issues. Task 1 added `web/.npmrc` pointing npm cache at `/private/tmp/ecommerce-analyst-npm-cache`, after which `npm --prefix web install` passed.
- `next build` generated build artifacts and rewrote generated type inputs as expected; `.next` must be cleaned before the final typecheck gate.
- Prisma 7 required `prisma.config.ts` and rejected the obsolete `db push --skip-generate` flag; Task 2 used `generate` plus `db push` instead.
- Running setup/test generated `web/.env`, `web/dev.db`, and `web/test.db`; these are expected local artifacts and must remain ignored.
- pip installed pandas into `.venv/` but warned that the user cache directory was not writable; the install still succeeded and `.venv/bin/python` imported pandas 3.0.3.

## Outcomes & Retrospective

- Phase 00 achieved its intended bootstrap foundation: runnable `web/` app, npm lockfile, required scripts, Prisma/SQLite setup, isolated Vitest test database, Recharts dependency, ignored pandas `.venv/`, environment template, stack ADR, and phase report.
- Programmatic gates passed through the QA worker: typecheck, lint, test, and build. `web/.next` was absent before typecheck in the QA run, so cleanup was skipped; the Lead should still clean it before the independent rerun if build artifacts exist.
- No launch-prompt deviation was recorded. Git history, vendor-literal scans, tagging, pushing, and any visual smoke remain Lead-owned.
