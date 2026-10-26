(function () {
  const REPORTS_PAGE = "back2owner my reports page.html";

  const item = {
    ref: "OAU-2024-0980",
    image: "images/card 5.jpg",
    imageAlt: "Casio fx-991ES Plus calculator on a wooden desk",
    kind: "Lost Item",
    claimState: "Unclaimed",
    title: "Casio fx-991ES Plus 2nd Edition Scientific Calculator",
    category: "Stationery / Gadgets",
    logged: "Oct 23, 2024 (5 hours ago)",
    location: "BOOC Lecture Theatre (Row 4, Seat 18)",
    brand: "Casio",
    finder: "Verified Student",
    state: "Ready For Claim"
  };

  const claimsData = [
    {
      id: "claim-1",
      name: "Olawale A.",
      badge: "Verified Student",
      status: "pending",
      primary: "accept",
      heading: "Claimant Ownership Statement & Physical Identifiers:",
      statement: "I lost my Casio fx-991ES Plus right after MTH 201 test in BOOC Row 4. There is a faint blue ink smear on the battery compartment clasp from my Pilot pen leaking last semester, and my department initials 'O.A.' are scratched very lightly inside the sliding cover. In the mode menu, contrast is adjusted to 3 bars from default.",
      quoted: true,
      files: [
        { name: "OAU_ID_Card_Slip_Verified.pdf", size: "240 KB", type: "pdf" },
        { name: "Photo_of_Receipt_SUB_Bookshop_2023.jpg", size: "1.1 MB", type: "image" }
      ]
    },
    {
      id: "claim-2",
      name: "Babatunde E.",
      badge: "Verified Student",
      status: "pending",
      primary: "request",
      heading: "Claimant Ownership Statement & Physical Identifiers:",
      statement: "I misplaced my black Casio calculator somewhere around BOOC or White House yesterday morning. It is clean and works fine. I really need it for my PHY 105 exam this Friday.",
      quoted: true,
      files: []
    },
    {
      id: "claim-3",
      name: "Eso D.",
      badge: "Verified Student",
      status: "done",
      primary: "accept",
      heading: "",
      statement: "Student did not provide required information",
      quoted: false,
      files: []
    }
  ];

  const ACTION_LABELS = {
    accept: "Accept Claim",
    request: "Make A Request",
    details: "Details",
    decline: "Decline",
    reopen: "Reopen Review"
  };

  const STATUS_LABELS = {
    pending: "Review Pending",
    done: "Review Done"
  };

  const FILE_ICONS = {
    pdf: `<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/>`,
    image: `<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m4 16 5-4 4 3 3-2 4 3"/>`
  };

  const itemPanel = document.getElementById("itemPanel");
  const claimsList = document.getElementById("claimsList");

  if (!itemPanel || !claimsList) return;

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function fileIcon(type) {
    return `<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FILE_ICONS[type] || FILE_ICONS.pdf}</svg>`;
  }

  function createDetail(label, value) {
    return `
      <div>
        <p class="detail-label">${escapeHTML(label)}</p>
        <p class="detail-value">${escapeHTML(value)}</p>
      </div>
    `;
  }

  function createItemPanel(data) {
    return `
      <article class="item-panel">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="item-ref">Item REF: #${escapeHTML(data.ref)}</p>
          <div class="flex items-center gap-2">
            <span class="tag tag-lost">${escapeHTML(data.kind)}</span>
            <span class="tag tag-soft">${escapeHTML(data.claimState)}</span>
          </div>
        </div>

        <div class="mt-4 grid gap-5 md:grid-cols-[205px_1fr]">
          <div class="item-thumb">
            <img src="${escapeHTML(data.image)}" alt="${escapeHTML(data.imageAlt)}" data-fallback />
          </div>
          <div class="min-w-0">
            <h1 class="item-title">${escapeHTML(data.title)}</h1>
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              ${createDetail("Category", data.category)}
              ${createDetail("Date Logged", data.logged)}
              ${createDetail("Location", data.location)}
              ${createDetail("Brand", data.brand)}
            </div>
          </div>
        </div>

        <div class="item-foot mt-5">
          <span>Finder Record: ${escapeHTML(data.finder)}</span>
          <span>${escapeHTML(data.state)}</span>
        </div>
      </article>
    `;
  }

  function createFileRow(file) {
    return `
      <div class="doc-row">
        ${fileIcon(file.type)}
        <span class="doc-name">${escapeHTML(file.name)}</span>
        <span class="doc-size">(${escapeHTML(file.size)})</span>
        <button class="doc-view" data-file="${escapeHTML(file.name)}">[VIEW]</button>
      </div>
    `;
  }

  function createDocuments(files) {
    const rows = files.length
      ? files.map(createFileRow).join("")
      : `<div class="doc-row">${fileIcon("pdf")}<span class="doc-name">No Attached Files</span></div>`;

    return `
      <p class="doc-label mt-4">Attached corroborating documents (${files.length} ${files.length === 1 ? "file" : "files"}):</p>
      <div class="mt-2 flex flex-col items-start gap-2">${rows}</div>
    `;
  }

  function createClaimActions(claim) {
    const actions = claim.status === "done" ? ["reopen", "details"] : [claim.primary, "details", "decline"];
    return actions
      .map((action) => `<button class="btn-outline" data-action="${action}">${ACTION_LABELS[action]}</button>`)
      .join("");
  }

  function createClaimCard(claim) {
    const heading = claim.heading ? `<p class="claim-heading">${escapeHTML(claim.heading)}</p>` : "";
    const statement = claim.quoted ? `“${escapeHTML(claim.statement)}”` : escapeHTML(claim.statement);

    return `
      <article class="claim-card" data-id="${claim.id}">
        <div class="claim-head">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="claim-name">${escapeHTML(claim.name)}</h2>
            <span class="tag tag-type">${escapeHTML(claim.badge)}</span>
          </div>
          <span class="claim-status is-${claim.status}">${STATUS_LABELS[claim.status]}</span>
        </div>

        <div class="mt-4 grid gap-4 xl:grid-cols-[1fr_210px]">
          <div class="min-w-0">
            ${heading}
            <p class="claim-quote${heading ? " mt-3" : ""}">${statement}</p>
            ${createDocuments(claim.files)}
          </div>
          <div class="report-actions">${createClaimActions(claim)}</div>
        </div>
      </article>
    `;
  }

  function renderPage() {
    itemPanel.innerHTML = createItemPanel(item);
    claimsList.innerHTML = claimsData.length
      ? claimsData.map(createClaimCard).join("")
      : `<p class="empty-message">No claims have been submitted for this item yet.</p>`;
    checkImages();
  }

  function markActiveLink() {
    document.querySelectorAll(".side-link[data-nav]").forEach((link) => {
      const label = link.querySelector("span")?.textContent.trim();
      const isReports = label === "My Reports";
      link.classList.toggle("is-active", isReports);
      if (isReports) link.setAttribute("href", REPORTS_PAGE);
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

  claimsList.addEventListener("click", (event) => {
    const fileButton = event.target.closest("[data-file]");
    if (fileButton) {
      alert(`Opening file: ${fileButton.dataset.file}`);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest("[data-id]");
    const claim = claimsData.find((c) => c.id === card.dataset.id);
    if (!claim) return;

    switch (button.dataset.action) {
      case "accept":
        if (!confirm(`Accept the claim from ${claim.name}? The item will be marked as claimed.`)) return;
        claim.status = "done";
        item.claimState = "Claimed";
        item.state = "Claim Accepted";
        renderPage();
        break;

      case "decline":
        if (!confirm(`Decline the claim from ${claim.name}?`)) return;
        claim.status = "done";
        renderPage();
        break;

      case "reopen":
        claim.status = "pending";
        renderPage();
        break;

      default:
        alert(`${ACTION_LABELS[button.dataset.action]}: ${claim.name}`);
    }
  });

  markActiveLink();
  renderPage();
})();
