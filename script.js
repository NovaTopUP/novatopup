/* NovaTopUp — Single Page App with hash routing
   Works fully offline. Stores recharge history in localStorage.
*/

// ---- Data ----
const GAMES = [
  { id: "mlbb", name: "Mobile Legends", img: "MLBB-2025-tiles-178x178.jpg" },
  { id: "freefire", name: "Free Fire", img: "free_fire_new_tile.png" },
  { id: "pubgm", name: "PUBG Mobile", img: "pubgm_tile_aug2024.jpg" },
  { id: "genshin", name: "Genshin Impact", img: "genshinimpact_tile.jpg" },
  { id: "hok", name: "Honor of Kings", img: "Honor-of-Kings-Tile.png" },
  { id: "wildrift", name: "Wild Rift", img: "Wildrift_APPICON_iOS_1024px.png" },
  { id: "codm", name: "COD Mobile", img: "codmobile_tile.jpg" },
  { id: "valorant", name: "Valorant", img: "valorant_tile.jpg" },
];

const PACKAGES = [
  { label: "60 Diamonds", amount: "S$1.29" },
  { label: "100 Diamonds", amount: "S$1.79" },
  { label: "250 Diamonds", amount: "S$3.49" },
  { label: "500 Diamonds", amount: "S$5.99" },
  { label: "1000 Diamonds", amount: "S$10.99" },
  { label: "2000 Diamonds", amount: "S$20.99" },
  { label: "4100 Diamonds", amount: "S$40.99" },
];

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "paynow", label: "PayNow" },
  { id: "paypal", label: "PayPal" },
  { id: "card", label: "Debit/Credit Card" }, // only actionable
  { id: "netbank", label: "Net Banking" },
  { id: "grabpay", label: "GrabPay" },
];

// ---- State ----
let selectedGame = null;
let orderState = {
  playerId: "",
  serverId: "",
  package: null,
  method: null,
  txnId: "",
  dateISO: "",
};

// Helpers
const $ = sel => document.querySelector(sel);
const app = () => $("#app");
const setYear = () => ($("#year").textContent = String(new Date().getFullYear()));
const fmtDateTime = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString(undefined, { hour12: true });
};
const randomTxn = () => "NTU" + Math.random().toString(36).slice(2, 10).toUpperCase();

// LocalStorage
const LS_KEY = "novatopup_history";
const getHistory = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
};
const pushHistory = (entry) => {
  const list = getHistory();
  list.unshift(entry);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
};

// ---- Views ----
function viewHome(){
  const cards = GAMES.map(g => `
    <button class="card card-hover" onclick="navigateToRecharge('${g.id}')">
      <img src="images/${g.img}" alt="${g.name}" class="game-thumb w-full">
      <div class="game-card-title">${g.name}</div>
      <div class="text-slate-400 text-sm">Top up instantly in SGD</div>
    </button>
  `).join("");

  return `
    <section class="mb-8 text-center">
      <h1 class="text-4xl font-extrabold tracking-tight">Power up your games instantly</h1>
      <p class="text-slate-400 mt-4">Choose a game below to begin your top-up.</p>
    </section>
    <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      ${cards}
    </section>
    <section class="mt-16">
      <div class="card">
        <h3 class="text-xl font-bold mb-3">Why NovaTopUp?</h3>
        <ul class="text-slate-300">
          <li>• Secure checkout with multiple payment options</li>
          <li>• Transparent SGD pricing</li>
          <li>• Order receipts and local history</li>
          <li>• Mobile-first, works offline</li>
        </ul>
      </div>
    </section>
  `;
}

function viewRecharge(){
  if(!selectedGame){ return viewNotFound(); }
  const pkgOpts = PACKAGES.map(p => `<option value="${p.label}|${p.amount}">${p.label} — ${p.amount}</option>`).join("");

  return `
    <section class="grid gap-6">
      <div class="flex items-center gap-4">
        <img src="images/${selectedGame.img}" alt="${selectedGame.name}" style="width:64px;height:64px;border-radius:16px">
        <div>
          <h2 class="text-3xl font-extrabold">${selectedGame.name}</h2>
          <div class="text-slate-400">Enter your Player ID & Server ID, then select a package.</div>
        </div>
      </div>

      <div class="grid gap-6">
        <div class="card">
          <div class="grid gap-4">
            <div>
              <label class="label">Player ID</label>
              <input id="playerId" class="input" placeholder="e.g. 1234567890">
            </div>
            <div>
              <label class="label">Server ID</label>
              <input id="serverId" class="input" placeholder="e.g. 1234">
            </div>
            <button class="btn w-full mt-4" id="checkBtn">Check Account</button>
            <div id="acctStatus" class="hidden mt-2 text-green">✅ Account Found</div>
          </div>
        </div>

        <div class="card">
          <div class="grid gap-4">
            <div>
              <label class="label">Diamond Package</label>
              <select id="pkg" class="select">
                <option value="">Select a package</option>
                ${pkgOpts}
              </select>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="text-lg font-bold mb-3">Choose a payment method</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            ${PAYMENT_METHODS.map(m => `
              <button class="btn-ghost card card-hover" onclick="selectPayment('${m.id}')">
                <div class="text-center">
                  <div class="font-bold mb-2">${m.label}</div>
                  <div class="text-slate-400 text-sm">Instant checkout</div>
                </div>
              </button>
            `).join("")}
          </div>
          <div id="pmNote" class="mt-4 text-slate-400 text-sm"></div>
        </div>

        <div class="flex gap-4">
          <button class="btn" onclick="proceedPayment()">Continue</button>
          <a href="#/" class="btn-ghost">Back</a>
        </div>
      </div>
    </section>
  `;
}

