// Basic config
const CONTRACT_ADDRESS = "0x5571d4b93eB7469BaA0d41dCFf4A42944b830A33";
const BASE_RPC_URL = "https://mainnet.base.org";

// Minimal ABI for FasterTasks-style contract
const CONTRACT_ABI = [
  // Views
  {
    inputs: [],
    name: "nextTaskId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "tasks",
    outputs: [
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "remainingReward", type: "uint256" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" },
      { internalType: "uint256", name: "participantsPaid", type: "uint256" },
      { internalType: "bool", name: "isActive", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "nativeBalances",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "verifierWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },

  // Writes
  {
    inputs: [{ internalType: "uint256", name: "maxParticipants", type: "uint256" }],
    name: "createTaskNative",
    outputs: [{ internalType: "uint256", name: "taskId", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "taskId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "allocateReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "withdrawNative",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// Basic state
let readProvider;
let readContract;

let web3Provider;
let signer;
let writeContract;
let currentAccount = null;
let ownerAddress = null;
let verifierAddress = null;

// Simple mock metadata per task id (off-chain)
// Later you can replace this with a backend API.
function getMockTaskMeta(taskId) {
  const types = ["Follow account", "Boost cast"];
  const type = types[Number(taskId) % types.length];

  let howToEarn =
    "Follow the creator account in the Farcaster frame, then tap Verify.";
  if (type === "Boost cast") {
    howToEarn =
      "Like and recast the target cast, then tap Verify in the frame.";
  }

  return {
    type,
    howToEarn
  };
}

// Utility: small toast
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.borderColor = isError ? "rgba(248,113,113,0.9)" : "";
  toast.style.color = isError ? "#fecaca" : "";
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2600);
}

// Shorten address
function shortAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Format ETH from wei (BigInt)
function formatEth(value) {
  if (value === null || value === undefined) return "0.0";
  try {
    const eth = ethers.formatEther(value);
    const num = Number(eth);
    if (num === 0) return "0.0";
    if (num < 0.0001) return num.toExponential(2);
    if (num < 1) return num.toFixed(4);
    return num.toFixed(4);
  } catch {
    return "0.0";
  }
}

// Very rough USD estimation for UI only (no live price)
const STATIC_ETH_PRICE = 3000;
function formatUsdApprox(ethString) {
  const num = Number(ethString);
  if (!num || num <= 0) return "~$0";
  const usd = num * STATIC_ETH_PRICE;
  if (usd < 1) return "~$" + usd.toFixed(2);
  if (usd < 1000) return "~$" + usd.toFixed(2);
  return "~$" + usd.toFixed(0);
}

// Init read provider & contract (no wallet needed)
async function initRead() {
  readProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);

  try {
    ownerAddress = await readContract.owner();
    verifierAddress = await readContract.verifierWallet();
  } catch (e) {
    console.error("Failed to read owner/verifier:", e);
  }
}

// Connect wallet
async function connectWallet() {
  const btn = document.getElementById("connectButton");

  if (!window.ethereum) {
    showToast("No wallet detected. Install MetaMask or a compatible wallet.", true);
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Connecting...";

    // Request accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });
    if (!accounts || !accounts.length) {
      throw new Error("No account selected");
    }
    currentAccount = ethers.getAddress(accounts[0]);

    // Ensure Base network (8453)
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    if (chainIdHex !== "0x2105") {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2105" }]
        });
      } catch (switchError) {
        // Try to add Base if not available
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x2105",
                chainName: "Base",
                nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18
                },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"]
              }
            ]
          });
        } catch (addError) {
          console.warn("Failed to add/switch Base network", addError);
        }
      }
    }

    web3Provider = new ethers.BrowserProvider(window.ethereum);
    signer = await web3Provider.getSigner();
    writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    btn.textContent = shortAddress(currentAccount);
    btn.classList.add("btn-secondary");

    showToast("Wallet connected");
    await refreshAll();
    wireAdminRoleLabel();
  } catch (e) {
    console.error(e);
    showToast("Failed to connect wallet", true);
    btn.textContent = "Connect wallet";
  } finally {
    btn.disabled = false;
  }
}

