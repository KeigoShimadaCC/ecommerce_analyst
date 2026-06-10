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

To be appended by the phase orchestrator.

## Progress

- [ ] Not started.

## Decision Log

- No phase decisions recorded yet.

## Surprises & Discoveries

- None yet.

## Outcomes & Retrospective

- Pending phase completion.
