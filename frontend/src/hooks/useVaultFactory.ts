import { useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACTS, VaultFactoryABI } from "../lib/contracts";

export function useUserVaults(userAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.VAULT_FACTORY,
    abi: VaultFactoryABI,
    functionName: "getUserVaults",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });
}

export function useCreateVault() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  // Once the createVault transaction is mined, the cached `getUserVaults`
  // and `getVaultCount` reads are stale. Invalidate them so any mounted
  // Dashboard / Marketplace components refetch automatically and show the
  // new vault without a manual refresh.
  useEffect(() => {
    if (!isSuccess) return;
    queryClient.invalidateQueries({
      predicate: (query) => {
        const fn = (query.queryKey as ReadonlyArray<unknown>).find(
          (k): k is { functionName?: string } =>
            typeof k === "object" && k !== null && "functionName" in k,
        );
        return (
          fn?.functionName === "getUserVaults" ||
          fn?.functionName === "getVaultCount" ||
          fn?.functionName === "getAgentCount" ||
          fn?.functionName === "listAgents"
        );
      },
    });
  }, [isSuccess, queryClient]);

  const createVault = (agent: `0x${string}`, allowedTargets: `0x${string}`[]) => {
    writeContract({
      address: CONTRACTS.VAULT_FACTORY,
      abi: VaultFactoryABI,
      functionName: "createVault",
      args: [agent, allowedTargets],
    });
  };

  return {
    createVault,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError ?? receiptError,
  };
}

export function useVaultCount() {
  return useReadContract({
    address: CONTRACTS.VAULT_FACTORY,
    abi: VaultFactoryABI,
    functionName: "getVaultCount",
  });
}
