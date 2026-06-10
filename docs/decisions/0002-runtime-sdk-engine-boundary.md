# ADR 0002: Runtime SDK Engine Boundary

Status: Accepted

Date: June 10 2026

## Context

Phase 02 replaces the deterministic stub with the runtime engine that answers merchant questions by letting the SDK write and run code against a per-request data snapshot.

The engine is the assignment-critical boundary. It must prove that analysis code ran against merchant-scoped data, keep the app in control of validation, avoid network and approval risk during runtime turns, and preserve enough work trail for the UI to show the result and code side by side.

## Decision

Use a file-based runtime engine with these boundaries:

- Each request creates a temporary merchant snapshot directory populated only from authenticated merchant data.
- The runtime prompt requires a durable `analysis.mjs` or `analysis.py` script and a file-based `result.json`.
- The app reads `result.json` and validates it with the centralized strict Zod schema in `web/src/lib/analysis/result.ts`.
- SDK structured outputs are not used for the runtime result contract.
- The runner, snapshot provider, and persistence hook are injectable so unit tests can exercise success, retry, timeout, fallback, and dependency-failure paths without a live SDK turn.
- Runtime SDK turns disable network access, use workspace-write sandboxing, require no approvals, skip git checks, and enforce one hard timeout budget across the whole analysis run. A corrective retry receives only the remaining budget and is skipped when fewer than 40 seconds remain.
- The engine captures generated code and command logs from SDK turn items plus the snapshot directory so saved history can render the work trail.
- Unrecoverable failures persist a schema-valid fallback instead of surfacing a stack trace.

## Consequences

The app owns the validation boundary and can test it without a live model call. The script file and command log make the proof of work visible in the product, not just in logs.

This design adds explicit cleanup, retry, and fallback responsibilities to the engine. It also requires a Lead-owned live normal-app-path SDK proof at the phase gate, because fake-runner tests cannot prove native package loading, ambient auth, or actual SDK behavior.