// Refresh everything that depends on chain
async function refreshAll() {
  await Promise.all([loadTasks(), loadNativeBalance()]);
}

// Load tasks from contract
async function loadTasks() {
  const listEl = document.getElementById("tasksList");
  const emptyEl = document.getElementById("tasksEmpty");

  listEl.innerHTML = "";
  emptyEl.classList.add("hidden");

  if (!readContract) return;

  try {
    const total = await readContract.nextTaskId();
    const totalNum = Number(total);
    if (!totalNum || totalNum <= 0) {
      emptyEl.classList.remove("hidden");
      return;
    }

    const indices = Array.from({ length: totalNum }, (_, i) => i);
    const tasks = await Promise.all(
      indices.map((i) => readContract.tasks(i))
    );

    let rendered = 0;
    tasks.forEach((t, idx) => {
      const isActive = t.isActive;
      // You can change to show ended tasks too if you want
      if (!isActive && Number(t.remainingReward) === 0) return;

      const taskId = idx;
      const tokenAddress = t.token;
      const remaining = t.remainingReward;
      const maxParticipants = t.maxParticipants;
      const participantsPaid = t.participantsPaid;

      const totalRewardEth = formatEth(remaining);
      const usdApprox = formatUsdApprox(totalRewardEth);

      const meta = getMockTaskMeta(taskId);

      const card = document.createElement("div");
      card.className = "task-card";
      card.dataset.taskId = String(taskId);

      card.innerHTML = `
        <div class="task-header">
          <div class="token-info">
            <div class="token-logo">Ξ</div>
            <div class="token-meta">
              <div class="token-amount">${totalRewardEth} ETH</div>
              <div class="token-symbol">Reward pool</div>
              <div class="token-usd">${usdApprox}</div>
            </div>
          </div>
          <button class="btn btn-secondary verify-inline" data-verify-id="${taskId}">
            Verify
          </button>
        </div>
        <div class="task-body">
          <div class="how-to-earn-title">How to earn</div>
          <div class="how-to-earn-text">${meta.howToEarn}</div>
          <div class="task-type-row">
            <div class="task-type-label">Task type</div>
            <div class="task-type-value">${meta.type}</div>
          </div>
        </div>
      `;

      // Click on card opens detail modal
      card.addEventListener("click", (e) => {
        // Don't treat inline verify button click as "open modal"
        const target = e.target;
        if (target && target.closest(".verify-inline")) return;
        openTaskModal(taskId, {
          tokenAddress,
          remaining,
          maxParticipants,
          participantsPaid,
          meta
        });
      });

      // Inline verify button (for now just show toast)
      const verifyBtn = card.querySelector(".verify-inline");
      verifyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleVerifyClick(taskId);
      });

      listEl.appendChild(card);
      rendered++;
    });

    if (!rendered) {
      emptyEl.classList.remove("hidden");
    }
  } catch (e) {
    console.error("Failed to load tasks:", e);
    showToast("Failed to load tasks", true);
    emptyEl.classList.remove("hidden");
  }
}

// Load native balance for current user
async function loadNativeBalance() {
  const el = document.getElementById("nativeBalance");
  if (!readContract || !currentAccount) {
    el.textContent = "0.0";
    return;
  }

  try {
    const bal = await readContract.nativeBalances(currentAccount);
    el.textContent = formatEth(bal);
  } catch (e) {
    console.error("Failed to load native balance:", e);
    el.textContent = "0.0";
  }
}

// Withdraw native rewards
async function withdrawNative() {
  if (!writeContract || !signer || !currentAccount) {
    showToast("Connect wallet first", true);
    return;
  }

  try {
    const el = document.getElementById("withdrawNativeButton");
    el.disabled = true;
    el.textContent = "Withdrawing...";

    const tx = await writeContract.withdrawNative();
    showToast("Transaction sent...");

    await tx.wait();
    showToast("Withdrawal complete");
    await loadNativeBalance();
  } catch (e) {
    console.error("Withdraw failed:", e);
    showToast("Withdraw failed", true);
  } finally {
    const el = document.getElementById("withdrawNativeButton");
    el.disabled = false;
    el.textContent = "Withdraw to wallet";
  }
}

