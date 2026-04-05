import { AgentRegistryABI, AgentVaultABI, VaultFactoryABI, MockLendingPoolABI } from "./abis";

// Contract addresses — update after deployment to Minitia
export const CONTRACTS = {
  AGENT_REGISTRY: import.meta.env.VITE_AGENT_REGISTRY_ADDRESS as `0x${string}`,
  VAULT_FACTORY: import.meta.env.VITE_VAULT_FACTORY_ADDRESS as `0x${string}`,
  MOCK_POOL_A: import.meta.env.VITE_MOCK_POOL_A_ADDRESS as `0x${string}`,
  MOCK_POOL_B: import.meta.env.VITE_MOCK_POOL_B_ADDRESS as `0x${string}`,
} as const;

export { AgentRegistryABI, AgentVaultABI, VaultFactoryABI, MockLendingPoolABI };
