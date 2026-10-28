// js/messages.js
(function () {
  const CONVERSATIONS_API_URL = "http://127.0.0.1:8000/api/chat/conversations/";
  const CHAT_PAGE = "back2owner chat page.html";
  const CLAIM_PAGE = "back2owner claim review page.html";

  let conversations = [];
  let searchQuery = "";
  let unreadOnly = false;

  const messagesList = document.getElementById("messagesList");
  const searchInput = document.getElementById("searchInput");
  const filterBtn = document.getElementById("filterBtn");

  if (!messagesList) return;

  const WHEN_ICONS = {
    clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    calendar: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>`
  };

  function escapeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function initials(name) {
    if (!name) return "U";
    return name
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function formatTime(dateString) {
    if (!dateString) return { text: "Recently", icon: "clock" };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { text: "Recently", icon: "clock" };

    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;

    if (diffHours < 24) {
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { text: `${timeStr} WAT`, icon: "clock" };
    } else {
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return { text: dateStr, icon: "calendar" };
    }
  }

  function whenIcon(name) {
    return `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WHEN_ICONS[name] || WHEN_ICONS.clock}</svg>`;
  }

  function createStatusTag(unread) {
    return unread > 0
      ? `<span class="tag tag-type bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-xs flex items-center gap-1"><span class="tag-dot h-2 w-2 rounded-full bg-red-600 inline-block"></span>Unread (${unread} New)</span>`
      : `<span class="tag tag-type text-gray-500 text-xs font-medium">Read</span>`;
  }

  function createMenu(conversation) {
    const readLabel = conversation.unread_count > 0 ? "Mark as read" : "Mark as unread";
    return `
      <div class="kebab relative">
        <button class="kebab-btn p-1 text-gray-500 hover:text-gray-900" data-action="menu" aria-label="More options" aria-haspopup="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>
          </svg>
        </button>
        <div class="kebab-menu hidden absolute right-0 bottom-full mb-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-20 p-1">
          <button class="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 rounded text-slate-700 font-medium" data-action="toggle-read">${readLabel}</button>
          <button class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded font-medium" data-action="delete">Delete conversation</button>
        </div>
      </div>
    `;
  }

  function createMessageCard(conv) {
    const participant = conv.other_participant || {};
    const item = conv.item_details || {};
    const lastMsg = conv.last_message || {};
    const timeFormatted = formatTime(lastMsg.created_at || conv.updated_at);

    const participantName = participant.full_name || "Unknown User";
    const roleBadge = participant.role_badge || "Participant";
    const faculty = participant.department_or_faculty ? ` • ${participant.department_or_faculty}` : "";
    
    const itemTitle = item.title || "Reported Item";
    const itemRef = item.item_ref || `#REF-${item.id ? item.id.slice(0, 6) : '000'}`;
    const reportType = item.report_type ? `${item.report_type} ITEM` : "ITEM";

    return `
      <article class="message-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md" data-id="${conv.id}" data-item-id="${item.id || ''}">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="avatar flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs shrink-0">
              <span class="avatar-initials">${escapeHTML(initials(participantName))}</span>
            </span>
            <span class="person-name font-bold text-slate-800 text-sm">${escapeHTML(participantName)}</span>
            <span class="person-meta text-xs text-slate-500 font-medium">${escapeHTML(roleBadge)}${escapeHTML(faculty)}</span>
            ${createStatusTag(conv.unread_count || 0)}
          </div>
          <span class="message-time text-xs text-slate-400 flex items-center gap-1">${whenIcon(timeFormatted.icon)}${escapeHTML(timeFormatted.text)}</span>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 class="message-title font-semibold text-slate-900 text-base line-clamp-1">${escapeHTML(itemTitle)}</h2>
          <span class="tag tag-ref font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">${escapeHTML(reportType)} ${escapeHTML(itemRef)}</span>
        </div>

        ${lastMsg.content ? `<p class="mt-2 text-xs italic text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">"${escapeHTML(lastMsg.content)}"</p>` : ''}

        <div class="message-foot mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          ${createMenu(conv)}
          <div class="message-actions flex items-center gap-2">
            <button class="btn-outline px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors" data-action="claim">View Details</button>
            <button class="btn-solid px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent-dark transition-colors" data-action="chat">Open Chat</button>
          </div>
        </div>
      </article>
    `;
  }

  function getVisible() {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      if (unreadOnly && (c.unread_count || 0) === 0) return false;
      if (!query) return true;

      const pName = c.other_participant?.full_name || "";
      const pRole = c.other_participant?.role_badge || "";
      const pDept = c.other_participant?.department_or_faculty || "";
      const iTitle = c.item_details?.title || "";
      const iRef = c.item_details?.item_ref || "";
      const lastMsgContent = c.last_message?.content || "";

      return [pName, pRole, pDept, iTitle, iRef, lastMsgContent].join(" ").toLowerCase().includes(query);
    });
  }

  function render() {
    const visible = getVisible();

    if (visible.length === 0) {
      let message = "You have no active conversations yet.";
      if (searchQuery.trim()) message = `No conversations match “${escapeHTML(searchQuery)}”.`;
      else if (unreadOnly) message = "You have no unread messages.";
      messagesList.innerHTML = `<p class="empty-message text-center py-12 text-slate-500 font-medium">${message}</p>`;
    } else {
      messagesList.innerHTML = visible.map(createMessageCard).join("");
    }
  }

  function closeMenus() {
    messagesList.querySelectorAll(".kebab-menu").forEach((menu) => menu.classList.add("hidden"));
  }

  // --- API FETCH: CONVERSATIONS ---
  async function fetchConversations() {
    messagesList.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-slate-500">
        <svg class="w-8 h-8 animate-spin text-brand mb-2" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p class="text-sm font-medium">Loading conversations...</p>
      </div>
    `;

    const token = localStorage.getItem("access_token");
    console.log("Access Token:", localStorage);
    if (!token) {
      messagesList.innerHTML = `
        <div class="text-center py-12 text-slate-600">
          Please <a href="back2owner sign in page.html" class="text-brand font-bold underline">sign in</a> to view your conversations.
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
      const response = await fetch(CONVERSATIONS_API_URL, { method: "GET", headers });

      if (response.ok) {
        conversations = await response.json();
        render();
      } else if (response.status === 401) {
        console.warn("[401 Unauthorized]: Token expired or invalid.");
        messagesList.innerHTML = `
          <div class="text-center py-12 text-slate-600">
            Your session has expired. Please <a href="back2owner sign in page.html" class="text-brand font-bold underline">sign in again</a>.
          </div>
        `;
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error(`[Conversations API ${response.status}]`, errData);
        messagesList.innerHTML = `<p class="text-center py-10 text-red-500 font-medium">Failed to load conversations (Status ${response.status}).</p>`;
      }
    } catch (err) {
      console.error("Fetch Conversations Error:", err);
      messagesList.innerHTML = `<p class="text-center py-10 text-red-500 font-medium">Unable to connect to backend server. Please check your connection.</p>`;
    }
  }

  // --- EVENT LISTENERS ---
  messagesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest("[data-id]");
    if (!card) return;

    const convId = card.dataset.id;
    const itemId = card.dataset.itemId;
    const conversation = conversations.find((c) => c.id === convId);

    switch (button.dataset.action) {
      case "menu": {
        const menu = card.querySelector(".kebab-menu");
        const isHidden = menu.classList.contains("hidden");
        closeMenus();
        if (isHidden) menu.classList.remove("hidden");
        break;
      }

      case "toggle-read":
        if (conversation) {
          conversation.unread_count = (conversation.unread_count || 0) > 0 ? 0 : 1;
          render();
        }
        break;

      case "delete":
        if (conversation && confirm(`Delete conversation regarding "${conversation.item_details?.title || 'this item'}"?`)) {
          conversations.splice(conversations.indexOf(conversation), 1);
          render();
        }
        break;

      case "claim":
        if (itemId) {
          window.location.href = `${CLAIM_PAGE}?id=${itemId}`;
        } else {
          window.location.href = CLAIM_PAGE;
        }
        break;

      case "chat":
        if (conversation) conversation.unread_count = 0;
        window.location.href = `${CHAT_PAGE}?conversation_id=${convId}`;
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
      filterBtn.classList.toggle("bg-slate-200", unreadOnly);
      render();
    });
  }

  fetchConversations();
})();