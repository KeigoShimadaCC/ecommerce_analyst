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

To be appended by the phase orchestrator.

## Progress

- [ ] Not started.

## Decision Log

- No phase decisions recorded yet.

## Surprises & Discoveries

- None yet.

## Outcomes & Retrospective

- Pending phase completion.
