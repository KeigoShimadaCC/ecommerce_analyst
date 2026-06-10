# Phase 04 — Wow And Submission

This phase plan is maintained per `PLANS.md`.

## Purpose

Apply exactly one safe wow upgrade if time allows, complete final measurements, write `RUN_REPORT.md`, and make the repo submission-ready.

## Acceptance Criteria

- Exactly one wow upgrade is selected: richer seed refinement or a second dashboard insight chart. If P2/P3 ran long or submission risk is rising, choose no upgrade and record the scope cut honestly.
- Three cheap demo queries have live measurements: runtime, fallback status, attempts, generated-code length, command-log length, chart non-empty status, and recording suitability.
- Final normal-app-path live SDK turn with a fresh question passes and generated-code panel is non-empty.
- `RUN_REPORT.md` records outcome, time accounting, session timing/token summaries copied from durable phase evidence, deviation summary, shipped-vs-DoD, deferred items, and honest feasibility answer.
- README and demo script claims match recorded evidence.
- Quality gates pass on a clean tree.
- `docs/phases/phase-04-report.md` records evidence and intended commits.

## Frozen Contracts

- MVP fallback if behind: login -> seeded dashboard -> one known question -> real SDK writes and runs code -> answer plus non-empty generated-code panel -> saved history.
- Ignored `logs/` files are not durable submission evidence; timing/token and live-proof claims must be summarized in committed phase reports or `RUN_REPORT.md`.
- Do not add broad new product surfaces in this phase.
- Human-owned video recording and final upload are scheduled, not performed by sandboxed workers.

## North Star Acceptance Slice

Completes submission-specific DoD: cheap-query measurements, final live proof, proof artifact verification, claim-evidence mapping, and run report.

## Lead-Owned Gate Checklist

- Review phase report.
- Clean `web/.next` before typecheck.
- Run typecheck, lint, test, build independently.
- Run final normal-app-path live SDK proof.
- Verify proof artifact.
- Run final vendor-literal scans across tracked files and commit history.
- Commit, tag `phase-04-complete`, and push.
- Surface human-owned visual smoke and video checklist to supervisor.

## Phase-Level Workstreams

- Decide and implement one wow upgrade only if budget permits; cut it immediately if it threatens P2/P3 proof quality, final measurements, or submission packaging.
- Measure demo queries and record evidence.
- Write `RUN_REPORT.md`.
- Reconcile README/demo script with shipped behavior.
- Write final phase report.

## Owned Files

- `web/**`
- `README.md`
- `RUN_REPORT.md`
- `docs/demo-script.md`
- `docs/phases/phase-04-report.md`
- `phase-plans/phase-04-wow-and-submission.md`

## Forbidden Files

- `NORTH_STAR.md`
- `AGENTS.md`
- `PLANS.md`
- `RUNBOOK.md`
- `prompts/**`
- `phase-plans/phase-00-bootstrap.md`
- `phase-plans/phase-01-walking-skeleton.md`
- `phase-plans/phase-02-codex-engine.md`
- `phase-plans/phase-03-polish-and-proof.md`

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
