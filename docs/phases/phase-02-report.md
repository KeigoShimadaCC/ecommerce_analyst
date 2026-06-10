# Phase 02 Report: Codex Engine

Date: June 10 2026

## Phase Status

Phase 02 is code-ready after the Project Lead's post-hotfix normal-app-path live SDK proof. The runtime engine, snapshot writer, SDK client boundary, file-based result validation, fallback path, persistence wiring, generated-code panel, and command-log panel are implemented and covered by mock-runner tests, production-server HTTP evidence, clean gates, and a real production UI proof.

The first Lead-owned normal app-path live SDK proof reached a saved result page with fallback false, non-empty generated code, non-empty command log, and a non-empty chart, but exposed a chart-unit scaling defect: the generated `result.json` chart used dollar-scale values such as `2366.4`, persistence inferred `currency_cents`, and the UI rendered about `$24` instead of about `$2,366`. The sandbox-owned fix tightened the strict contract so monetary chart values are integer cents, added focused tests, and kept a defensive persistence normalization path for observed dollar-scale violations. That normalization is documented here instead of being treated as invisible proof: the preferred contract is still `currency_cents`, tests assert cent values such as `236640`, and the final live proof generated cent-scale chart values directly.

Remote reconciliation before P2 publishing: `origin/main` and local `HEAD` were both `346b489` (`docs: add phase 02 launch prompt`) before the P2 commit sequence. At that point GitHub did not contain `web/src/lib/codex/**`; the real P2 engine implementation, cleanup, and currency hotfix were local-only until the Lead-owned commit/tag/push gate.

## Launch Contract / Prompt Fidelity

Tier 2 phase orchestrator scope: own the Phase 02 contract, decomposition, worker dispatch, programmatic gates, and phase report. The orchestrator writes no application code directly; all code changes were dispatched to workers.

Phase-owned files:

- `web/**`
- `docs/decisions/**`
- `docs/phases/phase-02-report.md`
- `phase-plans/phase-02-codex-engine.md`

Phase-forbidden files:

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- Other phase plans

Definition of done:

- Acceptance criteria met.
- Gates pass or are marked BLOCKED with evidence.
- Report includes worker summaries, gates, deviations, intended commits, and a reserved Lead-owned live-turn section.
- No forbidden file touched.
- No git history attempted.

Docs/reporting worker scope: write this report, create an engine ADR if warranted, and update only the living sections of `phase-plans/phase-02-codex-engine.md`. No application code, steering docs, sibling phase plans, staging, commits, tags, pushes, or git plumbing were attempted.

Launch fidelity deviations: none.

Gate-fix worker launch contract: sandboxed Tier 3 worker fixing exactly the Phase 02 acceptance gaps found at the Lead gate. Owned files were the prompt-listed Phase 02 engine, snapshot, prompt, analysis persistence/tests, dashboard components/tests, `web/vitest.global-setup.ts`, `web/.env.example`, this report, this phase plan, and ADR 0002 only if runtime-boundary wording changed. Forbidden files were steering docs, prompts, sibling phase plans, `.git/**`, and unlisted `web/**`. Definition of done was global 120-second timeout across the whole analysis run, monthly region/category summaries emitted by the real snapshot writer, deterministic clean test DB setup, precise docs with Lead-owned live proof reserved, existing P2 behavior preserved, and required gates passing or BLOCKED with evidence.

Currency-scale hotfix worker launch contract: sandboxed Tier 3 hotfix worker fixing exactly the chart-unit defect found by the Lead-owned live proof. Owned files were the prompt-listed prompt, result contract/tests, persistence/tests, saved-result renderer, module README, this report, this phase plan, and ADR 0002 only if runtime-boundary wording required it. Forbidden files were steering docs, prompts, sibling phase plans, `.git/**`, and unlisted `web/**`. Definition of done was an unambiguous prompt rule that monetary chart values are integer cents, persisted money charts rendering correctly for both cent-scale and observed dollar-scale engine outputs, tests that catch `$24` vs `$2,366`, docs reflecting failed first live proof, required gates passing or BLOCKED, no live SDK turn, and no git history operation.

