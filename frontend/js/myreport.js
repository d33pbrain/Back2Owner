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

  function getReportImageUrl(report, fallback = "images/card 4.jpg") {
    if (report && Array.isArray(report.images) && report.images.length > 0) {
      return report.images[0].image || report.images[0].image_url || fallback;
    }
    return fallback;
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

  // Render animated loading skeleton state
  function renderLoadingState() {
    reportsList.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <svg class="w-8 h-8 animate-spin text-orange-500 mb-3" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs sm:text-sm font-semibold text-slate-600">Loading your reports...</p>
      </div>
    `;
  }

  function createReportRow(report) {
    const imageSrc = getReportImageUrl(report, "images/card 4.jpg");

    const reportTypeLabel = report.report_type === "FOUND" ? "Found Item Report" : "Lost Item Report";
    const statusLabel = report.status || "OPEN";
    const refNumber = report.item_ref || report.id.slice(0, 8);
    const locationText = report.specific_location_details || "Campus Location Not Specified";
    const claimsText = `${report.pending_claims_count || 0} Pending Claim(s)`;

    return `
      <article class="report-card grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-[130px_1fr] xl:grid-cols-[130px_1fr_200px] rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm items-center" data-id="${report.id}">
        <!-- Thumbnail -->
        <div class="report-thumb overflow-hidden rounded-xl h-[140px] md:h-[100px] w-full bg-slate-100 shrink-0">
          <img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(report.title)}" class="w-full h-full object-cover" onerror="this.src='images/card 4.jpg'" />
        </div>
        
        <!-- Details Column -->
        <div class="min-w-0 flex flex-col justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="tag tag-type bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full">${escapeHTML(reportTypeLabel)}</span>
              <span class="tag tag-meta text-xs text-slate-500 font-medium py-1">Reported: ${formatDate(report.created_at || report.date_lost)}</span>
              <span class="tag tag-meta text-xs font-mono font-bold text-slate-700 py-1">REF: ${escapeHTML(refNumber)}</span>
            </div>
            <h2 class="report-title mt-2 text-base sm:text-lg font-bold text-slate-900 line-clamp-1">${escapeHTML(report.title)}</h2>
            <div class="mt-2 flex flex-col gap-1.5 text-xs text-slate-600">
              <p class="report-meta flex items-center gap-1.5 truncate">${icon("location")} <span class="font-medium text-slate-400">Location:</span> ${escapeHTML(locationText)}</p>
              <p class="report-meta flex items-center gap-1.5">${icon("claims")} <span class="font-medium text-slate-400">Claims:</span> ${escapeHTML(claimsText)}</p>
            </div>
          </div>
          <div class="status-bar mt-3">
            <span class="status-label text-[11px] font-extrabold uppercase tracking-wider text-orange-500">STATUS: ${escapeHTML(statusLabel)}</span>
          </div>
        </div>

        <!-- Action Buttons Column (Overrides oval pill styling with explicit !rounded-xl and !px-4) -->
        <div class="report-actions flex flex-col sm:flex-row xl:flex-col items-stretch justify-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 md:col-span-2 xl:col-span-1">
          <button 
            type="button"
            class="w-full !h-auto !min-h-[42px] !px-4 !py-2.5 !rounded-xl !border !border-slate-200 !bg-white hover:!bg-slate-50 !text-slate-700 active:scale-95 text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer" 
            data-action="view"
          >
            <span>View Details</span>
            <svg class="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>

          ${report.pending_claims_count > 0 ? `
            <button 
              type="button"
              class="w-full !h-auto !min-h-[42px] !px-4 !py-2.5 !rounded-xl !border-0 !bg-orange-500 hover:!bg-orange-600 !text-white active:scale-95 text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer" 
              data-action="claims"
            >
              <span>Review Claims (${report.pending_claims_count})</span>
            </button>
          ` : ''}
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
      reportsList.innerHTML = `
        <div class="text-center py-12 px-4 border border-slate-200 rounded-2xl bg-white shadow-sm">
          <svg class="h-8 w-8 mx-auto text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
          <h2 class="text-sm font-bold text-slate-800">No reports found</h2>
          <p class="text-xs text-slate-500 mt-1">Try adjusting your search query or report filter.</p>
        </div>
      `;
    } else {
      reportsList.innerHTML = pageReports.map(createReportRow).join("");
    }

    if (resultsSummary) {
      resultsSummary.innerHTML = `Showing <strong>${pageReports.length}</strong> of <strong>${filtered.length}</strong> reports`;
    }

    updateStats();
  }

  async function fetchMyReports() {
    renderLoadingState();

    const token = localStorage.getItem("access_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(MY_REPORTS_API_URL, { method: "GET", headers });
      if (response.ok) {
        reportsData = await response.json();
        renderReports();
      } else {
        reportsList.innerHTML = `
          <div class="text-center py-12 px-4 border border-red-200 rounded-2xl bg-red-50/50 text-red-600 text-xs font-semibold">
            Unable to fetch reports. Please make sure you are signed in.
          </div>
        `;
      }
    } catch (error) {
      console.error(error);
      reportsList.innerHTML = `
        <div class="text-center py-12 px-4 border border-red-200 rounded-2xl bg-red-50/50 text-red-600 text-xs font-semibold">
          Network error. Failed to load reports from server.
        </div>
      `;
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