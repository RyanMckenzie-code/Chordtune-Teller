// Scroll scrubs the light across the title in either direction.
const title = document.querySelector(".mystic-title");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let scheduled = false;

function paintShine() {
  scheduled = false;
  if (!title || reducedMotion.matches) return;
  const bounds = title.getBoundingClientRect();
  const titleBottom = bounds.bottom + window.scrollY;
  const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(1, titleBottom)));
  title.style.setProperty("--shine-position", `${100 - progress * 100}%`);
}

function scheduleShine() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(paintShine);
}

window.addEventListener("scroll", scheduleShine, { passive: true });
window.addEventListener("resize", scheduleShine);
window.addEventListener("pageshow", scheduleShine);
reducedMotion.addEventListener("change", scheduleShine);
paintShine();
