# Phase 02 — Codex Engine

This phase plan is maintained per `PLANS.md`.

## Purpose

Replace the stub with the assignment-critical runtime SDK engine: per-merchant snapshot, Codex writes and runs a durable script, app validates `result.json`, captures code and command log, persists the verified result, and falls back gracefully on failure.

## Acceptance Criteria

- `web/src/lib/analysis/result.ts` centralizes the strict Zod result schema.
- `web/package.json` and the lockfile include real runtime dependencies on `@openai/codex-sdk` and `@openai/codex` before any SDK implementation or live proof.
- `web/src/lib/codex/` contains snapshot, client, prompt, engine, and module README files.
- Runtime code imports `@openai/codex-sdk` and never shells out to the CLI.
- `next.config.ts` sets `serverExternalPackages: ["@openai/codex-sdk", "@openai/codex"]` before any live proof so Next.js does not bundle native-binary-backed packages.
- Each engine call uses a per-request snapshot directory populated only from `where: { merchantId }`.
- Snapshot is small and summary-first: it includes exactly named input artifacts `data.json`, `data.csv`, `monthly_revenue.csv`, `revenue_by_region.csv`, `revenue_by_category.csv`, and `data_dictionary.md`; prompts prefer summary CSVs before raw data for matching questions, and region/category summaries carry monthly `period` rows for period-specific demo queries.
- Snapshot temp directories are cleaned up in a `finally` block on success, retry, timeout, and fallback paths.
- Runtime SDK call sets workspace-write, approval never, network disabled in both SDK config and thread/options, skip git repo check, and a 120-second timeout budget across the whole analysis run.
- Prompt requires writing and executing `analysis.mjs` or `analysis.py` before writing `result.json`.
- Validation failure triggers at most one corrective turn when enough budget remains; otherwise fallback is persisted.
- Fallback result is schema-valid and preserves any generated code/command log captured.
- Runner, snapshot provider, and persistence are injectable for tests.
- Tests cover happy path, strict-schema rejection, retry-then-fallback, timeout, dependency throw, generated-code non-empty success, and tenant isolation.
- Success-path tests assert `generatedCode` is non-empty and at least one command-log entry is captured.
- Phase 01 known-answer correctness tests remain intact and a P2 engine-level known-answer test proves at least one fixed demo query returns the expected values, not just a schema-valid payload.
- `rg -n 'child_process|spawn\\(|codex exec' web/` has no runtime violation.
- Quality gates pass.
- `docs/phases/phase-02-report.md` records mock-runner evidence, authenticated HTTP evidence, Lead-owned live-turn evidence, generated-code length, command-log length, attempts, fallback status, chart non-empty status, and intended commits.

## Frozen Contracts

- Model-emitted result keys: `answer`, optional `table`, optional `chart`, optional `notes`; strict parsing rejects extras.
- App-captured fields: generated code, command log, runtime, attempts, fallback.
- Runtime env names: `CODEX_AUTH_MODE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT`.
- API-mode proof env: set `CODEX_AUTH_MODE=api`, `OPENAI_MODEL=gpt-5.5`, and `OPENAI_REASONING_EFFORT=low` explicitly when API auth is deliberately exercised; never rely on SDK defaults.
- API model validation allowlist: GPT-5 family only, reject nano variants.
- Ambient auth is default; API auth is opt-in/failover only. Repeated live turns are minimized and measured because API-mode turns can have non-trivial token usage.
- API claims must be precise: standalone API smoke is already proven; app-path API proof may be claimed only if it is actually run through login -> dashboard -> SDK turn -> persisted result page.
- Snapshot file names are fixed for prompt, tests, proof artifacts, and README references: `data.json`, `data.csv`, `monthly_revenue.csv`, `revenue_by_region.csv`, `revenue_by_category.csv`, `data_dictionary.md`.

## North Star Acceptance Slice

This phase advances the core assignment claim: Codex writes and runs real code against a per-request merchant snapshot and the UI shows the verified result plus code. The Lead review gate must run one real normal-app-path SDK turn with a question outside the test suite and verify the generated-code panel is non-empty. P2 also starts demo-query phrasing measurements for the primary query.

## Lead-Owned Gate Checklist

- Review phase report.
- Clean `web/.next` before typecheck.
- Run typecheck, lint, test, build independently.
- Start production server and run login form -> dashboard ask form -> SDK turn -> saved result page.
- Verify generated-code panel and command-log panel are non-empty.
- Measure 2-3 phrasings of the primary demo query and record runtime, attempts, fallback, generated-code length, command-log length, and chart non-empty status.
- Record the Lead-owned live-turn result directly in `docs/phases/phase-02-report.md` before committing; temporary smoke files or ignored logs are not durable evidence.
- Run vendor-literal scans.
- Commit, tag `phase-02-complete`, and push.

