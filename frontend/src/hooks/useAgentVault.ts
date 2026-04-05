import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AgentVaultABI } from "../lib/contracts";
import { parseEther } from "viem";

export interface VaultInfo {
  user: `0x${string}`;
  agent: `0x${string}`;
  balance: bigint;
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  pnl: bigint;
  revoked: boolean;
}

export function useVaultInfo(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: AgentVaultABI,
    functionName: "getVaultInfo",
    query: { enabled: !!vaultAddress, refetchInterval: 10000 },
  });
}

export function useDeposit(vaultAddress: `0x${string}` | undefined) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = (amount: string) => {
    if (!vaultAddress) return;
    writeContract({
      address: vaultAddress,
      abi: AgentVaultABI,
      functionName: "deposit",
      value: parseEther(amount),
    });
  };

  return { deposit, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw(vaultAddress: `0x${string}` | undefined) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: string) => {
    if (!vaultAddress) return;
    writeContract({
      address: vaultAddress,
      abi: AgentVaultABI,
      functionName: "withdraw",
      args: [parseEther(amount)],
    });
  };

  return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useRevokeAgent(vaultAddress: `0x${string}` | undefined) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const revoke = () => {
    if (!vaultAddress) return;
    writeContract({
      address: vaultAddress,
      abi: AgentVaultABI,
      functionName: "revokeAgent",
    });
  };

  return { revoke, hash, isPending, isConfirming, isSuccess, error };
}
