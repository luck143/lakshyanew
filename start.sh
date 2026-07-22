#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cmd="${1:-all}"
if [ $# -gt 0 ]; then
  shift
fi

cd "$ROOT"
exec bash -lc ". scripts/runtime/start \"$cmd\" \${@+\"\$@\"}"