Currency contract simplification worker launch contract: sandboxed Tier 3 hotfix worker aligning the implementation with the preferred Phase 02 chart currency contract. Owned files were the prompt-listed prompt, result contract/tests, persistence/tests, saved-result renderer, module README, this report, and this phase plan. Forbidden files were steering docs, prompts, sibling phase plans, `.git/**`, and unlisted `web/**`. Definition of done was an unambiguous prompt rule that monetary chart values are integer cents, app-captured chart units narrowed to `currency_cents` and `number`, dollar-scale live outputs normalized to integer cents during persistence, regression tests that catch `$24` vs `$2,366`, accurate docs, no live SDK turn, no git history operation, and required gates passing or BLOCKED.

## Files Changed Summary

Dependency/config:

- `web/package.json`
- `web/package-lock.json`
- `web/next.config.ts`
- `web/.env.example`

Result contract and persistence:

- `web/src/lib/analysis/result.ts`
- `web/src/lib/analysis/result.test.ts`
- `web/src/lib/analysis/runs.ts`
- `web/src/lib/analysis/analysis-flow.test.tsx`

Runtime engine:

- `web/src/lib/codex/**`

Dashboard and saved results:

- `web/src/app/dashboard/actions.ts`
- `web/src/app/dashboard/actions.test.ts`
- `web/src/app/analyses/**`
- `web/src/components/AnalysisViews.tsx`
- `web/src/components/DashboardView.tsx`

Docs/plan:

- `docs/decisions/0002-runtime-sdk-engine-boundary.md`
- `docs/phases/phase-02-report.md`
- `phase-plans/phase-02-codex-engine.md`

## Worker Summaries

Dependency/config worker:

- Installed `@openai/codex-sdk@0.139.0` and `@openai/codex@0.139.0`.
- Externalized both packages in `next.config.ts`.
- Froze runtime env names in `.env.example`.
- Typecheck passed.
- `npm audit` reported 5 moderate findings.

Dependency follow-up:

- Added direct `zod@4.4.3`.
- Install passed.

Result schema workers:

- Centralized the strict Zod model result schema.
- Added the structured command-entry array contract.
- Preserved Phase 01 compatibility and known-answer assertions.
- Result tests passed with 9 tests after follow-up.

Snapshot worker:

- Added `snapshot.ts` with the exact six snapshot files.
- Implemented tenant filtering, paid summaries, and cleanup helper.
- `npm --prefix web run test -- snapshot` passed 4 tests.
- Typecheck passed.

Client/prompt worker:

- Added direct SDK import, env resolver, runtime safety options, and summary-first prompt.
- Model validation accepts the GPT-5 family including `gpt-5.5`, rejects nano variants, and rejects non-GPT-5 models.
- Network is disabled in SDK config and thread options.
- Prompt requires a durable script and file-based `result.json`.
- `npm --prefix web run test -- client prompt` passed 13 tests.
- Lint and typecheck passed.
- Shell-out scan on client/prompt found no matches.

Engine worker and failover follow-up:

- Added injectable runner, snapshot provider, and persistence dependencies.
- Implemented timeout, retry, fallback, work-trail capture, cleanup in `finally`, and guarded ambient-to-API failover.
- Added the module README.
- `npm --prefix web run test -- engine work-trail` passed 12 tests.
- Follow-up `npm --prefix web run test -- engine` passed 10 tests.
- Typecheck and lint passed.
- Shell-out scan on engine files found no matches.

UI/persistence worker:

- Dashboard action uses the production engine by default.
- Added injectable action helper for tests.
- Persisted engine output to existing DB columns.
- Generated-code and command-log panels render from saved history.
- Focused tests passed 20 tests.
- Typecheck and lint passed.

