// Hands-free commands ("Connect", "Random") using the browser's speech recognition.
//
// Supported in Chrome, Edge and Safari. Firefox has no speech recognition, so the
// app falls back to tap targets there. Note that Chrome sends the audio to Google's
// speech service to transcribe it.

const Recognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export const voiceCommandsSupported = () => Boolean(Recognition());

/**
 * Listens until one of `commands` is heard, then stops and calls it.
 * `commands` maps a keyword to a callback, e.g. { connect: () => ..., random: () => ... }.
 * Matching is on word starts, so "connect me" and "Connected" both count.
 *
 * Callbacks:
 *   onHeard(text)   what was heard so far, for feedback on screen
 *   onError(reason) "blocked" (mic permission denied) or "unavailable"
 *
 * Returns { stop() }.
 */
export function listenForCommands(commands, { onHeard = () => {}, onError = () => {} } = {}) {
  const Rec = Recognition();
  if (!Rec) {
    onError("unavailable");
    return { stop() {} };
  }

  const patterns = Object.entries(commands).map(([word, run]) => [new RegExp(`\\b${word}`, "i"), run]);
  const rec = new Rec();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = true; // react mid-sentence instead of waiting for a pause

  let active = true;
  const stop = () => {
    active = false;
    rec.abort();
  };

  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript.trim();
      if (!text) continue;
      onHeard(text);
      const match = patterns.find(([pattern]) => pattern.test(text));
      if (match) {
        stop();
        match[1]();
        return;
      }
    }
  };

  rec.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
      active = false;
      onError("blocked");
    } else if (event.error === "network" || event.error === "language-not-supported") {
      active = false;
      onError("unavailable");
    }
    // "no-speech" and "aborted" just end the session; onend restarts it.
  };

  // Browsers end recognition after a stretch of silence; keep listening.
  rec.onend = () => {
    if (!active) return;
    try {
      rec.start();
    } catch {
      active = false;
      onError("unavailable");
    }
  };

  try {
    rec.start();
  } catch {
    active = false;
    onError("unavailable");
  }
  return { stop };
}

// Short spoken confirmation, so drivers don't need to look at the screen.
export function say(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
