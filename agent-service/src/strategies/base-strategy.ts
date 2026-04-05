import type { VaultState, PoolState } from "../services/chain-reader.js";
import type { ExecutionResult } from "../services/vault-executor.js";

export interface StrategyAction {
  type: "deposit" | "withdraw" | "rebalance";
  fromPool?: string;
  toPool?: string;
  amount: bigint;
  reasoning: string;
}

export interface StrategyAnalysis {
  shouldAct: boolean;
  actions: StrategyAction[];
  reasoning: string;
}

export abstract class BaseStrategy {
  abstract name: string;

  abstract analyze(
    vault: VaultState,
    pools: [PoolState, PoolState]
  ): Promise<StrategyAnalysis>;
}
