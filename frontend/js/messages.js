(function () {
  const CLAIM_PAGE = "";
  const MESSAGES_PAGE = "back2owner messages page.html";
  const CHAT_PAGE = "back2owner chat page.html"

  const conversations = [
    {
      id: "msg-1",
      name: "Olawale A.",
      role: "Claimant",
      badge: "Verified Student",
      avatar: "images/messages1.jpg",
      unread: 2,
      when: "10 mins ago • 14:22 WAT",
      whenIcon: "clock",
      itemTitle: "Casio fx-991ES Plus 2nd Edition Scientific Calculator",
      itemRef: "Found Item #FND-2024-0980"
    },
    {
      id: "msg-2",
      name: "Folashade B.",
      role: "Finder",
      badge: "Verified Student",
      avatar: "images/messages1.jpg",
      unread: 0,
      when: "10 mins ago • 14:22 WAT",
      whenIcon: "clock",
      itemTitle: "Black Leather Bi-Fold Wallet (Contains ATM & Student ID)",
      itemRef: "LOST ITEM #REP-2024-0842"
    },
    {
      id: "msg-3",
      name: "Tunde O.",
      role: "Claimant",
      badge: "Verified Student",
      avatar: "images/messages1.jpg",
      unread: 0,
      when: "Oct 21, 2024",
      whenIcon: "calendar",
      itemTitle: "Blue HP Pavilion 65W Laptop Charger & Cord",
      itemRef: "Lost Item #FND-2024-0715"
    }
  ];

  const WHEN_ICONS = {
    clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    calendar: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>`
  };

  const messagesList = document.getElementById("messagesList");
  const searchInput = document.getElementById("searchInput");
  const filterBtn = document.getElementById("filterBtn");

  if (!messagesList) return;

  let searchQuery = "";
  let unreadOnly = false;

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function initials(name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function whenIcon(name) {
    return `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WHEN_ICONS[name] || WHEN_ICONS.clock}</svg>`;
  }

  function createStatusTag(unread) {
    return unread > 0
      ? `<span class="tag tag-type"><span class="tag-dot"></span>Unread (${unread} New)</span>`
      : `<span class="tag tag-type">Read</span>`;
  }

  function createMenu(conversation) {
    const readLabel = conversation.unread > 0 ? "Mark as read" : "Mark as unread";
    return `
      <div class="kebab">
        <button class="kebab-btn" data-action="menu" aria-label="More options" aria-haspopup="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>
          </svg>
        </button>
        <div class="kebab-menu">
          <button data-action="toggle-read">${readLabel}</button>
          <button data-action="delete">Delete conversation</button>
        </div>
      </div>
    `;
  }

  function createMessageCard(conversation) {
    return `
      <article class="message-card" data-id="${conversation.id}">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="avatar">
              <span class="avatar-initials">${escapeHTML(initials(conversation.name))}</span>
              <img src="${escapeHTML(conversation.avatar)}" alt="" class="avatar-img" data-fallback />
            </span>
            <span class="person-name">${escapeHTML(conversation.name)}</span>
            <span class="person-meta">${escapeHTML(conversation.role)} • ${escapeHTML(conversation.badge)}</span>
            ${createStatusTag(conversation.unread)}
          </div>
          <span class="message-time">${whenIcon(conversation.whenIcon)}${escapeHTML(conversation.when)}</span>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 class="message-title">${escapeHTML(conversation.itemTitle)}</h2>
          <span class="tag tag-ref">${escapeHTML(conversation.itemRef)}</span>
        </div>

        <div class="message-foot">
          ${createMenu(conversation)}
          <div class="message-actions">
            <button class="btn-outline" data-action="claim">View Claim</button>
            <button class="btn-solid" data-action="chat">Open Chat</button>
          </div>
        </div>
      </article>
    `;
  }

  function getVisible() {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      if (unreadOnly && c.unread === 0) return false;
      if (!query) return true;
      return [c.name, c.role, c.itemTitle, c.itemRef].join(" ").toLowerCase().includes(query);
    });
  }

  function render() {
    const visible = getVisible();

    if (visible.length === 0) {
      let message = "You have no conversations yet.";
      if (searchQuery.trim()) message = `No conversations match “${escapeHTML(searchQuery)}”.`;
      else if (unreadOnly) message = "You have no unread messages.";
      messagesList.innerHTML = `<p class="empty-message">${message}</p>`;
    } else {
      messagesList.innerHTML = visible.map(createMessageCard).join("");
    }

    checkImages();
  }

  function closeMenus() {
    messagesList.querySelectorAll(".kebab-menu.is-open").forEach((menu) => menu.classList.remove("is-open"));
  }

  function markActiveLink() {
    document.querySelectorAll(".side-link[data-nav]").forEach((link) => {
      const label = link.querySelector("span")?.textContent.trim();
      const isThisPage = label === "Messages";
      link.classList.toggle("is-active", isThisPage);
      const icon = link.querySelector(".nav-icon");
      if (isThisPage) {
        link.setAttribute("href", MESSAGES_PAGE);
        if (icon) icon.setAttribute("fill", "currentColor");
      }
    });
  }

  function hideBrokenImage(img) {
    img.style.display = "none";
  }

  function checkImages() {
    document.querySelectorAll("img[data-fallback]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) hideBrokenImage(img);
    });
  }

  document.addEventListener("error", (event) => {
    if (event.target.matches && event.target.matches("img[data-fallback]")) hideBrokenImage(event.target);
  }, true);

  messagesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest("[data-id]");
    const conversation = conversations.find((c) => c.id === card.dataset.id);
    if (!conversation) return;

    switch (button.dataset.action) {
      case "menu": {
        const menu = card.querySelector(".kebab-menu");
        const wasOpen = menu.classList.contains("is-open");
        closeMenus();
        if (!wasOpen) menu.classList.add("is-open");
        break;
      }

      case "toggle-read":
        conversation.unread = conversation.unread > 0 ? 0 : 1;
        render();
        break;

      case "delete":
        if (!confirm(`Delete your conversation with ${conversation.name}?`)) {
          closeMenus();
          return;
        }
        conversations.splice(conversations.indexOf(conversation), 1);
        render();
        break;

      case "claim":
        window.location.href = CLAIM_PAGE;
        break;

      case "chat":
        conversation.unread = 0;
        render();
        window.location.href = `${CHAT_PAGE}?id=${conversation.id}`;
        break;
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".kebab")) closeMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      render();
    });
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      unreadOnly = !unreadOnly;
      filterBtn.setAttribute("aria-pressed", String(unreadOnly));
      render();
    });
  }

  markActiveLink();
  render();
})();
