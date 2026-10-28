// js/home.js

// 1. API CONFIGURATION & STATE
const ITEMS_API_URL = "http://127.0.0.1:8000/api/items/reports/";
const CLAIMS_API_URL = "http://127.0.0.1:8000/api/items/claims/";

let allItems = [];
let allClaims = [];

// 2. EXACT SIDEBAR HTML STRUCTURE
const sidebarHTML = `
  <aside id="sidebar" class="sidebar flex flex-col justify-between px-5 py-6">
    <div>
      <div class="flex items-center justify-between mb-10">
        <a href="back2owner landing page.html" class="logo-box inline-block px-4 py-2">BACK<span class="text-accent">2</span>OWNER</a>
        
        <!-- Mobile Close Button -->
        <button id="sidebarCloseToggle" class="!hidden max-lg:!block icon-btn p-1 text-slate-600 hover:text-slate-900" aria-label="Close menu">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="flex flex-col gap-3" aria-label="Main navigation">
        <a href="back2owner home page.html" class="side-link" data-nav>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 2.5 11.2a1 1 0 0 0 1.3 1.5L5 11.7V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-8.3l1.2 1a1 1 0 0 0 1.3-1.5L12 3Z"/></svg>
          <span>Home</span>
        </a>
        <a href="back2owner my reports page.html" class="side-link" data-nav>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M12 10v4M12 17h.01"/></svg>
          <span>My Reports</span>
        </a>
        <a href="back2owner messages page.html" class="side-link" data-nav>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.3A8.5 8.5 0 1 1 21 11.5Z"/></svg>
          <span>Messages</span>
        </a>
        <a href="back2owner notifications page.html" class="side-link" data-nav>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-6"/><circle cx="18" cy="6" r="2.5"/></svg>
          <span>Notifications</span>
        </a>
        <a href="#" class="side-link" data-nav>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
          <span>Profile</span>
        </a>
      </nav>

      <div class="user-chip flex items-center gap-2 mt-6 px-4 py-3">
        <span class="avatar">
          <span class="avatar-initials" id="userInitials">UO</span>
          <img src="images/person.jpg" alt="" class="avatar-img" data-fallback />
        </span>
        <span class="user-name" id="userName">User</span>
        <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Verified">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
    </div>
  </aside>
`;

// 3. INJECT SIDEBAR & ROUTE HIGHLIGHTING
const sidebarContainer = document.getElementById('sidebar-container');
if (sidebarContainer) {
  sidebarContainer.outerHTML = sidebarHTML;

  const currentFilename = decodeURIComponent(window.location.pathname.split('/').pop().toLowerCase());

  document.querySelectorAll('#sidebar .side-link[data-nav]').forEach((link) => {
    const linkHref = link.getAttribute('href');
    if (!linkHref) return;

    const linkFilename = decodeURIComponent(linkHref.split('/').pop().toLowerCase());

    if (currentFilename === linkFilename || (currentFilename === "" && linkFilename.includes("home"))) {
      link.classList.add('is-active');
    } else {
      link.classList.remove('is-active');
    }
  });

  const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
  if (userInfo.full_name) {
    const userNameEl = document.getElementById("userName");
    const userInitialsEl = document.getElementById("userInitials");
    if (userNameEl) userNameEl.textContent = userInfo.full_name;
    if (userInitialsEl) {
      const initials = userInfo.full_name.split(" ").map(n => n[0]).join("").toUpperCase();
      userInitialsEl.textContent = initials.slice(0, 2);
    }
  }
}

// 4. SIDEBAR TOGGLES
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarCloseToggle = document.getElementById('sidebarCloseToggle');

function openMenu() {
  if (!sidebar || !sidebarOverlay) return;
  sidebar.classList.add('active', 'is-open');
  sidebarOverlay.classList.add('active', 'is-open');
  sidebar.style.transform = 'translateX(0)';
  sidebarOverlay.style.display = 'block';
  sidebarOverlay.style.opacity = '1';
}

function closeMenu() {
  if (!sidebar || !sidebarOverlay) return;
  sidebar.classList.remove('active', 'is-open');
  sidebarOverlay.classList.remove('active', 'is-open');
  if (window.innerWidth < 1024) sidebar.style.transform = 'translateX(-100%)';
  sidebarOverlay.style.display = 'none';
  sidebarOverlay.style.opacity = '0';
}

if (menuToggle) menuToggle.addEventListener('click', (e) => { e.stopPropagation(); openMenu(); });
if (sidebarCloseToggle) sidebarCloseToggle.addEventListener('click', closeMenu);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMenu);

window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024 && sidebar) {
    sidebar.style.transform = '';
    sidebarOverlay.style.display = 'none';
  }
});

// 5. HELPER FUNCTIONS
function timeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// 6. CARD RENDERING (REPORTS & CLAIMS/OFFERS)
function createItemCard(item) {
  const imageSrc = (item.images && item.images.length > 0 && item.images[0].image_url)
    ? item.images[0].image_url
    : "images/card 4.jpg";

  const location = item.specific_location_details || "Campus Landmark";
  const status = item.report_type || "LOST";
  const formattedTime = timeAgo(item.created_at || item.date_lost);

  return `
    <article class="item-card flex flex-col justify-between" data-item-id="${item.id}">
      <div>
        <div class="card-image overflow-hidden rounded-xl h-[180px] bg-gray-100">
          <img src="${imageSrc}" alt="${item.title}" class="w-full h-full object-cover" onerror="this.src='images/card 4.jpg'" />
        </div>
        <div class="flex items-center justify-between mt-4">
          <span class="badge-${status.toLowerCase()} text-xs font-bold px-2.5 py-1 rounded-full ${status === 'FOUND' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${status}</span>
          <span class="card-time text-xs text-gray-400 font-medium">${formattedTime}</span>
        </div>
        <h3 class="card-title mt-3 font-semibold text-[#151C25] text-base line-clamp-2" title="${item.title}">${item.title}</h3>
        <p class="card-location mt-2 text-xs text-gray-500 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
          ${location}
        </p>
      </div>
      <button class="btn-orange btn-details w-full mt-5 py-3 rounded-xl text-sm font-semibold transition-transform active:scale-95" onclick="navigateToDetails('${item.id}', false)">View Details</button>
    </article>
  `;
}

