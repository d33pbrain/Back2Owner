// js/notifications.js
(function () {
  const NOTIFICATIONS_API_URL = `${CONFIG.API_BASE_URL}/api/notifications/`;
  const NOTIFICATIONS_PAGE = "back2owner notifications page.html";
  const CLAIM_PAGE = "back2owner claim review page.html";
  const CHAT_PAGE = "back2owner chat page.html";

  let notifications = [];
  let activeTab = "all";
  let timeframe = 0; // Default to all time when fetching from server
  let compact = false;
  let searchQuery = "";

  const TABS = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "CLAIM_SUBMITTED", label: "Claims" },
    { key: "MATCH_FOUND", label: "Matches" },
    { key: "RECOVERY_PENDING", label: "Recovery" },
    { key: "NEW_MESSAGE", label: "Messages" }
  ];

  const TIMEFRAMES = [
    { days: 7, label: "Past 7 Days" },
    { days: 30, label: "Past 30 Days" },
    { days: 0, label: "All Time" }
  ];

  const notifList = document.getElementById("notifList");
  const filterPanel = document.getElementById("filterPanel");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");

  if (!notifList || !filterPanel) return;

  function escapeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(dateString) {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffMins < 60) {
      return `${Math.max(1, diffMins)} mins ago • ${timeStr}`;
    } else if (diffHours < 24) {
      return `${diffHours} hrs ago • ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday • ${timeStr}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago • ${timeStr}`;
    } else {
      return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${timeStr}`;
    }
  }

  function getDaysAgo(dateString) {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / 86400000);
  }

  function inTimeframe(item) {
    if (timeframe === 0) return true;
    return getDaysAgo(item.created_at) <= timeframe;
  }

  function matchesTab(item, tab) {
    if (tab === "all") return true;
    if (tab === "unread") return !item.is_read;
    return item.category === tab;
  }

  function matchesQuery(item) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const title = item.formatted_title || item.title_prefix || "";
    const body = item.body || "";
    return `${title} ${body}`.toLowerCase().includes(query);
  }

  function getVisible() {
    return notifications.filter((item) => inTimeframe(item) && matchesTab(item, activeTab) && matchesQuery(item));
  }

  function countFor(tab) {
    return notifications.filter((item) => inTimeframe(item) && matchesTab(item, tab)).length;
  }

  function createTabs() {
    return TABS.map((tab) => `
      <button class="filter-tab${tab.key === activeTab ? " is-active" : ""}" data-tab="${tab.key}">
        <span class="count">${countFor(tab.key)}</span>${tab.label}
      </button>
    `).join("");
  }

  function createFilterPanel() {
    const options = TIMEFRAMES
      .map((t) => `<option value="${t.days}"${t.days === timeframe ? " selected" : ""}>${t.label}</option>`)
      .join("");

    return `
      <div class="filter-tabs" role="tablist">${createTabs()}</div>
      <div class="filter-extras">
        <label class="filter-select">
          <span>Timeframe:</span>
          <select id="timeframeSelect">${options}</select>
        </label>
        <div class="view-toggle" role="group" aria-label="Notification density">
          <button data-view="detailed" class="${compact ? "" : "is-active"}">Detailed</button>
          <button data-view="compact" class="${compact ? "is-active" : ""}">Compact</button>
        </div>
      </div>
    `;
  }

  function createCard(item) {
    const state = item.is_read ? "is-read" : "is-unread";
    const toggleLabel = item.is_read ? "Mark as unread" : "Mark as read";
    const formattedTitle = item.formatted_title || (item.item_title ? `${item.title_prefix}: ${item.item_title}` : item.title_prefix);
    const timeFormatted = formatTime(item.created_at);
    const initials = item.actor_initials || "SY";

    return `
      <article class="notif-card ${state} cursor-pointer transition-shadow hover:shadow-md" data-id="${item.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            ${!item.is_read ? `<span class="badge-initials flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-extrabold text-white shrink-0 mt-0.5" title="Unread">${escapeHTML(initials)}</span>` : ''}
            <div class="min-w-0 flex-1">
              <h2 class="notif-title font-semibold text-slate-900 text-sm line-clamp-1">${escapeHTML(formattedTitle)}</h2>
              <span class="notif-time text-xs text-slate-400 block mt-0.5">${escapeHTML(timeFormatted)}</span>
              <p class="notif-text text-xs text-slate-600 mt-2 line-clamp-2">${escapeHTML(item.body)}</p>
            </div>
          </div>

          <div class="pop-wrap relative shrink-0">
            <button class="dots-btn p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100" data-action="menu" aria-label="More options" aria-haspopup="true">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>
              </svg>
            </button>
            <div class="pop-menu hidden absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-20 p-1">
              <button data-action="toggle-read" class="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded text-slate-700 font-medium flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 13 4 4L14 8M10 15l2 2 8-9"/></svg>
                ${toggleLabel}
              </button>
              <button data-action="delete" class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded font-medium flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function createEmptyState() {
    const text = searchQuery.trim()
      ? `No notifications match “${escapeHTML(searchQuery)}”. Check the spelling and try again.`
      : "No new alerts in this filter view. You will receive real-time notices when claims are filed, automated matches trigger, or verification desk handovers occur.";

    return `
      <div class="empty-card text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
        <svg class="h-8 w-8 mx-auto text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0"/><path d="M10.5 9.5h3l-3 3h3"/>
        </svg>
        <h2 class="empty-title text-base font-bold text-slate-800">You’re all caught up</h2>
        <p class="empty-text text-xs text-slate-500 mt-1 max-w-md mx-auto">${text}</p>
      </div>
    `;
  }

  function renderPanel() {
    filterPanel.innerHTML = createFilterPanel();
  }

  function renderList() {
    const visible = getVisible();
    notifList.classList.toggle("is-compact", compact);
    notifList.innerHTML = visible.length ? visible.map(createCard).join("") : createEmptyState();
  }

  function render() {
    renderPanel();
    renderList();
  }

  function closeMenus() {
    notifList.querySelectorAll(".pop-menu").forEach((menu) => menu.classList.add("hidden"));
  }

  function setPanelOpen(open) {
    filterPanel.classList.toggle("is-open", open);
    filterBtn.setAttribute("aria-expanded", String(open));
  }

  function markActiveLink() {
    document.querySelectorAll(".side-link[data-nav]").forEach((link) => {
      const label = link.querySelector("span")?.textContent.trim();
      const isThisPage = label === "Notifications";
      link.classList.toggle("is-active", isThisPage);
      const icon = link.querySelector(".nav-icon");
      if (isThisPage) {
        link.setAttribute("href", NOTIFICATIONS_PAGE);
        if (icon) icon.setAttribute("fill", "currentColor");
      }
    });
  }

  // --- API FETCH: NOTIFICATIONS ---
  async function fetchNotifications() {
    notifList.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-slate-500">
        <svg class="w-8 h-8 animate-spin text-brand mb-2" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p class="text-sm font-medium">Loading notifications...</p>
      </div>
    `;

    const token = localStorage.getItem("access_token");
    if (!token) {
      notifList.innerHTML = `
        <div class="text-center py-12 text-slate-600">
          Please <a href="back2owner sign in page.html" class="text-brand font-bold underline">sign in</a> to view your notifications.
        </div>
      `;
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    };

    try {
      const response = await fetch(NOTIFICATIONS_API_URL, { method: "GET", headers });

      if (response.ok) {
        notifications = await response.json();
        render();
      } else if (response.status === 401) {
        notifList.innerHTML = `
          <div class="text-center py-12 text-slate-600">
            Session expired. Please <a href="back2owner sign in page.html" class="text-brand font-bold underline">sign in again</a>.
          </div>
        `;
      } else {
        notifList.innerHTML = `<p class="text-center py-10 text-red-500 font-medium">Failed to load notifications (Status ${response.status}).</p>`;
      }
    } catch (err) {
      console.error("Fetch Notifications Error:", err);
      notifList.innerHTML = `<p class="text-center py-10 text-red-500 font-medium">Unable to connect to backend server.</p>`;
    }
  }

  // --- API ACTION: MARK AS READ ---
  async function markNotificationAsRead(notifId) {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      await fetch(`${NOTIFICATIONS_API_URL}${notifId}/mark-read/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Mark read error:", err);
    }
  }

  // --- ROUTING HANDLER FOR NOTIFICATION SELECTION ---
  function handleNotificationClick(item) {
    // 1. Mark as read on backend if unread
    if (!item.is_read) {
      item.is_read = true;
      markNotificationAsRead(item.id);
    }

    // 2. Priority Navigation based on target IDs available
    if (item.target_claim_id) {
      window.location.href = `${CLAIM_PAGE}?claim_id=${item.target_claim_id}`;
    } else if (item.target_item_id) {
      window.location.href = `${CLAIM_PAGE}?id=${item.target_item_id}`;
    } else if (item.target_conversation_id) {
      window.location.href = `${CHAT_PAGE}?conversation_id=${item.target_conversation_id}`;
    } else {
      render();
    }
  }

  // --- EVENT LISTENERS ---
  filterBtn.addEventListener("click", () => {
    setPanelOpen(!filterPanel.classList.contains("is-open"));
  });

  filterPanel.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-tab]");
    if (tabBtn) {
      activeTab = tabBtn.dataset.tab;
      render();
      return;
    }

    const viewBtn = event.target.closest("[data-view]");
    if (viewBtn) {
      compact = viewBtn.dataset.view === "compact";
      render();
    }
  });

  filterPanel.addEventListener("change", (event) => {
    if (event.target.id === "timeframeSelect") {
      timeframe = Number(event.target.value);
      render();
    }
  });

  notifList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    const item = notifications.find((n) => n.id === card.dataset.id);
    if (!item) return;

    const actionBtn = event.target.closest("[data-action]");

    // Click on card body (Navigation)
    if (!actionBtn) {
      if (event.target.closest(".pop-wrap")) return;
      handleNotificationClick(item);
      return;
    }

    // Click on context menu action
    switch (actionBtn.dataset.action) {
      case "menu": {
        const menu = card.querySelector(".pop-menu");
        const isHidden = menu.classList.contains("hidden");
        closeMenus();
        if (isHidden) menu.classList.remove("hidden");
        break;
      }

      case "toggle-read":
        item.is_read = !item.is_read;
        if (item.is_read) markNotificationAsRead(item.id);
        render();
        break;

      case "delete":
        notifications.splice(notifications.indexOf(item), 1);
        render();
        break;
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".pop-wrap")) closeMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      renderList();
    });
  }

  markActiveLink();
  fetchNotifications();
})();