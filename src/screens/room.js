// The voice chat: who's here, who's talking, and your mic / audio / leave controls.

import { gsap } from "gsap";
import { Car, HeadphoneOff, Headphones, MapPin, Mic, MicOff, PhoneOff } from "lucide";
import { joinVoiceChat } from "../api/roadies.js";
import { display, esc, icon, initials, toast, tone } from "../lib/dom.js";
import { startMic } from "../lib/mic.js";

/**
 * Renders the chat into `root` and joins it.
 * `onLeave(chat)` fires after the user leaves (or joining fails).
 */
export function showRoom(root, { jam, chat, onLeave }) {
  root.innerHTML = template(jam, chat);
  const $ = (sel) => root.querySelector(sel);
  const ui = {
    count: $("[data-count]"),
    banner: $("[data-banner]"),
    hint: $("[data-hint]"),
    people: $("[data-people]"),
    mic: $("[data-mic]"),
    audio: $("[data-audio]"),
    leave: $("[data-leave]"),
    reconnect: $("[data-reconnect]"),
  };

  let session = null;
  let mic = null; // from startMic(), while the mic is on
  let micOn = false;
  let micPending = false;
  let audioOn = true;
  let left = false;
  const speaking = new Set();
  let shownIds = new Set();

  // ---- Rendering ----

  const renderPeople = (participants) => {
    ui.people.innerHTML = participants.map(personTemplate).join("");
    for (const id of speaking) setSpeakingClass(id, true);

    // Pop in anyone who wasn't on screen before.
    const newcomers = [...ui.people.children].filter((li) => shownIds.size && !shownIds.has(li.dataset.id));
    if (newcomers.length) {
      gsap.from(newcomers, { scale: 0.6, autoAlpha: 0, duration: 0.35, ease: "back.out(2)", stagger: 0.05 });
    }
    shownIds = new Set(participants.map((p) => p.id));
    ui.count.textContent = `${participants.length} ${participants.length === 1 ? "driver" : "drivers"}`;
  };

  const setSpeakingClass = (id, isSpeaking) => {
    const li = ui.people.querySelector(`[data-id="${CSS.escape(id)}"]`);
    li?.classList.toggle("is-speaking", isSpeaking);
  };

  const setSpeaking = (id, isSpeaking) => {
    if (isSpeaking) speaking.add(id);
    else speaking.delete(id);
    setSpeakingClass(id, isSpeaking);
  };

  const renderControls = () => {
    ui.mic.setAttribute("aria-pressed", String(micOn));
    ui.mic.querySelector(".ctl-icon").innerHTML = icon(micOn ? Mic : MicOff, { size: 26 });
    ui.mic.querySelector(".ctl-label").textContent = micOn ? "Mic on" : "Mic off";
    ui.mic.setAttribute("aria-label", micOn ? "Turn microphone off" : "Turn microphone on");
    ui.mic.disabled = !session || micPending;

    ui.audio.setAttribute("aria-pressed", String(audioOn));
    ui.audio.querySelector(".ctl-icon").innerHTML = icon(audioOn ? Headphones : HeadphoneOff, { size: 26 });
    ui.audio.querySelector(".ctl-label").textContent = audioOn ? "Audio on" : "Audio off";
    ui.audio.setAttribute("aria-label", audioOn ? "Disconnect audio" : "Connect audio");
    ui.audio.disabled = !session;

    ui.banner.hidden = audioOn;
    ui.hint.hidden = !session || micOn || !audioOn;
  };

  // ---- Actions ----

  const setMic = async (on) => {
    if (on === micOn || micPending) return;
    if (!on) {
      mic?.stop();
      mic = null;
      micOn = false;
      session.setMicEnabled(false);
      renderControls();
      return;
    }

    // You can't talk into a chat you can't hear, so turning the mic on reconnects audio.
    if (!audioOn) setAudio(true);
    micPending = true;
    renderControls();
    try {
      mic = await startMic((isSpeaking) => setSpeaking("me", isSpeaking));
      if (left) return mic.stop();
      micOn = true;
      session.setMicEnabled(true, mic.stream);
    } catch {
      toast("Allow microphone access to talk");
    } finally {
      micPending = false;
      renderControls();
    }
  };

  const setAudio = (on) => {
    if (on === audioOn) return;
    audioOn = on;
    session.setAudioConnected(on);
    // Disconnecting audio also mutes you, like hanging up the speakerphone.
    if (!on && micOn) setMic(false);
    renderControls();
  };

  const leave = () => {
    if (left) return;
    left = true;
    mic?.stop();
    session?.leave();
    onLeave(chat);
  };

  ui.mic.addEventListener("click", () => setMic(!micOn));
  ui.audio.addEventListener("click", () => setAudio(!audioOn));
  ui.reconnect.addEventListener("click", () => setAudio(true));
  ui.leave.addEventListener("click", leave);

  // ---- Join ----

  renderControls();
  joinVoiceChat(chat.id)
    .then((s) => {
      if (left) return s.leave();
      session = s;
      session.on("participants", renderPeople);
      session.on("speaking", setSpeaking);
      renderPeople(session.participants);
      renderControls();
    })
    .catch(() => {
      toast("Couldn't join that chat. Try again.");
      leave();
    });
}

function template(jam, chat) {
  return `
    <header class="room-top">
      <div class="room-tags">
        <span class="live"><span class="live-dot"></span>Live</span>
        <span class="road-tag">${icon(MapPin, { size: 14 })} ${esc(jam.road)}</span>
      </div>
      <h1 class="room-title">${display(chat.name)}</h1>
      <p class="room-sub"><span data-count>Connecting…</span> · ${esc(chat.topic)}</p>
    </header>

    <div class="room-banner" data-banner role="status" hidden>
      ${icon(HeadphoneOff, { size: 20 })}
      <span>Audio's off. You can't hear the chat.</span>
      <button class="link-btn" type="button" data-reconnect>Reconnect</button>
    </div>
    <p class="room-hint" data-hint hidden>You're muted. Tap the mic to talk.</p>

    <ul class="people" data-people aria-label="People in this chat">
      <li class="connecting">Pulling up to the chat…</li>
    </ul>

    <nav class="controls" aria-label="Voice controls">
      <button class="ctl" type="button" data-mic aria-pressed="false">
        <span class="ctl-icon"></span><span class="ctl-label"></span>
      </button>
      <button class="ctl" type="button" data-audio aria-pressed="true">
        <span class="ctl-icon"></span><span class="ctl-label"></span>
      </button>
      <button class="ctl ctl-leave" type="button" data-leave aria-label="Leave the chat">
        <span class="ctl-icon">${icon(PhoneOff, { size: 26 })}</span><span class="ctl-label">Leave</span>
      </button>
    </nav>`;
}

function personTemplate(p) {
  const face = p.isYou ? icon(Car, { size: 32 }) : esc(initials(p.name));
  const status = p.muted ? ", muted" : "";
  return `
    <li class="person${p.muted ? " is-muted" : ""}" data-id="${esc(p.id)}">
      <span class="avatar tone-${p.isYou ? "orange" : tone(p.id)}" aria-hidden="true">
        ${face}
        <span class="muted-badge">${icon(MicOff, { size: 13, stroke: 2.4 })}</span>
      </span>
      <p class="person-name">${esc(p.name)}<span class="sr-only">${status}</span></p>
      <p class="person-detail">${esc(p.detail)}</p>
    </li>`;
}
