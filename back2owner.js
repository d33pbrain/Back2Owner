// ===== Underline the nav link of the section you're viewing =====
const navLinks = document.querySelectorAll(".nav-link");

function updateNav() {
  const middle = window.innerHeight * 0.4;   // the line a section must cross to count as "current"
  let currentId = null;

  navLinks.forEach(function (link) {
    const section = document.querySelector(link.getAttribute("href"));
    if (!section) return;
    const rect = section.getBoundingClientRect();
    // current = the section whose top is above the line and whose bottom is below it
    if (rect.top <= middle && rect.bottom > middle) {
      currentId = section.id;
    }
  });

  navLinks.forEach(function (link) {
    link.classList.toggle("is-active", link.getAttribute("href") === "#" + currentId);
  });
}

window.addEventListener("scroll", updateNav);
window.addEventListener("resize", updateNav);
updateNav();

// ===== Carousel dots for "Recent Lost & Found Items" =====
const track = document.getElementById("items");
const dotsWrap = document.getElementById("dots");
const cards = [...track.children];
// One dot per card. Clicking a dot scrolls to that card.
const dots = cards.map((card, i) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `Go to item ${i + 1}`);
  dot.addEventListener("click", () => {
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  });
  dotsWrap.appendChild(dot);
  return dot;
});
// Work out which card is closest to the left edge, then resize the dots.
// Figma sizes: active 20px, next to it 16px, the rest 14px. All #D9D9D9, radius 40.
function updateDots() {
  const trackLeft = track.getBoundingClientRect().left;
  let active = 0;
  let smallest = Infinity;
  cards.forEach((card, i) => {
    const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
    if (distance < smallest) {
      smallest = distance;
      active = i;
    }
  });
  // At the very end the last card can't reach the left edge, so force the last dot
  if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) {
    active = cards.length - 1;
  }
  dots.forEach((dot, i) => {
    const distance = Math.abs(i - active);
    const size =
      distance === 0 ? "h-[20px] w-[20px]" :
      distance === 1 ? "h-[16px] w-[16px]" :
                       "h-[14px] w-[14px]";
    dot.className = `${size} shrink-0 rounded-[40px] bg-[#D9D9D9] transition-all`;
  });
}
track.addEventListener("scroll", updateDots);
window.addEventListener("resize", updateDots);
updateDots();
