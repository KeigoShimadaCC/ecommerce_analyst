#!/usr/bin/env bash
set -u

if [ "$#" -lt 1 ]; then
  printf 'Usage: %s <label-prefix>\n' "$0" >&2
  exit 64
fi

PREFIX="$1"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LEDGER="$ROOT/logs/sessions/ledger.tsv"

if [ ! -f "$LEDGER" ]; then
  printf 'No ledger found at %s\n' "$LEDGER" >&2
  exit 1
fi

node - "$LEDGER" "$PREFIX" <<'NODE'
const fs = require("fs");
const [ledger, prefix] = process.argv.slice(2);
const lines = fs.readFileSync(ledger, "utf8").trim().split(/\r?\n/);
const header = lines.shift()?.split("\t") || [];
const rows = lines
  .filter(Boolean)
  .map((line) => Object.fromEntries(line.split("\t").map((value, index) => [header[index], value])))
  .filter((row) => row.label?.startsWith(prefix));

let wall = 0;
let input = 0;
let output = 0;
let total = 0;
let failed = 0;

for (const row of rows) {
  wall += Number(row.wall_seconds || 0);
  input += Number(row.input_tokens || 0);
  output += Number(row.output_tokens || 0);
  total += Number(row.total_tokens || 0);
  if (Number(row.exit_code || 0) !== 0) failed += 1;
}

console.log(`prefix\t${prefix}`);
console.log(`sessions\t${rows.length}`);
console.log(`failed\t${failed}`);
console.log(`wall_seconds\t${wall}`);
console.log(`input_tokens\t${input}`);
console.log(`output_tokens\t${output}`);
console.log(`total_tokens\t${total}`);

for (const row of rows) {
  console.log(`${row.timestamp}\t${row.label}\t${row.role}\t${row.model}\t${row.effort}\texit=${row.exit_code}\twall=${row.wall_seconds}\ttokens=${row.total_tokens}`);
}
NODE
