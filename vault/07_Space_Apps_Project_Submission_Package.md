# Space Apps Project Submission Package

Related: [[00_SELENE_OPS_Challenge_Overview]] | [[01_Selenographic_Physics_and_Ephemeris]] | [[02_Multi_Physics_Heatmaps_Reference]] | [[03_Cislunar_Constellation_and_Relay_Access]] | [[05_Software_Architecture_and_ECC_Design_System]] | [[06_Rover_Traverse_Planning_and_DEM_Resolution]]

This note mirrors the repository root submission guide ([SPACEAPPS_SUBMISSION.md](../SPACEAPPS_SUBMISSION.md)) and [README.md](../README.md) prepared against the official **[NASA Space Apps Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)**.

---

## Submission Checklist & Key Parameters

- **Project Name:** `SELENE OPS — 3D Selenographic Mission Readiness & Relay Console`
- **Live Production Deployment:** `https://selene-ops.vercel.app` ([Slide Deck](https://selene-ops.vercel.app/presentation.html))
- **Public Code Repository:** `https://github.com/AryanBanker07/selene_ops`
- **Challenge:** [Lunar Landing Site Navigator (NASA Space Apps 2026)](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=details)
- **Allowed Demo Formats (pick one):**
  1. **Slide Presentation (Generated & Ready):** Maximum **7 slides**
     - PowerPoint (`.pptx`, `16:9` widescreen): [`SELENE_OPS_SpaceApps_2026_Presentation.pptx`](../SELENE_OPS_SpaceApps_2026_Presentation.pptx) & `/SELENE_OPS_SpaceApps_2026_Presentation.pptx`
     - Interactive Browser Deck: [`public/presentation.html`](../public/presentation.html) (`/presentation.html`)
     - High-DPI Slide Figures: [`public/slides/`](../public/slides/) (`slide1_hero_composite.png` .. `slide6_rover_traverse.png`) via [`scripts/generate_spaceapps_presentation.py`](../scripts/generate_spaceapps_presentation.py)
  2. **Video Pitch:** Maximum **30 seconds** (timed script + shot list provided in `SPACEAPPS_SUBMISSION.md`)
- **Mandatory Judging Sections Covered:**
  - High-Level Project Summary (*What? How? Why important?*)
  - Link to Final Project (public, no auth wall)
  - Project Details (*What does it do? How does it work? Benefits? Tech stack?*)
  - Space Agency Data & Partner Attribution (`NASA Moon Trek WMTS`, `LRO LOLA PDS & GSFC PGDA`, `ASU LROC`, `Diviner DLRE`, `LPNS / LEND`, `JPL Horizons`, `CSA`)
  - Artificial Intelligence Disclosure
  - References & English-language / public-link verification

---

## High-Level Project Summary *(Ready to Paste — 165 Words)*

> Answering: *What did you develop? How does it address the challenge? Why is it important? (50–200 words)*

We developed SELENE OPS, an interactive 3D lunar landing site navigator and mission readiness console for NASA's Artemis and Commercial Lunar Payload Services (CLPS) programs.

At the Lunar South Pole, grazing sunlight (0°-3°) creates sharp contrasts between sunlit ridges and 25-45 K water-ice cold traps near steep crater scarps (>15°), while a 27.2-day optical libration cycle blocks Direct-to-Earth links for nearly half the month. SELENE OPS addresses this coupled challenge by combining a South Polar Stereographic NASA LOLA/LROC terrain pyramid (down to 10 m/px at Artemis Site 01) with live NASA Moon Trek WMTS global streaming. Inside one 60 FPS WebGL workspace, users toggle seven GPU physics heatmaps, compute 100-point readiness scores via 360° LOLA horizon ray-tracing, track five cislunar relay satellites (LRO, Danuri, Queqiao-2, CAPSTONE, Lunar Pathfinder), and plan energy-aware A* rover traverses.

This is important because it unifies fragmented planetary datasets into an accessible, zero-download web console—helping mission planners evaluate landing tradeoffs and relay windows while letting students explore real polar lunar physics.

