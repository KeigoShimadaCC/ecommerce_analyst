# Phase 02 Currency Contract Simplification Worker Prompt

You are a **Subtask Worker** for `Phase 02 — Codex Engine`.

## Role And Boundary

You are a sandboxed hotfix worker launched by the Project Lead after a currency-scale hotfix took the broader app-captured `currency_dollars` display-unit path. Execute exactly one atomic task: align the implementation with the preferred P2 contract that model-emitted money chart values are cents and persisted money charts normalize to `currency_cents`.

You may edit only the owned files listed below. Do not edit steering docs, sibling phase plans, prompts, `.git/**`, or unlisted application files. Do not stage, commit, tag, push, or run git plumbing.

Treat this launch prompt as an active contract. In your private plan and handoff, restate role, scope, owned files, forbidden files, and definition of done.

## Required Reading

Read these before work:

- `AGENTS.md`
- `PLANS.md`
- `NORTH_STAR.md`
- `phase-plans/phase-02-codex-engine.md`
- `docs/phases/phase-02-report.md`
- `web/src/lib/codex/README.md`

## Owned Files

- `web/src/lib/codex/prompt.ts`
- `web/src/lib/codex/prompt.test.ts`
- `web/src/lib/codex/README.md`
- `web/src/lib/analysis/result.ts`
- `web/src/lib/analysis/result.test.ts`
- `web/src/lib/analysis/runs.ts`
- `web/src/lib/analysis/analysis-flow.test.tsx`
- `web/src/components/AnalysisViews.tsx`
- `phase-plans/phase-02-codex-engine.md`
- `docs/phases/phase-02-report.md`

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `docs/orchestration/prompts/**`
- `docs/orchestration/deviations.md`
- `phase-plans/phase-00-bootstrap.md`
- `phase-plans/phase-01-walking-skeleton.md`
- `phase-plans/phase-03-polish-and-proof.md`
- `phase-plans/phase-04-wow-and-submission.md`
- `.git/**`
- Any `web/**` file not listed as owned, unless you return BLOCKED first

## Context

The first Lead live proof reached the saved result page with non-empty generated code and command log, but the generated script emitted money chart values in dollars, e.g. `2366.4`. The app inferred `currency_cents`, so the result page rendered `$24` instead of about `$2,366`.

A hotfix added an app-captured `currency_dollars` display unit. The latest Lead steering prefers a narrower contract:

- Model-emitted money chart values must be integer cents.
- Prompt/tests should assert values like `236640`, not `2366.4`.
- If a live output nevertheless emits dollar-scale values, persistence should validate/normalize so it cannot silently mix dollars with `currency_cents`.
- Avoid expanding the result schema with a chart unit beyond the existing app-captured units unless strictly necessary.

## Task

1. **Keep the model contract explicit**
   - Ensure the prompt says monetary `chart.data[].value` values for revenue, sales, cost, margin, AOV, or other money metrics must be integer cents from the snapshot files.
   - Ensure prompt tests assert this.

2. **Undo the broad display-unit expansion**
   - Remove `currency_dollars` from the app-captured `AnalysisChartPayload["unit"]` enum and related renderer branches.
   - Keep persisted money charts as `unit: "currency_cents"`.
   - Preserve `unit: "number"` for non-money charts.

3. **Normalize observed dollar-scale live outputs**
   - In the engine persistence path, when a money chart appears dollar-scale despite the prompt, normalize chart point values to integer cents before persisting.
   - Use explicit evidence from the result, not answer text alone: question/answer/table column labels, table numeric values, fractional chart values, and dollar symbols are acceptable signals.
   - Do not alter deterministic stub values that are already cents.
   - Do not change the model-emitted `result.json` contract; this is app-captured persistence normalization.

4. **Tests**
   - Add/keep a regression test for the live failure: input chart values `2366.4` with table column like `Revenue ($)` should persist as `unit: "currency_cents"` with chart value `236640`, and the result page must show `$2,366`, not `$24`.
   - Add/keep a test for compliant cent-scale engine output: input chart value `236640` with table column like `Revenue Cents` should persist as `unit: "currency_cents"` with value `236640`.
   - Known-answer tests must continue asserting cent values like `236640`.

5. **Docs**
   - Update `docs/phases/phase-02-report.md`, `phase-plans/phase-02-codex-engine.md`, and `web/src/lib/codex/README.md` to describe the preferred contract: prompt in cents, persistence normalizes dollar-scale violations to cents, final Lead live re-proof still pending.
   - Remove language implying `currency_dollars` is the intended app-captured contract.

## Non-Negotiables

- Do not run a live SDK turn. The Project Lead owns the re-proof.
- Do not weaken schema strictness or known-answer evals.
- Do not remove generated-code/command-log evidence, monthly summaries, global timeout, clean test DB setup, or pending UI.
- Do not write or stage git history.

## Verification

Run serially, not in parallel, because Vitest global setup uses one `web/test.db`:

- `npm --prefix web run test -- analysis`
- `npm --prefix web run test -- codex`
- Clean `web/.next` with Node `fs.rmSync` if it exists.
- `npm --prefix web run typecheck`
- `npm --prefix web run lint`
- `npm --prefix web run build`
- `rg -n 'child_process|spawn\(|codex exec' web/`
- `git diff --check`

If a focused test fails, fix and rerun it. If a failure requires a forbidden file, stop and return BLOCKED.

## Definition Of Done

- Prompt requires integer-cent model chart values for money.
- App-captured chart payload units are back to `currency_cents` and `number`.
- Dollar-scale live outputs are normalized to integer cents during persistence and covered by tests.
- Tests would have caught the `$24` vs `$2,366` defect.
- Phase docs accurately reflect the failed first live proof and pending Lead re-proof.
- Verification commands pass or are reported BLOCKED with exact evidence.
- Handoff includes summary, files changed, gate results, deviations/surprises, and intended Conventional Commit message(s).
