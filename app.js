// Connect Wallet Button
const connectBtn = document.getElementById("connectWalletBtn");

async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        alert("MetaMask not detected. Please install MetaMask.");
        return;
    }

    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        const wallet = accounts[0];
        connectBtn.innerText = wallet.substring(0, 6) + "..." + wallet.slice(-4);
        connectBtn.style.background = "#4caf50";
        console.log("Wallet connected:", wallet);
    } catch (err) {
        console.error("Connection rejected:", err);
        alert("Connection failed. Please try again.");
    }
}

connectBtn.addEventListener("click", connectWallet);
