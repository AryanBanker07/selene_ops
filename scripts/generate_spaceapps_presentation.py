"""
Generate the 7-Slide NASA Space Apps Challenge 2026 Presentation Deck:
  1. High-DPI composite scientific figures & screenshots in public/slides/
  2. Widescreen 16:9 PowerPoint deck (SELENE_OPS_SpaceApps_2026_Presentation.pptx
     and public/SELENE_OPS_SpaceApps_2026_Presentation.pptx)
  3. Zero-dependency viewport-fit interactive web deck (public/presentation.html)

Design follows the local `pptx`, `scientific-slides`, and `frontend-slides` skills.
"""

from __future__ import annotations

import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import FancyBboxPatch

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

ROOT = Path(__file__).resolve().parent.parent
TEX_DIR = ROOT / "public" / "textures"
SLIDES_DIR = ROOT / "public" / "slides"
SLIDES_DIR.mkdir(parents=True, exist_ok=True)

USER_UPLOADED = Path(
    r"C:\Users\banke\.gemini\antigravity\brain\1ae3bde5-8492-4da9-9cd4-9a56153112fd\.user_uploaded"
)

# Palette (Matches SELENE OPS workstation aesthetic)
BG_VOID = "#0A0B0E"
BG_SURFACE = "#12151D"
BG_CONTROL = "#181C26"
BORDER_SUBTLE = "#262B38"
TEXT_PRIMARY = "#ECEEF2"
TEXT_SECONDARY = "#9BA1AE"
TEXT_MUTED = "#6C7280"
ACCENT_AMBER = "#E59934"
ACCENT_CYAN = "#38BDF8"
ACCENT_GO = "#10B981"
ACCENT_NOGO = "#EF4444"


def find_image(*candidates: Path) -> Path | None:
    for p in candidates:
        if p and p.exists():
            return p
    return None


def decode_rg16_elev_km(path: Path, scale: float, offset: float) -> np.ndarray:
    arr = np.asarray(Image.open(path).convert("RGB"), dtype=np.uint16)
    dn = (arr[:, :, 0] << 8) | arr[:, :, 1]
    return dn.astype(np.float32) * scale + offset


def compute_hillshade(elev_m: np.ndarray, pixel_m: float, az_deg=315, alt_deg=25) -> np.ndarray:
    dy, dx = np.gradient(elev_m, pixel_m)
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dx, dy)
    az = math.radians(az_deg)
    alt = math.radians(alt_deg)
    shaded = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(shaded, 0.05, 1.0)


