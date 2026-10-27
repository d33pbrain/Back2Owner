(function () {
  const MESSAGES_PAGE = "back2owner messages page.html";

  const chats = {
    "msg-1": {
      person: {
        name: "Olawale A.",
        role: "Claimant",
        badge: "Verified Student",
        avatar: "images/person.jpg",
        faculty: "Faculty of Technology [Mech Eng]",
        matric: "Matric: 2021/1/68***"
      },
      thread: [
        { type: "date", label: "Yesterday, Oct 23, 2024" },
        {
          type: "system",
          title: "System Event: Claim Accepted",
          text: "Direct messaging unlocked. End to end encryption message.",
          time: "Oct 23, 2024 • 6:42 PM"
        },
        {
          type: "in",
          text: "Hello! Thank you so much for accepting the claim. I really need this calculator for my test tomorrow. When will you be around BOOC Porter's Lodge?",
          time: "2:15 PM"
        },
        {
          type: "out",
          text: "Hi Olawale, I have already deposited the calculator with the hall porter, Mr. Adeleke, at BOOC Central Porter's Lodge. You can meet him with your student ID card and Handover Code",
          time: "2:20 PM"
        },
        { type: "date", today: true }
      ]
    },
    "msg-2": {
      person: {
        name: "Folashade B.",
        role: "Finder",
        badge: "Verified Student",
        avatar: "images/person.jpg",
        faculty: "Faculty of Science [Chemistry]",
        matric: "Matric: 2020/1/34***"
      },
      thread: [
        { type: "date", label: "Yesterday, Oct 23, 2024" },
        {
          type: "system",
          title: "System Event: Claim Accepted",
          text: "Direct messaging unlocked. End to end encryption message.",
          time: "Oct 23, 2024 • 6:42 PM"
        }
      ]
    },
    "msg-3": {
      person: {
        name: "Tunde O.",
        role: "Claimant",
        badge: "Verified Student",
        avatar: "images/person.jpg",
        faculty: "Faculty of Technology [Chemical Eng]",
        matric: "Matric: 2022/1/52***"
      },
      thread: [
        { type: "date", label: "Oct 21, 2024" },
        {
          type: "system",
          title: "System Event: Claim Accepted",
          text: "Direct messaging unlocked. End to end encryption message.",
          time: "Oct 21, 2024 • 4:10 PM"
        }
      ]
    }
  };

  const chatHead = document.getElementById("chatHead");
  const chatThread = document.getElementById("chatThread");
  const composer = document.getElementById("composer");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const plusBtn = document.getElementById("plusBtn");
  const plusMenu = document.getElementById("plusMenu");
  const fileInput = document.getElementById("fileInput");

  if (!chatHead || !chatThread || !composer) return;

  const params = new URLSearchParams(window.location.search);
  const chatId = chats[params.get("id")] ? params.get("id") : "msg-1";
  const chat = chats[chatId];

  let blocked = false;

  const TICK = `<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 13 4 4L14 8M10 15l2 2 8-9"/></svg>`;

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

  function todayLabel() {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `Today, ${date}`;
}

  function nowLabel() {
    return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function createHead(person) {
    return `
      <div class="chat-head">
        <div class="flex min-w-0 items-center gap-4">
          <span class="avatar avatar-lg">
            <span class="avatar-initials">${escapeHTML(initials(person.name))}</span>
            <img src="${escapeHTML(person.avatar)}" alt="" class="avatar-img" data-fallback />
          </span>
          <div class="min-w-0">
            <p class="flex flex-wrap items-baseline gap-x-2">
              <span class="chat-name">${escapeHTML(person.name)}</span>
              <span class="person-meta">${escapeHTML(person.role)} • ${escapeHTML(person.badge)}</span>
            </p>
            <p class="chat-sub mt-1">
              <span>${escapeHTML(person.faculty)}</span>
              <span>${escapeHTML(person.matric)}</span>
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button class="chat-icon-btn" data-action="info" aria-label="Student details">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>
            </svg>
          </button>
          <button class="chat-icon-btn" data-action="block" aria-label="Block student">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function createItem(item, person) {
    switch (item.type) {
      case "date":
        return `<div class="date-divider"><span>${escapeHTML(item.today ? todayLabel() : item.label)}</span></div>`;

      case "system":
        return `
          <div class="system-event">
            <p class="system-title">${escapeHTML(item.title)}</p>
            <p class="system-text">${escapeHTML(item.text)}</p>
            <p class="system-time">${escapeHTML(item.time)}</p>
          </div>
        `;

      case "in":
        return `
          <div class="msg msg-in">
            <p class="msg-meta"><strong>${escapeHTML(person.name)}</strong> ${escapeHTML(item.time)}</p>
            <div class="bubble bubble-in">
              <p>${escapeHTML(item.text)}</p>
              ${TICK}
            </div>
          </div>
        `;

      case "file":
        return `
          <div class="msg msg-out">
            <p class="msg-meta">${escapeHTML(item.time)} <strong>You</strong></p>
            <div class="bubble bubble-out">
              <p class="flex items-center gap-2">
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></svg>
                <span class="min-w-0 break-all">${escapeHTML(item.text)}</span>
              </p>
              ${TICK}
            </div>
          </div>
        `;

      default:
        return `
          <div class="msg msg-out">
            <p class="msg-meta">${escapeHTML(item.time)} <strong>You</strong></p>
            <div class="bubble bubble-out">
              <p>${escapeHTML(item.text)}</p>
              ${TICK}
            </div>
          </div>
        `;
    }
  }

  function renderThread() {
    chatThread.innerHTML = chat.thread.map((item) => createItem(item, chat.person)).join("");
    chatThread.scrollTop = chatThread.scrollHeight;
  }

 function addToThread(item) {
  const hasTodayDivider = chat.thread.some((entry) => entry.type === "date" && entry.today);
  if (!hasTodayDivider) chat.thread.push({ type: "date", today: true });
  chat.thread.push(item);
  renderThread();
}

  function updateSendState() {
    sendBtn.disabled = blocked || messageInput.value.trim() === "";
  }

  function closePlusMenu() {
    plusMenu.classList.remove("is-open");
    plusBtn.setAttribute("aria-expanded", "false");
  }

  function applyBlockedState() {
    messageInput.disabled = blocked;
    plusBtn.disabled = blocked;
    messageInput.placeholder = blocked
      ? "You have blocked this student. Unblock to send messages."
      : "Type a message to coordinate handover details (do not share passwords, financial data, or off-campus locations)...";
    updateSendState();
  }

  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || blocked) return;
    addToThread({ type: "out", text, time: nowLabel() });
    messageInput.value = "";
    updateSendState();
  }

  function markActiveLink() {
    document.querySelectorAll(".side-link[data-nav]").forEach((link) => {
      const label = link.querySelector("span")?.textContent.trim();
      const isMessages = label === "Messages";
      link.classList.toggle("is-active", isMessages);
      const icon = link.querySelector(".nav-icon");
      if (isMessages) {
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

  chatHead.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    if (button.dataset.action === "info") {
      alert(`${chat.person.name}\n${chat.person.faculty}\n${chat.person.matric}`);
      return;
    }

    if (button.dataset.action === "block") {
      const question = blocked
        ? `Unblock ${chat.person.name}?`
        : `Block ${chat.person.name}? You will not be able to send messages to this student.`;
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

  plusBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !plusMenu.classList.contains("is-open");
    plusMenu.classList.toggle("is-open", willOpen);
    plusBtn.setAttribute("aria-expanded", String(willOpen));
  });

  plusMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    closePlusMenu();

    if (button.dataset.action === "upload") {
      fileInput.click();
      return;
    }

    if (button.dataset.action === "request") {
      if (!confirm(`Ask ${chat.person.name} to confirm the claim details?`)) return;
      addToThread({
        type: "system",
        title: "System Event: Claim Confirmation Requested",
        text: "You asked the claimant to confirm the claim details.",
        time: `${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${nowLabel()}`
      });
    }
  });

  fileInput.addEventListener("change", () => {
    Array.from(fileInput.files).forEach((file) => {
      addToThread({ type: "file", text: file.name, time: nowLabel() });
    });
    fileInput.value = "";
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".plus-wrap")) closePlusMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlusMenu();
  });

  chatHead.innerHTML = createHead(chat.person);
  markActiveLink();
  renderThread();
  checkImages();
  updateSendState();
})();
