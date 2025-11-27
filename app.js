const CONTRACT_ADDRESS = "0x5571d4b93eB7469BaA0d41dCFf4A42944b830A33";
const BASE_CHAIN_ID_HEX = "0x2105"; // 8453
const ETH_USD_PRICE = 3000;

// Minimal ABI for the described contract interface.
// Adjust if the on-chain ABI differs.
const CONTRACT_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "verifier",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
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
      { internalType: "uint8", name: "taskType", type: "uint8" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" },
      { internalType: "uint256", name: "participantsPaid", type: "uint256" },
      { internalType: "uint256", name: "remainingReward", type: "uint256" },
      { internalType: "bool", name: "active", type: "bool" }
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
    name: "withdrawNative",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "maxParticipants", type: "uint256" }],
    name: "createNativeTask",
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
    name: "allocateNativeReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const state = {
  provider: null,
  signer: null,
  contract: null,
  address: null,
  owner: null,
  verifier: null,
  isOwner: false,
  isVerifier: false,
  tasks: [],
  selectedTask: null,
  nativeBalanceWei: 0n
};

// UI helpers

function $(id) {
  return document.getElementById(id);
}

function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatEth(weiBigNumberish, decimals = 4) {
  try {
    const ethStr = ethers.formatEther(weiBigNumberish);
    const num = Number(ethStr);
    if (Number.isNaN(num)) return "0.0000";
    return num.toFixed(decimals);
  } catch {
    return "0.0000";
  }
}

function formatUsd(ethAmount) {
  const num = Number(ethAmount);
  if (Number.isNaN(num)) return "$0.00";
  const usd = num * ETH_USD_PRICE;
  return `$${usd.toFixed(2)}`;
}

function showToast(message, type = "info", title) {
  const container = $("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const toastTitle = document.createElement("div");
  toastTitle.className = "toast-title";
  toastTitle.textContent =
    title || (type === "success" ? "Success" : type === "error" ? "Error" : "Notice");
  const toastMessage = document.createElement("div");
  toastMessage.className = "toast-message";
  toastMessage.textContent = message;
  toast.appendChild(toastTitle);
  toast.appendChild(toastMessage);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, 3400);
}

function setButtonLoading(button, isLoading, labelWhenDone) {
  if (!button) return;
  if (isLoading) {
    button.dataset.prevLabel = button.textContent;
    button.textContent = "Processing…";
    button.disabled = true;
  } else {
    button.textContent = labelWhenDone || button.dataset.prevLabel || button.textContent;
    button.disabled = false;
  }
}

// Task helpers

const HOW_TO_EARN_COPY = {
  follow: [
    "Follow the specified account and keep notifications enabled for at least 24 hours.",
    "Tap the follow button on the target profile and keep the follow active.",
    "Follow the account, then engage with at least one recent post."
  ],
  boost: [
    "Boost the specified cast so it reaches a wider audience.",
    "Quote the cast with a short, relevant comment to help discovery.",
    "Boost the cast and keep it visible on your profile for at least 1 hour."
  ]
};

function randomHowTo(taskTypeLabel) {
  const key = taskTypeLabel === "Follow account" ? "follow" : "boost";
  const pool = HOW_TO_EARN_COPY[key];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function mapTaskType(typeIndex) {
  const idx = Number(typeIndex);
  if (idx === 1) return "Boost cast";
  return "Follow account";
}

function generateMockParticipants(participantsPaid, maxParticipants) {
  const participants = [];
  const total = Math.min(maxParticipants, Math.max(4, participantsPaid + 3));
  for (let i = 0; i < total; i += 1) {
    const isPaid = i < participantsPaid;
    const base = "0x";
    const addr =
      base +
      Math.random().toString(16).slice(2, 10) +
      Math.random().toString(16).slice(2, 10);
    const minutesLeft = Math.floor(Math.random() * 25) + 5;
    participants.push({
      address: addr,
      status: isPaid ? "paid" : "pending",
      minutesLeft: isPaid ? 0 : minutesLeft
    });
  }
  return participants;
}

// Blockchain connection

async function ensureProviderOnBase() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Install a wallet like MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (!network || network.chainId !== 8453n) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_CHAIN_ID_HEX }]
      });
    } catch (err) {
      if (err && err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BASE_CHAIN_ID_HEX,
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
      } else {
        throw err;
      }
    }
  }

  return new ethers.BrowserProvider(window.ethereum);
}

