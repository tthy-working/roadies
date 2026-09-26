import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { FRAMES, ZOOM, ZOOM_FOCUS, BUBBLES, frameById } from "./frames.js";
import { WORDMARK, BUBBLE_TEXT, BUBBLE_TAIL } from "./shapes.js";
import redCarUrl from "./assets/car-red.png";
import tealCarUrl from "./assets/car-teal.png";
import "./style.css";

gsap.registerPlugin(MorphSVGPlugin);

const SVG_NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);

// ---- Scene ----------------------------------------------------------------

const el = {
  world: $("world"),
  wordmark: $("wordmark"),
  ro: $("ro"),
  adies: $("adies"),
  masks: $("masks"),
  mask6: $("mask6"),
  mask5: $("mask5"),
  cars: $("cars"),
  red: $("car-red"),
  teal: $("car-teal"),
  bubbles: $("bubbles"),
};

el.wordmark.setAttribute("transform", `translate(${WORDMARK.x} ${WORDMARK.y})`);
el.ro.setAttribute("d", WORDMARK.ro);
el.adies.setAttribute("d", WORDMARK.adies);
el.red.setAttribute("href", redCarUrl);
el.teal.setAttribute("href", tealCarUrl);

function svg(tag, attrs, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent.appendChild(node);
  return node;
}

function buildBubble({ text, ellipse: e, tail: t, origin }) {
  const g = svg("g", { class: "bubble" }, el.bubbles);
  svg("ellipse", { rx: e.rx, ry: e.ry, transform: `translate(${e.cx} ${e.cy}) rotate(${e.rot})` }, g);
  svg("path", {
    d: BUBBLE_TAIL.d,
    transform: `translate(${t.cx} ${t.cy}) rotate(${t.rot}) translate(${-BUBBLE_TAIL.w / 2} ${-BUBBLE_TAIL.h / 2})`,
  }, g);
  const label = BUBBLE_TEXT[text];
  svg("path", { class: "bubble-text", d: label.d, transform: `translate(${label.x} ${label.y})` }, g);
  gsap.set(g, { svgOrigin: origin, scale: 0, opacity: 0 });
  return g;
}

const bubbleLeft = buildBubble(BUBBLES.left); // "Wassup Beijing" (red car)
const bubbleRight = buildBubble(BUBBLES.right); // "Ni Howdy!" (teal car)

// Everything the timeline animates. render() pushes it into the SVG.
const carVars = ({ cx, cy, w, h, rot }) => ({ cx, cy, w, h, rot });
const first = FRAMES[0];
const state = {
  cam: first.cam,
  wordmark: first.wordmark,
  adies: first.adies,
  masks: first.masks,
  cars: first.cars,
  red: carVars(first.red),
  teal: carVars(first.teal),
};
el.mask6.setAttribute("d", first.m6);
el.mask5.setAttribute("d", first.m5);

function placeCar(node, c) {
  node.setAttribute("x", -c.w / 2);
  node.setAttribute("y", -c.h / 2);
  node.setAttribute("width", c.w);
  node.setAttribute("height", c.h);
  node.setAttribute("transform", `translate(${c.cx} ${c.cy}) rotate(${c.rot})`);
}

function render() {
  // Zoom in log space so the push-in feels constant-speed, pinned on ZOOM_FOCUS.
  const s = ZOOM.scale ** state.cam;
  const tx = ZOOM_FOCUS.x * (1 - s);
  const ty = ZOOM_FOCUS.y * (1 - s);
  el.world.setAttribute("transform", `matrix(${s} 0 0 ${s} ${tx} ${ty})`);
  el.wordmark.style.opacity = state.wordmark;
  el.adies.style.opacity = state.adies;
  el.masks.style.opacity = state.masks;
  el.cars.style.opacity = state.cars;
  placeCar(el.red, state.red);
  placeCar(el.teal, state.teal);
}

// ---- Timeline ---------------------------------------------------------------

// One Figma "smart animate" step: every layer tweens to frame `id`'s state.
function morph(id, duration, ease = "none") {
  const f = frameById(id);
  return gsap
    .timeline({ defaults: { duration, ease } })
    .to(state.red, carVars(f.red), 0)
    .to(state.teal, carVars(f.teal), 0)
    .to(state, { cam: f.cam, wordmark: f.wordmark, masks: f.masks, cars: f.cars }, 0)
    .to(el.mask6, { morphSVG: f.m6 }, 0)
    .to(el.mask5, { morphSVG: f.m5 }, 0);
}

