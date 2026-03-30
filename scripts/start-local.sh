#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/backend"
npm run build
nohup npm run start:prod > "$ROOT_DIR/backend/backend.log" 2>&1 &

cd "$ROOT_DIR"
npm run build
nohup node "$ROOT_DIR/scripts/https-gateway.mjs" > "$ROOT_DIR/frontend.log" 2>&1 &

echo "Backend log: $ROOT_DIR/backend/backend.log"
echo "Frontend log: $ROOT_DIR/frontend.log"
