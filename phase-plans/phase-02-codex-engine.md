# Phase 02 — Codex Engine

This phase plan is maintained per `PLANS.md`.

## Purpose

Replace the stub with the assignment-critical runtime SDK engine: per-merchant snapshot, Codex writes and runs a durable script, app validates `result.json`, captures code and command log, persists the verified result, and falls back gracefully on failure.

## Acceptance Criteria

- `web/src/lib/analysis/result.ts` centralizes the strict Zod result schema.
- `web/src/lib/codex/` contains snapshot, client, prompt, engine, and module README files.
- Runtime code imports `@openai/codex-sdk` and never shells out to the CLI.
- `next.config.ts` externalizes `@openai/codex-sdk` and `@openai/codex`.
- Each engine call uses a per-request snapshot directory populated only from `where: { merchantId }`.
- Snapshot includes raw data plus small pre-aggregated summaries for common demo queries.
- Runtime SDK call sets workspace-write, approval never, network disabled, skip git repo check, and 120-second timeout.
- Prompt requires writing and executing `analysis.mjs` or `analysis.py` before writing `result.json`.
- Validation failure triggers at most one corrective turn when enough budget remains; otherwise fallback is persisted.
- Fallback result is schema-valid and preserves any generated code/command log captured.
- Runner, snapshot provider, and persistence are injectable for tests.
- Tests cover happy path, strict-schema rejection, retry-then-fallback, timeout, dependency throw, generated-code non-empty success, and tenant isolation.
- `rg -n 'child_process|spawn\\(|codex exec' web/` has no runtime violation.
- Quality gates pass.
- `docs/phases/phase-02-report.md` records evidence, live-turn readiness, and intended commits.

## Frozen Contracts

- Model-emitted result keys: `answer`, optional `table`, optional `chart`, optional `notes`; strict parsing rejects extras.
- App-captured fields: generated code, command log, runtime, attempts, fallback.
- Runtime env names: `CODEX_AUTH_MODE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`.
- API model validation allowlist: GPT-5 family only, reject nano variants.
- Ambient auth is default; API auth is opt-in/failover only.

## North Star Acceptance Slice

This phase advances the core assignment claim: Codex writes and runs real code against a per-request merchant snapshot and the UI shows the verified result plus code. The Lead review gate must run one real normal-app-path SDK turn with a question outside the test suite and verify the generated-code panel is non-empty. P2 also starts demo-query phrasing measurements for the primary query.

## Lead-Owned Gate Checklist

- Review phase report.
- Clean `web/.next` before typecheck.
- Run typecheck, lint, test, build independently.
- Start production server and run login form -> dashboard ask form -> SDK turn -> saved result page.
- Verify generated-code panel and command-log panel are non-empty.
- Measure 2-3 phrasings of the primary demo query and record runtime, attempts, fallback, generated-code length, command-log length, and chart non-empty status.
- Run vendor-literal scans.
- Commit, tag `phase-02-complete`, and push.

## Phase-Level Workstreams

- Centralize result schema and schema-shape tests.
- Implement snapshot generation and pre-aggregated summaries.
- Implement SDK client/auth resolver and prompt.
- Implement engine loop with timeout, retry, fallback, and work-trail capture.
- Wire dashboard submit/result pages from stub to real engine with injectable test seams.
- Add module README and phase report.

## Owned Files

- `web/**`
- `docs/decisions/**`
- `docs/phases/phase-02-report.md`
- `phase-plans/phase-02-codex-engine.md`

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `phase-plans/phase-00-bootstrap.md`
- `phase-plans/phase-01-walking-skeleton.md`
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
