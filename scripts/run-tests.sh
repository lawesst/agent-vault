#!/usr/bin/env bash
# Run all Agent Vault tests in sequence
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
info()  { printf "\033[36m== %s ==\033[0m\n" "$*"; }

info "1. Foundry contract tests"
cd "$REPO_ROOT/contracts"
forge test
green "  Contract tests passed"

info "2. Frontend type-check + build"
cd "$REPO_ROOT/frontend"
npm run build >/dev/null
green "  Frontend builds clean"

info "3. Agent service type-check + build"
cd "$REPO_ROOT/agent-service"
npm run build >/dev/null
green "  Agent service builds clean"

info "4. E2E smoke test against live chain"
"$REPO_ROOT/scripts/e2e-smoke-test.sh"

green ""
green "ALL TESTS PASSED"