## Phase-Level Workstreams

- Centralize result schema and schema-shape tests.
- Install and lock `@openai/codex-sdk` and `@openai/codex`; externalize both packages in Next.js server config before SDK smoke.
- Implement snapshot generation and pre-aggregated summaries.
- Implement SDK client/auth resolver and summary-first prompt.
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

Authored by the Phase 02 orchestrator on June 10 2026. The launch prompt role is Tier 2 phase orchestrator: own the phase contract, decomposition, worker dispatch, programmatic gates, and phase report; write no application code directly. Owned files for this phase are `web/**`, `docs/decisions/**`, `docs/phases/phase-02-report.md`, and this phase plan. Forbidden files are `NORTH_STAR.md`, `AGENTS.md`, `PLANS.md`, `RUNBOOK.md`, `prompts/**`, and other phase plans. Definition of done is all acceptance criteria met, gates green or BLOCKED with evidence, forbidden files untouched, no git history attempted, phase report written with reserved Lead-owned live-turn section, and deviations explicit at handoff.

Execution order is serial unless noted. The result schema, snapshot file names, env names, SDK config, route/action boundaries, ownership boundaries, and gates above are frozen before dispatch.

1. **Dependency and Next server config setup**
   - Owned files: `web/package.json`, `web/package-lock.json`, `web/next.config.ts`, `web/.env.example`.
   - Forbidden files: all phase forbidden files; `web/src/**`; `docs/**`.
   - Estimate: 10 minutes.
   - Parallelizable: No; SDK packages and server externalization must land before SDK implementation.
   - Definition of done: `npm --prefix web install` leaves `@openai/codex-sdk` and `@openai/codex` in dependencies and lockfile; `next.config.ts` sets `serverExternalPackages: ["@openai/codex-sdk", "@openai/codex"]`; `.env.example` documents only the frozen env names with `OPENAI_REASONING_EFFORT=low`; no live SDK turn is attempted.

2. **Centralized result schema and persistence contract**
   - Owned files: `web/src/lib/analysis/result.ts`, `web/src/lib/analysis/*.test.ts`, `web/src/lib/analysis/runs.ts` only where needed to preserve compile compatibility with the new contract.
   - Forbidden files: all phase forbidden files; `web/src/lib/codex/**`; UI components/routes except existing analysis tests if needed for type compatibility.
   - Estimate: 15 minutes.
   - Parallelizable: No; engine and UI workers depend on these types.
   - Definition of done: `result.ts` exports the strict Zod model-emitted schema and app-captured run/result types; tests assert strict extra-key rejection and schema-shape invariants; Phase 01 known-answer tests remain intact and are not weakened to schema-only checks.

3. **Snapshot writer and summary artifacts**
   - Owned files: `web/src/lib/codex/snapshot.ts`, `web/src/lib/codex/snapshot.test.ts`, supporting test fixtures under `web/src/lib/codex/**` if needed.
   - Forbidden files: all phase forbidden files; `web/src/lib/analysis/**`; app routes/components.
   - Estimate: 15 minutes.
   - Parallelizable: No; prompt and engine depend on snapshot return shape.
   - Definition of done: per-request temp directory uses `mkdtemp`; database reads are scoped by `where: { merchantId }` semantics or equivalent parameterized merchant filters; writes exactly `data.json`, `data.csv`, `monthly_revenue.csv`, `revenue_by_region.csv`, `revenue_by_category.csv`, and `data_dictionary.md`; tests prove tenant isolation and the exact file set.

4. **SDK client, auth/env resolver, and summary-first prompt**
   - Owned files: `web/src/lib/codex/client.ts`, `web/src/lib/codex/prompt.ts`, `web/src/lib/codex/client.test.ts`, `web/src/lib/codex/prompt.test.ts`.
   - Forbidden files: all phase forbidden files; snapshot files except imported types; engine files except imported types; UI/routes.
   - Estimate: 15 minutes.
   - Parallelizable: No; depends on SDK dependencies and snapshot/prompt contracts.
   - Definition of done: runtime code imports `@openai/codex-sdk` directly; no shell-out APIs are introduced; env resolver accepts only GPT-5-family API models and rejects nano variants; API auth uses explicit `OPENAI_MODEL` and `OPENAI_REASONING_EFFORT`; SDK config and thread/options disable network, set workspace-write, approval never, skip git repo check, and expose a 120-second timeout mechanism to the engine; prompt requires durable `analysis.mjs` or `analysis.py`, executing that file, writing `result.json`, and preferring summary CSVs before raw data.