async function connectWallet() {
  const connectButton = $("connect-button");
  const labelSpan = $("connect-button-label");
  try {
    setButtonLoading(connectButton, true);
    labelSpan.textContent = "Connecting…";

    const provider = await ensureProviderOnBase();
    const accounts = await provider.send("eth_requestAccounts", []);
    if (!accounts || accounts.length === 0) {
      throw new Error("Wallet connection rejected.");
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    state.provider = provider;
    state.signer = signer;
    state.contract = contract;
    state.address = address;

    $("wallet-address").textContent = shortenAddress(address);
    labelSpan.textContent = "Connected";
    connectButton.disabled = false;

    await Promise.all([loadRolesAndPermissions(), loadUserNativeBalance(), loadTasks()]);
    showToast("Wallet connected on Base.", "success");
  } catch (err) {
    console.error(err);
    showToast(
      err && err.message ? err.message : "Failed to connect wallet.",
      "error"
    );
    $("wallet-address").textContent = "Not connected";
    $("connect-button-label").textContent = "Connect wallet";
  } finally {
    setButtonLoading(connectButton, false, "Connected");
  }
}

async function loadRolesAndPermissions() {
  const rolePill = $("role-pill");
  const adminBadge = $("admin-badge");
  const ownerSpan = $("owner-address");
  const verifierSpan = $("verifier-address");
  const createBtn = $("create-task-button");
  const allocateBtn = $("allocate-reward-button");

  if (!state.contract || !state.address) return;

  try {
    const [owner, verifier] = await Promise.all([
      state.contract.owner(),
      state.contract.verifier()
    ]);

    state.owner = owner;
    state.verifier = verifier;

    const lowerUser = state.address.toLowerCase();
    state.isOwner = owner && owner.toLowerCase() === lowerUser;
    state.isVerifier = verifier && verifier.toLowerCase() === lowerUser;

    const role = state.isOwner
      ? "Owner"
      : state.isVerifier
      ? "Verifier"
      : "Participant";

    rolePill.textContent = role;
    if (state.isOwner || state.isVerifier) {
      adminBadge.textContent = `Admin: ${role}`;
      adminBadge.style.borderColor = "rgba(56, 189, 248, 0.9)";
      adminBadge.style.color = "#5eead4";
      createBtn.disabled = false;
      allocateBtn.disabled = false;
    } else {
      adminBadge.textContent = "Wallet is not owner / verifier";
      createBtn.disabled = true;
      allocateBtn.disabled = true;
    }

    ownerSpan.textContent = owner ? shortenAddress(owner) : "Unknown";
    verifierSpan.textContent = verifier ? shortenAddress(verifier) : "Unknown";
  } catch (err) {
    console.error(err);
    showToast("Failed to load contract roles.", "error");
  }
}

async function loadUserNativeBalance() {
  const small = $("reward-balance-small");
  const large = $("reward-balance-large");
  const usd = $("reward-balance-usd");
  const withdrawBtn = $("withdraw-button");

  if (!state.contract || !state.address) {
    small.textContent = "0.00 ETH";
    large.textContent = "0.0000 ETH";
    usd.textContent = "$0.00";
    withdrawBtn.disabled = true;
    return;
  }

  try {
    const bal = await state.contract.nativeBalances(state.address);
    state.nativeBalanceWei = bal;
    const eth = formatEth(bal, 4);
    const ethSmall = formatEth(bal, 2);

    small.textContent = `${ethSmall} ETH`;
    large.textContent = `${eth} ETH`;
    usd.textContent = formatUsd(eth);
    withdrawBtn.disabled = Number(eth) <= 0;
  } catch (err) {
    console.error(err);
    showToast("Failed to load reward balance.", "error");
  }
}

async function loadTasks() {
  const container = $("tasks-container");
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <p>Loading tasks from Base…</p>
    </div>
  `;

  if (!state.contract) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Connect your wallet to view available tasks.</p>
      </div>
    `;
    return;
  }

  try {
    const nextIdBN = await state.contract.nextTaskId();
    const nextId = Number(nextIdBN);
    if (!Number.isFinite(nextId) || nextId === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No tasks are currently available. Check back soon.</p>
        </div>
      `;
      state.tasks = [];
      return;
    }

    const tasks = [];
    for (let id = 0; id < nextId; id += 1) {
      // eslint-disable-next-line no-await-in-loop
      const taskTuple = await state.contract.tasks(id);
      const taskType = taskTuple.taskType ?? taskTuple[0];
      const maxParticipants = taskTuple.maxParticipants ?? taskTuple[1];
      const participantsPaid = taskTuple.participantsPaid ?? taskTuple[2];
      const remainingReward = taskTuple.remainingReward ?? taskTuple[3];
      const active = taskTuple.active ?? taskTuple[4];

      if (!active) continue;

      const typeLabel = mapTaskType(taskType);
      const remainingEth = formatEth(remainingReward, 4);
      const max = Number(maxParticipants);
      const paid = Number(participantsPaid);
      const howTo = randomHowTo(typeLabel);

      tasks.push({
        id,
        taskTypeLabel: typeLabel,
        howTo,
        maxParticipants: max,
        participantsPaid: paid,
        remainingRewardWei: remainingReward,
        remainingEth
      });
    }

    state.tasks = tasks;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No active tasks are available right now.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    tasks.forEach((task) => {
      const card = document.createElement("article");
      card.className = "task-card";
      card.dataset.taskId = String(task.id);

      const completionRatio =
        task.maxParticipants > 0 ? task.participantsPaid / task.maxParticipants : 0;
      const completionPct = Math.min(100, Math.round(completionRatio * 100));

      card.innerHTML = `
        <div class="task-main-row">
          <div class="token-chip">
            <div class="token-logo">
              <span class="token-symbol">Ξ</span>
            </div>
            <div class="token-text">
              <span class="token-name">${task.taskTypeLabel}</span>
              <span class="token-sub">Task #${task.id}</span>
            </div>
          </div>
          <div class="task-reward">
            <div class="task-reward-eth">${task.remainingEth} ETH</div>
            <div class="task-reward-usd">${formatUsd(task.remainingEth)}</div>
          </div>
        </div>
        <div class="task-meta-row">
          <div class="task-info">
            <div class="task-type-pill">
              <span>${task.taskTypeLabel}</span>
            </div>
            <div class="task-how-to">${task.howTo}</div>
            <div class="task-progress">
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${completionPct}%;"></div>
              </div>
              <div class="progress-text">${task.participantsPaid}/${task.maxParticipants}</div>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn-ghost task-open-button">Details</button>
            <button class="btn-primary task-verify-button">Verify</button>
          </div>
        </div>
      `;

      const detailsBtn = card.querySelector(".task-open-button");
      const verifyBtn = card.querySelector(".task-verify-button");

      detailsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openTaskModal(task.id);
      });

      verifyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onVerifyClick(task.id);
      });

      card.addEventListener("click", () => openTaskModal(task.id));

      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load tasks from contract.", "error");
    container.innerHTML = `
      <div class="empty-state">
        <p>Unable to read tasks from the contract. Check your network and try again.</p>
      </div>
    `;
  }
}

// Modal handling

function openTaskModal(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  state.selectedTask = task;

  $("modal-task-type").textContent = task.taskTypeLabel;
  $("modal-task-title").textContent = `Task #${task.id}`;
  $("modal-task-id").textContent = String(task.id);
  $("modal-how-to-earn").textContent = task.howTo;
  $("modal-max-participants").textContent = String(task.maxParticipants);
  $("modal-participants-paid").textContent = String(task.participantsPaid);

  const remainingEth = task.remainingEth;
  $("modal-reward-eth").textContent = `${remainingEth} ETH`;
  $("modal-reward-usd").textContent = formatUsd(remainingEth);
  $("modal-remaining-reward").textContent = `${remainingEth} ETH`;

  const participantsContainer = $("modal-participants-list");
  participantsContainer.innerHTML = "";

  const mockParticipants = generateMockParticipants(
    task.participantsPaid,
    task.maxParticipants
  );
  mockParticipants.forEach((p) => {
    const row = document.createElement("div");
    row.className = "participant-row";

    const main = document.createElement("div");
    main.className = "participant-main";

    const addrSpan = document.createElement("span");
    addrSpan.className = "participant-address";
    addrSpan.textContent = shortenAddress(p.address);

    const metaSpan = document.createElement("span");
    metaSpan.className = "participant-meta";
    metaSpan.textContent =
      p.status === "paid"
        ? "Reward paid"
        : `Waiting for verifier · ~${p.minutesLeft} min`;

    main.appendChild(addrSpan);
    main.appendChild(metaSpan);

    const status = document.createElement("span");
    status.className = `participant-status ${p.status}`;
    status.textContent = p.status === "paid" ? "Paid" : "Pending";

    row.appendChild(main);
    row.appendChild(status);

    participantsContainer.appendChild(row);
  });

  $("task-modal").classList.remove("hidden");
}

function closeTaskModal() {
  $("task-modal").classList.add("hidden");
  state.selectedTask = null;
}

async function onVerifyClick(taskId) {
  if (!state.contract || !state.address) {
    showToast("Connect your wallet before verifying a task.", "error");
    return;
  }

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) {
    showToast("Task not found.", "error");
    return;
  }

  showToast(
    "Verification request registered. The verifier will allocate rewards if approved.",
    "info",
    "Verification requested"
  );
}

// Withdraw & admin actions

async function onWithdrawClick() {
  if (!state.contract || !state.address) {
    showToast("Connect your wallet first.", "error");
    return;
  }

  const withdrawBtn = $("withdraw-button");
  try {
    if (state.nativeBalanceWei <= 0n) {
      showToast("You have no withdrawable rewards.", "info");
      return;
    }

    setButtonLoading(withdrawBtn, true);
    const tx = await state.contract.withdrawNative();
    showToast("Withdrawal submitted. Waiting for confirmation…", "info");
    await tx.wait();
    showToast("Rewards withdrawn to your wallet.", "success");
    await loadUserNativeBalance();
  } catch (err) {
    console.error(err);
    showToast(
      err && err.message ? err.message : "Failed to withdraw rewards.",
      "error"
    );
  } finally {
    setButtonLoading(withdrawBtn, false, "Withdraw");
  }
}

async function onCreateTaskSubmit(event) {
  event.preventDefault();
  if (!state.contract || (!state.isOwner && !state.isVerifier)) {
    showToast("Only owner or verifier can create tasks.", "error");
    return;
  }

  const maxInput = $("create-max-participants");
  const rewardInput = $("create-total-reward");
  const button = $("create-task-button");

  const maxParticipants = Number(maxInput.value || 0);
  const rewardEth = Number(rewardInput.value || 0);

  if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) {
    showToast("Enter a valid max participants value.", "error");
    return;
  }

  if (!Number.isFinite(rewardEth) || rewardEth <= 0) {
    showToast("Enter a valid total reward in ETH.", "error");
    return;
  }

  try {
    const value = ethers.parseEther(rewardEth.toString());
    setButtonLoading(button, true);

    const tx = await state.contract.createNativeTask(maxParticipants, { value });
    showToast("Task creation submitted. Waiting for confirmation…", "info");
    await tx.wait();
    showToast("Native task created successfully.", "success");
    maxInput.value = "";
    rewardInput.value = "";
    await loadTasks();
  } catch (err) {
    console.error(err);
    showToast(
      err && err.message ? err.message : "Failed to create native task.",
      "error"
    );
  } finally {
    setButtonLoading(button, false, "Create task");
  }
}

