#!/usr/bin/env bash
# Check that the Mission Control simulation still behaves.
#
#   ./scripts/mission/verify.sh
#
# There is no test runner in this repo and this adds no dependency: it compiles
# lib/mission with the TypeScript already in node_modules and runs two probes
# against the result.
#
# Run it after changing anything in lib/mission — especially the thresholds in
# economy.ts. Every one of them is tuned against this roster, and a plausible
# looking change to any of them can silently stop a ceremony ever firing. That
# is not a failure you will notice by looking at the screen: the field carries on
# settling perfectly happily with a moment that never arrives.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

cd "$root"
./node_modules/.bin/tsc lib/mission/economy.ts lib/mission/renderer.ts \
  --outDir "$out" --module commonjs --target es2020 --moduleResolution node \
  --skipLibCheck --strict --lib es2020,dom

echo
node "$root/scripts/mission/economy-probe.cjs" "$out"
echo
node "$root/scripts/mission/render-smoke.cjs" "$out"