5. **Engine loop, validation, fallback, work-trail capture, and module README**
   - Owned files: `web/src/lib/codex/engine.ts`, `web/src/lib/codex/work-trail.ts`, `web/src/lib/codex/README.md`, `web/src/lib/codex/*.test.ts`.
   - Forbidden files: all phase forbidden files; dashboard/action UI wiring; dependency/config files.
   - Estimate: 20 minutes.
   - Parallelizable: No; central behavior combines prior contracts.
   - Definition of done: engine accepts injectable runner, snapshot provider, and persistence dependencies; validates disk `result.json` with centralized strict Zod; one corrective attempt on validation failure when enough time remains; schema-valid fallback on timeout, validation exhaustion, and dependency throw; cleanup happens in `finally` on success and failure; work-trail capture combines turn items and snapshot scan; success tests assert non-empty `generatedCode` and at least one command-log entry; P2 engine known-answer test asserts exact expected demo-query values.

6. **Dashboard/action, persistence, saved result, and fake-runner HTTP seam**
   - Owned files: `web/src/app/dashboard/actions.ts`, `web/src/app/analyses/**`, `web/src/components/**`, `web/src/lib/analysis/runs.ts`, `web/src/lib/analysis/database.ts`, `web/src/lib/analysis/result.ts` only for `codex-engine` runtime metadata compatibility, related tests under those directories.
   - Forbidden files: all phase forbidden files; `web/src/lib/codex/client.ts`; `web/src/lib/codex/prompt.ts`; dependency/config files.
   - Estimate: 20 minutes.
   - Parallelizable: No; depends on engine result and persistence types.
   - Definition of done: normal dashboard submit path calls the real engine with production dependencies by default; tests can inject or configure a fake runner without live SDK spend; saved result page renders answer/chart plus generated-code and command-log panels from persisted history; fallback rendering path stays coherent; no React falsy-render `0` regressions.

7. **Verification / QA gate**
   - Owned files: no application edits unless returning BLOCKED with a repro; may write temporary artifacts only under `/tmp` if needed.
   - Forbidden files: all phase forbidden files and all application files unless explicitly re-dispatched for a fix.
   - Estimate: 15 minutes.
   - Parallelizable: No; review gate after implementation.
   - Definition of done: run `npm --prefix web install` evidence if dependencies changed; clean `web/.next` with Node `fs.rm` before typecheck if present; run typecheck, lint, test, and build independently; run `rg -n 'child_process|spawn\\(|codex exec' web/`; start production server with `next start`; produce authenticated HTTP evidence for login, dashboard, normal ask path through fake-runner/test seam if practical, and saved result page with non-empty generated-code and command-log markup. No `next dev`; no live SDK turn.

8. **Docs / phase report**
   - Owned files: `docs/phases/phase-02-report.md`, `docs/decisions/**` if a non-obvious engine ADR is needed, and this phase plan living sections.
   - Forbidden files: all phase forbidden files except this phase plan; `web/**`.
   - Estimate: 10 minutes.
   - Parallelizable: No; evidence must exist first.
   - Definition of done: phase report includes launch contract restatement, worker summaries, mock-runner evidence, fallback evidence, authenticated HTTP evidence, SDK dependency/config evidence, known-answer correctness evidence, generated-code and command-log non-empty evidence, gate outcomes, deviations, reserved Lead-owned live-turn evidence section, and intended atomic commit breakdown; this phase plan Progress, Decision Log, Surprises, and Outcomes are updated.

## Progress

