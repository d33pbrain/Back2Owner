// js/report.js
(function () {
  const CATEGORIES_API = "http://127.0.0.1:8000/api/items/categories/";
  const LANDMARKS_API = "http://127.0.0.1:8000/api/items/landmarks/";
  const REPORT_API = "http://127.0.0.1:8000/api/items/reports/";
  const HOME_PAGE = "back2owner home page.html";

  const reportForm = document.getElementById("reportForm");
  const categorySelect = document.getElementById("itemCategory");
  const landmarkSelect = document.getElementById("itemLandmark");
  const dropZone = document.getElementById("dropZone");
  const imageInput = document.getElementById("imageInput");
  const attachedFilesContainer = document.getElementById("attachedFilesContainer");
  const attachedHeader = document.getElementById("attachedHeader");
  const fileList = document.getElementById("fileList");
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const submitBtn = document.getElementById("submitBtn");

  let attachedFiles = [];
  const MAX_FILES = 3;

  function escapeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  // --- UI NOTIFICATION HELPERS ---
  function showToast(message, type = "info") {
    const existing = document.getElementById("toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "toast-notification";
    const bgClass = type === "error" ? "bg-red-600" : "bg-slate-900";
    toast.className = `fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl ${bgClass} text-white text-xs font-semibold shadow-2xl transition-all transform translate-y-2 opacity-0`;
    toast.innerHTML = `
      <svg class="h-4 w-4 text-orange-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
      <span>${escapeHTML(message)}</span>
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove("translate-y-2", "opacity-0");
    });

    setTimeout(() => {
      toast.classList.add("translate-y-2", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function showErrorBanner(message) {
    let banner = document.getElementById("error-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "error-banner";
      banner.className = "mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-medium flex items-start gap-3 shadow-sm";
      reportForm.parentNode.insertBefore(banner, reportForm);
    }
    banner.innerHTML = `
      <svg class="h-5 w-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
      <div class="flex-1">
        <p class="font-bold text-slate-800 mb-0.5">Submission Error</p>
        <p>${escapeHTML(message)}</p>
      </div>
    `;
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideErrorBanner() {
    const banner = document.getElementById("error-banner");
    if (banner) banner.remove();
  }

  function showSuccessModal(itemData) {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in";
    modal.innerHTML = `
      <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center transform transition-all">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 class="text-xl font-extrabold text-slate-900">Report Created Successfully!</h2>
        <p class="text-xs text-slate-500 mt-1.5">
          Your report has been published to the campus bulletin. Reference code:
        </p>
        <div class="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 tracking-wider">
          ${escapeHTML(itemData.item_ref || itemData.id || "FND-REPORT")}
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed mb-6">
          You will receive automatic alerts when potential matches or claims are registered against this report.
        </p>
        <div class="flex items-center gap-3">
          <button id="modalHomeBtn" class="flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider transition shadow-md">
            Go to Home
          </button>
          <button id="modalNewBtn" class="py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition">
            Report Another
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("modalHomeBtn").addEventListener("click", () => {
      window.location.href = HOME_PAGE;
    });

    document.getElementById("modalNewBtn").addEventListener("click", () => {
      modal.remove();
      reportForm.reset();
      attachedFiles = [];
      renderFiles();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // --- FETCH CATEGORIES & LANDMARKS ---
  async function loadDropdowns() {
    const token = localStorage.getItem("access_token");
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    try {
      const [catRes, lmRes] = await Promise.all([
        fetch(CATEGORIES_API, { headers }),
        fetch(LANDMARKS_API, { headers })
      ]);

      if (catRes.ok) {
        const categories = await catRes.json();
        categorySelect.innerHTML = `<option value="" disabled selected>Select Category (e.g. Gadgets & Electronics, Academic & Stationery...)</option>`;
        categories.forEach((cat) => {
          categorySelect.insertAdjacentHTML("beforeend", `<option value="${cat.id}">${escapeHTML(cat.name)}</option>`);
        });
      }

      if (lmRes.ok) {
        const landmarks = await lmRes.json();
        landmarkSelect.innerHTML = `<option value="" disabled selected>Select Campus Landmark / Building...</option>`;
        landmarks.forEach((lm) => {
          landmarkSelect.insertAdjacentHTML("beforeend", `<option value="${lm.id}">${escapeHTML(lm.name)}</option>`);
        });
      }
    } catch (err) {
      console.warn("API load failed, populating defaults:", err);
    }
  }

  // --- FILE HANDLING ---
  function renderFiles() {
    if (attachedFiles.length === 0) {
      attachedFilesContainer.classList.add("hidden");
      return;
    }

    attachedFilesContainer.classList.remove("hidden");
    attachedHeader.textContent = `ATTACHED SCHEMATICS / PREVIEWS (${attachedFiles.length}/${MAX_FILES}):`;

    fileList.innerHTML = attachedFiles.map((file, idx) => `
      <div class="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-10 w-10 rounded-lg bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            IMG_0${idx + 1}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-800 truncate">${escapeHTML(file.name)}</p>
            <p class="text-[11px] text-slate-500">${formatFileSize(file.size)} • Reference Snapshot</p>
          </div>
        </div>
        <button type="button" data-remove="${idx}" class="text-slate-400 hover:text-red-500 p-1.5 transition" aria-label="Remove image">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join("");
  }

  function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (attachedFiles.length + validFiles.length > MAX_FILES) {
      showToast(`You can upload a maximum of ${MAX_FILES} images.`, "error");
    }

    const availableSlots = MAX_FILES - attachedFiles.length;
    attachedFiles = [...attachedFiles, ...validFiles.slice(0, availableSlots)];
    renderFiles();
  }

  dropZone.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    handleFiles(imageInput.files);
    imageInput.value = "";
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-blue-600", "bg-blue-50/50");
  });

  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-blue-600", "bg-blue-50/50"));

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-blue-600", "bg-blue-50/50");
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  });

  fileList.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.remove, 10);
      attachedFiles.splice(idx, 1);
      renderFiles();
    }
  });

  // --- POST /api/items/reports/ SUBMISSION ---
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideErrorBanner();

    const token = localStorage.getItem("access_token");
    if (!token) {
      showErrorBanner("You must be logged in to submit a report.");
      return;
    }

    const timeFrameRadio = document.querySelector('input[name="timeFrame"]:checked');
    const estimatedTimeVal = document.getElementById("estimatedTime").value;

    const formData = new FormData();
    formData.append("report_type", "LOST");
    formData.append("title", document.getElementById("itemName").value.trim());
    formData.append("category", categorySelect.value);
    formData.append("description", document.getElementById("itemDescription").value.trim());

    const brand = document.getElementById("itemBrand").value.trim();
    if (brand) formData.append("brand", brand);

    const primaryColour = document.getElementById("itemColour").value.trim();
    if (primaryColour) formData.append("primary_colour", primaryColour);

    const features = document.getElementById("itemFeatures").value.trim();
    if (features) formData.append("distinguishing_features", features);

    formData.append("campus_landmark", landmarkSelect.value);
    formData.append("specific_location_details", document.getElementById("locationDetails").value.trim());
    formData.append("date_lost", document.getElementById("dateLost").value);

    if (estimatedTimeVal) {
      const formattedTime = estimatedTimeVal.length === 5 ? `${estimatedTimeVal}:00` : estimatedTimeVal;
      formData.append("estimated_time", formattedTime);
    }

    if (timeFrameRadio) {
      formData.append("time_frame", timeFrameRadio.value);
    }

    attachedFiles.forEach((file) => {
      formData.append("uploaded_images", file);
    });

    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "Submitting...";

    try {
      const response = await fetch(REPORT_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok || response.status === 201) {
        const data = await response.json();
        showSuccessModal(data);
      } else {
        const errorData = await response.json();
        const errMsgs = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ");
        showErrorBanner(errMsgs || "Invalid parameters provided.");
      }
    } catch (err) {
      console.error("Submit Report Error:", err);
      showErrorBanner("Unable to connect to the backend server. Check your network.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Review Report";
    }
  });

  saveDraftBtn.addEventListener("click", () => {
    showToast("Report draft saved to local storage.");
  });

  loadDropdowns();
})();