async function onAllocateRewardSubmit(event) {
  event.preventDefault();
  if (!state.contract || (!state.isOwner && !state.isVerifier)) {
    showToast("Only owner or verifier can allocate rewards.", "error");
    return;
  }

  const taskIdInput = $("allocate-task-id");
  const addressInput = $("allocate-user-address");
  const amountInput = $("allocate-amount");
  const button = $("allocate-reward-button");

  const taskId = Number(taskIdInput.value || 0);
  const userAddress = addressInput.value.trim();
  const amountEth = Number(amountInput.value || 0);

  if (!Number.isFinite(taskId) || taskId < 0) {
    showToast("Enter a valid task ID.", "error");
    return;
  }

  if (!ethers.isAddress(userAddress)) {
    showToast("Enter a valid participant address.", "error");
    return;
  }

  if (!Number.isFinite(amountEth) || amountEth <= 0) {
    showToast("Enter a valid reward amount in ETH.", "error");
    return;
  }

  try {
    const amountWei = ethers.parseEther(amountEth.toString());
    setButtonLoading(button, true);
    const tx = await state.contract.allocateNativeReward(
      taskId,
      userAddress,
      amountWei
    );
    showToast("Allocation submitted. Waiting for confirmation…", "info");
    await tx.wait();
    showToast("Reward allocated to participant.", "success");
    taskIdInput.value = "";
    addressInput.value = "";
    amountInput.value = "";
    await loadUserNativeBalance();
  } catch (err) {
    console.error(err);
    showToast(
      err && err.message ? err.message : "Failed to allocate reward.",
      "error"
    );
  } finally {
    setButtonLoading(button, false, "Allocate reward");
  }
}