Gate-fix worker:

- Changed the engine timeout from per-attempt to one global analysis budget; retry attempts receive the remaining budget and are skipped when the configured remaining-time floor is not met.
- Added engine tests that assert the second validation attempt receives the remaining timeout budget and that retry is skipped when the first attempt exhausts too much time.
- Changed `revenue_by_region.csv` and `revenue_by_category.csv` to monthly `YYYY-MM` period summaries emitted by the real snapshot writer.
- Updated snapshot tests, prompt wording/tests, module README, and ADR wording for monthly summary rows and global timeout semantics.
- Recreated an empty `web/test.db` in Vitest global setup after deleting SQLite artifacts and before Prisma `db push`.
- Added contained dashboard pending UI: submit disables the textarea/button, shows immediate running copy, and switches to "Codex is still considering..." after 15 seconds.
- Persisted engine revenue charts as `currency_cents` when result text/table metadata indicates a money metric, so saved revenue charts render as dollars.
- Focused and required checks passed: `npm --prefix web run test -- codex`, `npm --prefix web run test -- analysis`, clean-artifact full `npm --prefix web run test`, `.next` cleanup before typecheck, `npm --prefix web run typecheck`, `npm --prefix web run lint`, `npm --prefix web run build`, and the shell-out scan.

Currency contract simplification worker:

- Updated the runtime prompt to require monetary `chart.data[].value` values for revenue, sales, cost, margin, AOV, and other money metrics to stay as integer cents from snapshot files; answer text may still format dollars for readability.
- Removed `currency_dollars` from the app-captured chart display unit contract; persisted chart units are `currency_cents` for money and `number` for non-money.
- Updated persistence to infer money metrics from the question plus answer/table/chart evidence, preserve compliant integer-cent outputs as `currency_cents`, and normalize observed dollar-scale money chart values to integer cents before saving.
- Simplified saved-result rendering back to `currency_cents` and `number`.
- Added focused analysis tests that reproduce the first live defect (`2366.4` with `Revenue ($)` persists as `236640` cents and renders about `$2,366`, not `$24`) and prove compliant `236640` cent-scale engine chart values stay unchanged.
- Focused checks passed when rerun serially after this simplification.

Verification worker:

- Dependency/config checks passed.
- `npm --prefix web install` passed with 5 moderate audit findings.
- Quality gates passed in order: typecheck, lint, test, build.
- Full test run passed 15 files / 66 tests.
- Build emitted a Turbopack NFT tracing warning but succeeded.
- Runtime shell-out scan `rg -n 'child_process|spawn\(|codex exec' web/` found no matches.
- Production server ran on port 3001.
- Authenticated `/dashboard` returned 200.
- Saved `/analyses/<id>` returned 200 and included `Generated code`, `analysis.mjs`, `Command log`, and `node analysis.mjs`.
- No live SDK turn was run in the sandbox.

## Acceptance Criteria Evidence

