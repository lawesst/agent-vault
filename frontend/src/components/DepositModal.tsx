import { useState } from "react";
import { useDeposit } from "../hooks/useAgentVault";

interface DepositModalProps {
  vaultAddress: `0x${string}`;
  onClose: () => void;
}

export function DepositModal({ vaultAddress, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const { deposit, isPending, isConfirming, isSuccess, error } = useDeposit(vaultAddress);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    deposit(amount);
  };

  if (isSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Deposit Successful</h3>
          <p>Your funds have been deposited into the vault.</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Deposit Funds</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount (GAS)</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={isPending || isConfirming}
            />
          </div>
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
              {isPending ? "Confirming..." : isConfirming ? "Depositing..." : "Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
