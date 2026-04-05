import { useState } from "react";
import { useWithdraw } from "../hooks/useAgentVault";
import { formatEther } from "viem";

interface WithdrawModalProps {
  vaultAddress: `0x${string}`;
  balance: bigint;
  onClose: () => void;
}

export function WithdrawModal({ vaultAddress, balance, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const { withdraw, isPending, isConfirming, isSuccess, error } = useWithdraw(vaultAddress);

  const maxAmount = formatEther(balance);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    withdraw(amount);
  };

  if (isSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Withdrawal Successful</h3>
          <p>Funds (minus fees on profits) have been sent to your wallet.</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Withdraw Funds</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount (INIT) — Max: {Number(maxAmount).toFixed(4)}</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={isPending || isConfirming}
            />
            <button
              type="button"
              className="btn-link"
              onClick={() => setAmount(maxAmount)}
            >
              Max
            </button>
          </div>
          <p className="info-text">
            Note: A 10% agent fee + 5% platform fee is deducted from any profits.
          </p>
          {error && <p className="error">{error.message}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending || isConfirming || !amount}
            >
              {isPending ? "Confirming..." : isConfirming ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