- [x] (June 10 2026) Required reading completed: `NORTH_STAR.md`, `AGENTS.md`, `PLANS.md`, `RUNBOOK.md`, `phase-plans/phase-02-codex-engine.md`, and `prompts/subtask-worker.md`.
- [x] (June 10 2026) Phase contract frozen: result schema, summary-first snapshot file names, env names, SDK config, route/action boundaries, file ownership, gates, and acceptance criteria.
- [x] (June 10 2026) Orchestrator-authored atomic task list appended.
- [x] (June 10 2026) Task 1 completed: SDK dependencies installed, Next.js server externalization added, runtime env names frozen, typecheck passed, and audit findings recorded.
- [x] (June 10 2026) Task 2 completed: strict centralized result schema and command-log entry contract added, with result tests passing 9 tests after follow-up.
- [x] (June 10 2026) Task 3 completed: snapshot writer added with exact six files, tenant filtering, paid summaries, cleanup helper, 4 snapshot tests passing, and typecheck passing.
- [x] (June 10 2026) Task 4 completed: SDK client/env resolver and prompt contract added, client/prompt tests passing 13 tests, lint/typecheck passing, and shell-out scan clean for those files.
- [x] (June 10 2026) Task 5 completed: engine loop, retry/fallback, timeout, work-trail capture, guarded failover, cleanup, and module README added; focused engine/work-trail and follow-up engine tests passed.
- [x] (June 10 2026) Task 6 completed: dashboard action uses production engine by default, test seam added, engine result persistence wired, generated-code and command-log panels render from history, and focused tests passed 20 tests.
- [x] (June 10 2026) Task 7 completed: verification worker ran install, typecheck, lint, test, build, shell-out scan, and production-server HTTP checks; all gates passed with recorded non-blocking warnings.
- [x] (June 10 2026) Task 8 completed: Phase 02 report written, engine ADR added, and living plan sections updated.
- [x] (June 10 2026) Gate-fix worker completed required reading and launch-contract review; role is sandboxed Tier 3 gate-fix worker, scope is the Phase 02 acceptance gaps only, owned files are the prompt-listed Phase 02 code/docs files, forbidden files include steering docs, sibling phase plans, prompts, `.git/**`, and unlisted `web/**`, and definition of done is the global timeout, monthly summaries, deterministic test DB setup, precise docs, preserved P2 behavior, and required gates passing or BLOCKED with evidence.
- [x] (June 10 2026) Gate fix implemented a single global analysis timeout budget, monthly region/category snapshot summaries, deterministic `web/test.db` recreation before Prisma `db push`, dashboard pending UI, and revenue-chart currency persistence.
- [x] (June 10 2026) Gate fix verification completed: focused `codex` and `analysis` tests passed; clean-artifact full test passed; `.next` was cleaned before typecheck; typecheck, lint, build, and shell-out scan passed.
- [x] (June 10 2026) Currency-scale hotfix completed required reading and launch-contract review; role is sandboxed Tier 3 hotfix worker, scope is exactly the Lead-exposed chart-unit defect, owned files are the prompt-listed prompt/result/persistence/renderer/test/docs files, forbidden files include steering docs, sibling phase plans, prompts, `.git/**`, and unlisted `web/**`, and definition of done is integer-cent prompt contract, correct saved money-chart rendering for cent-scale and observed dollar-scale outputs, regression tests, accurate docs, and required gates passing or BLOCKED.
- [x] (June 10 2026) Currency contract simplification worker completed required reading and launch-contract review; role is sandboxed Tier 3 hotfix worker, scope is exactly the preferred Phase 02 chart currency contract, owned files are the prompt-listed prompt/result/persistence/renderer/test/docs files, forbidden files include steering docs, sibling phase plans, prompts, `.git/**`, and unlisted `web/**`, and definition of done is integer-cent prompt contract, app-captured chart units narrowed to `currency_cents`/`number`, dollar-scale live-output normalization to cents, regression tests, accurate docs, and required gates passing or BLOCKED.
- [x] (June 10 2026) Currency contract simplification updated persistence to normalize dollar-scale money chart values to integer cents before saving, removed `currency_dollars` from the app-captured chart unit contract, preserved compliant cent-scale outputs and deterministic stubs, and updated focused regression tests.
- [x] (June 10 2026) Lead-owned normal app-path live SDK re-proof completed after the currency contract simplification. The final proof used login -> dashboard ask form -> real SDK turn -> saved result page -> history reopen; persisted result `/analyses/analysis-6905cb9f-36ab-443f-82b2-c722af54e98e` had runtime 53,637 ms, 1 attempt, fallback false, generated-code length 2,614, command-log length 4,617, chart unit `currency_cents`, chart non-empty with West `236640`, and answer/highlight/chart/table values all rendered at the same revenue scale.

## Decision Log

- Decision: Execute Phase 02 atomic tasks serially.
  Rationale: dependency/config, result schema, snapshot shape, client/prompt, engine loop, and UI persistence are contract-dependent. Parallelizing would force overlapping ownership in `web/src/lib/analysis/runs.ts` or require workers to code against unstable types.
  Date: June 10 2026.
  Author: Phase 02 orchestrator.
- Decision: Expand Task 6 ownership to include a narrow `web/src/lib/analysis/result.ts` change for `codex-engine` runtime metadata.
  Rationale: the persistence/UI worker must store engine-produced analyses without mislabeling them as deterministic stubs, and runtime metadata validation lives in the centralized result contract.
  Date: June 10 2026.
  Author: Phase 02 orchestrator.
