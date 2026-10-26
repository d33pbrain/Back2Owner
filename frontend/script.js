document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.querySelectorAll("[data-nav]");
  const searchInput = document.getElementById("searchInput");
  const itemsGrid = document.getElementById("itemsGrid");
  const shownCount = document.getElementById("shownCount");
  const totalCount = document.getElementById("totalCount");
  const emptyMessage = document.getElementById("emptyMessage");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  if (!sidebar || !itemsGrid) return;

  const TOTAL_ITEMS = Number(totalCount.textContent);
  const CARDS_PER_LOAD = 9;

  function handleImageError(img) {
    img.style.display = "none";
  }

  function watchImages(scope) {
    scope.querySelectorAll("img[data-fallback]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) handleImageError(img);
      img.addEventListener("error", () => handleImageError(img));
    });
  }

  watchImages(document);

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-visible");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
  }

  menuToggle.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navLinks.forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
      closeSidebar();
    });
  });

  function updateCount() {
    const cards = itemsGrid.querySelectorAll("[data-item]");
    const visible = [...cards].filter((card) => !card.classList.contains("hidden"));

    shownCount.textContent = visible.length;
    emptyMessage.classList.toggle("hidden", visible.length > 0);
    loadMoreBtn.classList.toggle("hidden", cards.length >= TOTAL_ITEMS);
  }

  function filterCards() {
    const query = searchInput.value.trim().toLowerCase();

    itemsGrid.querySelectorAll("[data-item]").forEach((card) => {
      const title = card.querySelector("[data-title]").textContent.toLowerCase();
      const location = card.querySelector("[data-location]").textContent.toLowerCase();
      const matches = title.includes(query) || location.includes(query);
      card.classList.toggle("hidden", !matches);
    });

    updateCount();
  }

  searchInput.addEventListener("input", filterCards);

  itemsGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".btn-details");
    if (!button) return;

    const card = button.closest("[data-item]");
    const title = card.querySelector("[data-title]").textContent.trim();

    alert(`Opening details for: ${title}`);
  });

  function loadMoreCards() {
    const template = itemsGrid.querySelector("[data-item]");
    const currentCount = itemsGrid.querySelectorAll("[data-item]").length;
    const toAdd = Math.min(CARDS_PER_LOAD, TOTAL_ITEMS - currentCount);

    for (let i = 0; i < toAdd; i++) {
      const newCard = template.cloneNode(true);
      newCard.classList.remove("hidden");
      itemsGrid.appendChild(newCard);
      watchImages(newCard);
    }

    filterCards();
  }

  loadMoreBtn.addEventListener("click", loadMoreCards);

  updateCount();
});