# SELENE OPS — Lunar Landing Site Navigator (NASA Space Apps 2026)

**Challenge:** [Lunar Landing Site Navigator (CLPS & Artemis Mission Theme)](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=details)  
**System Name:** `SELENE OPS // 3D Selenographic Mission Readiness & Relay Console`  
**Workspace:** `c:\Users\banke\OneDrive\Desktop\nasa_spaceapps\Lunar landing navigator`

---

## 1. Executive Summary

Missions targeting the Lunar South Pole under NASA's **Commercial Lunar Payload Services (CLPS)** and **Artemis** programs confront extreme coupled environmental constraints:
- Grazing solar incidence ($\sim 0^\circ \text{ to } 3^\circ$ elevation) where a $2\text{ km}$ shift from a crater rim into a floor changes solar power duty from **86.5% ("Peak of Eternal Light")** to **0% (Permanently Shadowed Region at $28\text{ K}$)**.
- A **27.2-day optical libration cycle** in latitude ($\pm 6.68^\circ$) causing Earth to rise and set behind local South-Pole massifs, interrupting **Direct-to-Earth (DTE)** X-band communications for $\sim 13\text{ days}$ per month unless bridged by cislunar relay satellites.

**SELENE OPS** unifies a **Hybrid Architecture** combining compact local 16-bit NASA **LOLA DEM** & **3-Tier South Polar Stereographic** clipmaps (`~11 MB` for instant 60 FPS South Pole detail, vertex displacement, 36-azimuth horizon ray-tracing, and A* rover terramechanics) with **Google Maps–style Live NASA Moon Trek OGC WMTS Dynamic Tile Streaming** (`EQ/LRO_WAC_Mosaic_Global_303ppd_v02` across mid-latitudes and Far-Side SPA, zero local disk storage), Keplerian cislunar satellite tracking, and an onboard **SELENE-AI Flight Co-Pilot** into a single interactive 3D web workstation.

### Official Challenge Data & Partner Resources (`?tab=resources`)
- **NASA Moon Trek (`https://trek.nasa.gov/moon/`):** Provides live OGC WMTS quadtree tile services (`EQ/LRO_WAC_Mosaic_Global_303ppd_v02` `z=4..8`) streamed dynamically across non-polar lunar regions, complementing the dedicated local 3-tier South Pole mosaics.
- **ASU LROC QuickMap (`https://quickmap.lroc.asu.edu/`):** High-resolution LRO WAC + NAC imagery & PSR polar morphology reference.
- **NASA JPL Horizons (`https://ssd.jpl.nasa.gov/horizons/`):** Precision solar & optical-libration ephemeris validation for any lunar coordinate and UTC epoch.
- **CSA Moon Exploration (`https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/`):** Partner reference for Artemis rover prospecting and surface mobility constraints.

---

## 2. Vault Knowledge Graph

- [[01_Selenographic_Physics_and_Ephemeris]] — Optical libration, sub-solar ephemeris, LOLA spherical horizon ray-marching, Newton-Raphson Keplerian propagation, **Geocentric (`Moon Around Earth`) & Heliocentric (`Earth & Moon Around Sun`) 3D views**, **Past/Future UTC Mission Epoch selection**, **KSP-style `"Warp To"` / `"Warp Here"` auto-warp**, and **Manual Location Selection WRT Sun & Earth**.
- [[02_Multi_Physics_Heatmaps_Reference]] — GPU GLSL shader models and NASA instrument provenance for all 7 global lunar heatmaps.
- [[03_Cislunar_Constellation_and_Relay_Access]] — Orbital mechanics and access capabilities of **LRO**, **Danuri (ShadowCam)**, **Queqiao-2**, **CAPSTONE (NRHO)**, and **Lunar Pathfinder**.
- [[04_Candidate_Landing_Sites_Analysis]] — Benchmark comparison of 10 Artemis III, CLPS, ISRU, and historic landing ellipses.
- [[05_Software_Architecture_and_ECC_Design_System]] — Frontend architecture, decluttered Mission Launcher (`LandingPageHero.tsx`), 5-step interactive **Feature Guide** wizard (`FeatureWizardModal.tsx`), left-anchored Flight Director Top-Ribbon + Collapsible Tab Drawer HUD, transparent **"What Readiness Means"** 100-pt breakdown, unified `Plus Jakarta Sans` (`Space Grotesk` title) typography, and generated 7-slide PPTX/HTML presentation pipeline.
- [[06_Rover_Traverse_Planning_and_DEM_Resolution]] — Singularity-free A* rover pathfinding, lunar terramechanics energetics, and 3-tier 16-bit NASA LOLA DEM resolution audit (`10 m/px` Site 01 patch + `16 ppd` Polar + `8 ppd` Global).
- [[07_Space_Apps_Project_Submission_Package]] — Official NASA Space Apps Project Submission form copy, generated **7-slide PowerPoint & Web Deck** (`SELENE_OPS_SpaceApps_2026_Presentation.pptx` & `public/presentation.html`), 30-second video script, Space Agency data citations, and eligibility checklist (`SPACEAPPS_SUBMISSION.md` & `README.md`).