function createClaimCard(claim, targetItem) {
  const isOffer = targetItem && targetItem.report_type === "LOST";
  const badgeLabel = isOffer ? "OFFER TO RETURN" : "CLAIM SUBMITTED";
  const badgeStyle = isOffer ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";
  const formattedTime = timeAgo(claim.created_at);

  return `
    <article class="item-card flex flex-col justify-between border-2 border-brand/20 bg-amber-50/20" data-claim-id="${claim.id}">
      <div>
        <div class="card-image overflow-hidden rounded-xl h-[180px] bg-gray-100 relative">
          <img src="images/card 5.jpg" alt="${claim.item_title}" class="w-full h-full object-cover" onerror="this.src='images/card 4.jpg'" />
          <span class="absolute top-2 right-2 text-[10px] font-extrabold px-2 py-1 rounded ${badgeStyle}">${badgeLabel}</span>
        </div>
        <div class="flex items-center justify-between mt-4">
          <span class="text-xs font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">${claim.status}</span>
          <span class="card-time text-xs text-gray-400 font-medium">${formattedTime}</span>
        </div>
        <h3 class="card-title mt-3 font-semibold text-[#151C25] text-base line-clamp-2" title="${claim.item_title}">${claim.item_title}</h3>
        <p class="card-location mt-2 text-xs text-gray-600">
          <strong class="font-semibold text-gray-800">${claim.claimant_name}:</strong> "${claim.verification_reason}"
        </p>
      </div>
      <button class="btn-orange btn-details w-full mt-5 py-3 rounded-xl text-sm font-semibold transition-transform active:scale-95" onclick="navigateToDetails('${claim.id}', true)">View ${isOffer ? 'Offer' : 'Claim'} Details</button>
    </article>
  `;
}

function navigateToDetails(id, isClaim = false) {
  const param = isClaim ? `claim_id=${id}` : `id=${id}`;
  window.location.href = `back2owner claim review page.html?${param}`;
}

// 7. RENDER GRID
function renderAllGridItems(items, claims) {
  const itemsGrid = document.getElementById('itemsGrid');
  const emptyMessage = document.getElementById('emptyMessage');
  const shownCount = document.getElementById('shownCount');
  const totalCount = document.getElementById('totalCount');

  if (!itemsGrid) return;

  const totalLength = items.length + claims.length;

  if (totalLength === 0) {
    itemsGrid.innerHTML = "";
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    if (shownCount) shownCount.textContent = "0";
    if (totalCount) totalCount.textContent = "0";
    return;
  }

  if (emptyMessage) emptyMessage.classList.add('hidden');

  const reportCardsHTML = items.map(item => createItemCard(item)).join('');
  const claimCardsHTML = claims.map(claim => {
    const targetItem = items.find(i => i.id === claim.item);
    return createClaimCard(claim, targetItem);
  }).join('');

  itemsGrid.innerHTML = claimCardsHTML + reportCardsHTML;

  if (shownCount) shownCount.textContent = totalLength;
  if (totalCount) totalCount.textContent = totalLength;
}

// 8. FETCH DATA FROM BACKEND API
async function fetchHomeData() {
  const itemsGrid = document.getElementById('itemsGrid');
  if (!itemsGrid) return;

  itemsGrid.innerHTML = `
    <div class="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
      <svg class="w-8 h-8 animate-spin text-brand mb-2" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      <p class="text-sm font-medium">Fetching campus items & claims...</p>
    </div>
  `;

  const token = localStorage.getItem("access_token");
  const headers = { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    // 1. Fetch Public Reports (Always succeeds for browsable items)
    const reportsRes = await fetch(ITEMS_API_URL, { method: "GET", headers });
    allItems = reportsRes.ok ? await reportsRes.json() : [];

    // 2. Fetch User Claims (Only if authenticated)
    if (token) {
      const claimsRes = await fetch(CLAIMS_API_URL, { method: "GET", headers });
      if (claimsRes.ok) {
        allClaims = await claimsRes.json();
      } else {
        console.warn(`[Claims API Status ${claimsRes.status}]: User session unverified or unauthorized for claims list.`);
        allClaims = [];
      }
    } else {
      allClaims = [];
    }

    renderAllGridItems(allItems, allClaims);
  } catch (error) {
    console.error("Home Data Fetch Error:", error);
    if (itemsGrid) {
      itemsGrid.innerHTML = `
        <div class="col-span-full text-center py-10 text-red-500 font-medium text-sm">
          Unable to connect to backend server.
        </div>
      `;
    }
  }
}

// 9. INITIALIZE PAGE
document.addEventListener("DOMContentLoaded", () => {
  fetchHomeData();

  const searchInput = document.getElementById('searchInput');
  if (searchInput && document.getElementById('itemsGrid')) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filteredItems = allItems.filter(item =>
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.specific_location_details && item.specific_location_details.toLowerCase().includes(query))
      );
      const filteredClaims = allClaims.filter(claim =>
        (claim.item_title && claim.item_title.toLowerCase().includes(query)) ||
        (claim.claimant_name && claim.claimant_name.toLowerCase().includes(query))
      );
      renderAllGridItems(filteredItems, filteredClaims);
    });
  }
});