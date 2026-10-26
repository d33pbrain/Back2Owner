(function () {
  const reportsData = [
    {
      id: "REP-2024-0891",
      image: "images/card 5.jpg",
      imageAlt: "Casio fx-991ES Plus calculator on a wooden desk",
      type: "Found Item Report",
      reported: "Oct 23, 2026 (2 days ago)",
      closed: null,
      title: "Casio fx-991ES Plus Calculator",
      meta: [
        { icon: "location", text: "Location: BOOC Lecture Theatre (Row 4, Seat 18)" },
        { icon: "claims", text: "Claim Submissions: 1 Pending Claim Submitted" }
      ],
      status: "ACTIVE"
    },
    {
      id: "REP-2024-0842",
      image: "images/card 4.jpg",
      imageAlt: "Black leather bi-fold wallet beside a student ID card",
      type: "Found Item Report",
      reported: "Oct 20, 2026 (5 days ago)",
      closed: null,
      title: "Black Leather Bi-Fold Wallet (Contains ATM & Student ID)",
      meta: [
        { icon: "custody", text: "Custody: Physically Held" },
        { icon: "pending", text: "Status: 2 Student Claims Pending Check" }
      ],
      status: "PENDING CLAIM"
    },
    {
      id: "REP-2024-0799",
      image: "images/card 8.jpg",
      imageAlt: "Black Dell laptop power adapter with its cable",
      type: "Found Item Report",
      reported: null,
      closed: "Oct 18, 2026",
      title: "Dell Latitude 65W AC Adapter & Power Cable",
      meta: [
        { icon: "location", text: "Location: Hezekiah Oluwasanmi Library (1st Floor)" },
        { icon: "claims", text: "Claim Submissions: 1 Pending Claim Submitted" }
      ],
      status: "RETURNED"
    }
  ];

  const REPORTS_PER_PAGE = 3;
  const MIN_PAGES = 2;
  const HIDDEN_REPORTS = { total: 1, ACTIVE: 1 };

  const ACTIONS_BY_STATUS = {
    "ACTIVE": ["view", "edit", "claims"],
    "PENDING CLAIM": ["view", "queue", "log"],
    "RETURNED": ["view", "archive"]
  };

  const ACTION_LABELS = {
    view: "View Details",
    edit: "Edit Report",
    claims: "Review Claims",
    queue: "Claim Queue",
    log: "Update Log",
    archive: "Archive Record"
  };

  const ICONS = {
    location: `<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>`,
    claims: `<path d="M4 5h16v11H8l-4 4V5Z"/>`,
    custody: `<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z"/>`,
    pending: `<path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>`
  };

  const reportsList = document.getElementById("reportsList");
  const searchInput = document.getElementById("searchInput");
  const resultsSummary = document.getElementById("resultsSummary");
  const pagination = document.getElementById("pagination");

  if (!reportsList) return;

  let currentPage = 1;
  let searchQuery = "";

  function icon(name) {
    return `<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function createStatusBar(status) {
    return `<div class="status-bar mt-4"><span class="status-label">STATUS: ${escapeHTML(status)}</span></div>`;
  }

  function createReportRow(report) {
    const dateTag = report.closed
      ? `<span class="tag tag-closed">Closed: ${escapeHTML(report.closed)}</span>`
      : `<span class="tag tag-meta">Reported: ${escapeHTML(report.reported)}</span>`;

    const metaLines = report.meta
      .map((line) => `<p class="report-meta">${icon(line.icon)}${escapeHTML(line.text)}</p>`)
      .join("");

    const buttons = (ACTIONS_BY_STATUS[report.status] || ["view"])
      .map((action) => `<button class="btn-outline" data-action="${action}">${ACTION_LABELS[action]}</button>`)
      .join("");

    const markReturned = report.status === "ACTIVE"
      ? `<button class="btn-text" data-action="returned">Mark As Returned</button>`
      : "";

    return `
      <article class="report-card grid gap-5 md:grid-cols-[130px_1fr] xl:grid-cols-[130px_1fr_210px]" data-id="${report.id}">
        <div class="report-thumb">
          <img src="${escapeHTML(report.image)}" alt="${escapeHTML(report.imageAlt)}" data-fallback />
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap gap-2">
            <span class="tag tag-type">${escapeHTML(report.type)}</span>
            ${dateTag}
            <span class="tag tag-meta">REF: #${escapeHTML(report.id)}</span>
          </div>
          <h2 class="report-title mt-3">${escapeHTML(report.title)}</h2>
          <div class="mt-2 flex flex-col gap-1.5">${metaLines}</div>
          ${createStatusBar(report.status)}
        </div>
        <div class="report-actions md:col-span-2 xl:col-span-1">
          ${buttons}
          ${markReturned}
        </div>
      </article>
    `;
  }

  function getFilteredReports() {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return reportsData;

    return reportsData.filter((report) => {
      const searchable = [report.title, report.id, report.type, report.status, ...report.meta.map((m) => m.text)]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }

  function updateStats() {
    const countBy = (status) => reportsData.filter((r) => r.status === status).length + (HIDDEN_REPORTS[status] || 0);
    const total = reportsData.length + HIDDEN_REPORTS.total;

    setText("statTotal", total);
    setText("statTotalCaption", total);
    setText("statActive", countBy("ACTIVE"));
    setText("statPending", countBy("PENDING CLAIM"));
    setText("statResolved", countBy("RETURNED"));
  }

  function renderPagination(totalPages) {
    if (!pagination) return;

    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    let html = `<button class="page-nav" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>« Previous</button>`;

    for (let page = 1; page <= totalPages; page++) {
      const isCurrent = page === currentPage;
      html += `<button class="page-btn${isCurrent ? " is-current" : ""}" data-page="${page}" ${isCurrent ? 'aria-current="page"' : ""}>${page}</button>`;
    }

    html += `<button class="page-nav" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>Next »</button>`;
    pagination.innerHTML = html;
  }

  function renderReports() {
    const filtered = getFilteredReports();
    const isSearching = searchQuery.trim() !== "";
    const neededPages = Math.max(1, Math.ceil(filtered.length / REPORTS_PER_PAGE));
    const totalPages = isSearching ? neededPages : Math.max(MIN_PAGES, neededPages);
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * REPORTS_PER_PAGE;
    const pageReports = filtered.slice(start, start + REPORTS_PER_PAGE);

    if (pageReports.length === 0) {
      reportsList.innerHTML = isSearching
        ? `<p class="empty-message">No reports match “${escapeHTML(searchQuery)}”. Check the spelling or search by reference number, like REP-2024-0891.</p>`
        : `<p class="empty-message">No more reports to show on this page yet.</p>`;
    } else {
      reportsList.innerHTML = pageReports.map(createReportRow).join("");
    }

    if (resultsSummary) {
      const shown = isSearching ? filtered.length : filtered.length + HIDDEN_REPORTS.total;
      resultsSummary.innerHTML =
        `Showing <strong>${shown}</strong> of <strong>${shown}</strong> reports registered in current session`;
    }

    renderPagination(totalPages);
    updateStats();
  }

  function todayLabel() {
    return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function markActiveLink() {
    const currentFile = decodeURIComponent(window.location.pathname.split("/").pop());
    document.querySelectorAll(".side-link[data-nav]").forEach((link) => {
      const label = link.querySelector("span")?.textContent.trim();
      const isThisPage = label === "My Reports";
      link.classList.toggle("is-active", isThisPage);
      if (isThisPage && currentFile) link.setAttribute("href", currentFile);
    });
  }

  function hideBrokenImage(img) {
    img.style.display = "none";
  }

  document.addEventListener("error", (event) => {
    if (event.target.matches && event.target.matches("img[data-fallback]")) hideBrokenImage(event.target);
  }, true);

  function checkImages() {
    document.querySelectorAll("img[data-fallback]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) hideBrokenImage(img);
    });
  }

  reportsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const row = button.closest("[data-id]");
    const report = reportsData.find((r) => r.id === row.dataset.id);
    if (!report) return;

    switch (button.dataset.action) {
      case "returned":
        if (!confirm(`Mark “${report.title}” as returned? Security porters will be notified.`)) return;
        report.status = "RETURNED";
        report.closed = todayLabel();
        renderReports();
        checkImages();
        break;

      case "archive":
        if (!confirm(`Archive “${report.title}”? It will be removed from My Reports.`)) return;
        reportsData.splice(reportsData.indexOf(report), 1);
        renderReports();
        checkImages();
        break;

      case "claims":
      case "queue":
        window.location.href = "back2owner claim review page.html";
        break;

      default:
        alert(`${ACTION_LABELS[button.dataset.action]}: ${report.title}`);
    }
  });

  if (pagination) {
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;

      currentPage = Number(button.dataset.page);
      renderReports();
      checkImages();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      reportsList.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      currentPage = 1;
      renderReports();
      checkImages();
    });
  }

  markActiveLink();
  renderReports();
  checkImages();
})();
