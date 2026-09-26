import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./styles/base.css";
import "./styles/intro.css";
import "./styles/home.css";
import "./styles/room.css";

import { gsap } from "gsap";
import { playIntro } from "./intro/intro.js";
import { showHome } from "./screens/home.js";
import { showRoom } from "./screens/room.js";
import { toast } from "./lib/dom.js";

const screens = {
  intro: document.getElementById("screen-intro"),
  home: document.getElementById("screen-home"),
  room: document.getElementById("screen-room"),
};
let current = "intro";

// Cross-fade to another screen; the new one rises in slightly.
function go(name) {
  const from = screens[current];
  const to = screens[name];
  if (from === to) return;
  current = name;
  to.hidden = false;
  to.scrollTop = 0;
  gsap.fromTo(to, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", clearProps: "transform" });
  gsap.to(from, {
    autoAlpha: 0,
    duration: 0.25,
    ease: "power1.out",
    onComplete: () => {
      from.hidden = true;
    },
  });
}

let home = null; // the Your jam screen, while it's listening for a command

function openHome() {
  home = showHome(screens.home, { onMatched: openRoom });
  go("home");
}

function openRoom(jam, chat) {
  home?.close(); // stop listening for commands before the chat takes the mic
  home = null;
  showRoom(screens.room, {
    jam,
    chat,
    onLeave: (leftChat) => {
      openHome();
      toast(`You left ${leftChat.name}`);
    },
  });
  go("room");
}

// The intro plays 1ms after the app opens, holds on the logo for a beat, then
// goes straight to Your jam. No Start button: drivers shouldn't need to tap.
const LOGO_HOLD_MS = 600;

playIntro(document.getElementById("intro-stage"), { delayMs: 1 }).then(() => {
  setTimeout(openHome, LOGO_HOLD_MS);
});
