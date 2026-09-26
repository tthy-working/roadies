// "Your jam": the jam you're stuck in, and a hands-free way into a voice chat.
//
// Drivers shouldn't be tapping their phones, so this screen listens for
// "Connect" (the room with the drivers nearest you) or "Random" (any room).
// The same two options are big tap targets for passengers, and for browsers
// without speech recognition.

import { MapPin, Mic, MicOff, ShieldCheck, Users } from "lucide";
import { findVoiceChat, getCurrentJam, locate } from "../api/roadies.js";
import { WORDMARK } from "../intro/shapes.js";
import { RED_CAR, TEAL_CAR } from "../lib/assets.js";
import { display, esc, icon, toast } from "../lib/dom.js";
import { listenForCommands, say } from "../lib/voice-commands.js";

const MODES = {
  nearest: {
    word: "Connect",
    desc: "Chat with the drivers nearest you",
    status: "Connecting you to drivers nearby…",
    spoken: "Connecting you to the drivers nearest you.",
  },
  random: {
    word: "Random",
    desc: "Hop into a random room",
    status: "Finding you a random room…",
    spoken: "Finding you a random room.",
  },
};

const wordmark = `
  <svg class="wordmark" viewBox="0 0 297 57" role="img" aria-label="Roadies">
    <path d="${WORDMARK.ro}" /><path d="${WORDMARK.adies}" />
  </svg>`;

const safety = `
  <p class="safety">${icon(ShieldCheck, { size: 18 })} Hands-free only. Keep your eyes on the road.</p>`;

let cached = null; // { jam, coords } after the first load

/**
 * Renders the screen into `root` and starts listening for a command.
 * `onMatched(jam, chat)` fires once a room has been picked.
 * Returns { close() }, which stops listening; call it when leaving the screen.
 */
export function showHome(root, { onMatched }) {
  const $ = (sel) => root.querySelector(sel);
  let closed = false;
  let busy = false;
  let listener = null;

  const setState = (state, status, detail = "") => {
    $("[data-voice]").dataset.state = state;
    $("[data-status]").textContent = status;
    $("[data-heard]").textContent = detail;
    const orb = $("[data-orb]");
    const canRetry = state === "blocked" || state === "unavailable";
    orb.disabled = !canRetry;
    orb.innerHTML = icon(canRetry ? MicOff : Mic, { size: 38 });
    orb.setAttribute("aria-label", canRetry ? "Try listening again" : "Listening");
    $("[data-say]").textContent = canRetry ? "Or tap one" : "Just say";
  };

  const listen = () => {
    listener?.stop();
    setState("listening", "Listening…");
    listener = listenForCommands(
      { connect: () => choose("nearest"), random: () => choose("random") },
      {
        onHeard: (text) => {
          $("[data-heard]").textContent = `Heard “${text}”`;
        },
        onError: (reason) => {
          if (reason === "blocked") {
            setState("blocked", "Roadies can't hear you", "Allow the microphone, then tap the mic. Or tap an option.");
          } else {
            setState("unavailable", "Voice commands aren't available here", "Tap an option below instead.");
          }
        },
      },
    );
  };

  const choose = async (mode) => {
    if (busy || closed) return;
    busy = true;
    listener?.stop();
    const { status, spoken } = MODES[mode];
    setState("connecting", status);
    for (const button of root.querySelectorAll("[data-mode]")) {
      button.classList.toggle("is-chosen", button.dataset.mode === mode);
      button.disabled = true;
    }
    say(spoken);

    try {
      const chat = await findVoiceChat(cached.jam.id, mode, cached.coords);
      if (!closed) onMatched(cached.jam, chat);
    } catch {
      busy = false;
      toast("Couldn't find a room. Try again.");
      for (const button of root.querySelectorAll("[data-mode]")) {
        button.classList.remove("is-chosen");
        button.disabled = false;
      }
      listen();
    }
  };

  (async () => {
    if (!cached) {
      root.innerHTML = loadingTemplate();
      const coords = await locate();
      const jam = await getCurrentJam(coords);
      cached = { jam, coords };
    }
    if (closed) return;
    root.innerHTML = template(cached.jam);
    for (const button of root.querySelectorAll("[data-mode]")) {
      button.addEventListener("click", () => choose(button.dataset.mode));
    }
    $("[data-orb]").addEventListener("click", listen);
    listen();
  })();

  return {
    close() {
      closed = true;
      listener?.stop();
    },
  };
}

function loadingTemplate() {
  return `
    <header class="home-top">${wordmark}</header>
    <section class="jam-card is-loading" aria-busy="true">
      <p class="eyebrow">Finding your jam…</p>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-chips"></div>
    </section>
    ${safety}`;
}

function template(jam) {
  const command = (mode) => `
    <button class="command" type="button" data-mode="${mode}">
      <span class="command-word">“${MODES[mode].word}”</span>
      <span class="command-desc">${MODES[mode].desc}</span>
    </button>`;

  return `
    <header class="home-top">${wordmark}</header>

    <section class="jam-card" aria-labelledby="jam-road">
      <div class="jam-cars" aria-hidden="true">
        <img src="${RED_CAR}" alt="" /><img src="${TEAL_CAR}" alt="" />
      </div>
      <p class="eyebrow">You're stuck on</p>
      <h1 id="jam-road" class="jam-road">${display(jam.road)}</h1>
      <p class="jam-near">${icon(MapPin, { size: 16 })} near ${esc(jam.near)}</p>
      <p class="jam-drivers">${icon(Users, { size: 16 })} <span><strong>${jam.drivers}</strong> drivers nearby</span></p>
    </section>

    <section class="voice" data-voice data-state="listening" aria-labelledby="voice-status">
      <button class="orb" type="button" data-orb disabled></button>
      <p id="voice-status" class="voice-status" data-status aria-live="polite"></p>
      <p class="voice-heard" data-heard></p>
      <p class="say-label" data-say>Just say</p>
      <div class="commands">
        ${command("nearest")}
        ${command("random")}
      </div>
    </section>

    ${safety}`;
}