// Admin: create native task
async function createTaskNative() {
  if (!writeContract || !signer || !currentAccount) {
    showToast("Connect wallet first", true);
    return;
  }
  if (!ownerAddress || currentAccount.toLowerCase() !== ownerAddress.toLowerCase()) {
    showToast("Only owner can create tasks", true);
    return;
  }

  const maxParticipantsInput = document.getElementById("createMaxParticipants");
  const totalEthInput = document.getElementById("createTotalEth");

  const maxParticipants = Number(maxParticipantsInput.value || "0");
  const totalEth = Number(totalEthInput.value || "0");

  if (!maxParticipants || maxParticipants <= 0) {
    showToast("Max participants must be > 0", true);
    return;
  }
  if (!totalEth || totalEth <= 0) {
    showToast("Total reward must be > 0", true);
    return;
  }

  try {
    const value = ethers.parseEther(totalEth.toString());
    const btn = document.getElementById("createTaskButton");
    btn.disabled = true;
    btn.textContent = "Creating...";

    const tx = await writeContract.createTaskNative(maxParticipants, {
      value
    });
    showToast("Transaction sent...");

    const receipt = await tx.wait();
    showToast("Task created");
    await loadTasks();
  } catch (e) {
    console.error("Create task failed:", e);
    showToast("Create task failed", true);
  } finally {
    const btn = document.getElementById("createTaskButton");
    btn.disabled = false;
    btn.textContent = "Create task (owner)";
  }
}

// Admin: allocate reward
async function allocateReward() {
  if (!writeContract || !signer || !currentAccount) {
    showToast("Connect wallet first", true);
    return;
  }
  if (
    !verifierAddress ||
    currentAccount.toLowerCase() !== verifierAddress.toLowerCase()
  ) {
    showToast("Only verifier can allocate", true);
    return;
  }

  const taskIdVal = Number(
    document.getElementById("allocTaskId").value || "0"
  );
  const user = document.getElementById("allocUser").value.trim();
  const amountEth = Number(
    document.getElementById("allocAmount").value || "0"
  );

  if (!Number.isInteger(taskIdVal) || taskIdVal < 0) {
    showToast("Task ID is invalid", true);
    return;
  }
  if (!user || !ethers.isAddress(user)) {
    showToast("User address is invalid", true);
    return;
  }
  if (!amountEth || amountEth <= 0) {
    showToast("Amount must be > 0", true);
    return;
  }

  try {
    const btn = document.getElementById("allocateButton");
    btn.disabled = true;
    btn.textContent = "Allocating...";

    const amountWei = ethers.parseEther(amountEth.toString());
    const tx = await writeContract.allocateReward(taskIdVal, user, amountWei);
    showToast("Transaction sent...");

    await tx.wait();
    showToast("Reward allocated");
    await Promise.all([loadTasks(), loadNativeBalance()]);
  } catch (e) {
    console.error("Allocate failed:", e);
    showToast("Allocate failed", true);
  } finally {
    const btn = document.getElementById("allocateButton");
    btn.disabled = false;
    btn.textContent = "Allocate (verifier)";
  }
}

// Wire admin role label
function wireAdminRoleLabel() {
  const tag = document.getElementById("adminRoleTag");
  if (!currentAccount || !ownerAddress || !verifierAddress) {
    tag.textContent = "Not owner / verifier";
    return;
  }

  const addr = currentAccount.toLowerCase();
  if (addr === ownerAddress.toLowerCase() && addr === verifierAddress.toLowerCase()) {
    tag.textContent = "Owner & verifier";
  } else if (addr === ownerAddress.toLowerCase()) {
    tag.textContent = "Owner";
  } else if (addr === verifierAddress.toLowerCase()) {
    tag.textContent = "Verifier";
  } else {
    tag.textContent = "Not owner / verifier";
  }
}

