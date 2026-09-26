import { gsap } from "gsap";
import { createElement } from "lucide";

// Escape text before putting it into an HTML template. Anything that can come
// from the backend (names, topics, road names) must go through this.
export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Bepory draws "-" as a plus sign, so text set in Bepory uses an en dash instead
// ("I-880 N" -> "I–880 N"). Use for anything shown in the display font.
export function display(value) {
  return esc(String(value).replaceAll("-", "–"));
}

// A Lucide icon as an HTML string, for use inside templates.
export function icon(node, { size = 24, stroke = 2 } = {}) {
  const svg = createElement(node);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("stroke-width", stroke);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg.outerHTML;
}

// Short status message at the top of the screen.
let toastTimer;
export function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  clearTimeout(toastTimer);
  gsap.fromTo(node, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" });
  toastTimer = setTimeout(() => gsap.to(node, { autoAlpha: 0, y: -8, duration: 0.2 }), 2600);
}

// Initials for an avatar: "Priya S." -> "PS", "Jordan" -> "J".
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Stable avatar color per person, from the brand palette (FNV-1a hash of the id,
// which spreads short ids across the tones far more evenly than a simple hash).
const TONES = ["orange", "teal", "ink", "sand"];
export function tone(id) {
  let hash = 0x811c9dc5;
  for (const ch of id) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return TONES[hash % TONES.length];
}