// Tabs

function setupTabs() {
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;

      document
        .querySelectorAll(".view")
        .forEach((view) => view.classList.remove("view-active"));
      $(`${targetId}`).classList.add("view-active");

      navItems.forEach((b) => b.classList.remove("nav-item-active"));
      btn.classList.add("nav-item-active");
    });
  });
}

// Modal events

function setupModalEvents() {
  const backdrop = $("task-modal");
  const closeBtn = $("modal-close-button");
  const verifyBtn = $("modal-verify-button");

  closeBtn.addEventListener("click", () => closeTaskModal());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeTaskModal();
    }
  });

  verifyBtn.addEventListener("click", () => {
    if (!state.selectedTask) return;
    onVerifyClick(state.selectedTask.id);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.classList.contains("hidden")) {
      closeTaskModal();
    }
  });
}

// Event wiring

function setupEventListeners() {
  $("connect-button").addEventListener("click", () => {
    connectWallet();
  });

  $("refresh-tasks").addEventListener("click", () => {
    if (!state.contract) {
      showToast("Connect your wallet to refresh tasks.", "info");
      return;
    }
    loadTasks();
  });

  $("withdraw-button").addEventListener("click", onWithdrawClick);
  $("create-task-form").addEventListener("submit", onCreateTaskSubmit);
  $("allocate-reward-form").addEventListener("submit", onAllocateRewardSubmit);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => {
      window.location.reload();
    });
    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }
}

// Bootstrap

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupModalEvents();
  setupEventListeners();
});
