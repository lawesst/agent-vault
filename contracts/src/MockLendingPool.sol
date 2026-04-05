// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockLendingPool
/// @notice Simulated lending protocol with configurable rates for hackathon demo.
///         Supports native token deposits with time-based interest accrual.
contract MockLendingPool {
    address public owner;
    string public poolName;

    // Annual supply rate in basis points (e.g., 500 = 5% APY)
    uint256 public supplyRateBps;

    struct Deposit {
        uint256 principal;
        uint256 lastAccrualTime;
        uint256 accruedInterest;
    }

    mapping(address => Deposit) public deposits;
    uint256 public totalDeposits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 interest);
    event RateUpdated(uint256 oldRate, uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockLendingPool: not owner");
        _;
    }

    constructor(string memory _name, uint256 _initialRateBps) {
        owner = msg.sender;
        poolName = _name;
        supplyRateBps = _initialRateBps;
    }

    /// @notice Deposit native tokens into the lending pool
    function deposit() external payable {
        require(msg.value > 0, "MockLendingPool: zero deposit");

        Deposit storage d = deposits[msg.sender];

        // Accrue existing interest before adding new principal
        if (d.principal > 0) {
            d.accruedInterest += _calculateInterest(d.principal, d.lastAccrualTime);
        }

        d.principal += msg.value;
        d.lastAccrualTime = block.timestamp;
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw principal + accrued interest
    function withdraw(uint256 amount) external {
        Deposit storage d = deposits[msg.sender];
        uint256 interest = d.accruedInterest + _calculateInterest(d.principal, d.lastAccrualTime);
        uint256 totalAvailable = d.principal + interest;

        require(amount <= totalAvailable, "MockLendingPool: insufficient balance");

        // Deduct from interest first, then principal
        if (amount <= interest) {
            d.accruedInterest = interest - amount;
        } else {
            uint256 principalDeduction = amount - interest;
            d.accruedInterest = 0;
            d.principal -= principalDeduction;
            totalDeposits -= principalDeduction;
        }
        d.lastAccrualTime = block.timestamp;

        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "MockLendingPool: transfer failed");

        emit Withdrawn(msg.sender, amount, interest);
    }

    /// @notice Get current balance including accrued interest
    function balanceOf(address user) external view returns (uint256) {
        Deposit storage d = deposits[user];
        if (d.principal == 0 && d.accruedInterest == 0) return 0;
        return d.principal + d.accruedInterest + _calculateInterest(d.principal, d.lastAccrualTime);
    }

    /// @notice Get the current supply rate in basis points
    function getSupplyRate() external view returns (uint256) {
        return supplyRateBps;
    }

    /// @notice Owner can update the supply rate to simulate market changes
    function setSupplyRate(uint256 _newRateBps) external onlyOwner {
        emit RateUpdated(supplyRateBps, _newRateBps);
        supplyRateBps = _newRateBps;
    }

    /// @notice Fund the pool so it can pay interest (owner deposits reserves)
    function fundReserves() external payable onlyOwner {}

    /// @dev Calculate simple interest: principal * rate * timeElapsed / (365 days * 10000)
    function _calculateInterest(uint256 principal, uint256 lastTime) internal view returns (uint256) {
        if (principal == 0 || lastTime == 0) return 0;
        uint256 elapsed = block.timestamp - lastTime;
        return (principal * supplyRateBps * elapsed) / (365 days * 10000);
    }

    receive() external payable {}
}
