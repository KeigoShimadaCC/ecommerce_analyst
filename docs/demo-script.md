# Demo Script

Target length: under 5 minutes.

## 0:00-0:45 — Product Claim

This is Codex eCommerce Analyst for a merchant on a commerce platform. The merchant asks an analytics question in plain English. Codex writes and runs real code against that merchant's data snapshot, then the app saves the verified answer, chart, generated code, command log, and proof artifact.

Opening line:

> This is Codex eCommerce Analyst. A merchant asks an analytics question in English; the server gives Codex a merchant-scoped data snapshot; Codex writes and runs an analysis script; the app validates `result.json`, persists the result, and shows the generated code and command log next to the answer.

One-sentence claim to land early:

> Codex wrote real analysis code, ran it in a sandbox against this merchant's snapshot, and the saved result shows the code and command log.

What this is not:

- Not chat over CSV.
- Not a generic OpenAI completion.
- Not a hidden manual calculation.
- Not a write-action agent.

What I want the reviewer to notice:

- Codex is used programmatically server-side.
- The data boundary is per merchant.
- The output is validated before persistence.
- The result is auditable through generated code, command logs, and Proof JSON.

## 0:45-2:10 — Live Product Flow

1. Run `npm --prefix web run setup`.
2. Start the app with `PORT=3001 npm --prefix web run dev`.
3. Log in with `owner@aurora.example` / `demo-aurora-2026`.
4. Show the dashboard KPIs and ask form.
5. Submit a bounded demo query:
   `Which region had the highest paid revenue in May 2026? Show the regional revenue bar chart and explain the gap to the runner-up.`
6. Show the loading state: input disabled, button disabled, and "Codex is writing code" / "Codex is still considering..." if the run takes long enough.
7. On the saved result page, show:
   - non-fallback answer;
   - compact horizontal result chart;
   - generated code panel;
   - command log panel;
   - `Proof JSON` link.
8. Open history and reopen the saved result.

## 2:10-3:30 — How It Works

Show or describe these files:

- `web/src/lib/codex/snapshot.ts`: creates merchant-only snapshot files.
- `web/src/lib/codex/client.ts`: configures the SDK with workspace-write, approval never, network disabled, and a 120-second global timeout.
- `web/src/lib/codex/prompt.ts`: tells Codex to write and execute `analysis.py` or `analysis.mjs`, then write `result.json`.
- `web/src/lib/codex/engine.ts`: reads `result.json`, validates it, retries once when useful, and falls back cleanly.
- `web/src/lib/analysis/result.ts`: centralized strict Zod result schema.
- `web/src/lib/analysis/proof-artifact.ts`: builds the downloadable JSON proof artifact.

Explain why this is Codex-native: a coding agent can inspect files, write a script, execute it, and leave an auditable work trail. A normal chat answer would not provide the same generated-code proof path.

## 3:30-4:20 — Evidence And Tests

Mention recorded Phase 02 evidence:

- normal app path proof;
- runtime 53.637 seconds;
- one attempt;
- fallback false;
- generated code 2,614 characters;
- command log 4,617 characters;
- chart unit `currency_cents`, West `236640`.

Mention final submission proof:

- normal path: login -> dashboard ask form -> real SDK turn -> persisted result page -> history -> proof JSON;
- question: `For May 2026, show paid revenue by category as a bar chart and recommend which category to feature next month.`;
- runtime 47.901 seconds;
- one attempt;
- fallback false;
- generated code 2,105 characters;
- command log 5,547 characters;
- chart unit `currency_cents`, Home `267840`.

Mention gates:

- typecheck;
- lint;
- full tests;
- build;
- runtime shell-out scan.

## 4:20-5:00 — Limitations And Rollout

Be precise:

- App-path proof used ambient auth. API mode is supported but not exercised in the recorded app-path proof.
- Proof JSON includes a regenerated download-time snapshot, not the original temp SDK directory.
- The workflow is read-only analytics. Future write actions should require approval gates.
- Production rollout would start with a pilot, per-tenant snapshot isolation, eval gates, fallback-rate tracking, and audit review.