- Decision: Record the runtime engine boundary in ADR 0002.
  Rationale: the combination of per-request snapshots, durable script plus `result.json`, own-Zod validation, injectable runner, disabled network, hard timeout, fallback persistence, and captured work trail is architectural rather than incidental implementation detail.
  Date: June 10 2026.
  Author: Docs/reporting worker.
- Decision: Leave raw HTTP ask submission and live SDK turn out of sandbox evidence.
  Rationale: production submit invokes the real engine and no HTTP fake-runner seam exists without expanding env names or changing code; live SDK proof is explicitly Lead-owned for P2+ engine phases.
  Date: June 10 2026.
  Author: Docs/reporting worker.
- Decision: Treat `turnTimeoutMs` as the whole-analysis budget, not a per-attempt budget.
  Rationale: the product contract is a 120-second analysis envelope. Corrective retries launched after a slow first attempt must receive only the remaining time, and validation retry is skipped when the remaining budget is below the configured floor.
  Date: June 10 2026.
  Author: Gate-fix worker.
- Decision: Make `revenue_by_region.csv` and `revenue_by_category.csv` monthly period summaries.
  Rationale: the pre-registered demo questions ask for May 2026 region/category breakdowns. The real snapshot writer must emit period-specific summary rows instead of relying on fake test rows that cannot come from production snapshots.
  Date: June 10 2026.
  Author: Gate-fix worker.
- Decision: Recreate an empty `web/test.db` before Vitest runs Prisma `db push`.
  Rationale: this environment can fail `db push` after SQLite artifacts are deleted unless the target file exists. Creating the empty file preserves the isolated test database while making clean setup deterministic.
  Date: June 10 2026.
  Author: Gate-fix worker.
- Decision: Keep monetary model chart values contractually in integer cents and normalize dollar-scale live violations to cents at persistence.
  Rationale: the prompt must match snapshot files and the result contract, and persisted money charts should have one app-captured unit, `currency_cents`. Normalizing dollar-scale violations before saving fixes the first live defect without expanding the chart unit contract or changing deterministic cent-scale charts.
  Date: June 10 2026.
  Author: Currency contract simplification worker.

## Surprises & Discoveries

- `npm audit` reports 5 moderate findings after SDK dependency install; remediation was not included in P2.
- The API model resolver needed to accept `gpt-5.5`, so the implementation accepts GPT-5 family names including dot-versioned models while still rejecting nano variants and non-GPT-5 models.
- Raw HTTP ask form submission was not practical in sandbox verification because the production submit path invokes the real engine and there is no HTTP fake-runner seam without expanding the contract.
- The production build emitted a Turbopack NFT tracing warning but still passed.
- `.env.example` now documents only runtime SDK env names; `web/.env` still carries `DATABASE_URL` for local run, so Lead/P3 should recheck setup and README alignment if needed.
- Lead gate found the first engine implementation used the full timeout for each attempt. Focused engine tests now assert retry attempts receive the remaining global budget.
- Lead gate found region/category May rows in tests were ahead of the real snapshot writer. Snapshot SQL now emits monthly `YYYY-MM` period rows for region and category summaries.
- Clean test database setup can require an empty `web/test.db` file before Prisma `db push`; the global setup now creates that file after deleting stale SQLite artifacts.
- Lead-owned live SDK proof reached the saved result page with fallback false and non-empty generated-code, command-log, and chart panels, but exposed a chart-unit scale defect: dollar-scale chart values such as `2366.4` were persisted as `currency_cents` and rendered around `$24` instead of around `$2,366`.
- Running `npm --prefix web run test -- analysis` and `npm --prefix web run test -- codex` in parallel can collide in Vitest global setup on `web/test.db`; rerunning the focused suites serially passed.

## Outcomes & Retrospective

- Phase 02 is gate-fixed for the sandbox-owned engine slice: SDK packages and externalization, strict file-based result validation, merchant snapshots with monthly summaries, summary-first prompt, global timeout retry behavior, work-trail capture, persistence, saved-result rendering, and production-server HTTP evidence all landed with passing gates as recorded in the phase report.
- Mock-runner coverage proves success, validation retry, timeout, dependency throw, fallback persistence, generated-code capture, command-log capture, tenant isolation, and P2 known-answer values.
- Currency contract simplification coverage now catches the first Lead live defect by asserting dollar-scale live output is persisted as integer cents, while preserving compliant cent-scale engine output. Lead-owned normal-app-path live re-proof is complete and recorded in `docs/phases/phase-02-report.md`, including generated-code, command-log, fallback, runtime, attempts, chart non-empty, history reopen, and corrected chart-scale evidence.
