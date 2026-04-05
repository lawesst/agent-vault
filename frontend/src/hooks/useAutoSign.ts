import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useMutation } from "@tanstack/react-query";
import { agentVaultChain } from "../lib/chains";

export function useAutoSign() {
  const { autoSign } = useInterwovenKit();
  const chainId = String(agentVaultChain.id);

  const isEnabled = autoSign?.isEnabledByChain?.[chainId] ?? false;
  const expiration = autoSign?.expiredAtByChain?.[chainId] ?? null;

  const enable = useMutation({
    mutationFn: async () => {
      if (!autoSign) throw new Error("AutoSign not available");
      await autoSign.enable(chainId);
    },
  });

  const disable = useMutation({
    mutationFn: async () => {
      if (!autoSign) throw new Error("AutoSign not available");
      await autoSign.disable(chainId);
    },
  });

  return {
    isEnabled,
    expiration,
    enable: enable.mutate,
    disable: disable.mutate,
    isEnabling: enable.isPending,
    isDisabling: disable.isPending,
    enableError: enable.error,
  };
}
