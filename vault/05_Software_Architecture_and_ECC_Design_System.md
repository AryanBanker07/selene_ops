# Software Architecture & ECC Design System

Related: [[00_SELENE_OPS_Challenge_Overview]]

---

## 1. Tech Stack & ECC Standards

Built utilizing **EVERYTHING CLAUDE CODE (ECC)** engineering patterns (`frontend-design-direction`, `make-interfaces-feel-better`, `design-system`, `dashboard-builder`, `frontend-patterns`, `vite-patterns`):
- **Framework:** React 18 + TypeScript 5.6 + Vite 6 + Tailwind CSS v4
- **3D Engine:** Three.js (`r170`) + `@react-three/fiber` + `@react-three/drei` + Custom GLSL Vertex/Fragment Multi-Physics Shaders
- **Design Direction:** *Impeccable Mission Workspace (Option C Overhaul)* — Restrained dark neutral surface hierarchy (`#0A0B0E` void / `#111318` surface / `#181B22` control), `#ECEEF2` primary text, `#9BA1AE` secondary text, subtle `#E59934` active signal accent, and semantic status colors reserved strictly for GO/CAUTION/NO-GO telemetry verdicts. Typography pairs `Plus Jakarta Sans` UI copy with `IBM Plex Mono` (`tabular-nums`) for numeric coordinates and engineering readouts.
- **UI & Landing Page Architecture:**
  - `LandingPageHero.tsx`: Single-viewport, non-scrolling Mission Launcher (`600px` centered workspace card over the live 3D Moon) with immediate operational entry buttons (`Open 3D Workspace`, `South Pole (5 m/px)`, `Rover Traverse`, `Earth–Moon`), an interactive curated landing site table, and quick data-layer launch pills—with AI trope decorations removed.
  - `App.tsx` (Left-Anchored Flight Director Ribbon): 2-tier neutral top ribbon aligned along a left-to-center ergonomic spine (Fitts's Law) with 6 consolidated collapsible tabs (`Sites`, `Layers`, `Readiness`, `Orbits`, `Rover`, `Timeline`), Tier 2 contextual layer pills/colorbar/camera presets, `Esc`-dismissible drawers anchored directly beneath the left control spine, and `Flight Windows & Subsystem Summary` folded into the `Readiness` drawer.

---

## 2. Module Breakdown

```
Lunar landing navigator/
├── DESIGN.md                              # ECC Design System & Colorbar Specification
├── public/textures/
│   ├── lroc_color.jpg                     # NASA GSFC SVS 4720 LROC WAC Mosaic
│   └── lola_dem.jpg                       # NASA GSFC SVS 4720 LOLA Laser Altimeter DEM
├── src/
│   ├── types/lunar.ts                     # Domain interfaces (Sites, Satellites, Flight Rules)
│   ├── data/lunarCatalog.ts               # 7 Heatmaps, 10 Sites, 5 Cislunar Orbiters
│   ├── engine/selenography.ts             # Ephemeris, Libration, LOLA Ray-Marching, Kepler Solver
│   ├── components/
│   │   ├── LunarGlobe3D.tsx               # 3D Displaced Moon, GLSL Heatmaps, Orbits & LOS Vectors
│   │   ├── PolarHorizonSkyplot.tsx        # 360° Polar Skyplot & Linear Crater-Rim Panorama
│   │   ├── SynodicTimelineDrawer.tsx      # 30-Day Synodic Sun/DTE/Relay/Temp Interactive Scrubber
│   │   ├── SiteComparisonModal.tsx        # Side-by-Side Site & Launch-Slip Trade Study Matrix
│   │   └── AiMissionAdvisor.tsx           # SELENE-AI Co-Pilot (Onboard Physics + Optional Gemini API)
│   └── App.tsx                            # Full-Viewport Mission Operations HUD Shell
└── vault/                                 # Obsidian Documentation Vault
```

---

## 3. Running Locally

```powershell
cd "c:\Users\banke\OneDrive\Desktop\nasa_spaceapps\Lunar landing navigator"
npm install
npm run dev
# Production Type-Checked Bundle:
npm run build
```

