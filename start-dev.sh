#!/bin/bash
# Watchdog script that keeps the dev server running.
# Resolves the project directory dynamically from this script's location so the
# project is portable (no hardcoded absolute paths).
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
while true; do
  echo "[$(date)] Starting dev server in $SCRIPT_DIR ..."
  bun run dev > /tmp/lernio-dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Dev server exited with code $EXIT_CODE, restarting in 2s..."
  sleep 2
done
