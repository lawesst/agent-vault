import { ethers } from "ethers";
import type { Env } from "../config.js";
import AgentVaultABI from "../abi/AgentVault.json" with { type: "json" };
import MockLendingPoolABI from "../abi/MockLendingPool.json" with { type: "json" };

export interface ExecutionResult {
  vaultAddress: string;
  action: string;
  txHash: string;
  success: boolean;
  error?: string;
}

export class VaultExecutor {
  private signer: ethers.Wallet;
  private poolInterface: ethers.Interface;

  constructor(env: Env) {
    const provider = new ethers.JsonRpcProvider(env.RPC_URL);
    this.signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
    this.poolInterface = new ethers.Interface(MockLendingPoolABI);
  }

  async depositToPool(
    vaultAddress: string,
    poolAddress: string,
    amount: bigint
  ): Promise<ExecutionResult> {
    try {
      const vault = new ethers.Contract(vaultAddress, AgentVaultABI, this.signer);
      const depositData = this.poolInterface.encodeFunctionData("deposit");

      const tx = await vault.executeStrategyWithValue(poolAddress, depositData, amount);
      const receipt = await tx.wait();

      return {
        vaultAddress,
        action: `Deposit ${ethers.formatEther(amount)} to pool ${poolAddress.slice(0, 8)}`,
        txHash: receipt.hash,
        success: true,
      };
    } catch (error: any) {
      return {
        vaultAddress,
        action: `Deposit to pool ${poolAddress.slice(0, 8)}`,
        txHash: "",
        success: false,
        error: error.message,
      };
    }
  }

  async withdrawFromPool(
    vaultAddress: string,
    poolAddress: string,
    amount: bigint
  ): Promise<ExecutionResult> {
    try {
      const vault = new ethers.Contract(vaultAddress, AgentVaultABI, this.signer);
      const withdrawData = this.poolInterface.encodeFunctionData("withdraw", [amount]);

      const tx = await vault.executeStrategy(poolAddress, withdrawData);
      const receipt = await tx.wait();

      return {
        vaultAddress,
        action: `Withdraw ${ethers.formatEther(amount)} from pool ${poolAddress.slice(0, 8)}`,
        txHash: receipt.hash,
        success: true,
      };
    } catch (error: any) {
      return {
        vaultAddress,
        action: `Withdraw from pool ${poolAddress.slice(0, 8)}`,
        txHash: "",
        success: false,
        error: error.message,
      };
    }
  }
}
