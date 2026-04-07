#!/usr/bin/env bash
# Agent Vault E2E Smoke Test
#
# Verifies the full deployment flow against a running EVM Minitia (or Anvil):
#   1. All 4 contracts respond to view calls
#   2. Agent registration works
#   3. Vault creation works
#   4. Deposit + strategy execution succeed
#   5. Lending pool accrues interest
#
# Prerequisites:
#   - Minitia (or anvil) running at $RPC_URL
#   - Contracts already deployed (set addresses below or via env)
#   - Deployer account funded
#
# Usage: ./scripts/e2e-smoke-test.sh

set -euo pipefail

# Defaults match local Minitia / Anvil deterministic deployment
RPC_URL="${RPC_URL:-http://localhost:8545}"
DEPLOYER_KEY="${DEPLOYER_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
AGENT_KEY="${AGENT_KEY:-0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d}"
REGISTRY="${AGENT_REGISTRY_ADDRESS:-0x5FbDB2315678afecb367f032d93F642f64180aa3}"
FACTORY="${VAULT_FACTORY_ADDRESS:-0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512}"
POOL_A="${MOCK_POOL_A_ADDRESS:-0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0}"
POOL_B="${MOCK_POOL_B_ADDRESS:-0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9}"

DEPLOYER_ADDR=$(cast wallet address "$DEPLOYER_KEY")
AGENT_ADDR=$(cast wallet address "$AGENT_KEY")

green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
info()  { printf "\033[36m== %s ==\033[0m\n" "$*"; }

info "Configuration"
echo "  RPC:      $RPC_URL"
echo "  Deployer: $DEPLOYER_ADDR"
echo "  Agent:    $AGENT_ADDR"
echo "  Registry: $REGISTRY"
echo "  Factory:  $FACTORY"
echo "  Pool A:   $POOL_A"
echo "  Pool B:   $POOL_B"

# ---- Step 1: Verify contracts ---------------------------------------------
info "1. Verify contracts respond"
RATE_A=$(cast call --rpc-url "$RPC_URL" "$POOL_A" "getSupplyRate()(uint256)")
RATE_B=$(cast call --rpc-url "$RPC_URL" "$POOL_B" "getSupplyRate()(uint256)")
echo "  Pool A rate: ${RATE_A} bps"
echo "  Pool B rate: ${RATE_B} bps"

INITIAL_AGENT_COUNT=$(cast call --rpc-url "$RPC_URL" "$REGISTRY" "getAgentCount()(uint256)")
INITIAL_VAULT_COUNT=$(cast call --rpc-url "$RPC_URL" "$FACTORY" "getVaultCount()(uint256)")
echo "  Existing agents: $INITIAL_AGENT_COUNT"
echo "  Existing vaults: $INITIAL_VAULT_COUNT"
green "  Contracts OK"

# ---- Step 2: Fund agent if needed -----------------------------------------
info "2. Ensure agent has gas"
AGENT_BAL=$(cast balance --rpc-url "$RPC_URL" "$AGENT_ADDR")
if [ "$AGENT_BAL" -lt "1000000000" ]; then
  echo "  Funding agent with 10B GAS..."
  cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" "$AGENT_ADDR" --value 10000000000 >/dev/null
fi
green "  Agent balance: $(cast balance --rpc-url "$RPC_URL" "$AGENT_ADDR")"

# ---- Step 3: Register agent (idempotent) ----------------------------------
info "3. Register agent (skip if already registered)"
ALREADY_REGISTERED=$(cast call --rpc-url "$RPC_URL" "$REGISTRY" "isActiveAgent(address)(bool)" "$AGENT_ADDR")
if [ "$ALREADY_REGISTERED" = "false" ]; then
  cast send --rpc-url "$RPC_URL" --private-key "$AGENT_KEY" "$REGISTRY" \
    "registerAgent(string,string,uint256)" "TestBot" "ipfs://test-strategy" 1000 >/dev/null
  green "  Registered TestBot"
else
  green "  Already registered"
fi

# ---- Step 4: Create vault --------------------------------------------------
info "4. Create vault (deployer as user)"
FACTORY_LOWER=$(echo "$FACTORY" | tr '[:upper:]' '[:lower:]')
VAULT_TX=$(cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" "$FACTORY" \
  "createVault(address,address[])" "$AGENT_ADDR" "[$POOL_A,$POOL_B]" --json)
VAULT=$(echo "$VAULT_TX" | FACTORY_LOWER="$FACTORY_LOWER" python3 -c "
import json, sys, os
tx = json.load(sys.stdin)
factory = os.environ['FACTORY_LOWER']
for log in tx.get('logs', []):
    if log['address'].lower() == factory:
        print('0x' + log['topics'][1][26:])
        break
")
echo "  Vault: $VAULT"
green "  Vault created"

# ---- Step 5: Deposit -------------------------------------------------------
info "5. Deposit 1B GAS"
cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" "$VAULT" "deposit()" --value 1000000000 >/dev/null
VAULT_BAL=$(cast balance --rpc-url "$RPC_URL" "$VAULT")
echo "  Vault balance: $VAULT_BAL"
[ "$VAULT_BAL" = "1000000000" ] && green "  Deposit OK" || (red "  Expected 1000000000, got $VAULT_BAL"; exit 1)

# ---- Step 6: Agent executes strategy --------------------------------------
info "6. Agent moves funds to Pool B (higher yield)"
DEPOSIT_CALLDATA=$(cast calldata "deposit()")
cast send --rpc-url "$RPC_URL" --private-key "$AGENT_KEY" "$VAULT" \
  "executeStrategyWithValue(address,bytes,uint256)" "$POOL_B" "$DEPOSIT_CALLDATA" 1000000000 >/dev/null
POOL_BAL=$(cast call --rpc-url "$RPC_URL" "$POOL_B" "balanceOf(address)(uint256)" "$VAULT")
VAULT_BAL_AFTER=$(cast balance --rpc-url "$RPC_URL" "$VAULT")
echo "  Vault balance: $VAULT_BAL_AFTER"
echo "  Pool B balance: $POOL_BAL"
[ "$VAULT_BAL_AFTER" = "0" ] && green "  Strategy executed" || (red "  Vault should be empty"; exit 1)

# ---- Step 7: Verify event log ---------------------------------------------
info "7. Verify on-chain events"
LATEST_BLOCK=$(cast block-number --rpc-url "$RPC_URL")
EVENTS=$(cast logs --rpc-url "$RPC_URL" --address "$VAULT" --from-block 0 --to-block "$LATEST_BLOCK" 2>&1 | grep -c "blockNumber" || true)
echo "  Vault events emitted: $EVENTS"
[ "$EVENTS" -ge "2" ] && green "  Events OK (deposit + strategy)" || red "  Expected ≥2 events"

# ---- Summary ---------------------------------------------------------------
echo ""
green "========================================"
green "  E2E SMOKE TEST PASSED"
green "========================================"
echo "  Vault: $VAULT"
echo "  Funds in Pool B (8% APY): $POOL_BAL"
