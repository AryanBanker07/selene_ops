# NASA Space Apps Challenge 2026 — Project Submission Package

> Copy-pasteable guide aligned with the official **[NASA Space Apps Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)** for the **[Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=details)** challenge.

---

## 1. Project Name
`SELENE OPS — 3D Selenographic Mission Readiness & Relay Console`

*(Short option if character-limited: `SELENE OPS: Lunar Landing Site Navigator`)*

---

## 2. High-Level Project Summary *(Ready to Paste)*
**SELENE OPS** is an interactive 3D lunar landing site navigator and mission readiness console built for NASA's Artemis and Commercial Lunar Payload Services (CLPS) missions. At the Lunar South Pole, grazing sunlight ($0^\circ\text{–}3^\circ$) and a 27.2-day Earth optical libration cycle ($\pm 6.68^\circ$) force mission planners to balance millimeter-tight margins between high-illumination "Peaks of Eternal Light," cryogenic water-ice cold traps (`25–45 K`), hazardous crater scarps (`>15°`), and periodic Direct-to-Earth blackout windows.

Using a hybrid terrain architecture, SELENE OPS combines a local 3-tier South Polar Stereographic NASA LOLA/LROC dataset (`down to 10 m/px` at Artemis Site 01) with live Google Maps–style NASA Moon Trek OGC WMTS quadtree streaming for the rest of the Moon. Inside a single 60 FPS WebGL workspace, users can toggle 7 real-time physics heatmaps, ray-trace local 360° crater-rim horizons, track 5 cislunar relay satellites (LRO, Danuri, Queqiao-2, CAPSTONE, Lunar Pathfinder), view Earth–Moon/Sun–Earth–Moon orbits, and plan battery-aware A* rover traverses across polar regolith.

---

## 3. Link to Final Project
- **Public Code Repository:** `https://github.com/AryanBanker07/luna_plana`
- *(Tip: Before publishing your Space Apps submission, ensure the repository visibility is **Public** and optionally deploy `dist/` to GitHub Pages, Vercel, or Netlify so judges can click a live URL directly without running `npm run dev`.)*

---

## 4. Link to Project Demo *(Choose Either 7-Slide Deck OR 30-Second Video)*

Per the official Space Apps Project Submission Guide, choose **one** primary demo format and make sure its sharing link is **public (anyone with the link can view, no login wall)**:

### Option A: 7-Slide Presentation Deck Blueprint *(Max 7 Slides)*
1. **Slide 1 — Title & Mission Hook:** `SELENE OPS // Lunar Landing Site Navigator` · 2026 NASA Space Apps Challenge · Tagline: *"3D Multi-Physics Readiness, Cislunar Relay & A* Rover Navigation from Global Moon Trek WMTS to 10 m/px South Pole Ridges."* (Hero visual: Full-screen Mission Launcher over 3D Moon).
2. **Slide 2 — The South Pole Engineering Problem:** Why CLPS & Artemis III sites fail without coupled analysis: grazing solar incidence ($0^\circ\text{–}3^\circ$), $28\text{ K}$ Permanently Shadowed Regions (`PSR`), steep crater walls ($>20^\circ$), and $\sim 13\text{-day}$ Direct-to-Earth blackouts from optical libration ($\pm 6.68^\circ$).
3. **Slide 3 — Hybrid Terrain Architecture (Best of Both Worlds):** Local 3-Tier South Polar Stereographic Pyramid (`IAU2000:30162`, 16-bit LOLA DEM + LROC NAC `35 m/px` + Site 01 `10 m/px` patch) seamlessly paired with live NASA Moon Trek OGC WMTS quadtree streaming (`EQ/LRO_WAC_Mosaic_Global_303ppd_v02`, `z=4..8`) — zero extra gigabytes on disk. (Visual: Zoomed mid-latitude crater crisp via WMTS vs. South Pole Shackleton 3D relief).
4. **Slide 4 — 7 Real-Time GPU Multi-Physics Heatmaps:** Side-by-side strip or composite screenshot showing `Optical / WAC`, `LOLA Elevation`, `Diviner Temp (25–395 K)`, `Slope Hazard`, `Solar Duty %`, `Water-Ice (wt% H₂O)`, and `DTE Visibility`.
5. **Slide 5 — 360° Polar Horizon Skyplot, Cislunar Relays & Time-Warp:** Screenshot of the LOLA 36-azimuth horizon blocker curve, Sun/Earth tracks, 5 tracked satellites (`LRO`, `Danuri ShadowCam`, `Queqiao-2`, `CAPSTONE NRHO`, `Lunar Pathfinder`), and Geocentric/Heliocentric orbital views with KSP-style `Warp To` sunlit windows.
6. **Slide 6 — Singularity-Free A* Rover Traverse & Terramechanics:** Screenshot of an optimized Shackleton Connecting Ridge traverse showing slope-detour path vs. crow-flies route, live 3D articulated rover scaling cleanly at surface zoom, and net battery / solar-horizon profile.
7. **Slide 7 — Space Agency Data Provenance & Mission Impact:** Attribution table (`NASA Moon Trek WMTS`, `LRO LOLA PDS & GSFC PGDA`, `ASU LROC`, `Diviner`, `LEND`, `JPL Horizons`, `CSA`), tech stack (`React 18`, `TypeScript`, `Three.js / WebGL`, `Vite`), and public GitHub link `github.com/AryanBanker07/luna_plana`.

