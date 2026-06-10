# Run Report

## Pre-Build Confirmation

- 2026-06-10: Human supervisor confirmed the OpenAI dashboard usage cap is set to `$20` before any deliberate API-mode run or project-code phase launch. Confirmation text: "yes capped!"

## Final Outcome

The submission-ready slice is a working merchant analytics app with login, SQLite persistence, seeded demo data, a server-side Codex SDK runtime, visible generated code and command log, saved history, compact result chart rendering, and a JSON proof artifact.

Git state at this checkpoint:

- Phase 02 was pushed and tagged as `phase-02-complete` at `b33caf0`.
- Phase 03 was pushed and tagged as `phase-03-complete` at `549d179`.
- Remote `origin/main` and local `main` both contained `549d179` before this final evidence refresh.

## Time Accounting

Durable session timing lives in phase reports and the ignored harness ledger. The score-critical recorded app-path SDK proof from Phase 02 completed in 53,637 ms with one attempt and fallback false.

Final submission live proof, run after Phase 03 was pushed:

- Normal app path: Playwright login as `owner@aurora.example`, dashboard ask form, real SDK turn, persisted result page, history list, proof JSON download.
- Question: `For May 2026, show paid revenue by category as a bar chart and recommend which category to feature next month.`
- Analysis ID: `analysis-f3e6e047-e5c4-4947-a24e-be16da543030`
- Runtime: 47,901 ms from persisted engine metadata.
- Attempts: 1.
- Fallback: false.
- Generated code length: 2,105 characters.
- Command log length: 5,547 characters.
- Chart: non-empty, `currency_cents`, `Home:267840|Coffee:264720|Apparel:177840|Beauty:106560`.
- Saved history: the new category analysis appeared first in `/analyses` and opened at `/analyses/analysis-f3e6e047-e5c4-4947-a24e-be16da543030`.
- Proof JSON: authenticated download succeeded and included question, answer/chart payloads, generated code, command log, runtime metadata, attempts, fallback, and six regenerated snapshot files.

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
