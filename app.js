const CONTRACT_ADDRESS = "0x720205F380a9d2ABD88Db200dC9eA201d0Ac96d8";

const ABI = [
    "function createTaskNative(uint256 maxParticipants) payable returns(uint256)",
    "function createTaskERC20(address token,uint256 totalAmount,uint256 maxParticipants) returns(uint256)",
    "function withdrawNative()",
];

let provider;
let signer;
let contract;

document.getElementById("connectBtn").onclick = async () => {
    if (!window.ethereum) return alert("MetaMask not found");

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const addr = await signer.getAddress();
    document.getElementById("walletAddress").innerText = "Connected: " + addr;
};

document.getElementById("nativeBtn").onclick = async () => {
    const max = document.getElementById("nativeMax").value;
    const ethValue = document.getElementById("nativeValue").value;

    try {
        const tx = await contract.createTaskNative(max, {
            value: ethers.parseEther(ethValue)
        });
        await tx.wait();
        alert("Native Task created!");
    } catch (e) {
        alert(e.message);
    }
};

document.getElementById("erc20Btn").onclick = async () => {
    const token = document.getElementById("erc20Token").value;
    const amount = document.getElementById("erc20Amount").value;
    const max = document.getElementById("erc20Max").value;

    try {
        const tx = await contract.createTaskERC20(token, amount, max);
        await tx.wait();
        alert("ERC20 Task created!");
    } catch (e) {
        alert(e.message);
    }
};

document.getElementById("withdrawNative").onclick = async () => {
    try {
        const tx = await contract.withdrawNative();
        await tx.wait();
        alert("Withdraw completed");
    } catch (e) {
        alert(e.message);
    }
};