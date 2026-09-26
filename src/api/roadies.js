// The one place the frontend talks to the backend.
//
// Everything here is mocked for now (data in ./mock.js) so the app runs on its own.
// To hook up the real backend, replace these function bodies with real calls
// (REST for the lists, a WebSocket/WebRTC connection for the voice session)
// and keep the shapes below. The screens only depend on these shapes.

import { MOCK_JAM, MOCK_CHATS, MOCK_NEAREST_CHAT_ID, MOCK_NEWCOMER } from "./mock.js";

/**
 * @typedef {Object} Jam
 * @property {string} id
 * @property {string} road          e.g. "I-880 N"
 * @property {string} near          landmark or exit, e.g. "Oakland Coliseum"
 * @property {number} drivers       Roadies users stuck in this jam
 *
 * @typedef {Object} Participant
 * @property {string} id
 * @property {string} name
 * @property {string} detail        where they are, e.g. "2 cars ahead"
 * @property {boolean} muted
 * @property {boolean} [isYou]
 *
 * @typedef {Object} VoiceChat
 * @property {string} id
 * @property {string} name
 * @property {string} topic
 *
 * @typedef {Object} VoiceSession
 * @property {Participant[]} participants   everyone in the chat, you first
 * @property {(event: "participants" | "speaking", cb: Function) => () => void} on
 *   "participants" -> cb(list) whenever someone joins, leaves or (un)mutes.
 *   "speaking"     -> cb(participantId, isSpeaking) as people talk.
 *   Returns an unsubscribe function.
 * @property {(enabled: boolean, stream?: MediaStream) => void} setMicEnabled
 *   Start/stop sending your microphone. `stream` comes from lib/mic.js.
 * @property {(connected: boolean) => void} setAudioConnected
 *   Start/stop receiving everyone else's audio.
 * @property {() => void} leave
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The jam the user is currently stuck in.
 * @param {GeolocationCoordinates | null} coords  null if location is unavailable
 * @returns {Promise<Jam>}
 */
export async function getCurrentJam(coords) {
  await delay(700);
  return { ...MOCK_JAM };
}

/**
 * Picks a voice chat for the user. Drivers don't browse a list; they say a word:
 *   "nearest" ("Connect") -> the room with the drivers closest to them in the jam
 *   "random"  ("Random")  -> any room
 * @param {string} jamId
 * @param {"nearest" | "random"} mode
 * @param {GeolocationCoordinates | null} coords
 * @returns {Promise<VoiceChat>}
 */
export async function findVoiceChat(jamId, mode, coords) {
  await delay(400);
  const chat =
    mode === "random"
      ? MOCK_CHATS[Math.floor(Math.random() * MOCK_CHATS.length)]
      : MOCK_CHATS.find((c) => c.id === MOCK_NEAREST_CHAT_ID);
  const { people, ...info } = chat;
  return info;
}

/**
 * Join a voice chat. You start muted with audio connected.
 * @returns {Promise<VoiceSession>}
 */
export async function joinVoiceChat(chatId) {
  await delay(500);
  const chat = MOCK_CHATS.find((c) => c.id === chatId);
  if (!chat) throw new Error(`No voice chat with id ${chatId}`);
  return new MockVoiceSession(chat.people);
}

// Pretends to be a live voice chat: people take turns talking and someone new joins.
class MockVoiceSession {
  #listeners = { participants: new Set(), speaking: new Set() };
  #timers = new Set();
  #speaking = new Set();

  constructor(people) {
    this.participants = [
      { id: "me", name: "You", detail: "That's you", muted: true, isYou: true },
      ...people.map((p) => ({ ...p })),
    ];
    this.#later(() => this.#nextTalker(), 700);
    this.#later(() => {
      this.participants = [...this.participants, { ...MOCK_NEWCOMER }];
      this.#emit("participants", this.participants);
    }, 9000);
  }

  on(event, cb) {
    this.#listeners[event].add(cb);
    return () => this.#listeners[event].delete(cb);
  }

  setMicEnabled(enabled, stream) {
    // Real version: add/remove `stream`'s audio track on the peer connection.
    this.participants = this.participants.map((p) => (p.isYou ? { ...p, muted: !enabled } : p));
    this.#emit("participants", this.participants);
  }

  setAudioConnected(connected) {
    // Real version: pause/resume incoming audio tracks.
  }

  leave() {
    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();
    for (const set of Object.values(this.#listeners)) set.clear();
  }

  #nextTalker() {
    const quiet = this.participants.filter((p) => !p.isYou && !p.muted && !this.#speaking.has(p.id));
    if (quiet.length) {
      const p = quiet[Math.floor(Math.random() * quiet.length)];
      this.#speaking.add(p.id);
      this.#emit("speaking", p.id, true);
      this.#later(() => {
        this.#speaking.delete(p.id);
        this.#emit("speaking", p.id, false);
      }, 900 + Math.random() * 2200);
    }
    this.#later(() => this.#nextTalker(), 700 + Math.random() * 1600);
  }

  #later(fn, ms) {
    const timer = setTimeout(() => {
      this.#timers.delete(timer);
      fn();
    }, ms);
    this.#timers.add(timer);
  }

  #emit(event, ...args) {
    for (const cb of this.#listeners[event]) cb(...args);
  }
}

/**
 * Best-effort location for finding the user's jam. Resolves null if the user
 * says no, the browser can't tell, or it takes too long.
 * @returns {Promise<GeolocationCoordinates | null>}
 */
export function locate(timeoutMs = 4000) {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const giveUp = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(giveUp);
        resolve(pos.coords);
      },
      () => {
        clearTimeout(giveUp);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: timeoutMs },
    );
  });
}
