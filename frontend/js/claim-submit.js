// js/claim-submit.js

const ITEM_REPORT_API = `${CONFIG.API_BASE_URL}/api/items/reports/`;
const CREATE_CLAIM_API = `${CONFIG.API_BASE_URL}/api/items/claims/` ;

let currentItemUUID = null;
let selectedFiles = [];

// Helper to extract URL parameters
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Display Alerts
function showAlert(message, type = "error") {
  const statusAlert = document.getElementById("statusAlert");
  if (!statusAlert) return;
  statusAlert.innerHTML = message;
  statusAlert.className = type === "error"
    ? "rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm font-medium text-red-700 block"
    : "rounded-xl border border-green-200 bg-green-50 p-4 text-xs sm:text-sm font-medium text-green-700 block";
  statusAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAlert() {
  const statusAlert = document.getElementById("statusAlert");
  if (statusAlert) statusAlert.className = "hidden";
}

// Fetch Item Context
async function loadItemContext() {
  currentItemUUID = getQueryParam("id");

  if (!currentItemUUID) {
    showAlert("No target item specified. Redirecting to home...", "error");
    setTimeout(() => { window.location.href = "back2owner home page.html"; }, 2000);
    return;
  }

  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${ITEM_REPORT_API}${currentItemUUID}/`, { headers });
    if (!response.ok) throw new Error("Item not found");

    const item = await response.json();
    populateItemCard(item);
  } catch (error) {
    console.error("Error fetching item context:", error);
    document.getElementById("itemTitle").textContent = "Item Details Unavailable";
  }
}

function populateItemCard(item) {
  document.getElementById("breadcrumbItemTitle").textContent = item.title || "Item";
  document.getElementById("itemTitle").textContent = item.title || "Untitled Item";
  
  const imgEl = document.getElementById("itemThumb");
  if (item.images && item.images.length > 0) {
    imgEl.src = item.images[0].image || item.images[0].image_url || "images/card 4.jpg";
  }

  document.getElementById("itemRef").textContent = `Item REF: #OAU-2024-${String(item.id).slice(0, 4).toUpperCase()}`;
  document.getElementById("itemCategory").textContent = item.category || "Stationery / Gadgets";
  document.getElementById("itemLocation").textContent = item.specific_location_details || item.location || "Campus Landmark";
  document.getElementById("itemBrand").textContent = item.brand || "N/A";
  
  if (item.created_at) {
    const d = new Date(item.created_at);
    document.getElementById("itemDateLogged").textContent = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const isLost = (item.report_type || "").toUpperCase() === "LOST";
  document.getElementById("itemTypeBadge").textContent = isLost ? "Lost Item" : "Found Item";
  document.getElementById("backBtn").href = `back2owner item details page.html?id=${item.id}`;
}

// Handle File Selection & Render File Badges
function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  const proofFilesInput = document.getElementById("proofFiles");
  const fileListContainer = document.getElementById("fileList");

  dropzone.addEventListener("click", () => proofFilesInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("border-orange-500", "bg-orange-50/20");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("border-orange-500", "bg-orange-50/20");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("border-orange-500", "bg-orange-50/20");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  proofFilesInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  });

  function handleFiles(files) {
    hideAlert();
    for (const file of files) {
      if (selectedFiles.length >= 3) {
        showAlert("You can upload a maximum of 3 proof files.", "error");
        break;
      }
      if (file.size > 10 * 1024 * 1024) {
        showAlert(`File "${file.name}" exceeds the 10MB size limit.`, "error");
        continue;
      }
      selectedFiles.push(file);
    }
    renderFileList();
  }

  function renderFileList() {
    fileListContainer.innerHTML = selectedFiles.map((file, idx) => `
      <div class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
        <span class="truncate max-w-[180px]">${file.name}</span>
        <button type="button" data-idx="${idx}" class="remove-file-btn text-slate-400 hover:text-red-500 font-bold ml-1">✕</button>
      </div>
    `).join("");

    fileListContainer.querySelectorAll(".remove-file-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-idx"), 10);
        selectedFiles.splice(index, 1);
        renderFileList();
      });
    });
  }
}

// Textarea Character Counter
function setupCharCounter() {
  const reasonTextarea = document.getElementById("verificationReason");
  const charCounter = document.getElementById("charCounter");

  reasonTextarea.addEventListener("input", () => {
    const count = reasonTextarea.value.length;
    charCounter.textContent = `${count} / 600 characters recommended (Max 1,000)`;
  });
}

// Form Submit Handler (Posts to /api/items/claims/)
function setupFormSubmit() {
  const claimForm = document.getElementById("claimForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitText = document.getElementById("submitText");
  const submitSpinner = document.getElementById("submitSpinner");
  const cancelBtn = document.getElementById("cancelBtn");

  cancelBtn.addEventListener("click", () => {
    window.history.back();
  });

  claimForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const verificationReason = document.getElementById("verificationReason").value.trim();

    if (!currentItemUUID) {
      showAlert("Invalid item reference. Please select an item again.", "error");
      return;
    }

    if (!verificationReason || verificationReason.length < 10) {
      showAlert("Please provide a detailed verification reason (at least 10 characters).", "error");
      return;
    }

    // Prepare FormData payload matching backend expectations
    const formData = new FormData();
    formData.append("item", currentItemUUID);
    formData.append("verification_reason", verificationReason);

    // Append proof files to FormData array
    selectedFiles.forEach((file) => {
      formData.append("proof_files", file);
    });

    // Loading State
    submitBtn.disabled = true;
    submitText.textContent = "Submitting...";
    submitSpinner.classList.remove("hidden");

    const token = localStorage.getItem("access_token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(CREATE_CLAIM_API, {
        method: "POST",
        headers: headers, // Do NOT manually set Content-Type header for Multipart FormData
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok || response.status === 201) {
        showAlert("Claim submitted successfully! Redirecting to home...", "success");
        setTimeout(() => {
          window.location.href = "back2owner home page.html";
        }, 1500);
      } else {
        let errorMsg = "Failed to submit claim. Please try again.";
        if (responseData.detail) {
          errorMsg = responseData.detail;
        } else if (typeof responseData === "object") {
          const errs = [];
          for (const key in responseData) {
            if (Array.isArray(responseData[key])) {
              errs.push(`${key.replace("_", " ")}: ${responseData[key].join(" ")}`);
            } else if (typeof responseData[key] === "string") {
              errs.push(responseData[key]);
            }
          }
          if (errs.length > 0) errorMsg = errs.join("<br/>");
        }
        showAlert(errorMsg, "error");
      }
    } catch (error) {
      console.error("Submit Claim Error:", error);
      showAlert("Unable to connect to server. Please check your network connection.", "error");
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = "Submit Claim";
      submitSpinner.classList.add("hidden");
    }
  });
}

// Initialize Controller
document.addEventListener("DOMContentLoaded", () => {
  loadItemContext();
  setupDropzone();
  setupCharCounter();
  setupFormSubmit();
});