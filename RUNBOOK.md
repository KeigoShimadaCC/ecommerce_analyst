# Runbook

This file summarizes the end-to-end choreography. `AGENTS.md` owns operational rules; `PLANS.md` owns the tier model and phase-plan method; `NORTH_STAR.md` owns product acceptance.

## Pre-Build

1. Read `NORTH_STAR.md`, `AGENTS.md`, and `PLANS.md`.
2. Verify the CLI, ambient auth, Node, npm, and model availability.
3. Generate and smoke `scripts/codex-run.sh` plus `scripts/codex-report.sh`.
4. Run direct SDK and minimal Next-route SDK spikes.
5. Record spike results in `docs/spike-notes.md`.
6. Generate phase plans and prompt templates.
7. Get supervisor confirmation that the dashboard usage cap is set to `$20`.

The implementation clock starts at the first project-code commit, not during pre-build.

## Phase Loop

For each phase:

1. Fill `prompts/phase-orchestrator.md` into `docs/orchestration/prompts/phase-NN-<name>.md`.
2. Launch exactly one phase session through `scripts/codex-run.sh`.
3. Monitor the JSONL stream for stalls or BLOCKED escalation.
4. Review the phase report and intended commit breakdown.
5. Clean `web/.next` if it exists, then run typecheck, lint, test, and build independently.
6. For P2 and later, run a live normal-app-path SDK turn and verify non-empty generated code.
7. Run the vendor-literal scans from `AGENTS.md`.
8. Commit, tag `phase-NN-complete`, and push.

## Submission Gate

Submission is code-ready only when:

- All shipped `NORTH_STAR.md` DoD items are met or honestly deferred.
- The final real normal-app-path SDK turn passes with a non-empty generated-code panel.
- Cheap demo query measurements are recorded.
- The result page exposes a proof-artifact download.
- README and demo-script claims point to recorded evidence.
- Final scans pass across tracked files and commit history.
- `RUN_REPORT.md` records outcome, time accounting, deviations, shipped-vs-DoD, and feasibility notes.