function viewCardPayment(){
  return `
    <section class="grid gap-6">
      <div class="card">
        <h2 class="text-2xl font-extrabold mb-4">Card Payment</h2>
        <div class="grid gap-4">
          <div>
            <label class="label">Card Number</label>
            <input id="cardNumber" class="input" placeholder="4111 1111 1111 1111">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Expiry</label>
              <input id="cardExpiry" class="input" placeholder="MM/YY">
            </div>
            <div>
              <label class="label">CVV</label>
              <input id="cardCVV" class="input" placeholder="123">
            </div>
          </div>
          <button class="btn w-full mt-4" onclick="payNow()">Pay Now</button>
          <div class="text-slate-400 text-sm mt-2">All cards are securely processed.</div>
        </div>
      </div>
      <div class="card">
        <h3 class="text-lg font-bold mb-2">Order summary</h3>
        <div id="orderSummary" class="text-slate-300"></div>
      </div>
    </section>
  `;
}

function viewProcessing(){
  return `
    <section class="text-center">
      <div class="spinner"></div>
      <h2 class="text-2xl font-extrabold mt-6">Processing Payment…</h2>
      <p class="text-slate-400 mt-2">Please wait while we confirm your transaction.</p>
    </section>
  `;
}

function viewSuccess(){
  const game = selectedGame;
  const pkg = orderState.package?.label || "-";
  const amt = orderState.package?.amount || "-";
  const method = orderState.methodLabel || "-";
  const date = fmtDateTime(orderState.dateISO);

  return `
    <section class="grid gap-6">
      <div class="text-center">
        <div class="text-4xl">✅</div>
        <h2 class="text-2xl font-extrabold mt-2">Payment Successful</h2>
        <p class="text-slate-400">Your purchase has been successfully processed. The diamonds will be delivered to your account within 7 days.</p>
      </div>
      <div class="card">
        <div class="flex items-center gap-4 mb-4">
          <img src="images/${game.img}" alt="${game.name}" style="width:56px;height:56px;border-radius:14px">
          <div>
            <div class="font-bold">${game.name}</div>
            <div class="text-slate-400 text-sm">Transaction Receipt</div>
          </div>
        </div>
        <div class="grid gap-2 text-slate-300">
          <div><span class="text-slate-400">Transaction ID:</span> <span class="badge">${orderState.txnId}</span></div>
          <div><span class="text-slate-400">Date/Time:</span> ${date}</div>
          <div><span class="text-slate-400">Package:</span> ${pkg}</div>
          <div><span class="text-slate-400">Amount:</span> ${amt} (SGD)</div>
          <div><span class="text-slate-400">Payment Method:</span> ${method}</div>
        </div>
      </div>
      <div class="flex gap-4">
        <a href="#/" class="btn">Back to Home</a>
        <a href="#/history" class="btn-ghost">View History</a>
      </div>
    </section>
  `;
}

function viewHistory(){
  const rows = getHistory().map(h => `
    <tr>
      <td>${h.game}</td>
      <td>${h.pkg}</td>
      <td>${h.amount}</td>
      <td><span class="badge">${h.txnId}</span></td>
      <td>${fmtDateTime(h.dateISO)}</td>
    </tr>
  `).join("");
  return `
    <section class="grid gap-6">
      <h2 class="text-3xl font-extrabold">Recharge History</h2>
      ${rows ? `
        <div class="card">
          <table class="table">
            <thead><tr>
              <th>Game</th><th>Package</th><th>Amount</th><th>Transaction ID</th><th>Date</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : `
        <div class="card text-center text-slate-400">No orders yet.</div>
      `}
    </section>
  `;
}

const viewStatic = (title, content) => `
  <section class="grid gap-4">
    <h2 class="text-3xl font-extrabold">${title}</h2>
    <div class="card text-slate-300">${content}</div>
  </section>`;

function viewNotFound(){
  return viewStatic("Not Found", "The page you’re looking for doesn’t exist.");
}

// ---- Actions ----
window.navigateToRecharge = (gameId) => {
  const g = GAMES.find(x => x.id === gameId);
  if(!g) return;
  selectedGame = g;
  location.hash = `#/recharge?game=${gameId}`;
};

