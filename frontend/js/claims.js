// js/claims.js
(function () {
  const ITEM_DETAIL_API_URL = "http://127.0.0.1:8000/api/items/reports/";
  const CLAIM_DETAIL_API_URL = "http://127.0.0.1:8000/api/items/claims/";

  const itemPanel = document.getElementById("itemPanel");
  const claimsList = document.getElementById("claimsList");

  if (!itemPanel || !claimsList) return;

  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get("id");
  const claimId = urlParams.get("claim_id");

  function escapeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateString) {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function createItemPanel(data) {
    const imageSrc = (data.images && data.images.length > 0 && data.images[0].image_url)
      ? data.images[0].image_url
      : "images/card 5.jpg";

    return `
      <article class="item-panel bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="item-ref font-mono font-bold text-slate-700">Item REF: ${escapeHTML(data.item_ref || data.id)}</p>
          <div class="flex items-center gap-2">
            <span class="tag ${data.report_type === 'FOUND' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-xs font-bold px-3 py-1 rounded-full">${escapeHTML(data.report_type)}</span>
            <span class="tag bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">${escapeHTML(data.status)}</span>
          </div>
        </div>

        <div class="mt-4 grid gap-5 md:grid-cols-[205px_1fr]">
          <div class="item-thumb overflow-hidden rounded-xl h-[140px] bg-gray-100">
            <img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(data.title)}" class="w-full h-full object-cover" onerror="this.src='images/card 5.jpg'" />
          </div>
          <div class="min-w-0">
            <h1 class="item-title text-xl font-extrabold text-[#151C25]">${escapeHTML(data.title)}</h1>
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div><p class="text-slate-400 font-medium">Brand</p><p class="font-bold text-slate-800">${escapeHTML(data.brand || "N/A")}</p></div>
              <div><p class="text-slate-400 font-medium">Date Logged</p><p class="font-bold text-slate-800">${formatDate(data.created_at || data.date_lost)}</p></div>
              <div><p class="text-slate-400 font-medium">Location</p><p class="font-bold text-slate-800">${escapeHTML(data.specific_location_details || "N/A")}</p></div>
              <div><p class="text-slate-400 font-medium">Features</p><p class="font-bold text-slate-800">${escapeHTML(data.distinguishing_features || "N/A")}</p></div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function createClaimCard(claim) {
    return `
      <article class="claim-card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <h2 class="claim-name font-bold text-slate-800">${escapeHTML(claim.claimant_name)}</h2>
            <span class="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">Verified Student</span>
          </div>
          <span class="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase">${escapeHTML(claim.status)}</span>
        </div>

        <div class="mt-4">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Statement / Verification Reason:</p>
          <p class="mt-1 text-sm italic text-slate-700 bg-slate-50 p-3 rounded-lg">"${escapeHTML(claim.verification_reason)}"</p>
        </div>
      </article>
    `;
  }

  async function loadPageData() {
    const token = localStorage.getItem("access_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (claimId) {
      // Fetch Claim Specific Details
      try {
        const response = await fetch(`${CLAIM_DETAIL_API_URL}${claimId}/`, { headers });
        if (response.ok) {
          const claimData = await response.json();
          claimsList.innerHTML = createClaimCard(claimData);

          // Fetch underlying item
          if (claimData.item) {
            const itemRes = await fetch(`${ITEM_DETAIL_API_URL}${claimData.item}/`, { headers });
            if (itemRes.ok) {
              const itemData = await itemRes.json();
              itemPanel.innerHTML = createItemPanel(itemData);
            }
          }
        }
      } catch (err) {
        console.error("Error loading claim details:", err);
      }
    } else if (reportId) {
      // Fetch Item Report Specific Details
      try {
        const response = await fetch(`${ITEM_DETAIL_API_URL}${reportId}/`, { headers });
        if (response.ok) {
          const itemData = await response.json();
          itemPanel.innerHTML = createItemPanel(itemData);
          claimsList.innerHTML = `<p class="text-sm text-slate-500 text-center py-6">Pending claims for this report are currently listed under review.</p>`;
        }
      } catch (err) {
        console.error("Error loading report details:", err);
      }
    } else {
      itemPanel.innerHTML = `<p class="text-red-500 font-medium">No valid item or claim ID provided in URL.</p>`;
    }
  }

  loadPageData();
})();