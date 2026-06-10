# Pre-Build Spike Notes

Date: 2026-06-10
Owner: Project Lead

## Toolchain

- Node: v25.9.0
- npm: 11.12.1
- Codex CLI: 0.137.0
- CLI auth: logged in using ChatGPT ambient auth.
- CLI doctor: default model `gpt-5.5`; stored API key false.
- Model probe: `codex exec -m gpt-5.5 --sandbox read-only -c approval_policy=never -c model_reasoning_effort=low --json "Reply exactly: MODEL_OK"` returned `MODEL_OK`.

No deliberate API-mode run was performed during pre-build. The supervisor billing-cap confirmation is still required before the implementation clock starts.

## Harness Smoke

Command:

```bash
bash scripts/codex-run.sh prebuild-harness-smoke "Reply exactly: HARNESS_OK" smoke gpt-5.5 low
```

Result:

- Exit code: 0
- Last response: `HARNESS_OK`
- Ledger row written to `logs/sessions/ledger.tsv`
- Recorded fields: timestamp, label, role, model, effort, exit code, wall seconds, input tokens, output tokens, total tokens, log file.
- Token extraction: `input_tokens=21588`, `output_tokens=7`, `total_tokens=21595`.

## Direct SDK Spike

Temporary workspace: `/private/tmp/ecommerce-sdk-spike-WiNWPm`

Setup:

- Installed `@openai/codex-sdk@0.139.0` and `@openai/codex@0.139.0` in the temp workspace.
- Used a six-row `data.csv` with May 2026 revenue by region.
- Ran three SDK turns with:
  - ambient auth
  - `model: "gpt-5.5"`
  - `modelReasoningEffort: "low"`
  - `sandboxMode: "workspace-write"`
  - `approvalPolicy: "never"`
  - `networkAccessEnabled: false`
  - `webSearchMode: "disabled"`
  - `skipGitRepoCheck: true`

Measurements:

| Run | Runtime | Result | Script | Commands | File changes | Contract note |
| --- | ---: | --- | --- | ---: | ---: | --- |
| 1 | 46.1s | non-empty chart | `analysis.mjs` | 7 | 1 | Shape matched the intended simple chart contract. |
| 2 | 47.5s | non-empty chart | `analysis.py` | 4 | 1 | Shape matched the intended simple chart contract. |
| 3 | 30.1s | non-empty chart | `analysis.mjs` | 6 | 1 | `notes` came back as an array, proving strict validation is necessary. |

Summary:

- p50: 46.1s
- worst of 3: 47.5s
- All runs produced a durable analysis script plus `result.json`.
- All runs correctly identified North as the top region with revenue 430.
- Prompt-following was good on the computation but not reliable enough for shape enforcement without app-side Zod validation and corrective retry.

## Next Route SDK Smoke

Temporary workspace: `/private/tmp/ecommerce-next-smoke-kS76oJ`

Setup:

- Installed Next 16.2.9, React 19.2.7, TypeScript 6.0.3, `@openai/codex-sdk@0.139.0`, and `@openai/codex@0.139.0`.
- Added `serverExternalPackages: ["@openai/codex-sdk", "@openai/codex"]`.
- Built a minimal App Router route at `/api/spike`.
- Ran `npm run build` successfully.
- Served with `next start -p 3087`.

Route result:

- `GET /api/spike` returned HTTP success.
- Runtime: 36.6s.
- `ok: true`.
- `generatedCodeItems: 1`.
- `commandItems: 5`.
- Result identified North as the top region with revenue 430.
- The returned chart shape included extra keys and `notes` as an array, again proving the final app must reject malformed model-emitted JSON and either correct or fall back.

## Lessons Promoted To Plans

- Runtime SDK calls must externalize native-binary-backed packages in Next.
- Runtime prompts must require a durable script file before execution.
- The app must validate the file-based result with its own strict Zod schema.
- Success-path tests must assert generated code is non-empty.
- The live proof must use the normal frontend path, not only an engine script.
- Cheap demo queries should target the observed 30-50s latency band and must remain below the 90s recording target.