- Strict result schema: PASS. Central Zod model schema rejects extra model-emitted keys and separates app-captured fields.
- Command-log array contract: PASS. Tests reject string command logs and accept structured entries.
- SDK dependencies and config: PASS. SDK packages are installed, Next.js externalizes both, and runtime env names are frozen.
- Snapshot contract: PASS. Tests prove the exact file set: `data.json`, `data.csv`, `monthly_revenue.csv`, `revenue_by_region.csv`, `revenue_by_category.csv`, and `data_dictionary.md`.
- Tenant isolation: PASS. Snapshot tests include only authenticated merchant rows and exclude the other merchant's data.
- Summary-first snapshot artifacts: PASS. Snapshot tests cover monthly revenue plus monthly period rows in region and category paid revenue summaries.
- Runtime SDK import with no shell-out path: PASS. Client imports the SDK directly; verification scan found no `child_process`, `spawn(`, or `codex exec` matches under `web/`.
- Runtime safety options: PASS. Client tests assert workspace-write, approval never, network disabled, web search disabled, git checks skipped, and a 120 second timeout setting.
- Prompt contract: PASS. Prompt tests assert summary CSV preference, durable script execution, no inline heredocs, no structured output schema, and `result.json` output.
- Mock-runner success evidence: PASS. Engine tests return a validated result with non-empty `generatedCode` and command log entry `node analysis.mjs`.
- Retry evidence: PASS. Strict-schema violation triggers one corrective retry and succeeds when the second `result.json` is valid.
- Global timeout evidence: PASS. Engine tests assert the whole-analysis budget is shared across attempts, retry receives the remaining budget, and retry is skipped when the remaining budget is below the configured floor.
- Fallback evidence: PASS. Repeated validation failure, timeout, and dependency throw persist schema-valid fallback results and clean up snapshots.
- Cleanup evidence: PASS. Snapshot cleanup is asserted after success, timeout, dependency throw, and validation fallback paths.
- API failover evidence: PASS. Tests prove ambient auth-like failure can retry once with explicit API env when allowed, and guarded scenarios do not fail over.
- Known-answer correctness: PASS. Engine-level P2 test asserts the May 2026 region values from monthly `period` rows: Midwest 235200, Northeast 183840, South 161280, West 236640.
- Deterministic clean test DB setup: PASS. The required clean-artifact full test deleted `web/test.db`, `web/test.db-journal`, `web/prisma/test.db`, and `web/prisma/test.db-journal`; Vitest global setup recreated `web/test.db`, ran Prisma `db push`, and the full suite passed.
- Long-running submit UX: PASS by implementation/typecheck. Dashboard submit disables the textarea and button while pending, shows immediate running copy, and switches to the 15-second still-considering copy.
- Revenue chart currency rendering: PASS in focused analysis tests and Lead-owned live proof. Engine revenue chart persistence preserves compliant cent-scale outputs as `unit: "currency_cents"` and normalizes observed dollar-scale revenue outputs to integer cents before saving, so saved charts render about `$2,366` instead of `$24`. The final live proof generated chart values as integer cents directly: West `236640`, Midwest `235200`, Northeast `183840`, South `161280`.
- Generated-code non-empty evidence: PASS. Success tests assert non-empty generated code; HTTP saved-result evidence includes `analysis.mjs`.
- Command-log non-empty evidence: PASS. Success tests assert command-log length; HTTP saved-result evidence includes `Command log` and `node analysis.mjs`.
- Persistence/UI evidence: PASS. Saved result page renders generated-code and command-log panels from persisted history.
- Authenticated HTTP evidence: PASS. Production server on port 3001 returned authenticated `/dashboard` 200 and saved `/analyses/<id>` 200.
- Quality gates: PASS.

## Gate Outcomes

- `npm --prefix web install`: PASS, with 5 moderate audit findings.
- `npm --prefix web run typecheck`: PASS.
- `npm --prefix web run lint`: PASS.
- `npm --prefix web run test`: PASS, 15 files / 66 tests.
- `npm --prefix web run build`: PASS, with a Turbopack NFT tracing warning.
- `rg -n 'child_process|spawn\(|codex exec' web/`: PASS, no matches.
- Production server HTTP checks on `PORT=3001`: PASS for authenticated `/dashboard` and saved result page.

Lead-owned post-hotfix reproducibility outcomes:

- Deleted test SQLite artifacts before the gate: PASS.
- `npm --prefix web run setup`: PASS; demo database reseeded and credentials printed.
- Cleaned `web/.next` with Node `fs.rmSync` before typecheck.
- `npm --prefix web run typecheck`: PASS.
- `npm --prefix web run lint`: PASS.
- Deleted test SQLite artifacts immediately before the full test run; `web/test.db` did not exist at test start.
- `npm --prefix web run test`: PASS, 15 files / 71 tests. Vitest global setup recreated `web/test.db` and Prisma `db push` succeeded.
- `npm --prefix web run build`: PASS, with the already documented Turbopack NFT tracing warning.
- `rg -n 'child_process|spawn\(|codex exec' web/`: PASS, no matches.
- SDK dependency check: PASS. `web/package.json` includes `@openai/codex-sdk` and `@openai/codex`.
- Next.js externalization check: PASS. `web/next.config.ts` contains `serverExternalPackages: ["@openai/codex-sdk", "@openai/codex"]`.

