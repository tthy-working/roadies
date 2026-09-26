# Roadies splash animation

The Roadies logo animation, rebuilt for the web from the Figma storyboard (page 1, frames 2–16).

Two cars drive in and draw the "R" of the wordmark. The camera then pushes in so they can chat ("Wassup Beijing" / "Ni Howdy!") and pulls back out as they settle into the finished **Roadies** logo.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Controls

| Key / control | Action |
| --- | --- |
| Space | Play / pause |
| ← / → | Jump to the previous / next Figma frame |
| R | Replay |
| Slider | Scrub the whole animation |
| 1× / 0.5× / 0.25× | Playback speed |

The label next to the slider shows which Figma frame you're on, so you can compare side by side with the file.

## How it maps to the Figma file

| Frames | What happens | How it's built |
| --- | --- | --- |
| 2 → 9 | Cars drive in and draw the "R" | Smart-animate morph across every frame: cars tween position/rotation, and the white masks morph shape with GSAP MorphSVG |
| 9 → 10 | Zoom in on "Ro" | Real camera zoom (3.75×, matching the 80px → 300px type), with "adies" fading out of shot |
| 10 → 12 | The conversation | Speech bubbles pop in from their tails, then fade out |
| 12 → 13 | Zoom out | Camera pulls back and "adies" returns |
| 13 → 16 | Cars settle and the "R" completes | Masks fade to reveal the full "R", then the cars fade out |

- `src/frames.js` holds every layer's position, rotation and size for each frame, taken directly from the Figma layers.
- `src/shapes.js` holds the wordmark, bubble text and bubble tail as outlined vector paths exported from Figma, so no font files are needed.
- `src/main.js` builds the GSAP timeline and the playback controls.

## Stack

[Vite](https://vite.dev) + [GSAP](https://gsap.com) (including MorphSVGPlugin, free since GSAP 3.13). Everything renders as a single SVG.