/* Task detail modal */

function openTaskModal(taskId, data) {
  const modal = document.getElementById("taskModal");
  modal.classList.remove("hidden");

  const tokenLabel = document.getElementById("modalTokenLabel");
  const rewardLabel = document.getElementById("modalRewardLabel");
  const typeLabel = document.getElementById("modalTaskType");
  const howToEarnLabel = document.getElementById("modalHowToEarn");
  const remainingLabel = document.getElementById("modalRemaining");
  const maxLabel = document.getElementById("modalMaxParticipants");
  const paidLabel = document.getElementById("modalParticipantsPaid");

  const remainingEth = formatEth(data.remaining);
  tokenLabel.textContent = "Reward token: ETH (Base)";
  rewardLabel.textContent = `${remainingEth} ETH total remaining`;
  typeLabel.textContent = data.meta.type;
  howToEarnLabel.textContent = data.meta.howToEarn;
  remainingLabel.textContent = remainingEth + " ETH";
  maxLabel.textContent = String(data.maxParticipants);
  paidLabel.textContent = String(data.participantsPaid);

  // Participants list: mock data for now
  const list = document.getElementById("modalParticipantsList");
  list.innerHTML = "";

  // Example placeholder data
  const sample = [
    {
      address: currentAccount || "0x1234...abcd",
      secondsLeft: 3600,
      amountEth: "0.01",
      paid: false
    },
    {
      address: "0x9f27...c1b0",
      secondsLeft: 0,
      amountEth: "0.02",
      paid: true
    }
  ];

  sample.forEach((p) => {
    const row = document.createElement("div");
    row.className = "participant-row " + (p.paid ? "paid" : "pending");
    const status = p.paid ? "Reward sent" : "Pending unlock";

    row.innerHTML = `
      <div class="participant-main">
        <div class="participant-address">${p.address}</div>
        <div class="participant-sub">${status}</div>
      </div>
      <div class="participant-meta">
        <div>${p.amountEth} ETH</div>
        <div>${
          p.paid ? "0s" : Math.round(p.secondsLeft / 60) + " min left"
        }</div>
      </div>
    `;

    list.appendChild(row);
  });

  const verifyButton = document.getElementById("modalVerifyButton");
  verifyButton.onclick = () => {
    handleVerifyClick(taskId);
  };
}

function closeTaskModal() {
  const modal = document.getElementById("taskModal");
  modal.classList.add("hidden");
}

// Currently verify just shows a toast.
// Later you would call your backend endpoint here.
function handleVerifyClick(taskId) {
  showToast("Verification will be handled by backend for task " + taskId);
}

// Tabs

function setActiveTab(tab) {
  const tasksView = document.getElementById("tasksView");
  const dashView = document.getElementById("dashboardView");

  if (tab === "tasks") {
    tasksView.classList.add("active");
    dashView.classList.remove("active");
  } else {
    dashView.classList.add("active");
    tasksView.classList.remove("active");
  }

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
}

// DOM load

document.addEventListener("DOMContentLoaded", async () => {
  await initRead();
  await loadTasks();

  const connectBtn = document.getElementById("connectButton");
  connectBtn.addEventListener("click", connectWallet);

  const withdrawBtn = document.getElementById("withdrawNativeButton");
  withdrawBtn.addEventListener("click", withdrawNative);

  const createTaskBtn = document.getElementById("createTaskButton");
  createTaskBtn.addEventListener("click", createTaskNative);

  const allocBtn = document.getElementById("allocateButton");
  allocBtn.addEventListener("click", allocateReward);

  // Tabs
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      setActiveTab(tab);
    });
  });

  // Modal events
  document
    .getElementById("modalCloseButton")
    .addEventListener("click", closeTaskModal);
  document
    .getElementById("taskModal")
    .addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop")) {
        closeTaskModal();
      }
    });

  // Wallet events (if wallet changes)
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => {
      window.location.reload();
    });
    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }
});
