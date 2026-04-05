import Anthropic from "@anthropic-ai/sdk";
import { ethers } from "ethers";
import type { VaultState, PoolState } from "../services/chain-reader.js";
import type { StrategyAnalysis } from "./base-strategy.js";

/**
 * AI Advisor wraps the yield rebalancer strategy with AI-powered reasoning.
 * Per Initia hackathon AI track guidance: AI runs off-chain, blockchain handles state/ownership.
 */
export class AIAdvisor {
  private client: Anthropic | null;

  constructor(apiKey?: string) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async enhanceAnalysis(
    vault: VaultState,
    pools: [PoolState, PoolState],
    baseAnalysis: StrategyAnalysis
  ): Promise<string> {
    if (!this.client) {
      // Fallback: return base analysis reasoning without AI enhancement
      return `[Base Strategy] ${baseAnalysis.reasoning}`;
    }

    const [poolA, poolB] = pools;

    const prompt = `You are an AI DeFi strategy advisor for Agent Vault on Initia. Analyze this vault state and provide a brief (2-3 sentence) recommendation.

Vault Balance: ${ethers.formatEther(vault.balance)} INIT (idle)
Pool A "${poolA.name}": ${Number(poolA.supplyRate) / 100}% APY, vault has ${ethers.formatEther(poolA.vaultBalance)} deposited
Pool B "${poolB.name}": ${Number(poolB.supplyRate) / 100}% APY, vault has ${ethers.formatEther(poolB.vaultBalance)} deposited
Total Deposited: ${ethers.formatEther(vault.totalDeposited)} INIT
Current P&L: ${ethers.formatEther(vault.pnl)} INIT

Base strategy decision: ${baseAnalysis.shouldAct ? "REBALANCE" : "HOLD"}
Reasoning: ${baseAnalysis.reasoning}

Provide your analysis. Be concise and actionable. Focus on the rate differential and risk.`;

    try {
      const response = await this.client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      });

      const aiText = response.content[0].type === "text" ? response.content[0].text : "";
      return `[AI Analysis] ${aiText}`;
    } catch (error: any) {
      console.warn("AI advisor fallback:", error.message);
      return `[Base Strategy] ${baseAnalysis.reasoning}`;
    }
  }
}
