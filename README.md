# SELENE OPS — Lunar Landing Site Navigator

**NASA Space Apps Challenge 2026:** [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=details)  
**Live Deployment:** [selene-ops.vercel.app](https://selene-ops.vercel.app) **Repository:** [github.com/AryanBanker07/selene_ops](https://github.com/AryanBanker07/selene_ops)

---

## High-Level Summary

**SELENE OPS** (*Selenographic Mission Readiness & Relay Console*) is an interactive 3D lunar landing site navigator, multi-physics hazard analyzer, cislunar relay tracker, and rover traverse planner built for NASA's **Artemis** and **Commercial Lunar Payload Services (CLPS)** mission scenarios.

Missions targeting the Lunar South Pole operate under extreme coupled terrain and orbital constraints: grazing solar incidence ($0^\circ\text{–}3^\circ$) creates adjacent "Peaks of Eternal Light" (`~86.5%` solar duty) and cryogenic Permanently Shadowed Regions (`25–45 K` cold traps holding water ice), while the $27.2$-day optical libration cycle ($\pm 6.68^\circ$) pushes Earth behind crater rims for roughly half of each synodic month. **SELENE OPS** fuses NASA LRO, LOLA, Diviner, LEND, and live NASA Moon Trek OGC WMTS data into a single 60 FPS WebGL workstation so engineers, mission planners, and educators can inspect landing ellipses, evaluate solar/Earth horizon clearance, check satellite relay access windows, and plan energy-optimal rover traverses from global scale down to meter-level polar ridges.

---

## Core Capabilities

### 1. Hybrid 3D Lunar Terrain Architecture (Local South Pole Clipmaps + Live NASA Moon Trek WMTS)
- **3-Tier Local South Polar Stereographic Pyramid (`IAU2000:30162`, zero polar pinching):**
  - **Wide Polar Cap (`78°S–90°S`):** `lroc_sp_wide.jpg` (`2048×2048`) + 16-bit `lola_sp_wide_16bit.png` (`LDEM_75S_240M`).
  - **Artemis III Zone (`84.9°S–90°S`):** `lroc_sp_artemis_4k.jpg` (`4096×4096`, `75 m/px` LROC WAC + NAC controlled) + 16-bit `lola_sp_artemis_16bit.png` (`151 m/px`, `LDEM_85S_40M`).
  - **Inner Shackleton & Connecting Ridge Core (`88.8°S–90°S`):** `lroc_sp_inner.jpg` (`2048×2048`, `35 m/px` LROC NAC controlled mosaic) + 16-bit `lola_sp_inner_16bit.png` (`35 m/px`, `LDEM_875S_20M`) fused with a `10 m/px` (`0.10 m` vertical quantization) Tier-4 tactical DEM patch (`lola_site01_10mpp_16bit.png`) from NASA GSFC PGDA (`Site01_final_adj_5mpp_surf.tif`).
- **Google Maps–Style Live NASA Moon Trek OGC WMTS Streaming (`src/engine/wmtsTileStreamer.ts`):**
  - Dynamically streams `EQ/LRO_WAC_Mosaic_Global_303ppd_v02` (`z = 4..8`) from NASA Moon Trek (`https://trek.nasa.gov/tiles/Moon/...`) into a viewport-centered `4×4` (`1024×1024 px`) RAM clipmap with a 192-entry LRU cache and hierarchical parent-tile fallback—delivering sharp equatorial, mid-latitude, and Far-Side South Pole–Aitken Basin imagery without storing gigabytes of global tiles on disk, while feathering out cleanly north of `78°S` so the local South Pole mosaics remain untouched.
- **Altitude-Adaptive Dynamic Scaling:** All 3D landing site beacons, custom pins, cold-trap markers, orbital spacecraft, and the articulated 3D rover model scale dynamically with camera distance (`1.0` down to `0.18–0.20` at low altitude) so surface features stay unobstructed when zoomed in.

### 2. Seven Real-Time GPU Multi-Physics Heatmaps (`src/components/LunarGlobe3D.tsx`)
Executed at 60 FPS inside custom WebGL vertex & fragment shaders synchronized with selectable UTC epochs:
1. **LROC True Albedo & Terminator (`albedo`)** — Calibrated LROC WAC reflectance + real-time solar terminator + Earthshine on the near-side hemisphere.
2. **Topographic Elevation (`elevation`)** — Hypsometric LOLA DEM (`-9.12 km` SPA Basin to `+10.76 km` peaks, `ref 1737.4 km`) with 3D terrain relief displacement and crisp contour lines.
3. **Surface Bolometric Temperature (`temperature`)** — Diviner (`DLRE`)-modeled `25 K` PSR cold traps to `395 K` subsolar noon driven by local surface normals and horizon concavity.
4. **Terrain Slope & Landing Hazard (`slope`)** — Singularity-free tangent-frame gradient calculation flagging steep crater scarps (`>15°–32°+`) vs. safe `<10°` CLPS/HLS landing pads.
5. **Solar Illumination Duty Cycle (`illumination`)** — `0%` deep PSRs to `>85%` Peaks of Eternal Light along Malapert and Shackleton Connecting Ridge.
6. **Water-Ice Equivalent (`ice`)** — Cryogenic polar volatile distribution (`0.0–5.5 wt% H₂O`) inside permanent cold traps (`<110 K`).
7. **Direct-to-Earth Visibility (`dte`)** — Combines live JPL optical libration (`±6.68°` lat, `±7.9°` lon) with high-res LOLA terrain rim masking.

### 3. Selenographic Ephemeris, 360° Horizon Skyplot & Cislunar Constellation
- **Exact Selenographic Physics (`src/engine/selenography.ts` & `src/engine/celestialEphemeris.ts`):** Computes sub-solar coordinates, optical libration in longitude/latitude, 36-azimuth LOLA spherical horizon ray-marching (`PolarHorizonSkyplot.tsx`), and multi-day lunar day/night transition windows (`SynodicTimelineDrawer.tsx`).
- **Orbital Views & Auto-Warp:** Dedicated **Lunar Globe**, **South Pole (`IAU2000:30162`)**, **Earth–Moon (Geocentric)**, and **Sun–Earth–Moon (Heliocentric)** 3D views (`CelestialSystem3D.tsx`), plus a **UTC Mission Epoch** selector (`MissionEpochModal.tsx`) and KSP-style **Warp To / Warp Here** orbital time-warp (`KspWarpMenu.tsx`).
- **5-Spacecraft Cislunar Relay Propagation:** Newton-Raphson Keplerian propagation and geometric line-of-sight link access across **LRO** (NASA), **Danuri / KPLO** (KARI / NASA ShadowCam), **Queqiao-2** (CNSA), **CAPSTONE / NRHO** (NASA / AdvSpace), and **Lunar Pathfinder** (ESA / SSTL).

### 4. Singularity-Free A* Rover Traverse Planner (`src/engine/roverPlanner.ts`)
- Builds a pole-safe $43 \times 31$ (`1,333`-node) local gnomonic tangent-plane navigation mesh between Start (`A`), optional checkpoints, and Goal (`B`).
- Evaluates slope hazard penalties, solar mast power generation vs. local LOLA crater-rim shadows at each arrival timestamp, regolith rolling resistance & slip, regenerative downhill recovery, and net battery state-of-charge (`RoverMissionPlanner.tsx`), with interactive Matplotlib-style elevation/power profile plots (`ScientificPlotModal.tsx`).

### 5. Mission Workspace UX
- **Single-Viewport Mission Launcher (`LandingPageHero.tsx`):** Opens directly over the live 3D Moon with one-click entry into `Open 3D Workspace`, `South Pole (5 m/px)`, `Rover Traverse`, `Earth–Moon`, 10 curated landing sites, and direct heatmap presets.
- **Left-Anchored Flight Director Top Ribbon (`App.tsx`):** Dark neutral console palette (`#0A0B0E` / `#111318` / `#181B22`) paired with readable `Plus Jakarta Sans` UI typography and `IBM Plex Mono` (`tabular-nums`) telemetry readouts. Six collapsible left-aligned drawers (`Sites`, `Layers`, `Readiness`, `Orbits`, `Rover`, `Timeline`) prevent cursor ping-pong across the viewport and can be dismissed at any time (`Esc`) for an unobstructed 3D view.

---

## Space Agency Data & Partner Resources Used

| Dataset / Service | Source Agency / Provider | How Used in SELENE OPS |
| :--- | :--- | :--- |
| **NASA Moon Trek OGC WMTS** (`EQ/LRO_WAC_Mosaic_Global_303ppd_v02`) | NASA Solar System Treks (`trek.nasa.gov/moon`) | Live `4×4` quadtree streaming (`z=4..8`) for high-detail global mid-latitude & far-side terrain |
| **LOLA 16-bit Global & Polar Stereographic DEMs** (`LDEM_8`, `LDEM_16`, `LDEM_75S_240M`, `LDEM_85S_40M`, `LDEM_875S_20M`) | NASA GSFC / MIT / PDS Geosciences Node | 3D vertex relief, tangent-frame slope gradients, 36-azimuth horizon masking, and A* rover pathfinding |
| **Artemis III Site 01 High-Res DEM** (`Site01_final_adj_5mpp_surf.tif` → `10 m/px` 16-bit patch) | NASA GSFC PGDA | Meter-scale hazard & crater-wall resolution across Shackleton Connecting Ridge |
| **LROC WAC & NAC Controlled Mosaics** | ASU LROC QuickMap (`quickmap.lroc.asu.edu`) | Global natural albedo and nested 3-tier South Pole stereographic imagery (`75 m/px` & `35 m/px`) |
| **Diviner Lunar Radiometer (`DLRE`) & Neutron / LEND Models** | UCLA / NASA LRO / Lunar Prospector | Bolometric surface temperature (`25–395 K`) and cryogenic PSR water-ice cold-trap indicators |
| **Solar & Optical Libration Ephemeris Benchmark** | NASA JPL Horizons (`ssd.jpl.nasa.gov/horizons`) | Ephemeris validation for sub-solar coordinates, Earth optical libration, and synodic timelines |
| **Lunar Rover Prospecting Reference** | Canadian Space Agency (CSA) Moon Exploration | Constraints and context for volatile prospecting rover traverse planning |

---

## Technology Stack

- **Frontend Framework:** React 18 (`^18.3.1`), TypeScript (`~5.6.3`), Vite (`^6.0.5`)
- **3D Rendering & Shaders:** Three.js (`^0.170.0`), `@react-three/fiber`, `@react-three/drei`, custom GLSL vertex/fragment shaders
- **Styling & Icons:** Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react`, Google Fonts (`Plus Jakarta Sans`, `IBM Plex Mono`)
- **Data Pipeline & Offline DEM Preparation:** Python scripts (`scripts/`) converting NASA PDS/PGDA GeoTIFFs into RG-packed 16-bit PNGs and Polar Stereographic tiles
- **Documentation Knowledge Graph:** Markdown engineering notes in `vault/`

---

## Local Setup & Quickstart

### Prerequisites
- Node.js `>= 18` and `npm`

### Install & Run Locally
```bash
git clone https://github.com/AryanBanker07/selene_ops.git
cd selene_ops
npm install
npm run dev
```
Open **`http://localhost:5173/`** (or `http://127.0.0.1:5173/` if bound via `--host 127.0.0.1`).

### Typecheck & Production Build
```bash
npm run typecheck
npm run build
npm run preview
```

---

## Key Repository Structure

```text
├── index.html                  # App shell & typography (Plus Jakarta Sans, IBM Plex Mono)
├── package.json                # Dependencies and scripts (dev, build, preview, typecheck)
├── vite.config.ts              # Vite build & chunking configuration
├── public/textures/            # 16-bit LOLA DEM pyramid, LROC albedos, 3-tier South Pole clipmaps
├── scripts/                    # Offline PDS/PGDA DEM & LROC South Pole tile generation utilities
├── src/
│   ├── App.tsx                 # Flight Director 2-tier top ribbon, collapsible drawers & state controller
│   ├── components/
│   │   ├── LandingPageHero.tsx # Single-viewport Mission Launcher overlay
│   │   ├── LunarGlobe3D.tsx    # Custom WebGL GLSL 3D Moon, shaders, beacons, rover & satellite orbits
│   │   ├── CelestialSystem3D.tsx # Geocentric (Earth-Moon) & Heliocentric 3D orbital views
│   │   ├── PolarHorizonSkyplot.tsx # 360° LOLA horizon ray-tracing skyplot (Sun & Earth tracks)
│   │   ├── RoverMissionPlanner.tsx # Singularity-free A* traverse planner & energy telemetry
│   │   ├── AiMissionAdvisor.tsx # Flight Windows & Subsystem Summary panel
│   │   ├── SynodicTimelineDrawer.tsx # 29.53-day illumination, thermal & DTE timeline
│   │   ├── SiteComparisonModal.tsx # Multi-site quantitative tradeoff matrix
│   │   ├── ScientificPlotModal.tsx # High-DPI canvas plot viewer for traverse/site profiles
│   │   ├── MissionEpochModal.tsx # Past/Future UTC mission epoch picker
│   │   ├── SunEarthLocatorModal.tsx # Coordinate picker relative to sub-solar / sub-Earth points
│   │   └── KspWarpMenu.tsx     # Time-warp speed & target-window jump menu
│   ├── data/lunarCatalog.ts    # Curated Artemis/CLPS/historic landing sites & satellite elements
│   ├── engine/
│   │   ├── selenography.ts     # Ephemeris, optical libration, Keplerian propagation & LOLA DEM sampling
│   │   ├── celestialEphemeris.ts # Geocentric/heliocentric ephemeris calculations
│   │   ├── wmtsTileStreamer.ts # Live NASA Moon Trek OGC WMTS 4×4 quadtree tile streamer
│   │   ├── roverPlanner.ts     # Tangent-plane A* pathfinder & lunar terramechanics model
│   │   └── craters.ts          # Curated lunar crater & PSR reference catalog
│   └── types/lunar.ts          # Shared TypeScript domain interfaces
└── vault/                      # Technical documentation & Obsidian knowledge graph
```

---

## Attribution & Use of Artificial Intelligence

- Scientific models and algorithms are anchored to official NASA PDS/PGDA datasets, ASU LROC mosaics, NASA Moon Trek WMTS endpoints, and NASA JPL ephemeris conventions.
- AI coding assistance was used during prototyping to help scaffold TypeScript/React components, refine GLSL multi-layer blending, and structure technical documentation; all physical equations, DEM resolutions, dataset attributions, and UI behaviors were verified against source assets and browser builds.

