// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockLendingPool} from "../src/MockLendingPool.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

contract AgentVaultTest is Test {
    MockLendingPool poolA;
    MockLendingPool poolB;
    AgentRegistry registry;
    VaultFactory factory;

    address owner = address(this);
    address user = address(0x1);
    address agentOperator = address(0x2);
    address platformTreasury = address(0x3);

    function setUp() public {
        // Deploy mock lending pools with different rates
        poolA = new MockLendingPool("Pool A - Conservative", 300); // 3% APY
        poolB = new MockLendingPool("Pool B - Aggressive", 800); // 8% APY

        // Fund pools so they can pay interest
        poolA.fundReserves{value: 100 ether}();
        poolB.fundReserves{value: 100 ether}();

        // Deploy registry (no registration fee for tests)
        registry = new AgentRegistry(0, platformTreasury);

        // Deploy factory with 5% platform fee
        factory = new VaultFactory(address(registry), 500, platformTreasury);

        // Register agent
        vm.prank(agentOperator);
        registry.registerAgent("YieldBot", "ipfs://strategy-description", 1000); // 10% agent fee

        // Fund user
        vm.deal(user, 100 ether);
        vm.deal(agentOperator, 10 ether);
    }

    // ===================== MockLendingPool Tests =====================

    function test_PoolDeposit() public {
        vm.prank(user);
        poolA.deposit{value: 1 ether}();
        assertEq(poolA.balanceOf(user), 1 ether);
    }

    function test_PoolInterestAccrual() public {
        vm.prank(user);
        poolA.deposit{value: 10 ether}();

        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);

        // 10 ETH at 3% = 0.3 ETH interest
        uint256 balance = poolA.balanceOf(user);
        assertApproxEqAbs(balance, 10.3 ether, 0.01 ether);
    }

    function test_PoolWithdraw() public {
        vm.prank(user);
        poolA.deposit{value: 5 ether}();

        vm.warp(block.timestamp + 365 days);

        vm.prank(user);
        poolA.withdraw(5 ether);

        // Should still have accrued interest left
        uint256 remaining = poolA.balanceOf(user);
        assertGt(remaining, 0);
    }

    function test_PoolRateUpdate() public {
        assertEq(poolA.getSupplyRate(), 300);
        poolA.setSupplyRate(500);
        assertEq(poolA.getSupplyRate(), 500);
    }

    // ===================== AgentRegistry Tests =====================

    function test_AgentRegistration() public {
        AgentRegistry.AgentInfo memory info = registry.getAgent(agentOperator);
        assertEq(info.name, "YieldBot");
        assertEq(info.feeRate, 1000);
        assertTrue(info.active);
    }

    function test_AgentRegistration_DuplicateFails() public {
        vm.prank(agentOperator);
        vm.expectRevert("AgentRegistry: already registered");
        registry.registerAgent("DupeBot", "ipfs://dupe", 500);
    }

    function test_AgentRegistration_ExcessiveFeeFails() public {
        address newAgent = address(0x99);
        vm.prank(newAgent);
        vm.expectRevert("AgentRegistry: fee too high (max 50%)");
        registry.registerAgent("GreedyBot", "ipfs://greedy", 6000);
    }

    function test_AgentDeactivation() public {
        vm.prank(agentOperator);
        registry.deactivate();
        assertFalse(registry.isActiveAgent(agentOperator));
    }

    function test_ListAgents() public {
        AgentRegistry.AgentInfo[] memory agents = registry.listAgents(0, 10);
        assertEq(agents.length, 1);
        assertEq(agents[0].name, "YieldBot");
    }

    // ===================== VaultFactory Tests =====================

    function test_CreateVault() public {
        address[] memory targets = new address[](2);
        targets[0] = address(poolA);
        targets[1] = address(poolB);

        vm.prank(user);
        address vaultAddr = factory.createVault(agentOperator, targets);

        assertTrue(vaultAddr != address(0));
        assertEq(factory.getUserVaults(user).length, 1);
        assertEq(factory.getAgentVaults(agentOperator).length, 1);
    }

    function test_CreateVault_InactiveAgentFails() public {
        vm.prank(agentOperator);
        registry.deactivate();

        address[] memory targets = new address[](0);
        vm.prank(user);
        vm.expectRevert("VaultFactory: agent not active");
        factory.createVault(agentOperator, targets);
    }

    // ===================== AgentVault Core Flow Tests =====================

    function _createVaultWithPools() internal returns (AgentVault) {
        address[] memory targets = new address[](2);
        targets[0] = address(poolA);
        targets[1] = address(poolB);

        vm.prank(user);
        address vaultAddr = factory.createVault(agentOperator, targets);
        return AgentVault(payable(vaultAddr));
    }

    function test_Deposit() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(user);
        vault.deposit{value: 10 ether}();

        (,, uint256 balance, uint256 deposited,,,) = vault.getVaultInfo();
        assertEq(balance, 10 ether);
        assertEq(deposited, 10 ether);
    }

    function test_Deposit_NonUserFails() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(agentOperator);
        vm.expectRevert("AgentVault: not user");
        vault.deposit{value: 1 ether}();
    }

    function test_Withdraw_NoPnL() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(user);
        vault.deposit{value: 10 ether}();

        uint256 balBefore = user.balance;
        vm.prank(user);
        vault.withdraw(5 ether);

        // No profit = no fees. User gets full 5 ETH back.
        assertEq(user.balance - balBefore, 5 ether);
    }

    function test_ExecuteStrategy_DepositToPool() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(user);
        vault.deposit{value: 10 ether}();

        // Agent deposits vault funds into Pool B
        bytes memory depositCall = abi.encodeWithSignature("deposit()");
        vm.prank(agentOperator);
        vault.executeStrategyWithValue(address(poolB), depositCall, 10 ether);

        // Vault balance should be 0 (funds moved to pool)
        assertEq(address(vault).balance, 0);
        // Pool should show vault's deposit
        assertEq(poolB.balanceOf(address(vault)), 10 ether);
    }

    function test_ExecuteStrategy_UnauthorizedAgentFails() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(user);
        vault.deposit{value: 10 ether}();

        bytes memory data = abi.encodeWithSignature("deposit()");
        vm.prank(address(0x999)); // Random address
        vm.expectRevert("AgentVault: not agent");
        vault.executeStrategyWithValue(address(poolA), data, 1 ether);
    }

    function test_ExecuteStrategy_DisallowedTargetFails() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(user);
        vault.deposit{value: 10 ether}();

        address randomTarget = address(0x888);
        bytes memory data = abi.encodeWithSignature("deposit()");
        vm.prank(agentOperator);
        vm.expectRevert("AgentVault: target not allowed");
        vault.executeStrategyWithValue(randomTarget, data, 1 ether);
    }

    function test_RevokeAgent() public {
        AgentVault vault = _createVaultWithPools();

        vm.prank(user);
        vault.deposit{value: 10 ether}();

        // User revokes agent
        vm.prank(user);
        vault.revokeAgent();

        // Agent can no longer execute
        bytes memory data = abi.encodeWithSignature("deposit()");
        vm.prank(agentOperator);
        vm.expectRevert("AgentVault: agent revoked");
        vault.executeStrategyWithValue(address(poolA), data, 1 ether);
    }

    // ===================== Full E2E: Deposit → Strategy → Profit → Withdraw =====================

    function test_E2E_ProfitWithFees() public {
        AgentVault vault = _createVaultWithPools();

        // User deposits 10 ETH
        vm.prank(user);
        vault.deposit{value: 10 ether}();

        // Agent deposits into Pool B (8% APY)
        bytes memory depositCall = abi.encodeWithSignature("deposit()");
        vm.prank(agentOperator);
        vault.executeStrategyWithValue(address(poolB), depositCall, 10 ether);

        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);

        // Agent withdraws from Pool B back to vault
        uint256 poolBalance = poolB.balanceOf(address(vault));
        bytes memory withdrawCall = abi.encodeWithSignature("withdraw(uint256)", poolBalance);
        vm.prank(agentOperator);
        vault.executeStrategy(address(poolB), withdrawCall);

        // Vault should now have ~10.8 ETH (10 + 8% interest)
        uint256 vaultBalance = address(vault).balance;
        assertApproxEqAbs(vaultBalance, 10.8 ether, 0.01 ether);

        // User withdraws everything
        uint256 userBalBefore = user.balance;
        uint256 agentBalBefore = agentOperator.balance;
        uint256 treasuryBalBefore = platformTreasury.balance;

        vm.prank(user);
        vault.withdraw(vaultBalance);

        // Profit ~= 0.8 ETH
        // Agent fee: 10% of 0.8 = 0.08 ETH
        // Platform fee: 5% of 0.8 = 0.04 ETH
        // User gets: 10.8 - 0.08 - 0.04 = ~10.68 ETH
        uint256 agentEarned = agentOperator.balance - agentBalBefore;
        uint256 platformEarned = platformTreasury.balance - treasuryBalBefore;
        uint256 userReceived = user.balance - userBalBefore;

        assertApproxEqAbs(agentEarned, 0.08 ether, 0.01 ether);
        assertApproxEqAbs(platformEarned, 0.04 ether, 0.01 ether);
        assertApproxEqAbs(userReceived, 10.68 ether, 0.02 ether);
    }
}
