import { formatEther } from "viem";
import { useUsernameQuery } from "@initia/interwovenkit-react";
import type { AgentInfo } from "../hooks/useAgentRegistry";

interface AgentCardProps {
  agent: AgentInfo;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const feePercent = Number(agent.feeRate) / 100;
  const pnl = Number(formatEther(agent.totalPnL));
  const { data: username } = useUsernameQuery(agent.operator);
  const displayName = username
    ? `${username}.init`
    : `${agent.operator.slice(0, 6)}...${agent.operator.slice(-4)}`;

  return (
    <div className="agent-card" onClick={onClick}>
      <div className="agent-card-header">
        <h3>{agent.name}</h3>
        <span className={`status ${agent.active ? "active" : "inactive"}`}>
          {agent.active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="agent-card-stats">
        <div className="stat">
          <span className="stat-label">Fee</span>
          <span className="stat-value">{feePercent}%</span>
        </div>
        <div className="stat">
          <span className="stat-label">Vaults</span>
          <span className="stat-value">{agent.totalVaults.toString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total P&L</span>
          <span className={`stat-value ${pnl >= 0 ? "positive" : "negative"}`}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)} GAS
          </span>
        </div>
      </div>
      <p className="agent-card-address">{displayName}</p>
    </div>
  );
}
