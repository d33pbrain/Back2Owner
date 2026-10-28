// js/myreport.js
(function () {
  const MY_REPORTS_API_URL = "http://127.0.0.1:8000/api/items/reports/?my_reports=true";
  const REPORTS_PER_PAGE = 5;

  let reportsData = [];
  let currentPage = 1;
  let searchQuery = "";

  const reportsList = document.getElementById("reportsList");
  const searchInput = document.getElementById("searchInput");
  const resultsSummary = document.getElementById("resultsSummary");
  const pagination = document.getElementById("pagination");

  if (!reportsList) return;

  const ICONS = {
    location: `<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>`,
    claims: `<path d="M4 5h16v11H8l-4 4V5Z"/>`,
  };

  function icon(name) {
    return `<svg class="h-4 w-4 shrink-0 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function escapeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatDate(dateString) {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function updateStats() {
    const total = reportsData.length;
    const active = reportsData.filter(r => r.status === "OPEN").length;
    const pending = reportsData.filter(r => r.status === "CLAIM_PENDING").length;
    const resolved = reportsData.filter(r => r.status === "RESOLVED" || r.status === "RETURNED").length;

    setText("statTotal", total);
    setText("statTotalCaption", total);
    setText("statActive", active);
    setText("statPending", pending);
    setText("statResolved", resolved);
  }

  function createReportRow(report) {
    const imageSrc = (report.images && report.images.length > 0 && report.images[0].image_url)
      ? report.images[0].image_url
      : "images/card 4.jpg";

    const reportTypeLabel = report.report_type === "FOUND" ? "Found Item Report" : "Lost Item Report";
    const statusLabel = report.status || "OPEN";
    const refNumber = report.item_ref || report.id.slice(0, 8);
    const locationText = report.specific_location_details || "Campus Location Not Specified";
    const claimsText = `${report.pending_claims_count || 0} Pending Claim(s)`;

    return `
      <article class="report-card grid gap-5 md:grid-cols-[130px_1fr] xl:grid-cols-[130px_1fr_210px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-id="${report.id}">
        <div class="report-thumb overflow-hidden rounded-xl h-[100px] bg-gray-100">
          <img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(report.title)}" class="w-full h-full object-cover" onerror="this.src='images/card 4.jpg'" />
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap gap-2">
            <span class="tag tag-type bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full">${escapeHTML(reportTypeLabel)}</span>
            <span class="tag tag-meta text-xs text-slate-500 font-medium py-1">Reported: ${formatDate(report.created_at || report.date_lost)}</span>
            <span class="tag tag-meta text-xs font-mono font-bold text-slate-700 py-1">REF: ${escapeHTML(refNumber)}</span>
          </div>
          <h2 class="report-title mt-2 text-lg font-bold text-[#151C25]">${escapeHTML(report.title)}</h2>
          <div class="mt-2 flex flex-col gap-1.5 text-xs text-slate-600">
            <p class="report-meta flex items-center gap-1.5">${icon("location")} Location: ${escapeHTML(locationText)}</p>
            <p class="report-meta flex items-center gap-1.5">${icon("claims")} Claims: ${escapeHTML(claimsText)}</p>
          </div>
          <div class="status-bar mt-3">
            <span class="status-label text-xs font-bold uppercase tracking-wider text-brand">STATUS: ${escapeHTML(statusLabel)}</span>
          </div>
        </div>
        <div class="report-actions flex flex-col justify-center gap-2 md:col-span-2 xl:col-span-1">
          <button class="btn-outline w-full py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors" data-action="view">View Details</button>
          ${report.pending_claims_count > 0 ? `<button class="btn-orange w-full py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors" data-action="claims">Review Claims (${report.pending_claims_count})</button>` : ''}
        </div>
      </article>
    `;
  }

  function getFilteredReports() {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return reportsData;

    return reportsData.filter((report) => {
      const searchable = [report.title, report.item_ref, report.report_type, report.status, report.specific_location_details].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }

  function renderReports() {
    const filtered = getFilteredReports();
    const totalPages = Math.max(1, Math.ceil(filtered.length / REPORTS_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * REPORTS_PER_PAGE;
    const pageReports = filtered.slice(start, start + REPORTS_PER_PAGE);

    if (pageReports.length === 0) {
      reportsList.innerHTML = `<p class="empty-message text-center py-10 text-slate-500">No reports found.</p>`;
    } else {
      reportsList.innerHTML = pageReports.map(createReportRow).join("");
    }

    if (resultsSummary) {
      resultsSummary.innerHTML = `Showing <strong>${pageReports.length}</strong> of <strong>${filtered.length}</strong> reports`;
    }

    updateStats();
  }

  async function fetchMyReports() {
    const token = localStorage.getItem("access_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(MY_REPORTS_API_URL, { method: "GET", headers });
      if (response.ok) {
        reportsData = await response.json();
        renderReports();
      }
    } catch (error) {
      console.error(error);
    }
  }

  reportsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const row = button.closest("[data-id]");
    const reportId = row.dataset.id;

    if (button.dataset.action === "view" || button.dataset.action === "claims") {
      window.location.href = `back2owner claim review page.html?id=${reportId}`;
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      renderReports();
    });
  }

  fetchMyReports();
})();