// js/home.js

// 1. EXACT ORIGINAL SIDEBAR HTML STRUCTURE (WITH FORCE-HIDDEN DESKTOP CLOSE BUTTON)
const sidebarHTML = `
  <aside id="sidebar" class="sidebar flex flex-col justify-between px-5 py-6">
    <div>
      <div class="flex items-center justify-between mb-10">
        <a href="back2owner landing page.html" class="logo-box inline-block px-4 py-2">BACK<span class="text-accent">2</span>OWNER</a>
        
        <!-- Mobile Close Button (Force Hidden on Desktop using !important modifiers) -->
        <button id="sidebarCloseToggle" class="!hidden max-lg:!block icon-btn p-1 text-slate-600 hover:text-slate-900" aria-label="Close menu">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="flex flex-col gap-3" aria-label="Main navigation">
        <a href="back2owner home page.html" class="side-link is-active" data-nav>
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
          <span class="avatar-initials">AK</span>
          <img src="images/person.jpg" alt="" class="avatar-img" data-fallback />
        </span>
        <span class="user-name">Abuka kingsley</span>
        <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Verified">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
    </div>
  </aside>
`;

// 2. INJECT SIDEBAR INTO PLACEHOLDER
const sidebarContainer = document.getElementById('sidebar-container');
if (sidebarContainer) {
  sidebarContainer.outerHTML = sidebarHTML;
}

// 3. ROBUST HAMBURGER, CLOSE BUTTON & OVERLAY TOGGLE
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
  
  if (window.innerWidth < 1024) {
    sidebar.style.transform = 'translateX(-100%)';
  }
  sidebarOverlay.style.display = 'none';
  sidebarOverlay.style.opacity = '0';
}

if (menuToggle) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = sidebar.classList.contains('active') || sidebar.style.transform === 'translateX(0px)';
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

if (sidebarCloseToggle) {
  sidebarCloseToggle.addEventListener('click', closeMenu);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeMenu);
}

// Reset desktop transforms on resize
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) {
    sidebar.style.transform = '';
    sidebarOverlay.style.display = 'none';
  }
});

// 4. REUSABLE ITEM CARD TEMPLATE
function createItemCard(imageSrc, title, location, status, timeAgo) {
  return `
    <article class="item-card" data-item>
      <div class="card-image">
        <img src="${imageSrc}" alt="${title}" data-fallback />
      </div>
      <div class="flex items-center justify-between mt-4">
        <span class="badge-${status.toLowerCase()}">${status}</span>
        <span class="card-time">${timeAgo}</span>
      </div>
      <h3 class="card-title mt-3" data-title>${title}</h3>
      <p class="card-location mt-2" data-location>
        <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
        ${location}
      </p>
      <button class="btn-orange btn-details w-full mt-5 py-3">View Details</button>
    </article>
  `;
}

// 5. RENDER CARDS INTO THE GRID
const itemsGrid = document.getElementById('itemsGrid');
if (itemsGrid) {
  const itemsData = [
    { img: "images/card 4.jpg", title: "OAU Student ID Card & Pocket Wallet", loc: "Amphitheatre / Oduduwa Hall area", status: "LOST", time: "2 hours ago" },
    { img: "images/card 5.jpg", title: "Casio fx-991ES Plus (Missing from BOOC row 6)", loc: "Faculty of Technology", status: "LOST", time: "2 hours ago" },
    { img: "images/card 6.jpg", title: "Black Sharp Scientific Calculator EL-W531TH", loc: "White House", status: "LOST", time: "2 hours ago" },
    { img: "images/card 6.jpg", title: "Black Sharp Scientific Calculator EL-W531TH", loc: "White House", status: "LOST", time: "2 hours ago" },
    { img: "images/card 6.jpg", title: "Black Sharp Scientific Calculator EL-W531TH", loc: "White House", status: "LOST", time: "2 hours ago" },
    { img: "images/card 6.jpg", title: "Black Sharp Scientific Calculator EL-W531TH", loc: "White House", status: "LOST", time: "2 hours ago" }
  ];

  itemsGrid.innerHTML = itemsData.map(item => 
    createItemCard(item.img, item.title, item.loc, item.status, item.time)
  ).join('');

  const shownCount = document.getElementById('shownCount');
  if (shownCount) shownCount.textContent = itemsData.length;
}