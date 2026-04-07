import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useUserVaults } from "../hooks/useVaultFactory";
import { VaultCard } from "../components/VaultCard";
import { AutoSignToggle } from "../components/AutoSignToggle";
import { useState } from "react";
import { DepositModal } from "../components/DepositModal";
import { WithdrawModal } from "../components/WithdrawModal";
import { ActivityLog } from "../components/ActivityLog";
import { useVaultInfo } from "../hooks/useAgentVault";

export function Dashboard() {
  const { address } = useAccount();
  const { openConnect, openBridge } = useInterwovenKit();
  const { data: vaults, isLoading } = useUserVaults(address);
  const [selectedVault, setSelectedVault] = useState<`0x${string}` | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const { data: selectedVaultInfo } = useVaultInfo(selectedVault ?? undefined);

  if (!address) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to view your vaults and manage your DeFi agents.</p>
          <button className="btn btn-primary" onClick={() => openConnect()}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Dashboard</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => openBridge()}>
            Bridge Assets
          </button>
        </div>
      </div>

      <AutoSignToggle />

      <h2>My Vaults ({vaults ? (vaults as `0x${string}`[]).length : 0})</h2>

      {isLoading ? (
        <div className="loading-state">Loading vaults...</div>
      ) : !vaults || (vaults as `0x${string}`[]).length === 0 ? (
        <div className="empty-state">
          <p>No vaults yet. Go to the Marketplace to find an agent and create a vault.</p>
        </div>
      ) : (
        <div className="vault-grid">
          {(vaults as `0x${string}`[]).map((vaultAddr) => (
            <div key={vaultAddr}>
              <VaultCard
                vaultAddress={vaultAddr}
                onClick={() => setSelectedVault(vaultAddr)}
              />
              {selectedVault === vaultAddr && (
                <>
                  <div className="vault-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowDeposit(true)}
                    >
                      Deposit
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowWithdraw(true)}
                    >
                      Withdraw
                    </button>
                  </div>
                  <ActivityLog vaultAddress={vaultAddr} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showDeposit && selectedVault && (
        <DepositModal
          vaultAddress={selectedVault}
          onClose={() => setShowDeposit(false)}
        />
      )}
      {showWithdraw && selectedVault && (
        <WithdrawModal
          vaultAddress={selectedVault}
          balance={selectedVaultInfo ? (selectedVaultInfo as unknown as [string, string, bigint, bigint, bigint, bigint, boolean])[2] : 0n}
          onClose={() => setShowWithdraw(false)}
        />
      )}
    </div>
  );
}
