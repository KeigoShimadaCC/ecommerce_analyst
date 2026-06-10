#!/usr/bin/env bash
set -u
set -o pipefail

if [ "$#" -lt 2 ]; then
  printf 'Usage: %s <label> <prompt> [role] [model] [effort]\n' "$0" >&2
  exit 64
fi

LABEL="$1"
PROMPT="$2"
ROLE="${3:-${CODEX_RUN_ROLE:-phase-orchestrator}}"
MODEL="${4:-${CODEX_RUN_MODEL:-gpt-5.5}}"
EFFORT="${5:-${CODEX_RUN_EFFORT:-high}}"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOG_DIR="$ROOT/logs/sessions"
mkdir -p "$LOG_DIR"

TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
LOG_FILE="$LOG_DIR/${LABEL}-${STAMP}.jsonl"
LAST_MESSAGE_FILE="$LOG_DIR/${LABEL}-${STAMP}.last-message.txt"
LEDGER="$LOG_DIR/ledger.tsv"

if [ ! -f "$LEDGER" ]; then
  printf 'timestamp\tlabel\trole\tmodel\teffort\texit_code\twall_seconds\tinput_tokens\toutput_tokens\ttotal_tokens\tlog_file\n' > "$LEDGER"
fi

START_SECONDS="$(date +%s)"

codex exec \
  -m "$MODEL" \
  --sandbox workspace-write \
  -c sandbox_workspace_write.network_access=true \
  -c approval_policy=never \
  -c model_reasoning_effort="$EFFORT" \
  -C "$ROOT" \
  --skip-git-repo-check \
  --json \
  -o "$LAST_MESSAGE_FILE" \
  "$PROMPT" 2>&1 | tee "$LOG_FILE"

EXIT_CODE="${PIPESTATUS[0]}"
END_SECONDS="$(date +%s)"
WALL_SECONDS="$((END_SECONDS - START_SECONDS))"

TOKEN_FIELDS="$(node - "$LOG_FILE" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
let input = 0;
let output = 0;

if (fs.existsSync(path)) {
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const event = JSON.parse(line);
      const usage = event.usage || event.item?.usage;
      if (!usage) continue;
      input += Number(usage.input_tokens || 0);
      output += Number(usage.output_tokens || 0);
    } catch (error) {
      // Non-JSON stderr from the CLI may be teed into the log on failures.
    }
  }
}

process.stdout.write(`${input}\t${output}\t${input + output}`);
NODE
)"

printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$TIMESTAMP" \
  "$LABEL" \
  "$ROLE" \
  "$MODEL" \
  "$EFFORT" \
  "$EXIT_CODE" \
  "$WALL_SECONDS" \
  "$TOKEN_FIELDS" \
  "$LOG_FILE" >> "$LEDGER"

exit "$EXIT_CODE"
