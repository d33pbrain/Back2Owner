(function () {
  const NOTIFICATIONS_PAGE = "back2owner notifications page.html";

  const notifications = [
    {
      id: "n-1",
      category: "claim",
      title: "New Ownership Claim Submitted: Casio fx-991ES Plus Calculator",
      text: "Olawale A. provided 3 identifying verification marks (engraved name initials on battery bay, blue casing sticker) for your review.",
      when: "10 mins ago • 2:25 PM",
      daysAgo: 0,
      unread: true,
    },
    {
      id: "n-2",
      category: "match",
      title: "Potential Match Found: Black Leather Bi-Fold Wallet",
      text: "An item closely matching your lost report parameters was cataloged at Student Union Building (SUB) Security Checkpoint (Desk 2). System algorithmic match confidence: 88%.",
      when: "2 hrs ago • 2:25 PM",
      daysAgo: 0,
      unread: true,
    },
    {
      id: "n-3",
      category: "recovery",
      title: "Recovery Sign-Off Pending: Casio fx-991ES Plus Calculator",
      text: "Olawale A. provided 3 identifying verification marks (engraved name initials on battery bay, blue casing sticker) for your review.",
      when: "Today • 2:25 PM",
      daysAgo: 0,
      unread: true,
    },
    {
      id: "n-4",
      category: "claim",
      title: "Claim Accepted: Dell Latitude 65W AC Adapter & Power Cable",
      text: "Your ownership claim was authenticated and authorized by Hezekiah Oluwasanmi Library Front Desk. Physical handover code",
      when: "Yesterday • 3:25 PM",
      daysAgo: 1,
      unread: false,
    },
    {
      id: "n-5",
      category: "message",
      title: "New Secure Message: Olawale A.",
      text: "Hello! Thank you so much for accepting the claim. I really need this calculator for my test tomorrow.",
      when: "2 days ago • 2:15 PM",
      daysAgo: 2,
      unread: false,
    }
  ];

  const TABS = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "claim", label: "Claims" },
    { key: "match", label: "Matches" },
    { key: "recovery", label: "Recovery" },
    { key: "message", label: "Messages" }
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

  let activeTab = "all";
  let timeframe = 7;
  let compact = false;
  let searchQuery = "";

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function inTimeframe(item) {
    return timeframe === 0 || item.daysAgo < timeframe;
  }

  function matchesTab(item, tab) {
    if (tab === "all") return true;
    if (tab === "unread") return item.unread;
    return item.category === tab;
  }

  function matchesQuery(item) {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.title} ${item.text}`.toLowerCase().includes(query);
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
    const state = item.unread ? "is-unread" : "is-read";
    const toggleLabel = item.unread ? "Mark as read" : "Mark as unread";

    return `
      <article class="notif-card ${state}" data-id="${item.id}">
        <h2 class="notif-title">${escapeHTML(item.title)}</h2>
        <span class="notif-time">${escapeHTML(item.when)}</span>
        <p class="notif-text">${escapeHTML(item.text)}</p>

        <div class="pop-wrap">
          <button class="dots-btn" data-action="menu" aria-label="More options" aria-haspopup="true">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>
            </svg>
          </button>
          <div class="pop-menu">
            <button data-action="toggle-read">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 13 4 4L14 8M10 15l2 2 8-9"/></svg>
              ${toggleLabel}
            </button>
            <button data-action="delete" class="is-danger">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>
              Delete
            </button>
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
      <div class="empty-card">
        <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0"/><path d="M10.5 9.5h3l-3 3h3"/>
        </svg>
        <h2 class="empty-title">You’re all caught up</h2>
        <p class="empty-text">${text}</p>
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
    notifList.querySelectorAll(".pop-menu.is-open").forEach((menu) => menu.classList.remove("is-open"));
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

    if (!actionBtn) {
      if (event.target.closest(".pop-wrap")) return;
      item.unread = false;
      window.location.href = item.link;
      return;
    }

    switch (actionBtn.dataset.action) {
      case "menu": {
        const menu = card.querySelector(".pop-menu");
        const wasOpen = menu.classList.contains("is-open");
        closeMenus();
        if (!wasOpen) menu.classList.add("is-open");
        break;
      }

      case "toggle-read":
        item.unread = !item.unread;
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

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderList();
  });

  markActiveLink();
  render();
})();
