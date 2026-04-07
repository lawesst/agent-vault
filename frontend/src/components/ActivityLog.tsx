import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatEther, parseAbiItem } from "viem";

interface ActivityLogProps {
  vaultAddress: `0x${string}`;
}

interface ActivityEntry {
  type: "Deposited" | "Withdrawn" | "StrategyExecuted" | "AgentRevoked";
  blockNumber: bigint;
  txHash: `0x${string}`;
  details: string;
}

const events = {
  Deposited: parseAbiItem("event Deposited(address indexed user, uint256 amount)"),
  Withdrawn: parseAbiItem(
    "event Withdrawn(address indexed user, uint256 amount, uint256 agentFee, uint256 platformFee)"
  ),
  StrategyExecuted: parseAbiItem(
    "event StrategyExecuted(address indexed agent, address target, bytes data, bool success)"
  ),
  AgentRevoked: parseAbiItem("event AgentRevoked(address indexed user)"),
};

export function ActivityLog({ vaultAddress }: ActivityLogProps) {
  const client = usePublicClient();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [deposits, withdrawals, strategies, revokes] = await Promise.all([
          client.getLogs({ address: vaultAddress, event: events.Deposited, fromBlock: 0n }),
          client.getLogs({ address: vaultAddress, event: events.Withdrawn, fromBlock: 0n }),
          client.getLogs({ address: vaultAddress, event: events.StrategyExecuted, fromBlock: 0n }),
          client.getLogs({ address: vaultAddress, event: events.AgentRevoked, fromBlock: 0n }),
        ]);

        const all: ActivityEntry[] = [];

        for (const log of deposits) {
          all.push({
            type: "Deposited",
            blockNumber: log.blockNumber!,
            txHash: log.transactionHash!,
            details: `+${formatEther(log.args.amount!)} GAS deposited`,
          });
        }
        for (const log of withdrawals) {
          const fee = (log.args.agentFee ?? 0n) + (log.args.platformFee ?? 0n);
          all.push({
            type: "Withdrawn",
            blockNumber: log.blockNumber!,
            txHash: log.transactionHash!,
            details: `-${formatEther(log.args.amount!)} GAS withdrawn (fees: ${formatEther(fee)} GAS)`,
          });
        }
        for (const log of strategies) {
          all.push({
            type: "StrategyExecuted",
            blockNumber: log.blockNumber!,
            txHash: log.transactionHash!,
            details: `Agent executed strategy on ${log.args.target!.slice(0, 10)}... ${log.args.success ? "✓" : "✗"}`,
          });
        }
        for (const log of revokes) {
          all.push({
            type: "AgentRevoked",
            blockNumber: log.blockNumber!,
            txHash: log.transactionHash!,
            details: "Agent access revoked",
          });
        }

        all.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setEntries(all);
      } catch (err) {
        console.error("Failed to load activity:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, vaultAddress]);

  if (loading) return <div className="activity-log loading">Loading activity...</div>;
  if (entries.length === 0)
    return <div className="activity-log empty">No activity yet.</div>;

  return (
    <div className="activity-log">
      <h4>Activity Log</h4>
      <ul>
        {entries.map((entry, i) => (
          <li key={`${entry.txHash}-${i}`} className={`activity-${entry.type.toLowerCase()}`}>
            <span className="activity-type">{entry.type}</span>
            <span className="activity-details">{entry.details}</span>
            <span className="activity-block">block #{entry.blockNumber.toString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
