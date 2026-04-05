import { formatEther } from "viem";
import { useVaultInfo } from "../hooks/useAgentVault";

interface VaultCardProps {
  vaultAddress: `0x${string}`;
  onClick: () => void;
}

export function VaultCard({ vaultAddress, onClick }: VaultCardProps) {
  const { data, isLoading } = useVaultInfo(vaultAddress);

  if (isLoading) return <div className="vault-card loading">Loading...</div>;
  if (!data) return null;

  const [, agent, balance, totalDeposited, , pnl, revoked] = data;
  const balanceEth = Number(formatEther(balance));
  const depositedEth = Number(formatEther(totalDeposited));
  const pnlEth = Number(formatEther(pnl));

  return (
    <div className="vault-card" onClick={onClick}>
      <div className="vault-card-header">
        <span className="vault-address">
          Vault: {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
        </span>
        {revoked && <span className="status inactive">Revoked</span>}
      </div>
      <div className="agent-card-stats">
        <div className="stat">
          <span className="stat-label">Balance</span>
          <span className="stat-value">{balanceEth.toFixed(4)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Deposited</span>
          <span className="stat-value">{depositedEth.toFixed(4)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">P&L</span>
          <span className={`stat-value ${pnlEth >= 0 ? "positive" : "negative"}`}>
            {pnlEth >= 0 ? "+" : ""}{pnlEth.toFixed(4)}
          </span>
        </div>
      </div>
      <p className="agent-card-address">
        Agent: {(agent as string).slice(0, 6)}...{(agent as string).slice(-4)}
      </p>
    </div>
  );
}
