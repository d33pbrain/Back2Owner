// js/chat.js
(function () {
  const CONVERSATION_DETAIL_API = `${CONFIG.API_BASE_URL}/api/chat/conversations/`;
  const WEBSOCKET_BASE_URL = `${CONFIG.API_BASE_URL.replace("http", "ws")}/ws/chat/`;

  const chatHead = document.getElementById("chatHead");
  const chatThread = document.getElementById("chatThread");
  const composer = document.getElementById("composer");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const plusBtn = document.getElementById("plusBtn");
  const plusMenu = document.getElementById("plusMenu");
  const fileInput = document.getElementById("fileInput");

  if (!chatHead || !chatThread || !composer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const conversationId = urlParams.get("conversation_id") || urlParams.get("id");

  let conversationData = null;
  let currentUser = null;
  let otherParticipant = null;
  let chatSocket = null;
  let blocked = false;

  const TICK = `<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 13 4 4L14 8M10 15l2 2 8-9"/></svg>`;

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
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Just now";
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatDateDivider(dateString) {
    if (!dateString) return "Today";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Today";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("user_info")) || {};
    } catch (e) {
      return {};
    }
  }

  // --- HEADER CREATOR ---
  function createHead(person, itemDetails) {
    const personName = person.full_name || "Participant";
    const roleBadge = person.role_badge || "User";
    const faculty = person.department_or_faculty || "OAU Campus";
    const itemRef = itemDetails ? `${itemDetails.report_type} #${itemDetails.item_ref || itemDetails.id.slice(0, 8)}` : "";
    const itemTitle = itemDetails ? itemDetails.title : "";

    return `
      <div class="chat-head bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div class="flex min-w-0 items-center gap-4">
          <span class="avatar avatar-lg flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-sm shrink-0">
            <span class="avatar-initials">${escapeHTML(initials(personName))}</span>
          </span>
          <div class="min-w-0">
            <p class="flex flex-wrap items-baseline gap-x-2">
              <span class="chat-name font-bold text-slate-800">${escapeHTML(personName)}</span>
              <span class="person-meta text-xs text-slate-500 font-medium">${escapeHTML(roleBadge)}</span>
            </p>
            <p class="chat-sub text-xs text-slate-500 mt-0.5">
              <span>${escapeHTML(faculty)}</span>
              ${itemTitle ? ` • <strong class="text-slate-700 font-semibold">${escapeHTML(itemTitle)}</strong> (${escapeHTML(itemRef)})` : ""}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button class="chat-icon-btn p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100" data-action="info" aria-label="Student details">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>
            </svg>
          </button>
          <button class="chat-icon-btn p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50" data-action="block" aria-label="Block student">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // --- MESSAGE BUBBLE CREATOR ---
  function createMessageItem(msg) {
    if (msg.message_type === "SYSTEM") {
      return `
        <div class="system-event text-center my-4">
          <p class="system-title text-xs font-bold text-slate-700">${escapeHTML(msg.title || "System Event")}</p>
          <p class="system-text text-xs text-slate-500">${escapeHTML(msg.content)}</p>
          <p class="system-time text-[10px] text-slate-400 mt-0.5">${formatTime(msg.created_at)}</p>
        </div>
      `;
    }

    const isMe = msg.is_me || (currentUser && (msg.sender === currentUser.id || msg.sender_name === currentUser.full_name));
    const senderName = isMe ? "You" : (msg.sender_name || otherParticipant.full_name || "User");
    const timeStr = formatTime(msg.created_at);

    if (msg.attachment || msg.message_type === "FILE") {
      const fileName = msg.attachment ? msg.attachment.split("/").pop() : (msg.content || "Attachment");
      return `
        <div class="msg ${isMe ? "msg-out flex flex-col items-end" : "msg-in flex flex-col items-start"} my-2">
          <p class="msg-meta text-[11px] text-slate-400 mb-1">${isMe ? `${timeStr} <strong>You</strong>` : `<strong>${escapeHTML(senderName)}</strong> ${timeStr}`}</p>
          <div class="bubble ${isMe ? "bubble-out bg-brand text-white" : "bubble-in bg-slate-100 text-slate-800"} p-3 rounded-2xl max-w-md shadow-sm">
            <p class="flex items-center gap-2 text-xs font-medium">
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>
              <a href="${escapeHTML(msg.attachment || '#')}" target="_blank" class="underline break-all">${escapeHTML(fileName)}</a>
            </p>
            ${isMe ? TICK : ""}
          </div>
        </div>
      `;
    }

    return `
      <div class="msg ${isMe ? "msg-out flex flex-col items-end" : "msg-in flex flex-col items-start"} my-2">
        <p class="msg-meta text-[11px] text-slate-400 mb-1">${isMe ? `${timeStr} <strong>You</strong>` : `<strong>${escapeHTML(senderName)}</strong> ${timeStr}`}</p>
        <div class="bubble ${isMe ? "bubble-out bg-brand text-white" : "bubble-in bg-slate-100 text-slate-800"} p-3 rounded-2xl max-w-md shadow-sm text-sm">
          <p>${escapeHTML(msg.content)}</p>
          ${isMe ? TICK : ""}
        </div>
      </div>
    `;
  }

  // --- RENDER FULL THREAD ---
  function renderThread(messages) {
    if (!messages || messages.length === 0) {
      chatThread.innerHTML = `<div class="text-center py-10 text-xs text-slate-400">No messages yet. Send a message to start coordinating handover.</div>`;
      return;
    }

    let html = "";
    let lastDateLabel = "";

    messages.forEach((msg) => {
      const dateLabel = formatDateDivider(msg.created_at);
      if (dateLabel !== lastDateLabel) {
        html += `<div class="date-divider text-center my-4"><span class="bg-slate-100 text-slate-500 text-[11px] font-semibold px-3 py-1 rounded-full">${escapeHTML(dateLabel)}</span></div>`;
        lastDateLabel = dateLabel;
      }
      html += createMessageCard(msg);
    });

    chatThread.innerHTML = html;
    scrollToBottom();
  }

  function appendSingleMessage(msg) {
    // Remove empty state if present
    if (chatThread.querySelector(".text-center")) {
      const emptyEl = chatThread.querySelector(".text-center");
      if (emptyEl && emptyEl.textContent.includes("No messages yet")) {
        chatThread.innerHTML = "";
      }
    }

    chatThread.insertAdjacentHTML("beforeend", createMessageCard(msg));
    scrollToBottom();
  }

  function scrollToBottom() {
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function updateSendState() {
    if (sendBtn) {
      sendBtn.disabled = blocked || messageInput.value.trim() === "";
    }
  }

  function closePlusMenu() {
    if (plusMenu && plusBtn) {
      plusMenu.classList.remove("is-open");
      plusBtn.setAttribute("aria-expanded", "false");
    }
  }

  function applyBlockedState() {
    messageInput.disabled = blocked;
    if (plusBtn) plusBtn.disabled = blocked;
    messageInput.placeholder = blocked
      ? "You have blocked this student. Unblock to send messages."
      : "Type a message to coordinate handover details (do not share passwords, financial data, or off-campus locations)...";
    updateSendState();
  }

  // --- WEBSOCKET REAL-TIME CONNECTION ---
  function initWebSocket(convId, token) {
    const wsUrl = `${WEBSOCKET_BASE_URL}${convId}/?token=${token}`;
    chatSocket = new WebSocket(wsUrl);

    chatSocket.onopen = function () {
      console.log("WebSocket connected to conversation:", convId);
    };

    chatSocket.onmessage = function (e) {
      try {
        const data = JSON.parse(e.data);
        const incomingMsg = data.message || data;
        if (incomingMsg && incomingMsg.content) {
          appendSingleMessage(incomingMsg);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    chatSocket.onerror = function (err) {
      console.error("WebSocket Error:", err);
    };

    chatSocket.onclose = function (e) {
      console.warn("WebSocket connection closed. Code:", e.code);
    };
  }

  // --- SEND MESSAGE METHOD ---
  function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || blocked) return;

    const payload = {
      message: content,
      message_type: "TEXT"
    };

    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify(payload));
    } else {
      // Fallback display if socket is reconnecting
      appendSingleMessage({
        id: Date.now().toString(),
        sender_name: currentUser.full_name || "You",
        content: content,
        is_me: true,
        created_at: new Date().toISOString()
      });
    }

    messageInput.value = "";
    updateSendState();
  }

  // --- HTTP FETCH INITIAL CONVERSATION DATA ---
  async function fetchConversationDetails() {
    if (!conversationId) {
      chatThread.innerHTML = `<div class="text-center py-10 text-red-500 font-medium">No valid conversation ID provided in URL.</div>`;
      return;
    }

    chatThread.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-slate-500">
        <svg class="w-8 h-8 animate-spin text-brand mb-2" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p class="text-sm font-medium">Loading chat history...</p>
      </div>
    `;

    currentUser = getStoredUser();
    const token = localStorage.getItem("access_token");
    if (!token) {
      chatThread.innerHTML = `<div class="text-center py-10 text-slate-600">Please <a href="back2owner sign in page.html" class="text-brand font-bold underline">sign in</a> to view this conversation.</div>`;
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    try {
      const response = await fetch(`${CONVERSATION_DETAIL_API}${conversationId}/`, { method: "GET", headers });

      if (response.ok) {
        conversationData = await response.json();

        // Extract partner from participants array
        const participants = conversationData.participants || [];
        otherParticipant = participants.find((p) => p.id !== currentUser.id) || participants[0] || { full_name: "Participant" };

        // Render Header & Messages
        chatHead.innerHTML = createHead(otherParticipant, conversationData.item_details);
        renderThread(conversationData.messages || []);

        // Connect Realtime WebSocket
        initWebSocket(conversationData.id || conversationId, token);
      } else if (response.status === 401) {
        chatThread.innerHTML = `<div class="text-center py-10 text-slate-600">Session expired. Please <a href="back2owner sign in page.html" class="text-brand font-bold underline">sign in again</a>.</div>`;
      } else {
        chatThread.innerHTML = `<div class="text-center py-10 text-red-500 font-medium">Failed to load chat history (Status ${response.status}).</div>`;
      }
    } catch (err) {
      console.error("Fetch Conversation Error:", err);
      chatThread.innerHTML = `<div class="text-center py-10 text-red-500 font-medium">Unable to connect to backend server.</div>`;
    }
  }

  // --- EVENT LISTENERS ---
  chatHead.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || !otherParticipant) return;

    if (button.dataset.action === "info") {
      alert(`Student: ${otherParticipant.full_name}\nFaculty/Dept: ${otherParticipant.department_or_faculty || 'N/A'}\nRole: ${otherParticipant.role_badge || 'User'}`);
      return;
    }

    if (button.dataset.action === "block") {
      const question = blocked
        ? `Unblock ${otherParticipant.full_name}?`
        : `Block ${otherParticipant.full_name}? You will not be able to send messages to this student.`;
      if (!confirm(question)) return;
      blocked = !blocked;
      applyBlockedState();
    }
  });

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
  });

  messageInput.addEventListener("input", updateSendState);

  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  if (plusBtn) {
    plusBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !plusMenu.classList.contains("is-open");
      plusMenu.classList.toggle("is-open", willOpen);
      plusBtn.setAttribute("aria-expanded", String(willOpen));
    });
  }

  if (plusMenu) {
    plusMenu.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      closePlusMenu();

      if (button.dataset.action === "upload" && fileInput) {
        fileInput.click();
        return;
      }

      if (button.dataset.action === "request") {
        if (!confirm(`Ask ${otherParticipant.full_name || 'the student'} to confirm claim handover?`)) return;
        const payload = {
          message: "Claim confirmation requested by user.",
          message_type: "SYSTEM"
        };
        if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
          chatSocket.send(JSON.stringify(payload));
        }
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      Array.from(fileInput.files).forEach((file) => {
        const payload = {
          message: file.name,
          message_type: "FILE"
        };
        if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
          chatSocket.send(JSON.stringify(payload));
        }
      });
      fileInput.value = "";
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".plus-wrap")) closePlusMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlusMenu();
  });

  fetchConversationDetails();
  updateSendState();
})();