import { ethers } from "ethers";
import type { Env } from "../config.js";
import AgentVaultABI from "../abi/AgentVault.json" with { type: "json" };
import MockLendingPoolABI from "../abi/MockLendingPool.json" with { type: "json" };
import VaultFactoryABI from "../abi/VaultFactory.json" with { type: "json" };

export interface VaultState {
  address: string;
  user: string;
  agent: string;
  balance: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  pnl: bigint;
  revoked: boolean;
}

export interface PoolState {
  address: string;
  name: string;
  supplyRate: bigint;
  vaultBalance: bigint;
}

export class ChainReader {
  private provider: ethers.JsonRpcProvider;
  private factory: ethers.Contract;
  private poolA: ethers.Contract;
  private poolB: ethers.Contract;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
    this.factory = new ethers.Contract(env.VAULT_FACTORY_ADDRESS, VaultFactoryABI, this.provider);
    this.poolA = new ethers.Contract(env.MOCK_POOL_A_ADDRESS, MockLendingPoolABI, this.provider);
    this.poolB = new ethers.Contract(env.MOCK_POOL_B_ADDRESS, MockLendingPoolABI, this.provider);
  }

  async getAgentVaults(agentAddress: string): Promise<string[]> {
    return await this.factory.getAgentVaults(agentAddress);
  }

  async getVaultState(vaultAddress: string): Promise<VaultState> {
    const vault = new ethers.Contract(vaultAddress, AgentVaultABI, this.provider);
    const [user, agent, balance, totalDeposited, totalWithdrawn, pnl, revoked] =
      await vault.getVaultInfo();
    return {
      address: vaultAddress,
      user,
      agent,
      balance,
      totalDeposited,
      totalWithdrawn,
      pnl,
      revoked,
    };
  }

  async getPoolStates(vaultAddress: string): Promise<[PoolState, PoolState]> {
    const [rateA, rateB, nameA, nameB, balA, balB] = await Promise.all([
      this.poolA.getSupplyRate(),
      this.poolB.getSupplyRate(),
      this.poolA.poolName(),
      this.poolB.poolName(),
      this.poolA.balanceOf(vaultAddress),
      this.poolB.balanceOf(vaultAddress),
    ]);

    return [
      { address: this.env.MOCK_POOL_A_ADDRESS, name: nameA, supplyRate: rateA, vaultBalance: balA },
      { address: this.env.MOCK_POOL_B_ADDRESS, name: nameB, supplyRate: rateB, vaultBalance: balB },
    ];
  }
}
