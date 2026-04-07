import { ethers } from "ethers";
import type { VaultState, PoolState } from "../services/chain-reader.js";
import type { StrategyAnalysis } from "./base-strategy.js";

/**
 * AI Advisor wraps the yield rebalancer strategy with AI-powered reasoning.
 * Per Initia hackathon AI track guidance: AI runs off-chain, blockchain handles state/ownership.
 */
export class AIAdvisor {
  private apiKey: string | null;
  private model: string;

  constructor(apiKey?: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey ?? null;
    this.model = model;
  }

  async enhanceAnalysis(
    vault: VaultState,
    pools: [PoolState, PoolState],
    baseAnalysis: StrategyAnalysis
  ): Promise<string> {
    if (!this.apiKey) {
      // Fallback: return base analysis reasoning without AI enhancement
      return `[Base Strategy] ${baseAnalysis.reasoning}`;
    }

    const [poolA, poolB] = pools;

    const prompt = `You are an AI DeFi strategy advisor for Agent Vault on Initia. Analyze this vault state and provide a brief (2-3 sentence) recommendation.

Vault Balance: ${ethers.formatEther(vault.balance)} GAS (idle)
Pool A "${poolA.name}": ${Number(poolA.supplyRate) / 100}% APY, vault has ${ethers.formatEther(poolA.vaultBalance)} deposited
Pool B "${poolB.name}": ${Number(poolB.supplyRate) / 100}% APY, vault has ${ethers.formatEther(poolB.vaultBalance)} deposited
Total Deposited: ${ethers.formatEther(vault.totalDeposited)} GAS
Current P&L: ${ethers.formatEther(vault.pnl)} GAS

Base strategy decision: ${baseAnalysis.shouldAct ? "REBALANCE" : "HOLD"}
Reasoning: ${baseAnalysis.reasoning}

Provide your analysis. Be concise and actionable. Focus on the rate differential and risk.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 150,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status} ${errText.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const aiText = data.choices?.[0]?.message?.content?.trim() ?? "";
      return `[AI Analysis] ${aiText}`;
    } catch (error: any) {
      console.warn("AI advisor fallback:", error.message);
      return `[Base Strategy] ${baseAnalysis.reasoning}`;
    }
  }
}
