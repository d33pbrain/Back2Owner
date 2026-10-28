// js/item-details.js

const API_BASE_URL = `${CONFIG.API_BASE_URL}/api/items/reports/`;

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function timeAgo(dateString) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

async function fetchItemDetails() {
  const itemId = getQueryParam("id");

  if (!itemId) {
    alert("No item specified.");
    window.location.href = "back2owner home page.html";
    return;
  }

  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}${itemId}/`, { headers });
    
    if (!response.ok) {
      throw new Error("Failed to fetch item details.");
    }

    const item = await response.json();
    populateItemDetails(item);
  } catch (error) {
    console.error("Item Details Error:", error);
    document.getElementById("itemTitle").textContent = "Item Details Not Found";
    document.getElementById("itemDescription").textContent = "We were unable to load the item details. Please return to the homepage and try again.";
  }
}

function populateItemDetails(item) {
  // Title & Breadcrumb
  document.getElementById("breadcrumbTitle").textContent = item.title || "Item Details";
  document.getElementById("itemTitle").textContent = item.title || "Untitled Item";

  // Image
  const imgEl = document.getElementById("itemImage");
  if (item.images && item.images.length > 0) {
    imgEl.src = item.images[0].image || item.images[0].image_url || "images/card 4.jpg";
  } else {
    imgEl.src = "images/card 4.jpg";
  }

  // Ref & Dates
  document.getElementById("itemRef").textContent = `#OAU-2024-${String(item.id).padStart(4, "0")}`;
  document.getElementById("itemReportedDate").textContent = `${new Date(item.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${timeAgo(item.created_at)})`;

  // Key Metadata Grid
  document.getElementById("itemCategory").textContent = item.category || "Stationery / Gadgets";
  document.getElementById("itemBrand").textContent = item.brand || "N/A";
  document.getElementById("itemColor").textContent = item.color || item.primary_color || "N/A";
  document.getElementById("itemCondition").textContent = item.condition || "Physically Held";
  document.getElementById("itemLocation").textContent = item.specific_location_details || item.location || "Campus Hall / Desk";
  document.getElementById("itemStatus").textContent = item.status || (item.is_claimed ? "Claimed" : "Unclaimed");

  // Description
  document.getElementById("itemDescription").textContent = item.description || "No specific description was provided for this report.";

  // Action Buttons
  const claimBtn = document.getElementById("claimBtn");
  if (claimBtn) {
    const isLost = (item.report_type || "").toUpperCase() === "LOST";
    claimBtn.textContent = isLost ? "Offer To Return" : "Claim Item";
    claimBtn.addEventListener("click", () => {
      window.location.href = `back2owner claim review page.html?id=${item.id}`;
    });
  }

  const reportFraudBtn = document.getElementById("reportFraudBtn");
  if (reportFraudBtn) {
    reportFraudBtn.addEventListener("click", () => {
      alert("Thank you. This item report has been flagged for campus porter review.");
    });
  }
}

document.addEventListener("DOMContentLoaded", fetchItemDetails);