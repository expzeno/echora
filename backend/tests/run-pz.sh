#!/bin/bash
# PipeZeno test runner wrapper — runs Vitest sandbox suite, prints pz-json to stdout.
# All Vitest output goes to stderr so PipeZeno can parse the last stdout line as pz-json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Pipeline injects real values; fallbacks are local dev defaults only — never hardcode credentials
export DATABASE_URL="${DATABASE_URL:-postgresql://server_tridentity_me@localhost:5432/{{PROJECT_NAME}}_sand}"
export TEST_API_BASE="${TEST_API_BASE:-http://localhost:{{PRIMARY_BACKEND_PORT}}}"

"$BACKEND_DIR/node_modules/.bin/vitest" run \
  --config "$SCRIPT_DIR/vitest.sandbox.config.js" >&2 || true

cat "$SCRIPT_DIR/reports/results-sandbox-pz.json" 2>/dev/null \
  || echo '{"ok":false,"total":0,"passed":0,"failed":0,"skipped":0,"durationMs":0,"runner":"vitest","failures":[{"suite":"runner","name":"script","error":"results-sandbox-pz.json not found — reporter may not have run"}],"skipped_tests":[],"tests":[]}'
