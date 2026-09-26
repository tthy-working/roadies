# Roadies

Roadies is a social voice app for people stuck in traffic. Hop into a live voice chat with the drivers in your jam, chat, joke around, and turn an annoying traffic jam into a fun hangout.

This repo is the frontend. The backend calls are mocked, so the whole app runs on its own (see [Hooking up the backend](#hooking-up-the-backend)).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. On a computer it shows in a phone-sized frame; on a phone it fills the screen.

## Screens

1. **Intro**: the Roadies logo animation (from the Figma storyboard) plays as soon as the app opens, holds on the logo for a moment, then goes straight to Your jam. There's no button to press. Tap anywhere during the intro to skip it. The whole intro is a single SVG canvas, so every object stays locked in place and scales together on any screen size.
2. **Your jam**: the road you're stuck on and how many drivers are nearby. Drivers shouldn't be tapping their phones, so this screen **listens for a voice command**:
   - Say **"Connect"** to join the room with the drivers nearest you.
   - Say **"Random"** to join a random room.

   Roadies confirms out loud ("Connecting you to the drivers nearest you.") so you don't need to look. The two options are also big buttons, for passengers and for browsers without speech recognition (Firefox). Voice commands use the browser's built-in speech recognition (Chrome, Edge, Safari); Chrome sends that audio to Google to transcribe it.
3. **Voice chat**: everyone in the chat, with a ring around whoever is talking. The controls at the bottom are:
   - **Mic**: turn your microphone on/off. You join muted.
   - **Audio**: connect/disconnect from the chat audio. Disconnecting also mutes you; turning your mic on reconnects.
   - **Leave**: back to Your jam.

## Brand

| Token | Color | Used for |
| --- | --- | --- |
| `--orange` | `#F4682C` | Logo, main actions (Connect / Random, Leave) |
| `--teal` | `#137584` | Jam card, "on" controls, speaking ring |
| `--cream` | `#FFFCEE` | Backgrounds |
| `--ink` | `#2A1F1F` | Text, controls bar |

Headings use **Bepory** and everything else uses **Roboto** (400 / 500 / 700, bundled via `@fontsource/roboto`).

> **Bepory is licensed for personal use only, and its license forbids re-uploading it**, so it is not in this repo. To see it, install Bepory on your computer, or put `Bepory.otf` in `public/fonts/` (that folder is git-ignored). Without it, headings fall back to Roboto. The logo and the intro's speech bubbles are vector outlines, so they look right either way. Get a commercial license from [Rantau Studio](https://rantaustudio.com/) before launching.

## Project layout

```
src/
  main.js            app start-up and screen switching
  intro/             the logo animation (keyframes from Figma frames 2–16)
  screens/home.js    Your jam
  screens/room.js    Voice chat
  api/roadies.js     every backend call (mocked for now)
  api/mock.js        the fake jam, chats and people
  lib/voice-commands.js  listens for "Connect" / "Random", speaks confirmations
  lib/mic.js         microphone capture + "am I talking?" detection
  lib/dom.js         small helpers (escaping, icons, toasts, avatar colors)
  styles/            one stylesheet per screen, brand tokens in base.css
```

## Hooking up the backend

The screens never talk to the server directly. Everything goes through `src/api/roadies.js`. To connect the real backend, replace the bodies of these functions and keep the shapes they return (they're documented with JSDoc in that file):

| Function | Returns | Notes |
| --- | --- | --- |
| `getCurrentJam(coords)` | `Jam` (`id`, `road`, `near`, `drivers`) | `coords` comes from the browser's location, or `null` if the user said no |
| `findVoiceChat(jamId, mode, coords)` | `VoiceChat` (`id`, `name`, `topic`) | `mode` is `"nearest"` (they said "Connect") or `"random"` (they said "Random") |
| `joinVoiceChat(chatId)` | `VoiceSession` | Open the socket / WebRTC connection here |

A `VoiceSession` needs:

- `participants`: everyone in the chat, with you first (`isYou: true`)
- `on("participants", cb)`: call `cb(list)` when someone joins, leaves, or mutes
- `on("speaking", cb)`: call `cb(participantId, isSpeaking)` as people talk
- `setMicEnabled(enabled, stream)`: start/stop sending your mic. `stream` is the `MediaStream` from `lib/mic.js`
- `setAudioConnected(connected)`: start/stop playing everyone else's audio
- `leave()`: disconnect and clean up

`MockVoiceSession` in the same file is a working example of all of this.

## Stack

[Vite](https://vite.dev), [GSAP](https://gsap.com) (the intro, including MorphSVGPlugin), [Lucide](https://lucide.dev) icons and plain JavaScript. There's no framework.
