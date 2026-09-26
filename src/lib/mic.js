// Local microphone capture plus a simple "am I talking?" detector.
//
// The returned `stream` is what the backend's WebRTC connection should send.
// The detector only drives the speaking ring on your own avatar.

const SPEAKING_LEVEL = 0.035; // RMS of the waveform (0–1) that counts as talking
const QUIET_HOLD_MS = 350; // stay "speaking" through short pauses between words

/**
 * Asks for the microphone and starts watching its level.
 * Throws if the user blocks access or there's no microphone.
 */
export async function startMic(onSpeakingChange) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);

  const samples = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let lastLoud = 0;
  let frame = 0;

  const watch = (now) => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const v of samples) {
      const x = (v - 128) / 128;
      sum += x * x;
    }
    const level = Math.sqrt(sum / samples.length);

    if (level > SPEAKING_LEVEL) {
      lastLoud = now;
      if (!speaking) onSpeakingChange((speaking = true));
    } else if (speaking && now - lastLoud > QUIET_HOLD_MS) {
      onSpeakingChange((speaking = false));
    }
    frame = requestAnimationFrame(watch);
  };
  frame = requestAnimationFrame(watch);

  return {
    stream,
    stop() {
      cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) track.stop();
      ctx.close();
      if (speaking) onSpeakingChange(false);
    },
  };
}