### Option B: 30-Second Video Pitch Script & Shot List *(Max 30 Seconds)*
- **`0:00 – 0:05` (Hook & Problem):** *[Screen: Mission Launcher (`LandingPageHero`) over rotating 3D Moon → click `South Pole (5 m/px)`]*  
  **Voiceover:** *"Landing at the Lunar South Pole leaves zero margin for error: a few hundred meters separates an 86% sunlit ridge from a 28-Kelvin shadow trap and complete Earth radio blackout."*
- **`0:05 – 0:13` (Hybrid WMTS + 7 Multi-Physics Layers):** *[Screen: Zoom smoothly into Copernicus or Tycho showing live NASA Moon Trek WMTS sharpening, then jump to Shackleton Connecting Ridge and click `Elevation`, `Slope Hazard`, and `Water-Ice` pills in the top ribbon]*  
  **Voiceover:** *"SELENE OPS combines 10-meter local LOLA South Pole elevation models with live NASA Moon Trek WMTS streaming across the entire Moon—rendering seven synchronized GPU physics layers at 60 frames per second."*
- **`0:13 – 0:22` (Horizon Ray-Tracing, Relays & Rover A*):** *[Screen: Open `Readiness` drawer showing the 360° Polar Horizon Skyplot + `Warp` to optimal window → toggle `Orbits` (`CAPSTONE`, `Queqiao-2`, `Danuri`) → open `Rover` drawer showing A* detour path & battery plot]*  
  **Voiceover:** *"Planners can ray-trace crater-rim shadows at any past or future UTC epoch, verify relay passes across five cislunar spacecraft, and compute battery-safe A* rover traverses around steep scarps."*
- **`0:22 – 0:30` (Close & Impact):** *[Screen: Quick cut to `Earth–Moon` view, back to clean 3D workspace over Shackleton]*  
  **Voiceover:** *"Built with NASA LROC, LOLA, Diviner, LEND, and Moon Trek data, SELENE OPS makes Artemis and CLPS landing-site engineering interactive for mission planners and explorers alike."*

---

## 5. Project Details / Detailed Project Description *(Ready to Paste)*

