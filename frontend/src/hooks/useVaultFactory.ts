import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

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