window.selectPayment = (methodId) => {
  const m = PAYMENT_METHODS.find(x => x.id === methodId);
  orderState.method = methodId;
  orderState.methodLabel = m?.label || "";
  const note = $("#pmNote");
  if(methodId === "card"){
    note.textContent = "Proceeding with secure card checkout.";
  }else{
    note.textContent = `${m.label} is temporarily unavailable. Please use Debit/Credit Card to continue.`;
  }
};

window.proceedPayment = () => {
  const playerId = $("#playerId")?.value?.trim();
  const serverId = $("#serverId")?.value?.trim();
  const pkgVal = $("#pkg")?.value;


  if(!playerId || !serverId || !pkgVal){
    alert("Please enter Player ID, Server ID, and select a package.");
    return;
  }
  const [label, amount] = pkgVal.split("|");
  orderState.playerId = playerId;
  orderState.serverId = serverId;
  orderState.package = { label, amount };

  if(orderState.method !== "card"){
    alert("Please select Debit/Credit Card to continue.");
    return;
  }
  location.hash = "#/pay";
};

window.payNow = () => {
  // Basic non-strict validation: any non-empty entries pass
  const num = $("#cardNumber").value.trim();
  const exp = $("#cardExpiry").value.trim();
  const cvv = $("#cardCVV").value.trim();
  if(!num || !exp || !cvv){
    alert("Please fill in card details.");
    return;
  }
  location.hash = "#/processing";

  // Simulate processing then route to success
  setTimeout(() => {
    orderState.txnId = randomTxn();
    orderState.dateISO = new Date().toISOString();
    const entry = {
      game: selectedGame?.name || "-",
      pkg: orderState.package?.label || "-",
      amount: orderState.package?.amount || "-",
      method: orderState.methodLabel || "-",
      txnId: orderState.txnId,
      dateISO: orderState.dateISO,
    };
    pushHistory(entry);
    location.hash = "#/success";
  }, 3000);
};

// ---- Router ----
function parseHash(){
  const raw = location.hash || "#/";
  const [path] = raw.split("?");
  const params = new URLSearchParams(raw.split("?")[1] || "");
  return { path, params };
}

function render(){
  const root = app();
  const { path, params } = parseHash();

  if(path === "#/"){
    root.innerHTML = viewHome();
  } else if(path === "#/recharge"){
    const gameId = params.get("game");
    if(gameId && (!selectedGame || selectedGame.id !== gameId)){
      const g = GAMES.find(x => x.id === gameId);
      if(g) selectedGame = g;
    }
    root.innerHTML = viewRecharge();
    // attach check account click after render
    $("#checkBtn")?.addEventListener("click", () => {
      $("#acctStatus")?.classList?.remove("hidden");
    });
  } else if(path === "#/pay"){
    root.innerHTML = viewCardPayment();
    // populate order summary
    const summaryEl = $("#orderSummary");
    if(summaryEl && orderState.package){
      summaryEl.innerHTML = `
        <div><span class="text-slate-400">Game:</span> ${selectedGame?.name}</div>
        <div><span class="text-slate-400">Package:</span> ${orderState.package.label}</div>
        <div><span class="text-slate-400">Amount:</span> ${orderState.package.amount}</div>
        <div><span class="text-slate-400">Payment:</span> ${orderState.methodLabel}</div>
      `;
    }
  } else if(path === "#/processing"){
    root.innerHTML = viewProcessing();
  } else if(path === "#/success"){
    root.innerHTML = viewSuccess();
  } else if(path === "#/history"){
    root.innerHTML = viewHistory();
  } else if(path === "#/about"){
    root.innerHTML = viewStatic("About", "NovaTopUp provides a streamlined checkout experience for game credits with transparent SGD pricing and clear receipts.");
  } else if(path === "#/contact"){
    root.innerHTML = viewStatic("Contact", "For assistance, click the Support/Help button or email support@novatopup.example");
  } else if(path === "#/terms"){
    root.innerHTML = viewStatic("Terms", "Use of this service is subject to standard terms of sale and acceptable use policies.");
  } else if(path === "#/help"){
    root.innerHTML = viewStatic("Help Center", "Find answers to common questions about payments, orders, and account checks.");
  } else if(path === "#/payment"){
    root.innerHTML = viewStatic("Payment Methods", "We display multiple payment options. For seamless checkout, use Debit/Credit Card.");
  } else if(path === "#/privacy"){
    root.innerHTML = viewStatic("Privacy Policy", "We respect your privacy and only store order history locally in your browser.");
  } else if(path === "#/cookie"){
    root.innerHTML = viewStatic("Cookie Policy", "Local storage is used to keep a record of your past top-ups on this device.");
  } else if(path === "#/refunds"){
    root.innerHTML = viewStatic("Refund Policy", "All transactions are final once processed, except where required by law.");
  } else {
    root.innerHTML = viewNotFound();
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("load", () => {
  setYear();
  render();
  // Help button toast
  const btn = document.getElementById("helpBtn");
  btn?.addEventListener("click", () => {
    alert("Support is currently available via email: support@novatopup.example");
  });
});