// Solve ease(t) = p, to find when an eased run passes a given frame.
function invertEase(ease, p) {
  const fn = gsap.parseEase(ease);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const refresh = () => {
  render();
  syncUI();
};

const tl = gsap.timeline({
  paused: true,
  repeat: -1,
  repeatDelay: 1.4,
  onUpdate: refresh,
  onComplete: () => setPlaying(false),
});

const mark = (id, time = tl.duration()) => tl.addLabel(`f${id}`, time);
const hold = (duration) => tl.to({}, { duration });

// Several frames as one continuous move: linear between keyframes (so the cars
// don't stop at every frame), with a single ease over the whole run.
function drive(ids, stepDuration, ease) {
  const chain = gsap.timeline({ paused: true });
  for (const id of ids) chain.add(morph(id, stepDuration));
  const start = tl.duration();
  const total = chain.duration();
  tl.add(chain.tweenFromTo(0, total, { ease, immediateRender: false }), start);
  ids.forEach((id, i) => mark(id, start + total * invertEase(ease, (i + 1) / ids.length)));
}

mark(2, 0);
hold(0.35);

// Frames 2 → 9: the cars drive in and draw the "R" as the masks morph away.
drive([3, 4, 5, 6, 7, 8, 9], 0.4, "sine.inOut");
hold(0.2);

// 9 → 10: camera pushes in on "Ro"; "adies" fades as it slides out of shot.
tl.add(morph(10, 1.2, "power2.inOut").to(state, { adies: 0, duration: 0.8, ease: "power1.in" }, 0));
mark(10);

// 10 → 11: the conversation.
tl.to(bubbleLeft, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }, "+=0.15");
tl.to(bubbleRight, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }, "+=0.3");
mark(11);
hold(1.5);

// 11 → 12: bubbles go away.
tl.to([bubbleRight, bubbleLeft], { scale: 0.6, opacity: 0, duration: 0.3, ease: "power1.in", stagger: 0.08 });
mark(12);
hold(0.15);

// 12 → 13: zoom back out; "adies" slides back in.
tl.add(morph(13, 1.1, "power2.inOut").to(state, { adies: 1, duration: 0.8, ease: "power1.out" }, 0.3));
mark(13);

// 13 → 16: the cars settle, the masks drop to reveal the full "R", the cars fade out.
drive([14, 15, 16], 0.5, "sine.inOut");

// ---- Controls ---------------------------------------------------------------

const ui = {
  play: $("play"),
  replay: $("replay"),
  prev: $("prev"),
  next: $("next"),
  scrub: $("scrub"),
  frame: $("frame"),
  loop: $("loop"),
  speeds: [...document.querySelectorAll("[data-speed]")],
};

const frameMarks = Object.entries(tl.labels)
  .map(([name, time]) => ({ id: name.slice(1), time }))
  .sort((a, b) => a.time - b.time);
const labelTimes = frameMarks.map((m) => m.time);

function syncUI() {
  const t = tl.time() + 1e-4; // GSAP rounds seek times; don't fall short of a label.
  const current = frameMarks.findLast((m) => m.time <= t) ?? frameMarks[0];
  ui.scrub.value = Math.round(tl.progress() * 1000);
  ui.frame.textContent = `Frame ${current.id}`;
}

function setPlaying(playing) {
  if (playing) {
    if (tl.progress() === 1 && tl.repeat() === 0) tl.restart();
    else tl.play();
  } else {
    tl.pause();
  }
  ui.play.textContent = playing ? "Pause" : "Play";
  ui.play.setAttribute("aria-pressed", String(playing));
}

function seekFrame(direction) {
  const t = tl.time();
  const target =
    direction > 0
      ? labelTimes.find((time) => time > t + 1e-3)
      : labelTimes.findLast((time) => time < t - 1e-3);
  if (target === undefined) return;
  setPlaying(false);
  // seek() suppresses onUpdate by default, so redraw by hand.
  tl.seek(target);
  refresh();
}

ui.play.addEventListener("click", () => setPlaying(tl.paused()));
ui.replay.addEventListener("click", () => {
  tl.restart();
  setPlaying(true);
});
ui.prev.addEventListener("click", () => seekFrame(-1));
ui.next.addEventListener("click", () => seekFrame(1));

ui.scrub.addEventListener("input", () => {
  setPlaying(false);
  tl.progress(ui.scrub.value / 1000);
  refresh();
});

ui.loop.addEventListener("change", () => {
  const p = tl.progress();
  tl.repeat(ui.loop.checked ? -1 : 0);
  tl.progress(p);
  refresh();
});

for (const button of ui.speeds) {
  button.addEventListener("click", () => {
    tl.timeScale(Number(button.dataset.speed));
    for (const b of ui.speeds) b.setAttribute("aria-pressed", String(b === button));
  });
}

document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    setPlaying(tl.paused());
  } else if (e.key === "ArrowRight") {
    seekFrame(1);
  } else if (e.key === "ArrowLeft") {
    seekFrame(-1);
  } else if (e.key.toLowerCase() === "r") {
    tl.restart();
    setPlaying(true);
  }
});

// ---- Start --------------------------------------------------------------------

refresh();

const preload = (src) => {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => {});
};

Promise.all([preload(redCarUrl), preload(tealCarUrl)]).then(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tl.progress(1);
    setPlaying(false);
    refresh();
  } else {
    setPlaying(true);
  }
});
