# Agent Vault

AI-powered DeFi Agent Marketplace on Initia. Users deposit funds into vaults, grant AI agents permission to execute yield strategies via Initia's auto-signing, and earn returns. Agents compete on a public leaderboard by performance.

## Initia Hackathon Submission

**Project Name:** Agent Vault

**Overview:** Agent Vault is a marketplace where AI agents offer DeFi strategies as a service on Initia. Users create vaults, deposit funds, and delegate strategy execution to AI agents using Initia's auto-signing (session keys). The AI agent monitors lending pool rates and automatically rebalances funds to maximize yield. Fees are only charged on profits — users retain full ownership and can withdraw at any time.

**Custom Implementation:** The core system consists of four Solidity smart contracts deployed on an EVM Minitia: VaultFactory (creates user-agent vaults), AgentVault (holds funds with scoped agent permissions and P&L tracking), AgentRegistry (agent marketplace with on-chain performance), and MockLendingPool (simulated DeFi protocol with configurable rates). The off-chain agent service uses a polling architecture with an AI decision layer (Anthropic API) that provides natural language reasoning for each strategy action.

**Native Feature — Auto-Signing:** Auto-signing is the core mechanic of Agent Vault. Users grant scoped session keys to AI agents via `autoSign.enable()` from InterwovenKit. Once enabled, the agent can submit transactions (`submitTxBlock()`) to rebalance vault funds without requiring wallet confirmation for each action. Users see the session expiration and can revoke at any time via the dashboard. This transforms auto-signing from a UX convenience into a fundamental product feature — enabling autonomous AI agent execution on Initia.

### Local Execution

Prerequisites: Docker Desktop, Go 1.22+, Node.js 20+, and [Foundry](https://book.getfoundry.sh/getting-started/installation).

1. **Set up the Minitia** (one-time, via Initia's [Weave CLI](https://github.com/initia-labs/weave)):
   ```bash
   weave init              # select EVM rollup
   weave opinit init executor
   weave relayer init
   ```

2. **Start the chain:**
   ```bash
   minitiad start
   # JSON-RPC will be listening on http://localhost:8545
   ```

3. **Deploy contracts** (run once against a fresh chain so the deterministic
   addresses in `.env.example` match):
   ```bash
   cd contracts
   forge build

   # DEPLOYER_KEY is Anvil's canonical test key 0 (funded on a fresh Minitia).
   export DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

   forge script script/Deploy.s.sol:Deploy \
     --rpc-url http://localhost:8545 \
     --private-key $DEPLOYER_KEY \
     --broadcast -vvv
   ```

   The script prints the four deployed addresses — copy them into
   `frontend/.env` and `agent-service/.env` (or use the defaults in
   `.env.example`, which already match the canonical first-four-nonces
   addresses).

4. **Start the frontend:**
   ```bash
   cd frontend
   cp .env.example .env   # already wired to the canonical addresses
   npm install
   npm run dev            # → http://localhost:5173
   ```

5. **Start the agent service:**
   ```bash
   cd agent-service
   cp .env.example .env   # add your OPENAI_API_KEY
   npm install
   npm run dev
   ```

6. **Smoke test the full stack** (optional but recommended):
   ```bash
   ./scripts/e2e-smoke-test.sh
   ```
   Registers an agent, creates a vault, deposits 1B GAS, triggers a
   strategy execution, and verifies events were emitted.

## Architecture

```
Frontend (React + InterwovenKit + wagmi)
  ├── Marketplace: Browse agents, view performance
  ├── Dashboard: Manage vaults, enable auto-signing, bridge assets
  └── Agent Detail: Create vault, deposit funds

EVM Minitia (Solidity)
  ├── VaultFactory.sol   — Creates per-user vaults
  ├── AgentVault.sol     — Holds funds, enforces permissions, tracks P&L
  ├── AgentRegistry.sol  — Agent marketplace with on-chain performance
  └── MockLendingPool.sol — Simulated lending pools with variable rates

Agent Service (TypeScript + Anthropic API)
  ├── Yield Rebalancer   — Monitors rates, rebalances across pools
  └── AI Advisor         — Provides natural language reasoning for decisions
```

## Revenue Model

| Stream | Rate | Mechanism |
|---|---|---|
| Platform fee | 5% of profits | Deducted on withdrawal |
| Agent fee | 10% of profits | Set by agent, deducted on withdrawal |

Users retain full ownership. No lock-ups. Self-custody via smart contract. Withdraw 100% of principal + remaining profit at any time.

## Tech Stack

- **Smart Contracts:** Solidity 0.8.24 + Foundry
- **Frontend:** React + Vite + TypeScript + InterwovenKit + wagmi + viem
- **Agent Service:** Node.js + TypeScript + ethers v6
- **AI:** Anthropic Claude API (off-chain, per AI track guidance)
- **Appchain:** Initia EVM Minitia via Weave CLI
