# Phase 02 Currency Scale Fix Worker Prompt

You are a **Subtask Worker** for `Phase 02 — Codex Engine`.

## Role And Boundary

You are a sandboxed hotfix worker launched by the Project Lead after the Lead-owned normal app-path live SDK proof exposed a chart-unit scaling defect. Execute exactly one atomic task: make persisted money charts render at the correct scale and tighten the prompt/tests so the runtime result contract is unambiguous.

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
- `docs/decisions/0002-runtime-sdk-engine-boundary.md` only if the runtime boundary wording must mention chart-unit handling

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

## Failure Evidence From Lead Gate

The Lead ran a real production app-path SDK turn through login -> dashboard ask form -> SDK turn -> persisted result page.

Question:
`In May 2026, chart paid revenue by region and tell me which region deserves next month's focus.`

What worked:

- The normal app path reached `/analyses/analysis-4a8662fc-b77d-4ebe-bac4-708268b7b049`.
- Fallback was false.
- Generated-code panel was non-empty and showed `analysis.mjs`.
- Command-log panel was non-empty and showed `node analysis.mjs`.
- Chart was non-empty.

Defect:

- The generated script converted summary cents to dollar values in `result.json` chart data, e.g. `2366.4`.
- Persistence inferred `currency_cents`, so the UI divided again and rendered chart/highlight values like `$24` instead of about `$2,366`.
- This is a real evidence-integrity bug. Do not let P2 pass until fixed and covered by tests.

## Task

1. **Make the runtime result contract unambiguous**
   - Update the Codex prompt so monetary `chart.data[].value` values must be integer cents, matching the snapshot files. The answer may format dollars for readability, but model-emitted chart values for revenue/cost/margin/AOV must stay in cents.
   - Update prompt tests to assert this rule.
   - Update module README/report wording as needed.

2. **Make persistence robust against the observed live output**
   - Saved revenue charts must render at the correct scale even if a generated result uses dollar values in `chart.data`.
   - Prefer a small, explicit app-captured unit/normalization strategy over brittle answer-only inference.
   - If you expand `AnalysisChartPayload["unit"]`, update the renderer and schema-shape tests accordingly.
   - Preserve existing correct behavior for deterministic stub charts and engine results that already use integer cents.

3. **Tests**
   - Add/strengthen a test reproducing the live failure: engine result answer/table indicates dollar values and chart values are dollar-scale; saved result rendering must show about `$2,366`, not `$24`.
   - Add/strengthen a test proving integer-cent engine chart values still render correctly.
   - Keep existing no-literal-zero tests and generated-code/command-log tests intact.

4. **Docs**
   - Update `docs/phases/phase-02-report.md` to record that the first Lead live turn reached the saved result page but exposed a chart-scale defect, then mark the fix as pending Lead re-proof.
   - Do not mark the reserved Lead-owned live-turn evidence as PASS. The Lead will fill final measurements after rerunning the app path.
   - Update the phase plan living sections if needed.

## Non-Negotiables

- Do not run a live runtime SDK turn. The Project Lead owns the re-proof.
- Do not weaken known-answer evals or schema validation.
- Do not remove the pending UI, generated-code panel, command-log panel, global timeout behavior, monthly summaries, or clean test DB setup.
- Do not add broad UI rewrites.
- Do not write or stage git history.

## Verification

Run:

- `npm --prefix web run test -- analysis`
- `npm --prefix web run test -- codex`
- Clean `web/.next` with Node `fs.rmSync` if it exists.
- `npm --prefix web run typecheck`
- `npm --prefix web run lint`
- `npm --prefix web run build`
- `rg -n 'child_process|spawn\(|codex exec' web/`
- `git diff --check`

If the focused tests fail, fix and rerun them. If full gates require a forbidden file, stop and return BLOCKED.

## Definition Of Done

- The prompt tells the runtime to emit monetary chart values in integer cents.
- The persisted result page renders money charts at the correct scale for both cent-scale and observed dollar-scale model outputs.
- Tests would have caught the `$24` vs `$2,366` live defect.
- Phase report/plan accurately reflect the failed first live proof and that final live re-proof remains Lead-owned.
- Verification commands pass or are reported BLOCKED with exact evidence.
- Handoff includes summary, files changed, gate results, deviations/surprises, and intended Conventional Commit message(s).
