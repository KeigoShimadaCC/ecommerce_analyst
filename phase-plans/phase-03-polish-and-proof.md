# Phase 03 — Polish And Proof

This phase plan is maintained per `PLANS.md`.

## Purpose

Make the product demo-ready: proof-artifact download, reviewer README, demo script, final engine ADR, latency UX, and any fixes surfaced by the P2 live turn.

## Acceptance Criteria

- Result page exposes a download action. ZIP is preferred; JSON fallback is acceptable if ZIP packaging risks the schedule, but only if it includes question, validated result, generated code, command log, metadata, and data snapshot.
- README documents a Quick Start, setup, `PORT=3001` override, demo credentials, "Why Codex", architecture, rollout posture, exact engine file references, and honest limitations.
- README includes an architecture diagram or tight request-flow graphic after P2 engine files exist, covering request -> snapshot -> SDK -> validation -> persistence -> result/proof artifact.
- Demo script is concise and maps claims to recorded evidence.
- Runtime latency UX shows immediate loading, 15-second threshold copy, disabled input while pending, and clean completion.
- Engine ADR records snapshot isolation, file-based validation, no-network runtime, timeout/fallback, and proof artifact.
- P2 live-turn defects, if any, are fixed through focused worker tasks.
- Quality gates pass.
- `docs/phases/phase-03-report.md` records evidence and intended commits.

## Frozen Contracts

- Proof artifact contents must logically include: question, `result.json`, generated code, command log, metadata, and data snapshot.
- If ZIP is cut, the JSON proof artifact is explicitly documented in README and the demo script as the shipped fallback, not implied to be a ZIP.
- README claims must point to recorded evidence in README or `RUN_REPORT.md`.
- UI must not use marketing-only landing copy; the app opens to the usable merchant flow.

## North Star Acceptance Slice

Advances portable result, communication quality, rollout posture, demo readiness, and user-facing polish. P3 should measure all three cheap demo queries if P2 did not finish them.

## Lead-Owned Gate Checklist

- Review phase report.
- Clean `web/.next` before typecheck.
- Run typecheck, lint, test, build independently.
- Run normal-app-path live SDK proof with a fresh question and verify generated code is non-empty.
- Verify proof-artifact download contains required logical contents.
- Run visual smoke or surface to supervisor.
- Run vendor-literal scans.
- Commit, tag `phase-03-complete`, and push.

## Phase-Level Workstreams

- Implement proof-artifact download.
- Improve latency UX and result/code/command-log presentation.
- Write README Quick Start, architecture diagram, and demo script with claim-evidence mapping.
- Write engine ADR and phase report.
- Fix defects from P2 live proof.

## Owned Files

- `web/**`
- `README.md`
- `docs/decisions/**`
- `docs/phases/phase-03-report.md`
- `docs/demo-script.md`
- `phase-plans/phase-03-polish-and-proof.md`

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `phase-plans/phase-00-bootstrap.md`
- `phase-plans/phase-01-walking-skeleton.md`
- `phase-plans/phase-02-codex-engine.md`
- `phase-plans/phase-04-wow-and-submission.md`

## Orchestrator-Authored Atomic Task List

- [x] Proof artifact worker / Lead finish (10 min, serial, implementation): implement the
  authenticated JSON proof artifact under `web/**`, link it from the saved
  result page, include regenerated merchant snapshot contents with explicit
  metadata, and add focused allowed/cross-tenant tests.
- [x] Documentation worker / Lead finish (10 min, serial after proof behavior is known):
  create reviewer-quality `README.md` and concise `docs/demo-script.md` with
  claim-evidence mapping and honest ambient/API proof wording.
- [x] Verification worker / Lead gate (10 min, serial after implementation/docs): run
  focused proof tests, typecheck, lint, clean-artifact full test, clean build,
  runtime shell-out scan, and production-server HTTP checks for proof auth and
  tenant enforcement when practical.
- [x] Reporting worker / Lead finish (5 min): write
  `docs/phases/phase-03-report.md`, update this plan's living sections, and
  record intended atomic commits for the Project Lead.

## Progress

- [x] 2026-06-10: Required steering docs, Phase 02 report, and ADR 0002 read.
- [x] 2026-06-10: Launch contract restated privately: Tier 2 owns phase
  contract/decomposition/gates/report only; app/doc implementation must be
  delegated to Tier 3 workers; git history and live SDK proof remain Lead-owned.
- [x] 2026-06-10: Scope cut accepted from launch prompt: ship JSON proof
  artifact, README, demo script, and phase report only; defer ZIP, optional wow,
  P4 `RUN_REPORT.md`, and three-query measurement table.
- [x] 2026-06-10: Proof artifact route, result-page link, regenerated snapshot artifact builder, and focused tests completed.
- [x] 2026-06-10: Result chart presentation defect fixed with compact horizontal bars and visible currency values.
- [x] 2026-06-10: README, demo script, Phase 03 report, and minimal RUN_REPORT completed.
- [x] 2026-06-10: Focused analysis tests, typecheck, lint, clean full test, build, runtime shell-out scan, production visual check, and proof JSON download check completed.
- [ ] 2026-06-10: Final vendor scan, commit, tag, and push pending.

## Decision Log

- 2026-06-10, Phase Orchestrator: Ship JSON proof artifact only and document
  regenerated-at-download snapshot semantics. Rationale: launch prompt cuts ZIP
  unless it is already free, and persisted original snapshot storage is not
  present in the Phase 02 schema.
- 2026-06-10, Phase Orchestrator: Keep execution serial. Rationale: proof
  implementation defines the exact route and metadata that README/demo claims
  must reference; parallel docs would risk overclaiming.
- 2026-06-10, Project Lead: Stop the active P3 orchestrator and finish directly.
  Rationale: the supervisor compressed the final scope and explicitly allowed
  intervention to prevent leaving the repo unpushed.

## Surprises & Discoveries

- 2026-06-10: The phase plan still listed broader P3 workstreams such as
  latency UX and engine ADR. The launch prompt narrows this run to the
  score-critical finish; no conflict found because the prompt explicitly cuts
  optional work for time.
- 2026-06-10: The P2 live proof data was correct after the chart-unit fix, but
  the result chart presentation was not demo-ready. The result chart now uses
  compact horizontal bars with visible formatted values.

## Outcomes & Retrospective

- Shipped the compressed P3 scope: readable saved-result chart, authenticated JSON proof artifact, reviewer README, demo script, Phase 03 report, and minimal run report.
- Deferred ZIP packaging, app-path API proof, optional wow upgrade, engine ADR, and full three-query live measurement to protect final gates and push.
- Pending only final vendor scan, commit, tag, and push.
