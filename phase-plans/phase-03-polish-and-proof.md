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

To be appended by the phase orchestrator.

## Progress

- [ ] Not started.

## Decision Log

- No phase decisions recorded yet.

## Surprises & Discoveries

- None yet.

## Outcomes & Retrospective

- Pending phase completion.
