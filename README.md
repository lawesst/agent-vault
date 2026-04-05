# Agent Vault

AI-powered DeFi Agent Marketplace on Initia. Users deposit funds into vaults, grant AI agents permission to execute yield strategies via Initia's auto-signing, and earn returns. Agents compete on a public leaderboard by performance.

## Initia Hackathon Submission

**Project Name:** Agent Vault

**Overview:** Agent Vault is a marketplace where AI agents offer DeFi strategies as a service on Initia. Users create vaults, deposit funds, and delegate strategy execution to AI agents using Initia's auto-signing (session keys). The AI agent monitors lending pool rates and automatically rebalances funds to maximize yield. Fees are only charged on profits — users retain full ownership and can withdraw at any time.

**Custom Implementation:** The core system consists of four Solidity smart contracts deployed on an EVM Minitia: VaultFactory (creates user-agent vaults), AgentVault (holds funds with scoped agent permissions and P&L tracking), AgentRegistry (agent marketplace with on-chain performance), and MockLendingPool (simulated DeFi protocol with configurable rates). The off-chain agent service uses a polling architecture with an AI decision layer (Anthropic API) that provides natural language reasoning for each strategy action.

**Native Feature — Auto-Signing:** Auto-signing is the core mechanic of Agent Vault. Users grant scoped session keys to AI agents via `autoSign.enable()` from InterwovenKit. Once enabled, the agent can submit transactions (`submitTxBlock()`) to rebalance vault funds without requiring wallet confirmation for each action. Users see the session expiration and can revoke at any time via the dashboard. This transforms auto-signing from a UX convenience into a fundamental product feature — enabling autonomous AI agent execution on Initia.

### Local Execution

1. **Set up the Minitia:**
   ```bash
   # Install prerequisites: Docker Desktop, Go 1.22+, Foundry
   # Install Initia tooling and run:
   weave init  # Select EVM rollup
   weave opinit init executor
   weave relayer init
   ```

2. **Deploy contracts:**
   ```bash
   cd contracts
   forge build
   # Deploy via minitiad tx evm create (see docs)
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   cp .env.example .env  # Fill in contract addresses
   npm install && npm run dev
   ```

4. **Start the agent service:**
   ```bash
   cd agent-service
   cp .env.example .env  # Fill in contract addresses + agent key
   npm install && npm run dev
   ```

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
