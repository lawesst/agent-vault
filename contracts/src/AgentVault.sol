// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentVault
/// @notice Holds user funds and allows an authorized AI agent to execute
///         DeFi strategies on behalf of the user. Tracks P&L and enforces fees.
contract AgentVault {
    address public user;
    address public agent;
    address public factory;
    uint256 public agentFeeRate; // Agent's fee in basis points
    uint256 public platformFeeRate; // Platform fee in basis points
    address public platformFeeRecipient;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    bool public agentRevoked;
    bool public initialized;

    // Allowed targets the agent can interact with (e.g., lending pools)
    mapping(address => bool) public allowedTargets;
    address[] public allowedTargetList;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 agentFee, uint256 platformFee);
    event StrategyExecuted(address indexed agent, address target, bytes data, bool success);
    event AgentRevoked(address indexed user);
    event TargetAllowed(address target);
    event TargetRemoved(address target);

    modifier onlyUser() {
        require(msg.sender == user, "AgentVault: not user");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "AgentVault: not agent");
        require(!agentRevoked, "AgentVault: agent revoked");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "AgentVault: not factory");
        _;
    }

    /// @notice Initialize the vault (called by factory after deployment)
    function initialize(
        address _user,
        address _agent,
        uint256 _agentFeeRate,
        uint256 _platformFeeRate,
        address _platformFeeRecipient,
        address[] calldata _allowedTargets
    ) external {
        require(!initialized, "AgentVault: already initialized");
        initialized = true;
        user = _user;
        agent = _agent;
        factory = msg.sender;
        agentFeeRate = _agentFeeRate;
        platformFeeRate = _platformFeeRate;
        platformFeeRecipient = _platformFeeRecipient;

        for (uint256 i = 0; i < _allowedTargets.length; i++) {
            allowedTargets[_allowedTargets[i]] = true;
            allowedTargetList.push(_allowedTargets[i]);
        }
    }

    /// @notice User deposits native tokens into the vault
    function deposit() external payable onlyUser {
        require(msg.value > 0, "AgentVault: zero deposit");
        totalDeposited += msg.value;
        emit Deposited(user, msg.value);
    }

    /// @notice User withdraws funds. Calculates P&L and distributes fees.
    function withdraw(uint256 amount) external onlyUser {
        uint256 balance = address(this).balance;
        require(amount <= balance, "AgentVault: insufficient balance");

        // Calculate P&L based on vault balance vs deposits
        int256 pnl = int256(balance) - int256(totalDeposited - totalWithdrawn);

        uint256 agentFee = 0;
        uint256 platformFee = 0;

        // Only charge fees on profits
        if (pnl > 0) {
            uint256 profit = uint256(pnl);
            // Pro-rate fees based on withdrawal proportion
            uint256 profitShare = (profit * amount) / balance;
            agentFee = (profitShare * agentFeeRate) / 10000;
            platformFee = (profitShare * platformFeeRate) / 10000;
        }

        uint256 userAmount = amount - agentFee - platformFee;
        totalWithdrawn += amount;

        // Transfer fees
        if (agentFee > 0) {
            (bool sentAgent,) = agent.call{value: agentFee}("");
            require(sentAgent, "AgentVault: agent fee failed");
        }
        if (platformFee > 0) {
            (bool sentPlatform,) = platformFeeRecipient.call{value: platformFee}("");
            require(sentPlatform, "AgentVault: platform fee failed");
        }

        // Transfer to user
        (bool sent,) = user.call{value: userAmount}("");
        require(sent, "AgentVault: withdrawal failed");

        emit Withdrawn(user, userAmount, agentFee, platformFee);
    }

    /// @notice Agent executes a strategy action against an allowed target
    function executeStrategy(address target, bytes calldata data) external onlyAgent returns (bytes memory) {
        require(allowedTargets[target], "AgentVault: target not allowed");

        (bool success, bytes memory result) = target.call{value: 0}(data);

        emit StrategyExecuted(agent, target, data, success);

        if (!success) {
            // Bubble up revert reason
            if (result.length > 0) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            revert("AgentVault: strategy execution failed");
        }

        return result;
    }

    /// @notice Agent executes a strategy action with a value transfer (e.g., depositing into a lending pool)
    function executeStrategyWithValue(address target, bytes calldata data, uint256 value) external onlyAgent returns (bytes memory) {
        require(allowedTargets[target], "AgentVault: target not allowed");
        require(value <= address(this).balance, "AgentVault: insufficient balance for value");

        (bool success, bytes memory result) = target.call{value: value}(data);

        emit StrategyExecuted(agent, target, data, success);

        if (!success) {
            if (result.length > 0) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            revert("AgentVault: strategy execution failed");
        }

        return result;
    }

    /// @notice User can revoke agent access at any time (emergency stop)
    function revokeAgent() external onlyUser {
        agentRevoked = true;
        emit AgentRevoked(user);
    }

    /// @notice User can add new allowed targets
    function addAllowedTarget(address target) external onlyUser {
        require(!allowedTargets[target], "AgentVault: already allowed");
        allowedTargets[target] = true;
        allowedTargetList.push(target);
        emit TargetAllowed(target);
    }

    /// @notice User can remove allowed targets
    function removeAllowedTarget(address target) external onlyUser {
        require(allowedTargets[target], "AgentVault: not allowed");
        allowedTargets[target] = false;
        emit TargetRemoved(target);
    }

    /// @notice Get vault info
    function getVaultInfo()
        external
        view
        returns (
            address _user,
            address _agent,
            uint256 _balance,
            uint256 _totalDeposited,
            uint256 _totalWithdrawn,
            int256 _pnl,
            bool _revoked
        )
    {
        uint256 balance = address(this).balance;
        int256 pnl = int256(balance) - int256(totalDeposited - totalWithdrawn);
        return (user, agent, balance, totalDeposited, totalWithdrawn, pnl, agentRevoked);
    }

    /// @notice Get list of allowed targets
    function getAllowedTargets() external view returns (address[] memory) {
        return allowedTargetList;
    }

    /// @notice Vault can receive native tokens (from lending pool withdrawals etc.)
    receive() external payable {}
}
