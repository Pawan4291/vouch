// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// To run on Polygon Amoy:
// forge script script/Deploy.s.sol \
//   --rpc-url https://polygon-amoy.drpc.org \
//   --broadcast \
//   --private-key $DEPLOYER_PRIVATE_KEY \
//   -vvvv
//
// Copy the printed addresses into app/src/contracts/addresses.ts
//
// NOTE: Set MOCK_USDT=true to deploy a mock USDT (for testnet).
//       For mainnet, set USDT_ADDRESS to the real USDT contract.

import "forge-std/Script.sol";
import "../src/ReputationRegistry.sol";
import "../src/DealEscrow.sol";
import "../src/DisputeJury.sol";

// ─── Minimal mock USDT for testnet deployment ─────────────────────────────────
contract MockUSDT {
    string  public name     = "Mock USDT";
    string  public symbol   = "USDT";
    uint8   public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply    += amount;
        emit Transfer(address(0), to, amount);
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "USDT: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]          += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "USDT: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "USDT: insufficient allowance");
        balanceOf[from]              -= amount;
        balanceOf[to]                 += amount;
        allowance[from][msg.sender]   -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

// ─── Deploy script ────────────────────────────────────────────────────────────
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy mock USDT (testnet only)
        //    On mainnet: use address 0xc2132D05D31c914a87C6611C10748AEb04B58e8F (Polygon USDT)
        MockUSDT usdt = new MockUSDT();
        console.log("MockUSDT deployed at:", address(usdt));

        // Mint 10,000 USDT to deployer for testing
        usdt.mint(deployer, 10_000e6);
        console.log("Minted 10,000 USDT to deployer");

        // 2. Deploy ReputationRegistry (needs USDT address; authorized set later)
        address[] memory emptyAuth = new address[](0);
        ReputationRegistry registry = new ReputationRegistry(address(usdt), emptyAuth);
        console.log("ReputationRegistry deployed at:", address(registry));

        // 3. Deploy DealEscrow (needs USDT + Registry; DisputeJury set later)
        DealEscrow escrow = new DealEscrow(address(usdt), address(registry));
        console.log("DealEscrow deployed at:", address(escrow));

        // 4. Deploy DisputeJury (needs Registry + Escrow)
        DisputeJury jury = new DisputeJury(address(registry), address(escrow));
        console.log("DisputeJury deployed at:", address(jury));

        // 5. Wire everything together:
        //    a. Set DisputeJury in DealEscrow
        escrow.setDisputeJury(address(jury));

        //    b. Authorize DealEscrow + DisputeJury to call slash() + recordDealComplete()
        address[] memory authorized = new address[](2);
        authorized[0] = address(escrow);
        authorized[1] = address(jury);
        registry.setAuthorized(address(escrow), true);
        registry.setAuthorized(address(jury),   true);

        vm.stopBroadcast();

        // Print summary for addresses.ts
        console.log("\n=== Copy into app/src/contracts/addresses.ts ===");
        console.log("REPUTATION_REGISTRY:", address(registry));
        console.log("DEAL_ESCROW:        ", address(escrow));
        console.log("DISPUTE_JURY:       ", address(jury));
        console.log("USDT (mock):        ", address(usdt));
        console.log("Explorer: https://amoy.polygonscan.com/address/", address(escrow));
    }
}
