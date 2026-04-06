import { useReadContract } from "wagmi";
import { CONTRACTS, AgentRegistryABI } from "../lib/contracts";

export interface AgentInfo {
  operator: `0x${string}`;
  name: string;
  strategyURI: string;
  feeRate: bigint;
  totalVaults: bigint;
  totalPnL: bigint;
  active: boolean;
  registeredAt: bigint;
}

export function useAgentCount() {
  return useReadContract({
    address: CONTRACTS.AGENT_REGISTRY,
    abi: AgentRegistryABI,
    functionName: "getAgentCount",
  });
}

export function useAgentList(offset: number, limit: number) {
  return useReadContract({
    address: CONTRACTS.AGENT_REGISTRY,
    abi: AgentRegistryABI,
    functionName: "listAgents",
    args: [BigInt(offset), BigInt(limit)],
  });
}

export function useAgent(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.AGENT_REGISTRY,
    abi: AgentRegistryABI,
    functionName: "getAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}
