# Tea Bubble Counter ☕🫧

> A gloriously over-engineered computer-vision experiment for answering the question nobody asked: **how many bubbles are on my tea?**

Tea Bubble Counter opens your camera, looks for bright, circle-ish regions on a drink's surface, and turns the result into a completely unnecessary bubble score. It is intentionally playful—not laboratory equipment, a beverage-quality tester, or actual artificial intelligence.

## Features

- Live browser camera preview via `getUserMedia`
- Client-side Canvas image processing; no images or camera frames leave the browser
- Light-region / local-peak bubble approximation with non-maximum suppression
- Green numbered markers aligned over detected candidates
- Tea and coffee modes, scan activity verdicts, and animated result count
- Local scan archive with totals, averages, and maximum bubble count
- Premium warm, responsive UI with camera errors and scanning feedback
- No framework, build step, backend, or paid API

## Run it

This is a static website—there are no dependencies to install.

Camera permission requires a secure context, so serve the project locally instead of opening `index.html` directly.

```powershell
https://saithya0123-jpg.github.io/useless_project_temp/
```

Then visitfile:///C:/Users/Admin/OneDrive/Desktop/project%201/useless_project_temp/index.html in a current desktop or mobile browser. Choose **Start Camera**, grant permission, point it at the surface of a drink, then choose **Scan / Count Bubbles**.

If Python is unavailable, use any static-file server that serves this folder on `localhost`. For a deployed copy, use HTTPS; browsers block camera access on ordinary HTTP pages other than localhost.

## How the dubious science works

1. The current video frame is downscaled to keep scanning quick on mobile devices.
2. Each pixel is converted to luminance, and a dynamic brightness threshold is calculated from that frame.
3. Bright local maxima become bubble candidates.
4. Nearby candidates are merged (non-maximum suppression), then the strongest 55 are shown.
5. The overlay maps source coordinates using the same `object-fit: cover` crop as the video, so its markers remain visually aligned.

Glossy reflections, foam, overhead lights, and a very enthusiastic spoon can all count as bubbles. That is part of the product's charm.

## Project structure

```text
index.html  Page structure, scanner controls, results, and archive
style.css   Responsive warm/glassmorphism visual system and animations
script.js   Camera lifecycle, Canvas detection, overlay, and local history
```

## Privacy and storage

Camera access is requested only when **Start Camera** is pressed. Frames are processed in the current browser tab and are never uploaded. Scan results (drink type, count, score, and timestamp) are saved only in that browser's `localStorage`; **Clear history** removes them.

## GitHub repository link


## documentary link
https://drive.google.com/file/d/1GGj9SJfY3so-KfGCrGPDB9aDvZGwE_8v/view?usp=drivesdk

## Limitations

This is a light-hearted visual approximation, so results vary with lighting, drink colour, camera focus, cup shape, and whether the universe wants to be counted today. Use it for bragging rights, not beverage science.

Made for TinkerHub Useless Projects—the technology is real; the purpose is delightfully not.
