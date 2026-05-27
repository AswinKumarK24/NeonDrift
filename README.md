# 🌌 NEON DRIFT - 3D Infinite Runner Game

[![WebGL](https://img.shields.io/badge/Graphics-WebGL--Three.js-cyan.svg?style=for-the-badge)](https://threejs.org/)
[![HTML5](https://img.shields.io/badge/Language-HTML5--CSS3-magenta.svg?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Synthesizer](https://img.shields.io/badge/Audio-Web_Audio_Synth-green.svg?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Deployment](https://img.shields.io/badge/Hosting-GitHub_Pages-orange.svg?style=for-the-badge)](https://pages.github.com/)

**Neon Drift** is a breathtaking, 3D browser-based infinite runner game featuring futuristic aesthetic styling, interactive retro synthesizers, and procedural geometric avatars. The application is built entirely with clean, vanilla client technologies and runs without any compilation step or node packaging, making it highly modular and ready to host instantly on static platforms like **GitHub Pages**.

---

## 🎮 Play the Game & Controls

Steer your retro fighter through high-speed sectors while avoiding incoming system hazards!

*   **Keyboard Controls (Desktop):**
    *   `A` or `←` (Left Arrow): Steer ship left.
    *   `D` or `→` (Right Arrow): Steer ship right.
*   **Touch Controls (Mobile / Tablet):**
    *   Tap the **left half** of your viewport: Steer ship left.
    *   Tap the **right half** of your viewport: Steer ship right.
*   **Audio Controls:**
    *   Toggle the glowing speaker button in the top-right corner to mute or unmute the synthesizer.

---

## 💎 Features & Architecture

### 1. Seamless Frontend Overlay & Glassmorphism
The UI blends standard layouts with **translucent blurred backdrops** (`backdrop-filter: blur(15px)`) and pulsating CSS keyframe animations. It is overlayed directly on top of the WebGL canvas, allowing players to view their selected ship idling and rotating in the 3D space in real-time.
*   **Transition System:** Standard CSS fade-out classes smoothly animate the Landing Page overlay out of view (`opacity: 0`, `pointer-events: none`) when the user hits "Engage Drift", resulting in zero loading screens.
*   **High Scores:** Local storage tracking persists your best performance core metrics.

### 2. Perfect Visual Responsiveness (Zero Black Bars)
*   **Three.js Canvas:** Set to fill the precise dimensions of the viewport (`100vw` by `100vh`).
*   **Aspect Ratio Preservation:** A robust resize event listener dynamically adjusts the renderer viewport and immediately updates the `camera.aspect` and `camera.updateProjectionMatrix()` parameters. The game remains distortion-free and scales fluidly when rotating device orientation.

### 3. Procedural Avatar Systems
The game includes three custom-built visual ships modeled dynamically using primitive Three.js geometries, each with its own physical profile shown on selection:
1.  **Cyan Shadow (Model // 01):** Speed-focused delta-wing fighter constructed using flat cones and swept box wings, casting cyan-colored engine trails.
2.  **Magenta Pulse (Model // 02):** Steer-optimized ship built from a central sphere core, surrounded by an orbiting outer drive torus ring and dual engines.
3.  **Toxic Apex (Model // 03):** Armor-focused heavy interceptor with side-angled plating panels and an aggressive spoiler fin generating green particles.

### 4. Interactive Web Audio Synthesizer
Includes a lightweight browser-synthesized audio core built from scratch via the **Web Audio API**. This eliminates heavy audio resource downloads and removes network latency.
*   **Synthwave Beat:** Generates a real-time looping sawtooth bassline with dynamic low-pass sweep filters scheduling eighth-note intervals. The baseline alters key and scales to match active phases.
*   **Sound Effects:** Custom oscillator sweeps produce distinct retro sound chimes for lane shifts (drift sweep), collisions (low-frequency filtered noise explosion), level transitions (sci-fi major-third chords), and UI taps.

### 5. Progressive Sector Difficulties
As your ship travels down the track, a dynamic `difficultyMultiplier` scales environmental parameters:
*   **Phase 1 (0m - 1000m):** Cool Blue Sector. Ambient lighting is calm, and obstacles are simple static neon boxes.
*   **Phase 2 (1000m - 2500m):** Purple Pulse Sector. Environment color lerps to purple, speed multiplies, and "Moving Lasers" are introduced sliding left and right on sine curves.
*   **Phase 3 (2500m+):** Glitch Aggressor Sector. Environment becomes deep red, base velocity spikes, and "Glitch Traps" appear—invisible obstacle zones that flicker and flash into solid geometry as you draw near.

---

## 🛠️ Code Structure

The repository maintains an extremely clean, modular footprint:

```
neondrift/
├── index.html       # Canvas viewport structure, high score widget, and HUD cards
├── style.css        # CSS variable tokens, glass overlays, and pulse keyframes
├── app.js           # WebGL Three.js render loop, camera controllers, and ship meshes
├── game.js          # Kinematic lane states, collision checks, and Audio Synth
└── README.md        # Comprehensive repository overview
```

---

## 🚀 Direct GitHub Pages Deployment

To host this repository on GitHub Pages in under a minute, follow these steps:

1.  **Initialize Git & Commit:**
    Ensure you push the files inside the `neondrift` folder to your target repository:
    ```bash
    # (Assuming you are in your project workspace directory)
    git init
    git add .
    git commit -m "Initialize Neon Drift 3D modular codebase"
    ```
2.  **Link to GitHub:**
    Add the remote repository reference:
    ```bash
    git remote add origin https://github.com/AswinKumarK24/NeonDrift.git
    git branch -M main
    git push -u origin main
    ```
3.  **Enable GitHub Pages:**
    *   Open your repository page on **GitHub**.
    *   Go to **Settings** (gear icon) -> **Pages** (in the left-hand navigation bar).
    *   Under **Build and deployment**, select **Deploy from a branch**.
    *   Set the branch to `main` and the folder to `/ (root)`.
    *   Click **Save**.
4.  **Engage Drift:**
    Your custom WebGL game will be live at `https://AswinKumarK24.github.io/NeonDrift/` within seconds!

---

## 🌌 Tech Notes & Performance
*   Uses `ToneMapping` and exp-horizon fog to produce deep sci-fi scene density without resource-intensive lights or shadows.
*   Runs on an optimal object pooling architecture—recycling inactive obstacle entries in memory to prevent GPU buffer bottlenecks.
*   Custom particle trail decay loops run on standard math delta times, ensuring consistent performance across both high-refresh monitors and mobile screens.