Gate-fix focused outcomes:

- `npm --prefix web run test -- codex`: PASS, 5 files / 33 tests.
- `npm --prefix web run test -- analysis`: PASS, 2 files / 16 tests.
- Clean-artifact full test after deleting the four SQLite artifacts with Node `fs.rmSync`: PASS, 15 files / 68 tests.
- Cleaned `web/.next` with Node `fs.rmSync` before final typecheck.
- `npm --prefix web run typecheck`: PASS.
- `npm --prefix web run lint`: PASS.
- `npm --prefix web run build`: PASS, with the already documented Turbopack NFT tracing warning.
- `rg -n 'child_process|spawn\(|codex exec' web/`: PASS, no matches.

Currency contract simplification focused outcomes:

- `npm --prefix web run test -- analysis`: PASS, 2 files / 18 tests.
- `npm --prefix web run test -- codex`: PASS, 5 files / 34 tests.
- Cleaned `web/.next` with Node `fs.rmSync` before typecheck.
- `npm --prefix web run typecheck`: PASS.
- `npm --prefix web run lint`: PASS.
- `npm --prefix web run build`: PASS, with the already documented Turbopack NFT tracing warning.
- `rg -n 'child_process|spawn\(|codex exec' web/`: PASS, no matches.
- `git diff --check`: PASS.
- An initial accidental parallel execution of the two focused suites produced the known transient Vitest global setup collision on `web/test.db` (`table "Merchant" already exists`) for the `analysis` run; the required focused suites were rerun serially and passed.

## Deviations And Limitations

Deviations from the docs/reporting worker launch prompt: none.

Non-blocking Phase 02 limitations:

- No live runtime SDK turn was run in the sandbox. This is reserved for the Lead-owned review gate.
- Raw HTTP ask form submission was not performed because production submit invokes the real engine and no HTTP fake-runner seam exists without adding env names or changing code. Verification used authenticated dashboard evidence and a fake persisted saved-result page instead.
- API model validation needed to accept `gpt-5.5`, so the implementation accepts GPT-5 family names including dot-versioned models while still rejecting nano variants and non-GPT-5 models.
- `npm audit` reports 5 moderate findings that were not remediated in P2.
- The production build emitted a Turbopack NFT tracing warning, but the build passed.
- `.env.example` now documents only runtime SDK env names. `web/.env` still carries `DATABASE_URL` for local run, and setup behavior should be rechecked in Lead/P3 if README or setup docs need alignment.
- The chart-unit fix includes a defensive normalization path for observed dollar-scale money chart outputs. This is intentionally documented as a guardrail, not as the primary contract: model-emitted money chart values are prompted and tested as integer cents, and the final live proof emitted integer-cent chart values directly.

Gate-fix deviations: none. No live runtime SDK turn, git history operation, staging operation, prompt edit, steering-doc edit, sibling phase-plan edit, or unlisted `web/**` edit was attempted.

Currency contract simplification deviations: the worker accidentally started the two focused test suites in parallel once, despite the brief requiring serial verification. No live runtime SDK turn, git history operation, staging operation, steering-doc edit, sibling phase-plan edit, prompt-template edit, or unlisted `web/**` edit was attempted.

## Reserved Lead-Owned Live-Turn Evidence

First Lead live proof before the currency-scale fix:

- Question asked through the normal app path: `In May 2026, chart paid revenue by region and tell me which region deserves next month's focus.`
- Saved result URL: `/analyses/analysis-4a8662fc-b77d-4ebe-bac4-708268b7b049`
- Fallback: false.
- Generated-code panel: non-empty, included `analysis.mjs`.
- Command-log panel: non-empty, included `node analysis.mjs`.
- Chart non-empty: yes.
- Defect: generated chart values were dollar-scale, persistence treated them as cent-scale, and rendered about `$24` instead of about `$2,366`.
- Status: sandbox-owned fix implemented; final Lead re-proof pending.

Final Lead live proof after the currency-scale fix:

- Normal app path: yes. The proof used production `next start` on `PORT=3001`, browser login, dashboard ask form, real SDK turn, saved result page, history list, and history reopen.
- Credentials: `owner@aurora.example` / documented demo password.
- Question asked through the normal app path: `Which region had the highest paid revenue in May 2026? Show the regional revenue bar chart and explain the gap to the runner-up.`
- Auth mode: ambient CLI auth. API app-path proof was not exercised.
- Runtime: 53,637 ms from persisted `runtimeMetadataJson.durationMs`.
- Attempts: 1.
- Fallback: false.
- Generated-code length: 2,614 characters.
- Command-log length: 4,617 characters.
- Chart non-empty: yes, 4 points.
- Persisted chart unit: `currency_cents`.
- Persisted chart values: West `236640`, Midwest `235200`, Northeast `183840`, South `161280`.
- Saved result URL: `/analyses/analysis-6905cb9f-36ab-443f-82b2-c722af54e98e`.
- Scale verification: answer prose showed West `$2,366.40`, highlights showed West `$2,366`, chart/table showed West `$2,366`, and generated `result.json` showed West chart value `236640`.
- Work-trail verification: generated-code panel was non-empty and contained `analysis.py`; command-log panel was non-empty and contained executed shell commands plus `result.json` output.
- Persistence/history verification: `/analyses` listed the run, and opening it returned the same saved result page.

Additional post-hotfix live proof using the pre-registered demo phrasing:

- Question: `For May 2026, show total revenue by region as a bar chart and recommend the region to focus next month.`
- Saved result URL: `/analyses/analysis-3c1a4787-754e-40ed-a941-7dd5dde8bd54`.
- Runtime: 35,659 ms.
- Attempts: 1.
- Fallback: false.
- Generated-code length: 2,475 characters.
- Command-log length: 4,348 characters.
- Chart non-empty: yes, 4 points.
- Persisted chart unit/value check: `currency_cents`, West `236640`.
- History reopen: PASS.

## ADR

Created `docs/decisions/0002-runtime-sdk-engine-boundary.md` because the file-based SDK engine boundary is a non-obvious architectural decision. It records per-request snapshots, durable script plus `result.json`, strict own-Zod validation, injectable runner, no network, hard timeout, fallback behavior, and captured work trail.

## Intended Atomic Commits

- `chore: add runtime sdk dependencies`
- `feat: add strict analysis result contract`
- `feat: add merchant snapshot writer`
- `feat: add sdk client and prompt contract`
- `feat: add runtime analysis engine`
- `feat: persist engine analysis history`
- `fix: stabilize test database setup`
- `docs: document phase 02 engine`

The chart-unit contract fix spans the strict result contract, prompt contract, and persisted-history commits: schema tests reject `currency_dollars`, prompt tests require monetary chart values as integer cents, and persistence/rendering tests assert cent values such as `236640` render at the correct dollar scale.

No commits, tags, pushes, staging operations, or git plumbing were performed by sandboxed workers.

## Lead-Owned Remaining Checks

- Fill the reserved live-turn evidence above after a real normal-app-path SDK turn.
- Run the required vendor-literal scans before public history is published.
- Independently rerun gates if desired, after cleaning `web/.next`.
- Perform visual smoke.
- Commit the intended atomic changes, tag `phase-02-complete`, and push.
