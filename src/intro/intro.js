// The Roadies intro: two cars draw the "R", chat, then settle into the wordmark.
// Built from the Figma storyboard (frames 2–16), paced as a ~3.4s app intro.

import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { FRAMES, ZOOM, ZOOM_FOCUS, BUBBLES, frameById } from "./frames.js";
import { WORDMARK, BUBBLE_TEXT, BUBBLE_TAIL } from "./shapes.js";
import { RED_CAR, TEAL_CAR } from "../lib/assets.js";

gsap.registerPlugin(MorphSVGPlugin);

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Plays the intro in `stage` (the element holding the intro <svg>).
 * Starts after `delayMs`; tapping the stage skips to the end.
 * Resolves once the final wordmark is on screen.
 */
export function playIntro(stage, { delayMs = 1 } = {}) {
  const q = (id) => stage.querySelector(`#${id}`);
  const el = {
    world: q("world"),
    wordmark: q("wordmark"),
    ro: q("ro"),
    adies: q("adies"),
    masks: q("masks"),
    mask6: q("mask6"),
    mask5: q("mask5"),
    cars: q("cars"),
    red: q("car-red"),
    teal: q("car-teal"),
    bubbles: q("bubbles"),
  };

  el.wordmark.setAttribute("transform", `translate(${WORDMARK.x} ${WORDMARK.y})`);
  el.ro.setAttribute("d", WORDMARK.ro);
  el.adies.setAttribute("d", WORDMARK.adies);
  el.red.setAttribute("href", RED_CAR);
  el.teal.setAttribute("href", TEAL_CAR);

  const svg = (tag, attrs, parent) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent.appendChild(node);
    return node;
  };

  const buildBubble = ({ text, ellipse: e, tail: t, origin }) => {
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
  };

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

  const placeCar = (node, c) => {
    node.setAttribute("x", -c.w / 2);
    node.setAttribute("y", -c.h / 2);
    node.setAttribute("width", c.w);
    node.setAttribute("height", c.h);
    node.setAttribute("transform", `translate(${c.cx} ${c.cy}) rotate(${c.rot})`);
  };

  const render = () => {
    // Zoom in log space so the push-in feels constant-speed, pinned on ZOOM_FOCUS.
    const s = ZOOM.scale ** state.cam;
    el.world.setAttribute("transform", `matrix(${s} 0 0 ${s} ${ZOOM_FOCUS.x * (1 - s)} ${ZOOM_FOCUS.y * (1 - s)})`);
    el.wordmark.style.opacity = state.wordmark;
    el.adies.style.opacity = state.adies;
    el.masks.style.opacity = state.masks;
    el.cars.style.opacity = state.cars;
    placeCar(el.red, state.red);
    placeCar(el.teal, state.teal);
  };

  // One Figma "smart animate" step: every layer tweens to frame `id`'s state.
  // Pass { camera: false } when the zoom is driven by its own tween.
  const morph = (id, duration, ease = "none", { camera = true } = {}) => {
    const f = frameById(id);
    const layers = { wordmark: f.wordmark, masks: f.masks, cars: f.cars };
    if (camera) layers.cam = f.cam;
    return gsap
      .timeline({ defaults: { duration, ease } })
      .to(state.red, carVars(f.red), 0)
      .to(state.teal, carVars(f.teal), 0)
      .to(state, layers, 0)
      .to(el.mask6, { morphSVG: f.m6 }, 0)
      .to(el.mask5, { morphSVG: f.m5 }, 0);
  };

  const tl = gsap.timeline({ paused: true, onUpdate: render });

  // Several frames as one continuous move: linear between keyframes (so the cars
  // don't stop at every frame), with a single ease over the whole run.
  // `steps` is [[frameId, seconds], ...]. Returns when each frame is reached.
  const drive = (steps, ease, morphOptions) => {
    const chain = gsap.timeline({ paused: true });
    const offsets = steps.map(([id, duration]) => {
      chain.add(morph(id, duration, "none", morphOptions));
      return [id, chain.duration()];
    });
    const start = tl.duration();
    const total = chain.duration();
    tl.add(chain.tweenFromTo(0, total, { ease, immediateRender: false }), start);
    return Object.fromEntries(offsets.map(([id, offset]) => [id, start + total * invertEase(ease, offset / total)]));
  };

  tl.to({}, { duration: 0.1 });

  // 2 → 10 as one move: the cars draw the "R" (masks morph away) and the camera
  // pushes in on "Ro" as "adies" leaves the shot. The cars barely move between
  // frames 9 and 10, so the push starts at frame 8 to keep the motion going.
  const drawn = drive([...[3, 4, 5, 6, 7, 8, 9].map((id) => [id, 0.12]), [10, 0.4]], "sine.inOut", { camera: false });
  tl.to(state, { cam: 1, duration: drawn[10] - drawn[8], ease: "power2.inOut" }, drawn[8]);
  tl.to(state, { adies: 0, duration: (drawn[10] - drawn[9]) * 0.7, ease: "power1.in" }, drawn[9]);

  // 10 → 12: the conversation.
  tl.to(bubbleLeft, { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(2)" }, drawn[10]);
  tl.to(bubbleRight, { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(2)" }, "+=0.05");
  tl.to({}, { duration: 0.45 });
  tl.to([bubbleRight, bubbleLeft], { scale: 0.6, opacity: 0, duration: 0.15, ease: "power1.in", stagger: 0.03 });

  // 12 → 16 as one move: the camera pulls back while the cars keep rolling into
  // place. Then the masks drop to reveal the full "R" and the cars fade out.
  const pullBackStart = tl.duration();
  const settled = drive([[13, 0.4], [14, 0.15], [15, 0.2], [16, 0.2]], "sine.inOut", { camera: false });
  const pullBack = settled[13] - pullBackStart; // camera lands exactly on frame 13
  tl.to(state, { cam: 0, duration: pullBack, ease: "power2.inOut" }, pullBackStart);
  tl.to(state, { adies: 1, duration: pullBack * 0.75, ease: "power1.out" }, pullBackStart + pullBack * 0.25);

  render();

  return new Promise((resolve) => {
    const skip = () => tl.progress(1);
    stage.addEventListener("pointerdown", skip);
    tl.eventCallback("onComplete", () => {
      stage.removeEventListener("pointerdown", skip);
      resolve();
    });
    setTimeout(() => tl.play(), delayMs);
  });
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
