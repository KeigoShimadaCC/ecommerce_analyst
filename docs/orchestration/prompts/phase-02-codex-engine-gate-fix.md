# Phase 02 Gate Fix Worker Prompt

You are a **Subtask Worker** for `Phase 02 — Codex Engine`.

## Role And Boundary

You are a sandboxed gate-fix worker launched by the Project Lead after the first Phase 02 handoff. Execute exactly one atomic task: close the Phase 02 acceptance gaps found at the Lead gate.

You may edit only the owned files listed below. Do not edit Lead-owned steering docs, sibling phase plans, prompts other than this already-filled prompt, or git history. Do not stage, commit, tag, push, or run git plumbing.

Treat this launch prompt as an active contract. In your private plan and handoff, restate role, scope, owned files, forbidden files, and definition of done. If a required fix needs a forbidden file, stop and return BLOCKED with diagnosis and proposed ownership expansion.

## Required Reading

Read these before work:

- `AGENTS.md`
- `PLANS.md`
- `NORTH_STAR.md`
- `phase-plans/phase-02-codex-engine.md`
- `docs/phases/phase-02-report.md`
- `web/src/lib/codex/README.md`

## Owned Files

- `web/vitest.global-setup.ts`
- `web/src/lib/codex/engine.ts`
- `web/src/lib/codex/engine.test.ts`
- `web/src/lib/codex/snapshot.ts`
- `web/src/lib/codex/snapshot.test.ts`
- `web/src/lib/codex/prompt.ts`
- `web/src/lib/codex/prompt.test.ts`
- `web/src/lib/codex/README.md`
- `web/src/lib/analysis/runs.ts`
- `web/src/lib/analysis/analysis-flow.test.tsx`
- `web/src/components/DashboardView.tsx`
- `web/src/components/AnalysisViews.tsx`
- `web/src/app/dashboard/actions.test.ts`
- `web/.env.example`
- `phase-plans/phase-02-codex-engine.md`
- `docs/phases/phase-02-report.md`
- `docs/decisions/0002-runtime-sdk-engine-boundary.md` only if the runtime boundary wording must change

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `docs/orchestration/prompts/**`
- `phase-plans/phase-00-bootstrap.md`
- `phase-plans/phase-01-walking-skeleton.md`
- `phase-plans/phase-03-polish-and-proof.md`
- `phase-plans/phase-04-wow-and-submission.md`
- `.git/**`
- Any `web/**` file not listed as owned, unless you return BLOCKED first

## Task

Close these P2 gate gaps before the Project Lead can claim Phase 02 complete.

1. **Global timeout budget**
   - The runtime analysis budget is 120 seconds for the whole analysis run, not 120 seconds per attempt.
   - If attempt 1 consumes most of the budget, retry only when enough time remains.
   - A retry must receive the remaining budget, not a fresh full timeout.
   - Add or strengthen tests so this cannot regress. The test must fail against the current per-attempt timeout behavior.
   - Keep the existing hard timeout, abort behavior, fallback behavior, cleanup in `finally`, and max two attempts.

2. **Month-specific summary CSVs**
   - Primary demo queries are period-specific, for example May 2026 revenue by region/category.
   - Make real snapshot summaries support that directly. Prefer monthly `period` rows in both `revenue_by_region.csv` and `revenue_by_category.csv`.
   - Do not rely on fake May rows that the real snapshot writer cannot emit.
   - Update snapshot tests and the P2 engine known-answer test so the eval signal matches the real snapshot writer.
   - Update prompt/data dictionary wording so the agent knows region/category summaries are monthly period summaries and summary CSVs are reliable for month-specific breakdowns.

3. **Deterministic clean test DB setup**
   - `web/vitest.global-setup.ts` currently removes SQLite artifacts and then runs `prisma db push`.
   - In this environment, `db push` can fail if `web/test.db` does not already exist.
   - After deleting SQLite artifacts and before `runPrisma(["db", "push"])`, recreate an empty `web/test.db` deterministically.
   - Preserve isolated test DB behavior; no test may import or wipe the production DB.

4. **Evidence and docs**
   - Update `phase-plans/phase-02-codex-engine.md` living sections and `docs/phases/phase-02-report.md` so they no longer overclaim completion before Lead-owned live proof.
   - Record that this gate fix addressed the global timeout, monthly summaries, and test DB reproducibility issues.
   - Keep API claims precise: standalone API smoke is proven elsewhere; app-path API proof is Lead-owned and must remain blank until actually run through login -> dashboard -> SDK turn -> persisted result page.
   - If you use high-effort reasoning in this hotfix session, record the exception in the phase report.

5. **Secondary polish only if low-risk**
   - Add or verify pending UI for the long-running dashboard submit: immediate loading, disabled input, and 15-second "still considering" copy.
   - If touching chart persistence naturally, revenue charts should render as currency rather than generic numbers. Do not take a broad UI rewrite to do this.

## Non-Negotiables

- Runtime code uses `@openai/codex-sdk`; it must not shell out to the CLI.
- Runtime engine remains file-based: durable `analysis.mjs` or `analysis.py`, execute it, write `result.json`, validate with centralized strict Zod, retry once at most, then persist a schema-valid fallback if needed.
- Network remains disabled in both SDK config and thread/options.
- Snapshot directories are per merchant and cleaned in `finally`.
- Success-path tests must assert non-empty `generatedCode` and non-empty command log.
- Do not run a live runtime SDK turn. The Project Lead owns that gate.
- Do not use ignored `references/` files in tracked artifacts. If a rule matters, write the rule itself.
- Do not write or stage git history.

## Verification

Run the cheapest relevant focused checks first, then the required gates.

Required checks:

- `npm --prefix web run test -- codex`
- `npm --prefix web run test -- analysis`
- Delete clean-test SQLite artifacts using Node `fs.rmSync` for `web/test.db`, `web/test.db-journal`, `web/prisma/test.db`, and `web/prisma/test.db-journal`, then run `npm --prefix web run test`.
- Clean `web/.next` with Node `fs.rm` before typecheck if it exists.
- `npm --prefix web run typecheck`
- `npm --prefix web run lint`
- `npm --prefix web run build`
- `rg -n 'child_process|spawn\(|codex exec' web/`

If a command fails, fix within owned files and rerun the relevant check. If a failure requires a forbidden file, stop and return BLOCKED.

## Definition Of Done

- Global 120-second timeout is enforced across the whole analysis run and tested.
- Region/category summary snapshots include month-specific periods, and tests/evals match the real snapshot writer.
- Fresh clean test DB setup is deterministic after deleting `web/test.db`.
- Existing P2 engine behavior remains intact: strict validation, retry/fallback, cleanup, generated-code capture, command-log capture, tenant isolation, no shell-out path.
- Programmatic gates listed above pass or are reported BLOCKED with exact evidence.
- Phase report and phase plan are accurate, with Lead-owned live-turn evidence still reserved.
- Handoff includes summary, files changed, gate results, deviations/surprises, and intended Conventional Commit message(s).