### What does it do?
**SELENE OPS** is an end-to-end 3D web workstation for evaluating lunar landing sites, orbital communications access, illumination windows, and rover surface mobility anywhere on the Moon, with ultra-high-resolution focus on the **Artemis III South Pole region** (`78°S–90°S`). Users can:
- Inspect 10 curated Artemis III, CLPS, ISRU, and historic Apollo/Chang'e landing targets or click anywhere on the 3D Moon to spawn a custom telemetry pin.
- Switch instantaneously among 7 GPU shader layers (`LROC True Albedo`, `LOLA Elevation`, `Diviner Bolometric Temperature`, `Terrain Slope Hazard`, `Solar Duty Cycle`, `Water-Ice Equivalent wt%`, and `Direct-to-Earth Visibility`).
- Evaluate exact solar elevation, optical Earth libration, local 36-azimuth LOLA crater-rim horizon clearance (`PolarHorizonSkyplot`), and 29.53-day synodic power/thermal/DTE duty timelines (`SynodicTimelineDrawer`) for any past or future UTC mission epoch.
- Track 5 active and pathfinder lunar spacecraft (`LRO`, `Danuri`, `Queqiao-2`, `CAPSTONE NRHO`, `Lunar Pathfinder`) in 3D orbit with real-time link-rate and pass-window calculations.
- Compute singularity-free polar A* rover traverses between landing pads and PSR cold traps, complete with terramechanics slip/slope energy modeling, solar mast vs. shadow recharge, and elevation/SOC charts.
- Switch between 4 spatial reference frames (`Lunar Globe`, `South Pole`, `Earth–Moon` Geocentric, and `Sun–Earth–Moon` Heliocentric) with KSP-style time-warp presets.

### How does it work?
1. **Hybrid Multi-Resolution Terrain Pipeline:**
   - Around the South Pole (`78°S–90°S`), WebGL shaders project vertex and pixel positions algebraically onto a **South Polar Stereographic coordinate plane (`IAU2000:30162`)** to eliminate polar UV pinching and antimeridian seams. Three nested clipmap tiers (`Wide 78°S–90°S`, `Artemis 4K 75 m/px`, and `Inner NAC 35 m/px` + 16-bit RG-encoded LOLA DEM down to `10 m/px` / `0.10 m` vertical step at Artemis Site 01) drive both surface shading and 3D mesh displacement (`createPolarRefinedSphereGeometry`).
   - Outside the South Pole, `wmtsTileStreamer.ts` computes the camera's sub-view selenographic bounds and streams `256×256` tiles from NASA Moon Trek's CORS-enabled OGC WMTS endpoint (`EQ/LRO_WAC_Mosaic_Global_303ppd_v02`, zoom `z=4..8`) into an offscreen `1024×1024` RAM canvas texture with a `192`-tile LRU cache and parent-tile fallback, keeping local storage minimal while scaling detail Google Maps–style on zoom.
2. **Selenographic & Orbital Physics Engine (`selenography.ts` & `celestialEphemeris.ts`):**
   - Propagates Earth–Moon–Sun geometry at arbitrary UTC epochs, computes exact optical libration in latitude/longitude, solves Kepler's equation via Newton-Raphson iteration for 5 cislunar satellites, and ray-marches the local LOLA terrain heightfield across 36 azimuths to determine exact horizon elevation masks for every candidate site.
3. **Polar-Safe Rover Navigation (`roverPlanner.ts`):**
   - Constructs a local orthonormal gnomonic tangent-plane grid (`43 × 31` nodes, 16-direction transitions) so A* pathfinding stays distortion-free even across `-89.9°S`. Edge weights incorporate lunar gravity ($1.625\text{ m/s}^2$), wheel slip as a function of LOLA slope, climb inefficiency, downhill regeneration, avionics hotel load, and live horizon-checked solar recharge.
4. **Ergonomic Flight-Deck UI (`LandingPageHero.tsx` & `App.tsx`):**
   - Designed using high-clarity operational typography (`Plus Jakarta Sans` + `IBM Plex Mono` `tabular-nums`), a restrained dark neutral surface hierarchy, altitude-adaptive 3D marker/rover scaling, and a left-anchored 2-tier top ribbon with collapsible tabs (`Sites`, `Layers`, `Readiness`, `Orbits`, `Rover`, `Timeline`) to minimize cursor travel and maximize 3D viewport visibility.