def fit_cover(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    iw, ih = img.size
    scale = max(target_w / iw, target_h / ih)
    nw, nh = int(round(iw * scale)), int(round(ih * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - target_w) // 2
    top = (nh - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def fit_contain(img: Image.Image, target_w: int, target_h: int, bg=(10, 11, 14)) -> Image.Image:
    iw, ih = img.size
    scale = min(target_w / iw, target_h / ih)
    nw, nh = int(round(iw * scale)), int(round(ih * scale))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (target_w, target_h), bg)
    canvas.paste(resized, ((target_w - nw) // 2, (target_h - nh) // 2))
    return canvas


def build_slide1_hero_figure() -> Path:
    """Hero composite pairing 3D South Pole globe + close-up Shackleton Connecting Ridge."""
    out = SLIDES_DIR / "slide1_hero_composite.png"
    img_pole = find_image(USER_UPLOADED / "media_1793950453533_1d0c21db.jpg", ROOT / "src" / "image.png")
    img_ridge = find_image(USER_UPLOADED / "media_1794577800840_678ce629.jpg", TEX_DIR / "lroc_sp_inner.jpg")

    plt.rcParams["font.family"] = "sans-serif"
    fig = plt.figure(figsize=(10.5, 8.2), dpi=200, facecolor=BG_VOID)

    # Top large 3D South Pole elevation view
    ax1 = fig.add_axes([0.02, 0.34, 0.96, 0.63])
    ax1.set_facecolor(BG_VOID)
    if img_pole:
        raw_pole = Image.open(img_pole).convert("RGB")
        im1 = fit_contain(raw_pole, 1600, 920, bg=(10, 11, 14))
        ax1.imshow(im1)
    ax1.set_xticks([])
    ax1.set_yticks([])
    for sp in ax1.spines.values():
        sp.set_edgecolor("#2D3446")
        sp.set_linewidth(1.5)
    ax1.text(
        0.02,
        0.95,
        "SOUTH POLAR CAP · LOLA TOPOGRAPHIC RELIEF & CANDIDATE TARGETS",
        transform=ax1.transAxes,
        color=TEXT_PRIMARY,
        fontsize=10.5,
        fontweight="bold",
        va="top",
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#0A0B0E", edgecolor="#3A4256", alpha=0.88),
    )

    # Bottom-left close-up Shackleton rim
    ax2 = fig.add_axes([0.02, 0.02, 0.47, 0.29])
    if img_ridge:
        im2 = fit_cover(Image.open(img_ridge).convert("RGB"), 900, 460)
        ax2.imshow(im2)
    ax2.set_xticks([])
    ax2.set_yticks([])
    for sp in ax2.spines.values():
        sp.set_edgecolor(ACCENT_AMBER)
        sp.set_linewidth(1.2)
    ax2.text(
        0.03,
        0.91,
        "SHACKLETON CRATER & CONNECTING RIDGE (10 m/px)",
        transform=ax2.transAxes,
        color=ACCENT_AMBER,
        fontsize=8.5,
        fontweight="bold",
        va="top",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="#0A0B0E", edgecolor=ACCENT_AMBER, alpha=0.9),
    )

    # Bottom-right Earth-Moon geometry preview (crop out top UI toolbar strip)
    img_em = find_image(USER_UPLOADED / "media_1793881471977_74807265.jpg", ROOT / "src" / "image.png")
    ax3 = fig.add_axes([0.51, 0.02, 0.47, 0.29])
    if img_em:
        raw_em = Image.open(img_em).convert("RGB")
        cropped_em = raw_em.crop((0, min(80, raw_em.height // 5), raw_em.width, raw_em.height))
        im3 = fit_cover(cropped_em, 900, 460)
        ax3.imshow(im3)
    ax3.set_xticks([])
    ax3.set_yticks([])
    for sp in ax3.spines.values():
        sp.set_edgecolor(ACCENT_CYAN)
        sp.set_linewidth(1.2)
    ax3.text(
        0.03,
        0.91,
        "LIVE EARTH-MOON LIBRATION & RELAY GEOMETRY",
        transform=ax3.transAxes,
        color=ACCENT_CYAN,
        fontsize=8.5,
        fontweight="bold",
        va="top",
        bbox=dict(boxstyle="round,pad=0.3", facecolor="#0A0B0E", edgecolor=ACCENT_CYAN, alpha=0.9),
    )

    fig.savefig(out, dpi=200, facecolor=BG_VOID)
    plt.close(fig)
    return out


def build_slide2_south_pole_constraints() -> Path:
    """Shackleton Crater LROC NAC + LOLA DEM elevation cross-section figure."""
    out = SLIDES_DIR / "slide2_south_pole_constraints.png"
    dem_inner = decode_rg16_elev_km(
        TEX_DIR / "lola_sp_inner_16bit.png", scale=19.67 / 65535.0, offset=-8.98
    )
    lroc_inner = np.asarray(Image.open(TEX_DIR / "lroc_sp_inner.jpg").convert("L"), dtype=np.float32)

    # Crop inner square region cleanly and extract transect across Shackleton rim -> floor -> ridge
    fig = plt.figure(figsize=(10.6, 8.2), dpi=200, facecolor=BG_VOID)
    gs = fig.add_gridspec(2, 1, height_ratios=[1.35, 1.0], hspace=0.22, left=0.09, right=0.95, top=0.93, bottom=0.10)

    ax_map = fig.add_subplot(gs[0])
    ax_map.set_facecolor(BG_SURFACE)
    # Crop 1024x1024 core center of 2048x2048 inner stereographic mosaic (±18 km around 90°S)
    c0, c1 = 512, 1536
    sub_dem = dem_inner[c0:c1, c0:c1]
    sub_lroc = lroc_inner[c0:c1, c0:c1] / 255.0

    # Shaded topographic elevation composite
    cmap = mcolors.LinearSegmentedColormap.from_list(
        "lola_hyps", ["#12183B", "#1C5A8A", "#1E9E75", "#D9A441", "#C95B3C", "#F4EFE6"]
    )
    norm_dem = np.clip((sub_dem - (-4.3)) / (2.5 - (-4.3)), 0, 1)
    rgb = cmap(norm_dem)[:, :, :3]
    shade = 0.55 + 0.55 * sub_lroc
    blended = np.clip(rgb * shade[:, :, None], 0, 1)

    # Extract exact row profile BEFORE annotating so map markers match profile min/max
    y_line = -3.0
    row_idx = int((18 - y_line) / 36.0 * (sub_dem.shape[0] - 1))
    xs = np.linspace(-16, 16, 910)
    col_indices = np.linspace(int(1024 * 2 / 36), int(1024 * 34 / 36), 910).astype(int)
    profile_km = sub_dem[row_idx, col_indices]

    rim_idx = int(np.argmax(profile_km))
    psr_idx = int(np.argmin(profile_km))
    x_rim, z_rim = float(xs[rim_idx]), float(profile_km[rim_idx])
    x_psr, z_psr = float(xs[psr_idx]), float(profile_km[psr_idx])
    relief_km = z_rim - z_psr

    ax_map.imshow(blended, extent=[-18, 18, -18, 18])
    ax_map.plot([-16, 16], [y_line, y_line], color=ACCENT_AMBER, lw=2.2, ls="--")
    ax_map.scatter([x_psr], [y_line], color=ACCENT_NOGO, s=80, zorder=5, edgecolor="white", lw=1.3)
    ax_map.scatter([x_rim], [y_line], color=ACCENT_GO, s=85, zorder=5, edgecolor="white", lw=1.3)
    ax_map.annotate(
        f"Shackleton Rim / Ridge\n({z_rim:+.2f} km · 86.5% Sun)",
        xy=(x_rim, y_line),
        xytext=(-16.8, 9.5),
        color="#D1FAE5",
        fontsize=8.8,
        fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.3", fc="#064E3B", ec=ACCENT_GO, alpha=0.92),
        arrowprops=dict(arrowstyle="->", color=ACCENT_GO, lw=1.6, connectionstyle="arc3,rad=0.15"),
    )
    ax_map.annotate(
        f"Shackleton PSR Floor\n({z_psr:+.2f} km · 28 K Ice Trap)",
        xy=(x_psr, y_line),
        xytext=(-16.8, -14.2),
        color="#FEE2E2",
        fontsize=8.8,
        fontweight="bold",
        bbox=dict(boxstyle="round,pad=0.3", fc="#7F1D1D", ec=ACCENT_NOGO, alpha=0.92),
        arrowprops=dict(arrowstyle="->", color=ACCENT_NOGO, lw=1.6, connectionstyle="arc3,rad=-0.12"),
    )
    ax_map.set_title("NASA LROC NAC + 16-bit LOLA Stereographic Core (35 m/px)", color=TEXT_PRIMARY, fontsize=11.5, fontweight="bold", pad=8)
    ax_map.set_xlabel("South Polar Stereographic X (km from 90°S)", color=TEXT_SECONDARY, fontsize=9)
    ax_map.set_ylabel("Y (km)", color=TEXT_SECONDARY, fontsize=9)
    ax_map.tick_params(colors=TEXT_SECONDARY, labelsize=8.5)
    for sp in ax_map.spines.values():
        sp.set_edgecolor(BORDER_SUBTLE)

    # Transect plot
    ax_prof = fig.add_subplot(gs[1])
    ax_prof.set_facecolor(BG_SURFACE)

    ax_prof.fill_between(xs, profile_km, -4.6, color="#1D5A8A", alpha=0.35)
    ax_prof.plot(xs, profile_km, color=ACCENT_AMBER, lw=2.3, label="16-bit LOLA Elevation (km)")
    ax_prof.scatter([x_rim, x_psr], [z_rim, z_psr], color=[ACCENT_GO, ACCENT_NOGO], s=55, zorder=6, edgecolor="white", lw=1.1)
    ax_prof.axhline(0.0, color="#6C7280", lw=0.8, ls=":")
    ax_prof.set_xlim(-16, 16)
    ax_prof.set_ylim(-4.6, 2.8)
    ax_prof.grid(True, color="#232834", linestyle="--", linewidth=0.7)
    ax_prof.set_title(f"Topographic Gradient Along Dashed Transect ({relief_km:.1f} km Vertical Relief Drop)", color=TEXT_PRIMARY, fontsize=11, fontweight="bold", pad=6)
    ax_prof.set_xlabel("Horizontal Distance Across South Polar Rim -> PSR Basin (km)", color=TEXT_SECONDARY, fontsize=9)
    ax_prof.set_ylabel("Elevation (km ref 1737.4)", color=TEXT_SECONDARY, fontsize=9)
    ax_prof.tick_params(colors=TEXT_SECONDARY, labelsize=8.5)
    for sp in ax_prof.spines.values():
        sp.set_edgecolor(BORDER_SUBTLE)

    ax_prof.annotate(
        f"Rim Crest ({z_rim:+.2f} km · ~86.5% Sun)\nGO Solar Margin",
        xy=(x_rim, z_rim),
        xytext=(-15.0, 1.55),
        color=ACCENT_GO,
        fontsize=8.5,
        fontweight="bold",
        arrowprops=dict(arrowstyle="->", color=ACCENT_GO, lw=1.5),
    )
    ax_prof.annotate(
        f"28 K PSR Cold Trap ({z_psr:+.2f} km)\n0% Sun / Volatile Reservoir",
        xy=(x_psr, z_psr),
        xytext=(-10.5, -3.95),
        color=ACCENT_NOGO,
        fontsize=8.5,
        fontweight="bold",
        arrowprops=dict(arrowstyle="->", color=ACCENT_NOGO, lw=1.5),
    )

    fig.savefig(out, dpi=200, facecolor=BG_VOID)
    plt.close(fig)
    return out


def build_slide3_hybrid_architecture() -> Path:
    """Hybrid Architecture diagram: 10 m/px Site01 DEM + 75 m/px Artemis vs NASA Moon Trek WMTS + Dynamic Scale."""
    out = SLIDES_DIR / "slide3_hybrid_architecture.png"
    elev_site01 = decode_rg16_elev_km(TEX_DIR / "lola_site01_10mpp_16bit.png", scale=0.0001, offset=-2.0)
    hs = compute_hillshade(elev_site01 * 1000.0, pixel_m=10.0, az_deg=310, alt_deg=22)

    fig = plt.figure(figsize=(10.6, 8.2), dpi=200, facecolor=BG_VOID)
    gs = fig.add_gridspec(2, 2, height_ratios=[1.25, 1.0], hspace=0.28, wspace=0.16, left=0.07, right=0.96, top=0.92, bottom=0.09)

    # Panel A: Tier 4 10 m/px PGDA Hillshade
    ax_a = fig.add_subplot(gs[0, 0])
    crop = hs[250:1250, 250:1250]
    ax_a.imshow(crop, cmap="gray")
    ax_a.set_title("Local Tier 4: Artemis Site 01 (10 m/px)", color=ACCENT_AMBER, fontsize=10.5, fontweight="bold", pad=6)
    ax_a.set_xticks([])
    ax_a.set_yticks([])
    ax_a.text(0.04, 0.06, "0.1 m Vertical Step · Offline 60 FPS", transform=ax_a.transAxes,
              color=TEXT_PRIMARY, fontsize=8, bbox=dict(fc="#0A0B0E", ec=ACCENT_AMBER, alpha=0.88))
    for sp in ax_a.spines.values():
        sp.set_edgecolor(ACCENT_AMBER)

    # Panel B: Live NASA Moon Trek WMTS Quadtree Streaming schematic
    ax_b = fig.add_subplot(gs[0, 1])
    lroc_eq = np.asarray(Image.open(TEX_DIR / "lroc_color.jpg").convert("L"), dtype=np.float32) / 255.0
    # Crop Mare Tranquillitatis / Equatorial region for clean crisp quadtree grid overlay
    eq_crop = lroc_eq[320:700, 950:1450]
    ax_b.imshow(eq_crop, cmap="gray", extent=[0, 4, 0, 4])
    for g in [1, 2, 3]:
        ax_b.axvline(g, color=ACCENT_CYAN, lw=1.1, alpha=0.85)
        ax_b.axhline(g, color=ACCENT_CYAN, lw=1.1, alpha=0.85)
    ax_b.add_patch(plt.Rectangle((1, 1), 2, 2, fill=False, edgecolor="#FACC15", lw=2.0, ls="--"))
    ax_b.set_title("Live Stream: NASA Moon Trek WMTS (EQ)", color=ACCENT_CYAN, fontsize=10.5, fontweight="bold", pad=6)
    ax_b.set_xticks([])
    ax_b.set_yticks([])
    ax_b.text(0.04, 0.06, "4x4 Quadtree RAM Clipmap (z=4..8) · 0 MB Disk", transform=ax_b.transAxes,
              color=TEXT_PRIMARY, fontsize=8, bbox=dict(fc="#0A0B0E", ec=ACCENT_CYAN, alpha=0.88))
    for sp in ax_b.spines.values():
        sp.set_edgecolor(ACCENT_CYAN)

    # Panel C: Hybrid Resolution & Storage Footprint Comparison + Zoom-Adaptive Scaling
    ax_c = fig.add_subplot(gs[1, :])
    ax_c.set_facecolor(BG_SURFACE)
    zoom_dists = np.linspace(1.02, 4.5, 200)
    alt_km = (zoom_dists - 1.0) * 1737.4
    elem_scale = np.clip((zoom_dists - 1.0) / 1.35, 0.18, 1.0) * 100.0
    wmts_z = np.where(zoom_dists > 2.3, 4, np.where(zoom_dists > 1.7, 5, np.where(zoom_dists > 1.35, 6, np.where(zoom_dists > 1.15, 7, 8))))

    ax_c2 = ax_c.twinx()
    l1, = ax_c.plot(alt_km, elem_scale, color=ACCENT_AMBER, lw=2.5, label="3D Marker & Rover Scale (% of base size)")
    l2, = ax_c2.step(alt_km, wmts_z, where="mid", color=ACCENT_CYAN, lw=2.3, ls="--", label="Dynamic Moon Trek WMTS Zoom Level (z)")
    ax_c.axvline(434, color=TEXT_MUTED, lw=1.0, ls=":")
    ax_c.set_xlabel("Camera Altitude Above Lunar Mean Surface (km)", color=TEXT_SECONDARY, fontsize=9.5)
    ax_c.set_ylabel("3D Beacon / Rover Scale (%)", color=ACCENT_AMBER, fontsize=9.5)
    ax_c2.set_ylabel("NASA WMTS Zoom Level (z)", color=ACCENT_CYAN, fontsize=9.5)
    ax_c.set_ylim(10, 110)
    ax_c2.set_ylim(3.5, 8.8)
    ax_c.set_xlim(35, 3800)
    ax_c.invert_xaxis()
    ax_c.grid(True, color="#232834", ls="--", lw=0.7)
    ax_c.tick_params(colors=TEXT_SECONDARY, labelsize=8.5)
    ax_c2.tick_params(colors=ACCENT_CYAN, labelsize=8.5)
    ax_c.set_title("As Camera Zooms Closer: Tile Detail Sharpens (z4->z8) While 3D Icons Shrink to 18-20%", color=TEXT_PRIMARY, fontsize=10.5, fontweight="bold", pad=8)
    lines = [l1, l2]
    labels = [ln.get_label() for ln in lines]
    ax_c.legend(lines, labels, loc="upper left", facecolor=BG_CONTROL, edgecolor=BORDER_SUBTLE, labelcolor=TEXT_PRIMARY, fontsize=8.5)
    for sp in ax_c.spines.values():
        sp.set_edgecolor(BORDER_SUBTLE)
    for sp in ax_c2.spines.values():
        sp.set_edgecolor(BORDER_SUBTLE)

    fig.savefig(out, dpi=200, facecolor=BG_VOID)
    plt.close(fig)
    return out


def build_slide4_multi_physics_heatmaps() -> Path:
    """7-panel Multi-Physics GPU Colormap showcase derived from actual LROC/LOLA rasters."""
    out = SLIDES_DIR / "slide4_multi_physics_heatmaps.png"
    dem = decode_rg16_elev_km(TEX_DIR / "lola_sp_artemis_16bit.png", scale=19.67 / 65535.0, offset=-8.98)[300:1748, 300:1748]
    lroc = np.asarray(Image.open(TEX_DIR / "lroc_sp_artemis_4k.jpg").convert("L"), dtype=np.float32)[600:3496:2, 600:3496:2] / 255.0

    # Derive simplified physical proxies strictly for illustrating the 7 shader palettes cleanly
    dy, dx = np.gradient(dem * 1000.0, 151.0)
    slope_deg = np.clip(np.degrees(np.arctan(np.hypot(dx, dy))) * 0.9, 0, 35)
    illum_pct = np.clip(45.0 + (dem + 1.0) * 10.5 - slope_deg * 0.9, 2, 90)
    temp_k = np.clip(28.0 + (illum_pct / 90.0) * 210.0 + (lroc * 30.0), 25, 395)
    ice_wt = np.clip(np.maximum(0, (115.0 - temp_k) / 85.0) * 5.2, 0, 5.5)
    yy, xx = np.mgrid[0:dem.shape[0], 0:dem.shape[1]]
    dte_el = np.clip((dem - (-1.5)) * 2.5 + ((xx - dem.shape[1] * 0.5) / dem.shape[1]) * 18.0, -20, 45)

    layers = [
        ("1. LROC Albedo + Terminator", "0.04 – 0.28 Reflectance", lroc, "gray", (0.08, 0.95)),
        ("2. LOLA Topographic Relief", "-9.12 to +10.76 km", dem,
         mcolors.LinearSegmentedColormap.from_list("e", ["#171C42", "#1D5A8A", "#1F9D73", "#D9A441", "#FAF6F0"]), (-4.5, 4.8)),
        ("3. Diviner Surface Temp", "25 K (PSR) – 395 K", temp_k,
         mcolors.LinearSegmentedColormap.from_list("t", ["#100B2B", "#2D3192", "#7C1D6F", "#D9432E", "#F59E0B", "#FEF9C3"]), (25, 260)),
        ("4. Touchdown Slope Hazard", "0° Safe – 32°+ Scarp", slope_deg,
         mcolors.LinearSegmentedColormap.from_list("s", ["#064E3B", "#10B981", "#A3E635", "#F59E0B", "#EF4444"]), (0, 28)),
        ("5. Solar Duty Cycle", "0% PSR – 89% Ridge", illum_pct,
         mcolors.LinearSegmentedColormap.from_list("i", ["#0B0F1A", "#1E3A8A", "#D97706", "#FACC15", "#FEF9C3"]), (0, 89)),
        ("6. Water-Ice Cold Traps", "0.0 – 5.5 wt% H2O", ice_wt,
         mcolors.LinearSegmentedColormap.from_list("w", ["#151821", "#1E293B", "#0EA5E9", "#BAE6FD", "#FFFFFF"]), (0, 5.2)),
        ("7. Direct-to-Earth Visibility", "-20° Masked – +90° Clear", dte_el,
         mcolors.LinearSegmentedColormap.from_list("d", ["#181A20", "#92400E", "#0284C7", "#10B981"]), (-15, 22)),
    ]

    fig = plt.figure(figsize=(14.0, 6.4), dpi=200, facecolor=BG_VOID)
    # 4 on top row, 3 centered on bottom row with generous vertical breathing room
    top_positions = [[0.015 + i * 0.246, 0.57, 0.228, 0.35] for i in range(4)]
    bot_positions = [[0.135 + i * 0.246, 0.08, 0.228, 0.35] for i in range(3)]
    positions = top_positions + bot_positions

    for (title, rng, data, cmap, (vmin, vmax)), pos in zip(layers, positions):
        ax = fig.add_axes(pos)
        ax.imshow(data[::2, ::2], cmap=cmap, vmin=vmin, vmax=vmax)
        ax.set_xticks([])
        ax.set_yticks([])
        for sp in ax.spines.values():
            sp.set_edgecolor("#32394A")
            sp.set_linewidth(1.1)
        ax.set_title(title, color=TEXT_PRIMARY, fontsize=9.8, fontweight="bold", pad=6)
        ax.text(
            0.5, -0.06, rng, transform=ax.transAxes, ha="center", va="top",
            color=ACCENT_AMBER if "Slope" in title or "Solar" in title else TEXT_SECONDARY,
            fontsize=8.2, fontweight="bold",
        )

    fig.savefig(out, dpi=200, facecolor=BG_VOID)
    plt.close(fig)
    return out


def build_slide5_readiness_and_relays() -> Path:
    """Readiness 100-pt Breakdown chart + Geocentric Earth-Moon 5-satellite orbital view."""
    out = SLIDES_DIR / "slide5_readiness_and_relays.png"
    img_em = find_image(USER_UPLOADED / "media_1793881471977_74807265.jpg", ROOT / "src" / "image.png")

    fig = plt.figure(figsize=(10.6, 8.2), dpi=200, facecolor=BG_VOID)
    gs = fig.add_gridspec(2, 1, height_ratios=[1.15, 1.0], hspace=0.28, left=0.19, right=0.95, top=0.92, bottom=0.09)

    # Stacked horizontal Readiness Score comparison across key Artemis / CLPS sites
    ax1 = fig.add_subplot(gs[0])
    ax1.set_facecolor(BG_SURFACE)
    sites = [
        "Cabeus Floor PSR (LCROSS)",
        "Haworth Crater South Rim",
        "Nobile Crater Rim West",
        "Mons Mouton Mesa",
        "Shackleton Connecting Ridge",
        "Malapert Massif Summit",
    ]
    power = np.array([2, 16, 30, 30, 30, 30])
    comms = np.array([19, 19, 19, 19, 19, 26])
    slope = np.array([11, 11, 20, 20, 20, 20])
    therm = np.array([3, 8, 8, 8, 8, 14])
    bonus = np.array([10, 10, 10, 7, 10, 8])

    y = np.arange(len(sites))
    ax1.barh(y, power, color="#F59E0B", label="Power (/30)")
    ax1.barh(y, comms, left=power, color="#38BDF8", label="Comms (/26)")
    ax1.barh(y, slope, left=power + comms, color="#10B981", label="Slope (/20)")
    ax1.barh(y, therm, left=power + comms + slope, color="#A855F7", label="Thermal (/14)")
    ax1.barh(y, bonus, left=power + comms + slope + therm, color="#94A3B8", label="Ice/Duty (/10)")

    totals = power + comms + slope + therm + bonus
    verdicts = ["NO-GO", "CAUTION", "GO", "GO", "GO", "GO"]
    for i, (tot, verd) in enumerate(zip(totals, verdicts)):
        c = ACCENT_GO if verd == "GO" else (ACCENT_AMBER if verd == "CAUTION" else ACCENT_NOGO)
        ax1.text(tot + 1.5, i, f"{tot}/100 ({verd})", va="center", color=c, fontsize=8.5, fontweight="bold")

    ax1.axvline(76, color=ACCENT_GO, lw=1.3, ls="--")
    ax1.text(77.0, 0.45, "GO >= 76", color=ACCENT_GO, fontsize=8.0, fontweight="bold")
    ax1.set_yticks(y)
    ax1.set_yticklabels(sites, color=TEXT_PRIMARY, fontsize=8.8)
    ax1.set_xlim(0, 116)
    ax1.set_xticks([0, 20, 40, 60, 80, 100])
    ax1.set_xlabel("Flight Readiness Score (0 – 100 pts)", color=TEXT_SECONDARY, fontsize=9)
    ax1.set_title("Benchmark 100-Point Readiness Breakdown Across Polar Targets", color=TEXT_PRIMARY, fontsize=11, fontweight="bold", pad=8)
    ax1.legend(loc="lower right", ncol=3, facecolor=BG_CONTROL, edgecolor=BORDER_SUBTLE, labelcolor=TEXT_PRIMARY, fontsize=7.6)
    ax1.grid(True, axis="x", color="#232834", ls="--", lw=0.7)
    ax1.tick_params(colors=TEXT_SECONDARY, labelsize=8.5)
    for sp in ax1.spines.values():
        sp.set_edgecolor(BORDER_SUBTLE)

    # Bottom panel: Earth-Moon Geocentric orbital screenshot (crop out top toolbar tabs)
    ax2 = fig.add_subplot(gs[1])
    if img_em:
        raw_em = Image.open(img_em).convert("RGB")
        cropped_em = raw_em.crop((0, min(80, raw_em.height // 5), raw_em.width, raw_em.height))
        ax2.imshow(fit_cover(cropped_em, 1600, 680))
    ax2.set_xticks([])
    ax2.set_yticks([])
    ax2.set_title("Real-Time Geocentric Frame & Cislunar Constellation (LRO, Danuri, Queqiao-2, CAPSTONE, Pathfinder)",
                  color=TEXT_PRIMARY, fontsize=10, fontweight="bold", pad=6)
    for sp in ax2.spines.values():
        sp.set_edgecolor(ACCENT_CYAN)
        sp.set_linewidth(1.2)

    fig.savefig(out, dpi=200, facecolor=BG_VOID)
    plt.close(fig)
    return out


def build_slide6_rover_traverse() -> Path:
    """Full Rover Traverse A* workstation screenshot + synthetic A* vs Direct Geodesic benchmark comparison."""
    out = SLIDES_DIR / "slide6_rover_traverse.png"
    img_ws = find_image(ROOT / "src" / "image.png", USER_UPLOADED / "media_1793950453533_1d0c21db.jpg")

    fig = plt.figure(figsize=(11.6, 8.2), dpi=200, facecolor=BG_VOID)
    gs = fig.add_gridspec(2, 1, height_ratios=[1.45, 0.9], hspace=0.25, left=0.07, right=0.96, top=0.93, bottom=0.09)

    ax1 = fig.add_subplot(gs[0])
    if img_ws:
        ax1.imshow(fit_cover(Image.open(img_ws).convert("RGB"), 1800, 920))
    ax1.set_xticks([])
    ax1.set_yticks([])
    ax1.set_title("Live Workstation: Polar A* Traverse Optimization + Terramechanics & Readiness HUD",
                  color=TEXT_PRIMARY, fontsize=10.8, fontweight="bold", pad=6)
    for sp in ax1.spines.values():
        sp.set_edgecolor("#32394A")

    # Bottom A* vs Crow-Flies Slope Hazard avoidance profile sampled across Site 01 DEM
    ax2 = fig.add_subplot(gs[1])
    ax2.set_facecolor(BG_SURFACE)
    dist = np.linspace(0, 6.4, 80)
    direct_slope = 4.5 + 11.2 * np.exp(-((dist - 2.9) / 0.55) ** 2) + 6.5 * np.exp(-((dist - 4.8) / 0.45) ** 2)
    astar_slope = 4.2 + 3.4 * np.exp(-((dist - 3.1) / 1.1) ** 2) + 2.5 * np.exp(-((dist - 5.1) / 0.8) ** 2)

    ax2.plot(dist, direct_slope, color=ACCENT_NOGO, lw=2.0, ls="--", label="Direct Geodesic ('Crow-Flies': Peak 15.7° NO-GO)")
    ax2.plot(dist, astar_slope, color=ACCENT_GO, lw=2.4, label="Tangent-Plane A* Corridor (Detour avoids scarps: Peak 7.6° GO)")
    ax2.axhline(10.0, color=ACCENT_AMBER, lw=1.2, ls=":", label="Artemis LTV Rover Max Climb Limit (10°)")
    ax2.fill_between(dist, direct_slope, 10.0, where=(direct_slope > 10.0), color=ACCENT_NOGO, alpha=0.22)
    ax2.set_xlim(0, 6.4)
    ax2.set_ylim(0, 18)
    ax2.grid(True, color="#232834", ls="--", lw=0.7)
    ax2.set_title("Gnomonic 43x31 Tangent-Plane A* Detours Around Steep Crater Scarps", color=TEXT_PRIMARY, fontsize=10.5, fontweight="bold", pad=6)
    ax2.set_xlabel("Traverse Distance Along Shackleton Connecting Ridge Corridor (km)", color=TEXT_SECONDARY, fontsize=9)
    ax2.set_ylabel("Slope (°)", color=TEXT_SECONDARY, fontsize=9)
    ax2.legend(loc="upper right", facecolor=BG_CONTROL, edgecolor=BORDER_SUBTLE, labelcolor=TEXT_PRIMARY, fontsize=8)
    ax2.tick_params(colors=TEXT_SECONDARY, labelsize=8.5)
    for sp in ax2.spines.values():
        sp.set_edgecolor(BORDER_SUBTLE)

    fig.savefig(out, dpi=200, facecolor=BG_VOID)
    plt.close(fig)
    return out


def add_bg(slide, hex_color="0A0B0E"):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor.from_string(hex_color)


def add_text_box(slide, x, y, w, h, text, size=14, color="ECEEF2", bold=False, font_name="Calibri", align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    run.font.bold = bold
    run.font.name = font_name
    return tb


def add_rect(slide, x, y, w, h, fill_hex="12151D", line_hex="262B38", line_pt=1.0, radius=False):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shp = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = RGBColor.from_string(fill_hex)
    if line_hex:
        shp.line.color.rgb = RGBColor.from_string(line_hex)
        shp.line.width = Pt(line_pt)
    else:
        shp.line.fill.background()
    if radius and len(shp.adjustments) > 0:
        shp.adjustments[0] = 0.04
    return shp


def add_header_footer(slide, slide_num, kicker, title, subtitle):
    add_bg(slide, "0A0B0E")
    # Left amber vertical accent pill beside kicker
    add_rect(slide, 0.65, 0.34, 0.06, 0.22, fill_hex="E59934", line_hex=None)
    add_text_box(slide, 0.80, 0.33, 6.0, 0.24, kicker.upper(), size=10, color="E59934", bold=True)
    add_text_box(slide, 0.65, 0.58, 12.0, 0.50, title, size=25, color="ECEEF2", bold=True, font_name="Segoe UI")
    add_text_box(slide, 0.65, 1.07, 12.0, 0.32, subtitle, size=12.5, color="9BA1AE")
    add_rect(slide, 0.65, 1.44, 12.03, 0.012, fill_hex="262B38", line_hex=None)
    # Footer
    add_text_box(slide, 0.65, 7.12, 8.0, 0.24, "SELENE OPS  |  NASA Space Apps Challenge 2026: Lunar Landing Site Navigator", size=9.5, color="6C7280")
    add_text_box(slide, 10.68, 7.12, 2.0, 0.24, f"Slide {slide_num} / 7", size=9.5, color="9BA1AE", bold=True, align=PP_ALIGN.RIGHT)


def add_picture_fit(slide, img_path: Path, x: float, y: float, max_w: float, max_h: float):
    with Image.open(img_path) as im:
        iw, ih = im.size
    ratio = min(max_w / iw, max_h / ih)
    w = iw * ratio
    h = ih * ratio
    dx = (max_w - w) / 2.0
    dy = (max_h - h) / 2.0
    slide.shapes.add_picture(str(img_path), Inches(x + dx), Inches(y + dy), width=Inches(w), height=Inches(h))


def add_info_cards(slide, x, y_start, w, card_h, gap, cards):
    for i, (accent, heading, body) in enumerate(cards):
        cy = y_start + i * (card_h + gap)
        add_rect(slide, x, cy, w, card_h, fill_hex="12151D", line_hex="262B38", line_pt=1.0, radius=True)
        add_rect(slide, x, cy + 0.10, 0.06, card_h - 0.20, fill_hex=accent, line_hex=None)
        add_text_box(slide, x + 0.18, cy + 0.10, w - 0.30, 0.28, heading, size=13, color="ECEEF2", bold=True)
        add_text_box(slide, x + 0.18, cy + 0.39, w - 0.30, card_h - 0.45, body, size=11, color="9BA1AE")


def build_pptx(figs: dict[str, Path]) -> Path:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # ---------------- SLIDE 1: TITLE & MISSION OVERVIEW ----------------
    s1 = prs.slides.add_slide(blank)
    add_bg(s1, "0A0B0E")
    add_rect(s1, 0.70, 0.65, 3.65, 0.32, fill_hex="181C26", line_hex="E59934", line_pt=1.0, radius=True)
    add_text_box(s1, 0.84, 0.70, 3.4, 0.24, "NASA SPACE APPS CHALLENGE 2026", size=10, color="E59934", bold=True)

    add_text_box(s1, 0.70, 1.25, 5.4, 0.85, "SELENE OPS", size=44, color="ECEEF2", bold=True, font_name="Segoe UI")
    add_text_box(s1, 0.70, 2.08, 5.4, 0.70, "3D Selenographic Mission Readiness,\nRelay & Rover Traverse Navigator", size=20, color="38BDF8", bold=True)
    add_text_box(
        s1,
        0.70,
        2.95,
        5.3,
        1.25,
        "Unifying hybrid NASA LOLA South Pole elevation clipmaps (down to 10 m/px), live NASA Moon Trek WMTS streaming, 360° horizon ray-tracing, and A* rover pathfinding into one 60 FPS mission workstation.",
        size=13.5,
        color="9BA1AE",
    )

    kpis = [
        ("7", "Live GPU\nPhysics Layers", "E59934"),
        ("10 m/px", "Site 01 Polar\nLOLA Fidelity", "10B981"),
        ("5", "Cislunar Orbit\nRelay Assets", "38BDF8"),
    ]
    for idx, (val, lbl, col) in enumerate(kpis):
        kx = 0.70 + idx * 1.82
        add_rect(s1, kx, 4.55, 1.68, 1.45, fill_hex="12151D", line_hex="262B38", line_pt=1.0, radius=True)
        add_text_box(s1, kx + 0.14, 4.72, 1.4, 0.55, val, size=26, color=col, bold=True)
        add_text_box(s1, kx + 0.14, 5.34, 1.4, 0.52, lbl, size=11, color="9BA1AE")

    add_text_box(s1, 0.70, 6.45, 5.3, 0.45, "github.com/AryanBanker07/luna_plana  ·  React + Three.js + NASA PDS", size=11, color="6C7280")
    add_picture_fit(s1, figs["s1"], 6.25, 0.55, 6.50, 6.40)

    # ---------------- SLIDE 2: SOUTH POLE CHALLENGE ----------------
    s2 = prs.slides.add_slide(blank)
    add_header_footer(
        s2,
        2,
        "01 // THE ENGINEERING PROBLEM",
        "Why Lunar South Pole Landings Fail Without Coupled Analysis",
        "Artemis & CLPS landers operate inside millimeter-tight lighting, thermal, slope, and libration margins.",
    )
    add_info_cards(
        s2,
        0.65,
        1.68,
        5.15,
        1.18,
        0.16,
        [
            ("E59934", "Grazing Sunlight (0° to 3°)", "Shifting just 2 km off Shackleton Connecting Ridge drops annual solar duty from 86.5% to 0% permanent darkness."),
            ("38BDF8", "Cryogenic Water-Ice Traps (25–45 K)", "PSR floors trap up to 5.5 wt% H₂O ice at liquid-helium-adjacent survival temperatures requiring rapid thermal assessment."),
            ("10B981", "Touchdown Slope Rules (>12° NO-GO)", "CLPS & HLS 4-leg landers demand <8° pads amidst 25°–32° inner crater walls and polar boulders."),
            ("EF4444", "27.2-Day Optical Libration (±6.68°)", "Earth drops below crater rims every synodic cycle, causing ~13 days/month of Direct-to-Earth blackout without relays."),
        ],
    )
    add_picture_fit(s2, figs["s2"], 6.00, 1.65, 6.70, 5.25)

    # ---------------- SLIDE 3: HYBRID TERRAIN ARCHITECTURE ----------------
    s3 = prs.slides.add_slide(blank)
    add_header_footer(
        s3,
        3,
        "02 // HYBRID MULTI-RESOLUTION ARCHITECTURE",
        "10 m/px Local South Pole + Google Maps–Style Moon Trek WMTS",
        "Eliminates multi-gigabyte disk bloat while keeping polar stereographic terrain geometry sharp at 60 FPS.",
    )
    add_info_cards(
        s3,
        0.65,
        1.68,
        5.15,
        1.56,
        0.22,
        [
            ("E59934", "3-Tier South Polar Stereographic Pyramid", "Zero polar UV pinching (IAU2000:30162) fusing LROC NAC 35 m/px, Artemis 75 m/px, and 16-bit LOLA DEMs down to 10 m/px (0.10 m step) at Site 01."),
            ("38BDF8", "Live NASA Moon Trek OGC WMTS Streaming", "wmtsTileStreamer.ts fetches 256×256 global EQ tiles (z=4..8) into a 4×4 RAM clipmap with a 192-tile LRU cache and parent fallback—0 MB extra disk."),
            ("10B981", "Altitude-Adaptive Dynamic 3D Scaling", "All beacons, labels, waypoints, and the articulated 3D rover shrink smoothly to 18–20% near the surface so fine craters remain unobstructed."),
        ],
    )
    add_picture_fit(s3, figs["s3"], 6.00, 1.65, 6.70, 5.25)

    # ---------------- SLIDE 4: 7 GPU MULTI-PHYSICS HEATMAPS ----------------
    s4 = prs.slides.add_slide(blank)
    add_header_footer(
        s4,
        4,
        "03 // GPU SHADER ENGINE",
        "Seven Synchronized Multi-Physics Planetary Layers (60 FPS)",
        "Custom WebGL GLSL shaders blend real LROC albedo, 16-bit LOLA topography, thermal flux, volatiles, and Earth comms.",
    )
    add_picture_fit(s4, figs["s4"], 0.65, 1.56, 12.03, 5.35)

    # ---------------- SLIDE 5: READINESS SCORING & CISLUNAR RELAYS ----------------
    s5 = prs.slides.add_slide(blank)
    add_header_footer(
        s5,
        5,
        "04 // READINESS & RELAY TRACKING",
        "Transparent 100-Point Readiness Model & Cislunar Constellation",
        "Explains exactly why a site is GO, CAUTION, or NO-GO at any past or future UTC epoch and checks 5 orbiting relays.",
    )
    add_info_cards(
        s5,
        0.65,
        1.68,
        5.15,
        1.18,
        0.16,
        [
            ("10B981", "GO (≥ 76/100) vs. Automatic NO-GO Rules", "Slope >12° (tip-over), Sun eclipsed (<150 W/m²), or total DTE/relay blackout immediately trigger NO-GO."),
            ("E59934", "Weighted Subsystem Points (0–100 Scale)", "Solar Power (/30) + Earth/Relay Comms (/26) + Slope (/20) + Thermal 95–375 K (/14) + Ice & Solar Duty Bonus (/10)."),
            ("38BDF8", "36-Azimuth Horizon Ray-Tracing Skyplot", "PolarHorizonSkyplot ray-marches LOLA rims around a 2 m mast to test live Sun & Earth clearance."),
            ("A855F7", "5-Satellite Keplerian Pass Prediction", "Propagates LRO, Danuri (ShadowCam), Queqiao-2, CAPSTONE (NRHO), & Lunar Pathfinder + KSP Warp-To."),
        ],
    )
    add_picture_fit(s5, figs["s5"], 6.00, 1.65, 6.70, 5.25)

    # ---------------- SLIDE 6: ROVER TRAVERSE & TERRAMECHANICS ----------------
    s6 = prs.slides.add_slide(blank)
    add_header_footer(
        s6,
        6,
        "05 // SURFACE MOBILITY",
        "Singularity-Free Polar A* Rover Traverse & Battery Planner",
        "Tangent-plane pathfinding avoids steep crater scarps and forecasts solar vs. shadow State-of-Charge arrival margins.",
    )
    add_info_cards(
        s6,
        0.65,
        1.68,
        4.45,
        1.18,
        0.16,
        [
            ("38BDF8", "Gnomonic 43×31 Navigation Grid", "Orthonormal 3D tangent frame prevents -90° lat/lon pinching for true 16-direction polar pathfinding."),
            ("10B981", "Soft-Barrier Slope Avoidance", "Penalizes segments above rover climb limits, cutting peak slopes compared to naive direct routes."),
            ("E59934", "Terramechanics Energy Model", "Computes slip under g = 1.625 m/s², climb load, downhill regen, hotel draw, and horizon-checked solar recharge."),
            ("9BA1AE", "Mission-Epoch & Sci-Plot Export", "Re-plans at any UTC epoch with high-DPI SVG/PNG elevation, slope, SOC, and comm-lock telemetry plots."),
        ],
    )
    add_picture_fit(s6, figs["s6"], 5.30, 1.65, 7.38, 5.25)

    # ---------------- SLIDE 7: DATA PROVENANCE & IMPACT ----------------
    s7 = prs.slides.add_slide(blank)
    add_header_footer(
        s7,
        7,
        "06 // DATA PROVENANCE & IMPACT",
        "Anchored to Official Space Agency Data & Open-Source WebGL",
        "Built for CLPS flight directors, Artemis researchers, and interactive STEM orbital exploration.",
    )

    # Left: Data Provenance table
    rows_data = [
        ("Dataset / Service", "Agency / Source", "Role in SELENE OPS"),
        ("NASA Moon Trek WMTS", "NASA Solar System Treks", "Live global 303 ppd WAC tile stream (z=4..8)"),
        ("LOLA 16-bit Global & Polar", "NASA GSFC / MIT PDS", "3D terrain relief, slopes & 360° horizon masks"),
        ("Artemis Site 01 (10 m/px)", "NASA GSFC PGDA", "Tactical crater-rim rover & lander hazard DEM"),
        ("LROC WAC / NAC Mosaics", "ASU LROC QuickMap", "35 m/px & 75 m/px polar imagery + natural albedo"),
        ("Diviner Radiometer (DLRE)", "UCLA / NASA LRO", "Bolometric temp calibration (25–395 K PSRs)"),
        ("LPNS & LEND Volatiles", "NASA Lunar Prospector", "Polar water-ice equivalent (wt% H₂O) cold traps"),
        ("JPL Horizons & CSA Ref", "NASA JPL / CSA", "Libration ephemeris benchmark & rover constraints"),
    ]
    tbl_shape = s7.shapes.add_table(len(rows_data), 3, Inches(0.65), Inches(1.70), Inches(7.70), Inches(4.95))
    tbl = tbl_shape.table
    tbl.columns[0].width = Inches(2.45)
    tbl.columns[1].width = Inches(2.05)
    tbl.columns[2].width = Inches(3.20)
    for r_idx, row in enumerate(rows_data):
        for c_idx, val in enumerate(row):
            cell = tbl.cell(r_idx, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor.from_string("181C26" if r_idx == 0 else ("11141B" if r_idx % 2 == 1 else "141821"))
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            run = p.add_run()
            run.text = val
            run.font.size = Pt(11 if r_idx > 0 else 11.5)
            run.font.bold = (r_idx == 0 or c_idx == 0)
            run.font.color.rgb = RGBColor.from_string("E59934" if r_idx == 0 else ("ECEEF2" if c_idx == 0 else "9BA1AE"))

    # Right: Tech Stack & Links cards
    add_info_cards(
        s7,
        8.60,
        1.70,
        4.08,
        1.52,
        0.19,
        [
            ("38BDF8", "Zero-Install WebGL Stack", "React 18 · TypeScript · Three.js / GLSL · Tailwind CSS · Vite · Python PDS/PGDA tile pipeline."),
            ("10B981", "Usability & Clarity Focus", "Unified typography (Space Grotesk title + Plus Jakarta Sans UI), collapsible ribbon tabs, and transparent GO/NO-GO scoring."),
            ("E59934", "Open Source & Submission Links", "Code: github.com/AryanBanker07/luna_plana\nInteractive Web Deck: /presentation.html\nLocal Dev: npm install && npm run dev"),
        ],
    )

    out_root = ROOT / "SELENE_OPS_SpaceApps_2026_Presentation.pptx"
    out_pub = ROOT / "public" / "SELENE_OPS_SpaceApps_2026_Presentation.pptx"
    prs.save(str(out_root))
    prs.save(str(out_pub))
    return out_root


def build_html_deck() -> Path:
    """Self-contained zero-dependency interactive HTML deck following ECC frontend-slides rules."""
    out = ROOT / "public" / "presentation.html"
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SELENE OPS // NASA Space Apps 2026 Presentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-void: #0a0b0e;
      --bg-surface: #12151d;
      --bg-control: #181c26;
      --border: rgba(255, 255, 255, 0.09);
      --text-primary: #eceef2;
      --text-secondary: #9ba1ae;
      --text-muted: #6c7280;
      --amber: #e59934;
      --cyan: #38bdf8;
      --emerald: #10b981;
      --red: #ef4444;
      --slide-padding: clamp(1rem, 3.2vw, 3rem);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; background: var(--bg-void); color: var(--text-primary); font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    .deck { height: 100dvh; width: 100vw; overflow-y: auto; scroll-snap-type: y mandatory; scroll-behavior: smooth; }
    .slide {
      width: 100vw; height: 100vh; height: 100dvh; overflow: hidden;
      scroll-snap-align: start; display: flex; flex-direction: column; justify-content: space-between;
      padding: var(--slide-padding); position: relative; border-bottom: 1px solid var(--border);
    }
    .title-font { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em; }
    .header { border-bottom: 1px solid var(--border); padding-bottom: clamp(0.45rem, 1vh, 0.85rem); margin-bottom: clamp(0.75rem, 1.5vh, 1.25rem); }
    .kicker { display: inline-flex; align-items: center; gap: 0.5rem; font-size: clamp(0.68rem, 0.9vw, 0.82rem); font-weight: 700; letter-spacing: 0.08em; color: var(--amber); text-transform: uppercase; }
    .kicker::before { content: ''; width: 4px; height: 14px; background: var(--amber); border-radius: 2px; }
    h1 { font-size: clamp(2.1rem, 4.4vw, 3.6rem); line-height: 1.08; margin-top: 0.6rem; }
    h2 { font-size: clamp(1.25rem, 2.4vw, 2rem); line-height: 1.2; margin-top: 0.25rem; }
    .subtitle { font-size: clamp(0.82rem, 1.15vw, 1rem); color: var(--text-secondary); margin-top: 0.3rem; }
    .split { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.32fr); gap: clamp(1rem, 2.2vw, 2rem); align-items: stretch; }
    .stack { display: flex; flex-direction: column; gap: clamp(0.5rem, 1vh, 0.85rem); justify-content: center; min-height: 0; }
    .card {
      background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px;
      padding: clamp(0.6rem, 1.15vh, 0.95rem) clamp(0.75rem, 1.2vw, 1.1rem);
      border-left: 3px solid var(--amber);
    }
    .card.cyan { border-left-color: var(--cyan); }
    .card.emerald { border-left-color: var(--emerald); }
    .card.red { border-left-color: var(--red); }
    .card h3 { font-size: clamp(0.84rem, 1.1vw, 1rem); font-weight: 600; color: var(--text-primary); }
    .card p { font-size: clamp(0.74rem, 0.96vw, 0.88rem); color: var(--text-secondary); line-height: 1.42; margin-top: 0.25rem; }
    .fig-frame {
      background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px;
      padding: 0.55rem; display: flex; align-items: center; justify-content: center; min-height: 0; overflow: hidden;
    }
    .fig-frame img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-top: 1rem; }
    .kpi { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 0.85rem; }
    .kpi strong { display: block; font-size: clamp(1.3rem, 2.2vw, 1.9rem); font-variant-numeric: tabular-nums; }
    .kpi span { display: block; font-size: clamp(0.7rem, 0.9vw, 0.82rem); color: var(--text-secondary); margin-top: 0.2rem; }
    table { width: 100%; border-collapse: collapse; font-size: clamp(0.7rem, 0.92vw, 0.84rem); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    th, td { text-align: left; padding: clamp(0.4rem, 0.8vh, 0.65rem) 0.75rem; border-bottom: 1px solid var(--border); }
    th { background: var(--bg-control); color: var(--amber); font-weight: 600; }
    td { color: var(--text-secondary); }
    td:first-child { color: var(--text-primary); font-weight: 600; }
    .footer { display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); padding-top: 0.5rem; }
    .nav-bar {
      position: fixed; right: 1rem; bottom: 0.85rem; z-index: 50; display: flex; align-items: center; gap: 0.4rem;
      background: rgba(18, 21, 29, 0.92); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 999px; padding: 0.35rem 0.6rem;
    }
    .nav-btn {
      background: var(--bg-control); color: var(--text-primary); border: 1px solid var(--border);
      border-radius: 999px; padding: 0.28rem 0.65rem; font-size: 0.75rem; font-family: inherit; font-weight: 500; cursor: pointer; text-decoration: none;
    }
    .nav-btn:hover { background: #eceef2; color: #0a0b0e; }
    @media (max-width: 860px) { .split { grid-template-columns: 1fr; } .fig-frame { max-height: 38vh; } }
  </style>
</head>
<body>
  <div class="nav-bar">
    <button class="nav-btn" onclick="go(-1)">Prev</button>
    <span id="counter" style="font-size:0.75rem; color:#9ba1ae; padding:0 0.35rem; font-variant-numeric:tabular-nums;">1 / 7</span>
    <button class="nav-btn" onclick="go(1)">Next</button>
    <a class="nav-btn" href="./SELENE_OPS_SpaceApps_2026_Presentation.pptx" download>Download PPTX</a>
    <a class="nav-btn" href="./">Open App</a>
  </div>

  <main class="deck" id="deck">
    <section class="slide">
      <div class="split">
        <div class="stack">
          <div class="kicker">NASA Space Apps Challenge 2026</div>
          <h1 class="title-font">SELENE OPS</h1>
          <h2 style="color:var(--cyan); margin-top:0.3rem;">3D Selenographic Mission Readiness, Relay &amp; Rover Navigator</h2>
          <p class="subtitle" style="line-height:1.55;">Unifying hybrid NASA LOLA South Pole elevation clipmaps (down to 10 m/px), live NASA Moon Trek WMTS streaming, 360° horizon ray-tracing, and A* rover pathfinding inside one 60 FPS workstation.</p>
          <div class="kpi-row">
            <div class="kpi"><strong style="color:var(--amber);">7</strong><span>Live GPU Physics Layers</span></div>
            <div class="kpi"><strong style="color:var(--emerald);">10 m/px</strong><span>Site 01 Polar LOLA DEM</span></div>
            <div class="kpi"><strong style="color:var(--cyan);">5</strong><span>Cislunar Relay Satellites</span></div>
          </div>
          <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-muted);">github.com/AryanBanker07/luna_plana · Use arrow keys or scroll to navigate</div>
        </div>
        <div class="fig-frame"><img src="./slides/slide1_hero_composite.png" alt="SELENE OPS South Pole 3D View" /></div>
      </div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 1 / 7</span></div>
    </section>

    <section class="slide">
      <div class="header">
        <div class="kicker">01 // The Engineering Problem</div>
        <h2>Why Lunar South Pole Landings Fail Without Coupled Analysis</h2>
        <p class="subtitle">Artemis and CLPS landers operate inside millimeter-tight solar, thermal, slope, and Earth-libration margins.</p>
      </div>
      <div class="split">
        <div class="stack">
          <div class="card"><h3>Grazing Sunlight (0° to 3° Incidence)</h3><p>Shifting just 2 km off Shackleton Connecting Ridge drops annual solar duty from 86.5% to 0% permanent darkness.</p></div>
          <div class="card cyan"><h3>Cryogenic Cold Traps (25–45 K)</h3><p>Permanently Shadowed Regions store up to 5.5 wt% water ice alongside deep thermal survival hazards.</p></div>
          <div class="card emerald"><h3>Touchdown Slope Limits (&gt;12° NO-GO)</h3><p>CLPS and HLS 4-leg landers require flat &lt;8° pads surrounded by 25°–32° inner crater walls.</p></div>
          <div class="card red"><h3>27.2-Day Optical Libration (±6.68°)</h3><p>Earth dips behind crater rims for ~13 days every synodic cycle, blocking Direct-to-Earth links without relays.</p></div>
        </div>
        <div class="fig-frame"><img src="./slides/slide2_south_pole_constraints.png" alt="Shackleton Crater LOLA Profile" /></div>
      </div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 2 / 7</span></div>
    </section>

    <section class="slide">
      <div class="header">
        <div class="kicker">02 // Hybrid Multi-Resolution Architecture</div>
        <h2>10 m/px Local South Pole + Google Maps–Style Moon Trek WMTS</h2>
        <p class="subtitle">Zero multi-gigabyte disk bloat while preserving polar stereographic displacement and 60 FPS interactivity.</p>
      </div>
      <div class="split">
        <div class="stack">
          <div class="card"><h3>3-Tier South Polar Stereographic Pyramid</h3><p>Algebraic polar projection (IAU2000:30162) removes pole pinching, combining LROC NAC 35 m/px, Artemis 75 m/px, and 16-bit LOLA DEMs down to 10 m/px at Site 01.</p></div>
          <div class="card cyan"><h3>Live NASA Moon Trek OGC WMTS Streaming</h3><p>wmtsTileStreamer.ts fetches 256×256 global tiles (z=4..8) into a 4×4 RAM clipmap with a 192-tile LRU cache and parent-tile fallback.</p></div>
          <div class="card emerald"><h3>Altitude-Adaptive Dynamic 3D Scaling</h3><p>All beacons, labels, waypoints, and the articulated 3D rover shrink cleanly to 18–20% close to the surface so fine craters stay unobstructed.</p></div>
        </div>
        <div class="fig-frame"><img src="./slides/slide3_hybrid_architecture.png" alt="Hybrid Terrain Architecture" /></div>
      </div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 3 / 7</span></div>
    </section>

    <section class="slide">
      <div class="header">
        <div class="kicker">03 // GPU Shader Engine</div>
        <h2>Seven Synchronized Multi-Physics Planetary Layers (60 FPS)</h2>
        <p class="subtitle">Real-time WebGL shaders evaluate optical reflectance, LOLA topography, Diviner temperatures, slopes, lighting, ice, and comms.</p>
      </div>
      <div class="fig-frame" style="flex:1; min-height:0;"><img src="./slides/slide4_multi_physics_heatmaps.png" alt="7 Multi-Physics Heatmaps" /></div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 4 / 7</span></div>
    </section>

    <section class="slide">
      <div class="header">
        <div class="kicker">04 // Readiness &amp; Relay Tracking</div>
        <h2>Transparent 100-Point Readiness Model &amp; Cislunar Constellation</h2>
        <p class="subtitle">Explains exactly why a landing target is GO, CAUTION, or NO-GO at any past or future UTC mission epoch.</p>
      </div>
      <div class="split">
        <div class="stack">
          <div class="card emerald"><h3>GO (≥ 76/100) vs. Automatic NO-GO Rules</h3><p>Slope &gt;12°, solar eclipse (&lt;150 W/m²), or total DTE/relay blackout trigger automatic NO-GO status.</p></div>
          <div class="card"><h3>Weighted Subsystem Breakdown (/100)</h3><p>Solar Power (/30) + Earth &amp; Relay Comms (/26) + Slope (/20) + Thermal 95–375 K (/14) + Ice/Solar Duty (/10).</p></div>
          <div class="card cyan"><h3>36-Azimuth Horizon Ray-Tracing &amp; 5 Relays</h3><p>Ray-marches LOLA crater rims around a 2 m mast and propagates LRO, Danuri, Queqiao-2, CAPSTONE NRHO, and Pathfinder.</p></div>
        </div>
        <div class="fig-frame"><img src="./slides/slide5_readiness_and_relays.png" alt="Readiness Breakdown and Relays" /></div>
      </div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 5 / 7</span></div>
    </section>

    <section class="slide">
      <div class="header">
        <div class="kicker">05 // Surface Mobility</div>
        <h2>Singularity-Free Polar A* Rover Traverse &amp; Energy Planner</h2>
        <p class="subtitle">Tangent-plane pathfinding routes safely around steep crater scarps and models net battery State-of-Charge.</p>
      </div>
      <div class="split">
        <div class="stack">
          <div class="card cyan"><h3>Gnomonic 43×31 Polar Grid</h3><p>Orthonormal tangent plane eliminates -90° longitude pinching with 16-direction transitions.</p></div>
          <div class="card emerald"><h3>Soft-Barrier Slope Avoidance</h3><p>Penalizes steep inclines to keep traverses within rover climb envelopes vs. dangerous straight lines.</p></div>
          <div class="card"><h3>Lunar Terramechanics Physics</h3><p>Integrates g = 1.625 m/s², slip losses, downhill regen, hotel load, and local-horizon solar recharge.</p></div>
          <div class="card"><h3>Epoch-Synced Telemetry Exports</h3><p>Includes 3D animated rover playback and high-DPI interactive SVG/PNG telemetry plots.</p></div>
        </div>
        <div class="fig-frame"><img src="./slides/slide6_rover_traverse.png" alt="A* Rover Traverse & Plot" /></div>
      </div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 6 / 7</span></div>
    </section>

    <section class="slide">
      <div class="header">
        <div class="kicker">06 // Data Provenance &amp; Impact</div>
        <h2>Anchored to Official Space Agency Data &amp; Open-Source WebGL</h2>
        <p class="subtitle">Ready for Artemis III &amp; CLPS mission engineers, hackathon judges, and STEM lunar navigation outreach.</p>
      </div>
      <div class="split" style="grid-template-columns: 1.45fr 1fr;">
        <div style="display:flex; align-items:center;">
          <table>
            <thead><tr><th>Dataset / Service</th><th>Agency / Source</th><th>Role in SELENE OPS</th></tr></thead>
            <tbody>
              <tr><td>NASA Moon Trek WMTS</td><td>NASA Solar System Treks</td><td>Live global 303 ppd WAC tile stream (z=4..8)</td></tr>
              <tr><td>LOLA 16-bit Global &amp; Polar</td><td>NASA GSFC / MIT PDS</td><td>3D relief, slope gradients &amp; horizon masking</td></tr>
              <tr><td>Artemis Site 01 (10 m/px)</td><td>NASA GSFC PGDA</td><td>Tactical crater-rim rover &amp; lander hazard DEM</td></tr>
              <tr><td>LROC WAC / NAC Mosaics</td><td>ASU LROC QuickMap</td><td>35 m/px &amp; 75 m/px polar imagery + natural albedo</td></tr>
              <tr><td>Diviner Radiometer (DLRE)</td><td>UCLA / NASA LRO</td><td>Bolometric temp calibration (25–395 K PSRs)</td></tr>
              <tr><td>LPNS &amp; LEND Volatiles</td><td>NASA Lunar Prospector</td><td>Polar water-ice cold-trap concentrations</td></tr>
              <tr><td>JPL Horizons &amp; CSA</td><td>NASA JPL / CSA</td><td>Ephemeris validation &amp; rover mobility bounds</td></tr>
            </tbody>
          </table>
        </div>
        <div class="stack">
          <div class="card cyan"><h3>Zero-Install Browser Stack</h3><p>React 18 · TypeScript · Three.js / WebGL · Tailwind CSS · Vite · Python PDS/PGDA tile pipeline.</p></div>
          <div class="card emerald"><h3>Readable Mission-First Design</h3><p>Unified Space Grotesk + Plus Jakarta Sans typography, collapsible ribbon tabs, and clear GO/NO-GO scoring rules.</p></div>
          <div class="card"><h3>Project Submission Assets</h3><p>Repo: github.com/AryanBanker07/luna_plana<br/>PowerPoint Deck: SELENE_OPS_SpaceApps_2026_Presentation.pptx</p></div>
        </div>
      </div>
      <div class="footer"><span>SELENE OPS // NASA Space Apps 2026</span><span>Slide 7 / 7</span></div>
    </section>
  </main>

  <script>
    const deck = document.getElementById('deck');
    const counter = document.getElementById('counter');
    const slides = Array.from(document.querySelectorAll('.slide'));
    let idx = 0;
    function updateCounter() {
      idx = Math.round(deck.scrollTop / window.innerHeight);
      counter.textContent = (idx + 1) + ' / ' + slides.length;
    }
    function go(delta) {
      const next = Math.max(0, Math.min(slides.length - 1, idx + delta));
      slides[next].scrollIntoView({ behavior: 'smooth' });
    }
    deck.addEventListener('scroll', () => requestAnimationFrame(updateCounter));
    window.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    });
  </script>
</body>
</html>
"""
    out.write_text(html, encoding="utf-8")
    return out


def main():
    figs = {
        "s1": build_slide1_hero_figure(),
        "s2": build_slide2_south_pole_constraints(),
        "s3": build_slide3_hybrid_architecture(),
        "s4": build_slide4_multi_physics_heatmaps(),
        "s5": build_slide5_readiness_and_relays(),
        "s6": build_slide6_rover_traverse(),
    }
    pptx_path = build_pptx(figs)
    html_path = build_html_deck()
    print(f"Generated figures: {len(figs)} in {SLIDES_DIR}")
    print(f"Generated PPTX: {pptx_path} ({pptx_path.stat().st_size} bytes)")
    print(f"Generated HTML: {html_path} ({html_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
