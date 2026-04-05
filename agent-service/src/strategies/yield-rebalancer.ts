import { ethers } from "ethers";
import { BaseStrategy, type StrategyAnalysis } from "./base-strategy.js";
import type { VaultState, PoolState } from "../services/chain-reader.js";

// Minimum rate differential (in bps) to trigger a rebalance
const REBALANCE_THRESHOLD_BPS = 100n; // 1% difference triggers rebalance
// Minimum balance to consider deploying
const MIN_DEPLOY_AMOUNT = ethers.parseEther("0.01");

export class YieldRebalancer extends BaseStrategy {
  name = "Yield Rebalancer";

  async analyze(
    vault: VaultState,
    pools: [PoolState, PoolState]
  ): Promise<StrategyAnalysis> {
    const [poolA, poolB] = pools;
    const idleBalance = vault.balance;

    // Find the best pool
    const bestPool = poolA.supplyRate > poolB.supplyRate ? poolA : poolB;
    const worstPool = poolA.supplyRate > poolB.supplyRate ? poolB : poolA;
    const rateDiff = bestPool.supplyRate - worstPool.supplyRate;

    const actions: StrategyAnalysis["actions"] = [];

    // Case 1: Idle funds in vault — deploy to best pool
    if (idleBalance > MIN_DEPLOY_AMOUNT) {
      actions.push({
        type: "deposit",
        toPool: bestPool.address,
        amount: idleBalance,
        reasoning: `Deploying ${ethers.formatEther(idleBalance)} idle funds to ${bestPool.name} (${Number(bestPool.supplyRate) / 100}% APY)`,
      });
    }

    // Case 2: Funds in worse pool and rate difference exceeds threshold — rebalance
    if (worstPool.vaultBalance > MIN_DEPLOY_AMOUNT && rateDiff > REBALANCE_THRESHOLD_BPS) {
      actions.push({
        type: "withdraw",
        fromPool: worstPool.address,
        amount: worstPool.vaultBalance,
        reasoning: `Withdrawing ${ethers.formatEther(worstPool.vaultBalance)} from ${worstPool.name} (${Number(worstPool.supplyRate) / 100}% APY)`,
      });
      actions.push({
        type: "deposit",
        toPool: bestPool.address,
        amount: worstPool.vaultBalance,
        reasoning: `Redeploying to ${bestPool.name} (${Number(bestPool.supplyRate) / 100}% APY) — rate advantage: ${Number(rateDiff) / 100}%`,
      });
    }

    const shouldAct = actions.length > 0;
    const reasoning = shouldAct
      ? `Rate comparison: ${poolA.name} = ${Number(poolA.supplyRate) / 100}% | ${poolB.name} = ${Number(poolB.supplyRate) / 100}%. ${actions.map((a) => a.reasoning).join(". ")}`
      : `No action needed. ${poolA.name} = ${Number(poolA.supplyRate) / 100}% | ${poolB.name} = ${Number(poolB.supplyRate) / 100}%. Idle: ${ethers.formatEther(idleBalance)}. Diff: ${Number(rateDiff) / 100}% (threshold: ${Number(REBALANCE_THRESHOLD_BPS) / 100}%).`;

    return { shouldAct, actions, reasoning };
  }
}
