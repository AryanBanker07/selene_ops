# Software Architecture & ECC Design System

Related: [[00_SELENE_OPS_Challenge_Overview]]

---

## 1. Tech Stack & ECC Standards

Built utilizing **EVERYTHING CLAUDE CODE (ECC)** engineering patterns (`frontend-design-direction`, `make-interfaces-feel-better`, `design-system`, `dashboard-builder`, `frontend-patterns`, `vite-patterns`):
- **Framework:** React 18 + TypeScript 5.6 + Vite 6 + Tailwind CSS v4
- **3D Engine:** Three.js (`r170`) + `@react-three/fiber` + `@react-three/drei` + Custom GLSL Vertex/Fragment Multi-Physics Shaders
- **Design Direction:** *Impeccable Mission Workspace (Option C Overhaul)* — Restrained dark neutral surface hierarchy (`#0A0B0E` void / `#111318` surface / `#181B22` control), `#ECEEF2` primary text, `#9BA1AE` secondary text, subtle `#E59934` active signal accent, and semantic status colors reserved strictly for GO/CAUTION/NO-GO telemetry verdicts. Typography uses unified **`Plus Jakarta Sans`** across all UI copy, tables, SVG skyplots, Matplotlib scientific windows, and numeric telemetry (`tabular-nums`), with **`Space Grotesk`** (`--font-title`) reserved solely for the main **`SELENE`** title.
- **UI & Landing Page Architecture:**
  - `LandingPageHero.tsx`: Single-viewport, non-scrolling Mission Launcher (`600px` centered workspace card over the live 3D Moon) with immediate operational entry buttons (`Open 3D Workspace`, `South Pole (10 m/px)`, `Rover Traverse`, `Earth–Moon`, plus `Feature Guide`), a clean interactive candidate landing site list (Slope, Solar Duty, Coordinates), and AI trope decorations/filler pills (`UTC` header pill, telemetry filler) removed.
  - `FeatureWizardModal.tsx`: Non-blocking 5-step interactive feature guide (`Sites`, `Layers`, `Readiness`, `Orbits`, `Rover`) accessible from both `LandingPageHero` and the top ribbon `Guide` button, with live 3D layer/camera/rover previews and `ArrowLeft`/`ArrowRight`/`Esc` keyboard navigation.
  - `DraggableWindow.tsx`: Moveable, minimizable, focus-stackable window shell enabling multiple tabs (`Sites`, `Layers`, `Readiness`, `Orbits`, `Rover`, `Timeline / Synodic Forecast`) to stay open simultaneously, with double-click header reset, viewport clamping, and `Snap Layout` / `Close (n)` controls.
  - `App.tsx` (Left-Anchored Flight Director Ribbon): 2-tier neutral top ribbon aligned along a left-to-center ergonomic spine (Fitts's Law) with 6 independent multi-window toggle tabs (`Sites`, `Layers`, `Readiness`, `Orbits`, `Rover`, `Timeline`), decluttered Tier 2 camera/layer controls, `Guide` toggle, `Esc` top-window dismissal, and a transparent **"What Readiness Means"** card + 5-subsystem `0–100` scoring breakdown (`Power /30`, `Comms /26`, `Slope /20`, `Thermal /14`, `Ice & Duty /10`, with `GO >= 76` vs `NO-GO` critical gate rules) inside the `Readiness` window.
- **Presentation Generator:** `scripts/generate_spaceapps_presentation.py` renders 6 high-DPI NASA LOLA/LROC figures (`public/slides/slide1..6.png`), builds the 7-slide widescreen PowerPoint deck (`SELENE_OPS_SpaceApps_2026_Presentation.pptx` + `public/SELENE_OPS_SpaceApps_2026_Presentation.pptx`), and exports a zero-dependency viewport-fit interactive web deck (`public/presentation.html`).

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
│   │   ├── LandingPageHero.tsx            # Single-Viewport Mission Launcher
│   │   ├── FeatureWizardModal.tsx         # 5-Step Interactive Feature Guide Wizard
│   │   ├── DraggableWindow.tsx            # Moveable Multi-Window Frame Shell (Drag, Minimize, Focus)
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

