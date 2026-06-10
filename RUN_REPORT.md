# Run Report

## Pre-Build Confirmation

- 2026-06-10: Human supervisor confirmed the OpenAI dashboard usage cap is set to `$20` before any deliberate API-mode run or project-code phase launch. Confirmation text: "yes capped!"

## Final Outcome

The submission-ready slice is a working merchant analytics app with login, SQLite persistence, seeded demo data, a server-side Codex SDK runtime, visible generated code and command log, saved history, compact result chart rendering, and a JSON proof artifact.

Git state at this checkpoint:

- Phase 02 was pushed and tagged as `phase-02-complete` at `b33caf0`.
- Phase 03 finishing work contains the reviewer README, proof artifact, chart presentation fix, demo script, gates/report, and this run report. It is ready for final commit, tag, and push after the vendor scan.

## Time Accounting

Durable session timing lives in phase reports and the ignored harness ledger. The score-critical recorded app-path SDK proof from Phase 02 completed in 53,637 ms with one attempt and fallback false.

Phase 03 gate evidence:

- `npm --prefix web run typecheck` passed.
- `npm --prefix web run lint` passed.
- `npm --prefix web run test` passed from deleted test SQLite artifacts, 15 files / 74 tests.
- `npm --prefix web run build` passed with the existing Turbopack tracing warning.
- Runtime shell-out scan returned no matches for CLI shell-out patterns in `web/`.
- Production visual check on port 3001 showed the saved result chart with visible currency values, non-empty generated code, non-empty command log, and an authenticated proof JSON download.

Due to the final timebox, optional wow work, ZIP proof packaging, API app-path proof, and broad UI polish were cut.

## Deviation Summary

- Phase 01 had one documented transient session stall and was relaunched per policy.
- Phase 02 live proof caught a chart-scale evidence defect; the contract was fixed so money chart values are integer cents and tests assert values such as `236640`.
- Phase 03 was compressed. The Project Lead directly intervened after a running orchestrator stalled around proof-artifact work because the supervisor explicitly prioritized finishing and pushing over preserving delegation purity.

## Shipped Vs Definition Of Done

Shipped:

- Login and protected merchant routes.
- Demo seed with two merchants and deterministic known answers.
- Dashboard KPIs and trend chart.
- Runtime Codex SDK engine with per-merchant snapshots, no network, 120-second global timeout, file-based `result.json`, strict Zod validation, retry/fallback, generated-code capture, and command-log capture.
- Saved analysis history.
- Compact readable result chart with visible currency values.
- JSON proof artifact containing question, result payloads, generated code, command log, runtime metadata, and regenerated merchant snapshot contents.
- README and demo script.

Deferred:

- ZIP proof artifact.
- App-path API proof.
- Full three-query live measurement table.
- Optional wow upgrade.
- Streaming SDK progress.
- Write actions.

## Feasibility Notes

A human could build a narrower version in four hours, but the reliable version depends on strong pre-build controls: frozen phase plans, explicit SDK auth mode, small snapshot files, known-answer evals, and live app-path proof. The docs that most reduce risk are the runtime SDK rules in `AGENTS.md`, the result contract in `NORTH_STAR.md`, and the phase reports that preserve timing and defect evidence outside ignored logs.
