# Codex Runtime Module

This module is the runtime boundary for merchant analyses. The app imports the SDK directly from server-side code and never shells out to a CLI process from this module.

## Contract

- Each analysis call creates a per-request snapshot directory for the authenticated merchant. The engine treats that directory as the only writable workspace and calls snapshot cleanup in a `finally` block.
- The runtime prompt requires the agent to write a durable `analysis.mjs` or `analysis.py` file, execute that file from the snapshot directory, and write `result.json`.
- The app does not use SDK structured outputs. It reads `result.json` from disk and validates it with the centralized strict Zod result contract in `web/src/lib/analysis/result.ts`.
- SDK turns run with workspace-write sandboxing, approval policy `never`, network disabled, web search disabled, git checks skipped, and a hard 120 second analysis timeout enforced with `AbortController`. Retry attempts spend the remaining global budget, not a fresh per-attempt timeout.
- Ambient auth is the default; API auth is used only when explicitly configured or when an ambient turn fails with an auth-like error and the API env vars are present.
- Validation failure gets at most one corrective attempt when at least 40 seconds remain in the turn budget. Timeout, repeated validation failure, missing `result.json`, or dependency failure returns a schema-valid fallback.
- The engine captures generated code and command logs from SDK turn items and scans the snapshot for `analysis.mjs` or `analysis.py`, so a saved script can still render in the generated-code panel.
- Monetary chart values are prompted as integer cents. Persistence keeps money charts on `currency_cents`; if a live output still emits dollar-scale money chart values, the app normalizes those chart values to integer cents before saving. Non-money charts remain `number`.
- The runner, snapshot provider, and persistence hook are injectable. Unit tests use fake runners only; they do not spend live SDK turns.

## Snapshot Summaries

`revenue_by_region.csv` and `revenue_by_category.csv` are monthly summaries. Their `period` column is a `YYYY-MM` value, so period-specific demo questions such as May 2026 revenue by region or category can be answered directly from the summary files without scanning raw order rows.

## Live Proof Ownership

Sandboxed workers verify this module with fake-runner tests and HTTP/programmatic gates only. The Lead-owned review gate runs the normal app path with a real SDK turn and verifies that the generated-code and command-log panels are non-empty.
