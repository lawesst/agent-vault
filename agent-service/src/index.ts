import { ethers } from "ethers";
import { loadEnv } from "./config.js";
import { ChainReader } from "./services/chain-reader.js";
import { VaultExecutor } from "./services/vault-executor.js";
import { YieldRebalancer } from "./strategies/yield-rebalancer.js";
import { AIAdvisor } from "./strategies/ai-advisor.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const env = loadEnv();
  console.log("Agent Vault Service starting...");
  console.log(`  RPC: ${env.RPC_URL}`);
  console.log(`  Poll interval: ${env.POLL_INTERVAL_SEC}s`);
  console.log(`  AI: ${env.ANTHROPIC_API_KEY ? "enabled" : "disabled (no API key)"}`);

  const reader = new ChainReader(env);
  const executor = new VaultExecutor(env);
  const strategy = new YieldRebalancer();
  const aiAdvisor = new AIAdvisor(env.ANTHROPIC_API_KEY);

  // Derive agent address from private key
  const agentWallet = new ethers.Wallet(env.AGENT_PRIVATE_KEY);
  const agentAddress = agentWallet.address;
  console.log(`  Agent address: ${agentAddress}`);

  console.log("\nStarting polling loop...\n");

  while (true) {
    try {
      // Get all vaults managed by this agent
      const vaultAddresses = await reader.getAgentVaults(agentAddress);

      if (vaultAddresses.length === 0) {
        console.log(`[${timestamp()}] No vaults assigned. Waiting...`);
      }

      for (const vaultAddr of vaultAddresses) {
        try {
          // Read vault state
          const vault = await reader.getVaultState(vaultAddr);

          if (vault.revoked) {
            console.log(`[${timestamp()}] Vault ${short(vaultAddr)}: REVOKED — skipping`);
            continue;
          }

          // Read pool states
          const pools = await reader.getPoolStates(vaultAddr);

          // Run strategy analysis
          const analysis = await strategy.analyze(vault, pools);

          // Get AI-enhanced reasoning
          const aiReasoning = await aiAdvisor.enhanceAnalysis(vault, pools, analysis);
          console.log(`[${timestamp()}] Vault ${short(vaultAddr)}: ${aiReasoning}`);

          if (!analysis.shouldAct) continue;

          // Execute actions
          for (const action of analysis.actions) {
            let result;
            if (action.type === "deposit" && action.toPool) {
              result = await executor.depositToPool(vaultAddr, action.toPool, action.amount);
            } else if (action.type === "withdraw" && action.fromPool) {
              result = await executor.withdrawFromPool(vaultAddr, action.fromPool, action.amount);
            }

            if (result) {
              const status = result.success ? "OK" : "FAILED";
              console.log(
                `[${timestamp()}]   ${status}: ${result.action}${result.txHash ? ` (tx: ${short(result.txHash)})` : ""}${result.error ? ` — ${result.error}` : ""}`
              );
            }
          }
        } catch (vaultError: any) {
          console.error(
            `[${timestamp()}] Error processing vault ${short(vaultAddr)}: ${vaultError.message}`
          );
        }
      }
    } catch (error: any) {
      console.error(`[${timestamp()}] Polling error: ${error.message}`);
    }

    await sleep(env.POLL_INTERVAL_SEC * 1000);
  }
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function short(s: string): string {
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
