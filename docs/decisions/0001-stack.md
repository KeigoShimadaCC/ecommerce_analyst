# ADR 0001: Bootstrap Stack

Status: Accepted

Date: June 10 2026

## Context

Phase 00 needed a runnable foundation for the merchant analytics app: a typed web surface, local persistence, isolated tests, charting support, and a Python analysis runtime for later generated analysis scripts.

The stack must support the North Star flow: a merchant asks a question, the app persists and reads store data, analysis code runs against a per-request snapshot, and the verified result plus generated code are shown in the UI.

## Decision

Use the following bootstrap stack:

- Next.js App Router with TypeScript in `web/`.
- npm as the package manager.
- Prisma with SQLite for local persistence.
- Vitest with an isolated SQLite test database.
- Recharts for frontend chart rendering.
- A project Python virtual environment at `.venv/` with pandas for analysis scripts.

## Consequences

This gives later phases one typed application root, deterministic local setup, charting primitives, and a Python runtime aligned with the planned analysis path.

SQLite keeps the demo self-contained. Prisma and Vitest require explicit production/test database separation from the start. The Python virtual environment is an ignored local artifact and must be created on each machine that runs analysis scripts.