### What benefits does it have?
- **Bridges Disparate Datasets:** Unifies terrain slope, thermal extremes, PSR volatiles, horizon occlusion, Earth libration, relay orbits, and rover battery constraints—variables typically scattered across separate PDFs and desktop GIS tools—into one interactive decision console.
- **Zero Heavy Downloads Required for Global Context:** Hybrid NASA Moon Trek WMTS streaming brings global 303 ppd WAC detail directly to the browser without bundling multi-gigabyte rasters, while keeping crisp offline South Pole clipmaps at 60 FPS.
- **Mission & Educational Utility:** Equally useful for rapid Artemis/CLPS trade-off demonstrations (`LandingSite` readiness scores `GO / CAUTION / NO-GO`) and STEM outreach showing how Earth–Moon orbital geometry governs polar lighting and communications.

### Tools, Coding Languages, Software & Frameworks Used
- **Languages:** TypeScript (`~5.6.3`), GLSL (WebGL Vertex & Fragment Shaders), CSS3, HTML5, Python (offline DEM/tile preprocessing)
- **Libraries & Frameworks:** React 18 (`18.3.1`), Three.js (`0.170.0`), `@react-three/fiber`, `@react-three/drei`, Tailwind CSS v4, `lucide-react`, Vite (`6.0.5`)
- **Tooling:** Node.js, npm, Git/GitHub, Obsidian documentation vault

---

## 6. Space Agency Data & Resources Used *(Ready to Paste)*
1. **NASA Moon Trek Web Map Tile Service (WMTS):** `https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02` — live dynamic global optical mosaic streaming (`z=4..8`).
2. **NASA LRO Lunar Orbiter Laser Altimeter (LOLA) PDS & MIT Gridded Data Records:** `LDEM_8`, `LDEM_16`, `LDEM_75S_240M`, `LDEM_85S_40M`, and `LDEM_875S_20M` converted into 16-bit RG-packed elevation clipmaps.
3. **NASA GSFC Planetary Geodynamics Data Archive (PGDA):** `Site01_final_adj_5mpp_surf.tif` (`10 m/px` tactical 16-bit patch over Shackleton Connecting Ridge).
4. **Arizona State University / NASA LROC QuickMap (`quickmap.lroc.asu.edu`):** Global LROC WAC natural-albedo mosaic and controlled LROC WAC + NAC South Polar mosaics (`35 m/px` and `75 m/px`).
5. **UCLA / NASA LRO Diviner Lunar Radiometer Experiment (DLRE):** Physical calibration reference for bolometric surface temperature ranges (`25 K` cryogenic PSRs to `395 K` subsolar noon).
6. **NASA Lunar Prospector Neutron Spectrometer (LPNS) & LRO LEND:** Polar water-ice equivalent (`wt% H₂O`) cold-trap modeling thresholds (`<110 K`).
7. **NASA JPL Horizons (`ssd.jpl.nasa.gov/horizons`):** Selenographic solar incidence and Earth optical libration ephemeris cross-verification.
8. **Canadian Space Agency (CSA) Moon Exploration Resources:** Operational context for lunar surface prospecting and rover mobility limits.

---

## 7. Use of Artificial Intelligence (AI) Disclosure
AI coding assistants were used as development productivity tools to assist in scaffolding TypeScript/React UI modules, tuning GLSL multi-physics colormap blending and stereographic math, and drafting engineering documentation. All scientific datasets, NASA Moon Trek WMTS endpoints, physical constants, orbital mechanics equations, and build outputs were directly integrated, verified, and compiled (`tsc --noEmit` and `vite build`) within the workspace.

---

## 8. Pre-Submission Checklist (Per Space Apps Submission Guide)
- [ ] **Team Page Complete:** Every team member is officially joined to the team under your Local or Universal Event on `spaceappschallenge.org`.
- [ ] **Language Requirement:** All text fields on the Project Submission Form are written in English (and if submitting a 30s video in another language, English subtitles are included).
- [ ] **Demo Format Limit Met:** Strictly **<= 7 slides** (if slide deck) OR **<= 30 seconds** (if video).
- [ ] **Public Access Verified:** GitHub repo (`https://github.com/AryanBanker07/luna_plana`) and demo link (Google Drive / YouTube / Slides / PDF) are tested in an Incognito browser window with zero login walls.
- [ ] **Save & Finalize:** Click **Save Progress** while editing and **Submit for Judging** before the local deadline (`11:59 PM` local time on final event day).
