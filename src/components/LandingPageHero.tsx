import React from 'react';
import {
  ArrowRight,
  Compass,
  Crosshair,
  Orbit,
  Route,
} from 'lucide-react';
import { HEATMAP_CONFIGS } from '../data/lunarCatalog';
import { HeatmapMode, LandingSite, ViewportViewMode } from '../types/lunar';

interface LandingPageHeroProps {
  curatedSites: LandingSite[];
  epochDisplay: string;
  onEnterConsole: () => void;
  onLaunchSouthPole: () => void;
  onLaunchRoverPlanner: () => void;
  onLaunchLayer: (mode: HeatmapMode) => void;
  onLaunchSite: (site: LandingSite) => void;
  onLaunchViewMode: (mode: ViewportViewMode) => void;
}

export const LandingPageHero: React.FC<LandingPageHeroProps> = ({
  curatedSites,
  epochDisplay,
  onEnterConsole,
  onLaunchSouthPole,
  onLaunchRoverPlanner,
  onLaunchLayer,
  onLaunchSite,
  onLaunchViewMode,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 h-screen w-screen overflow-hidden flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(10, 11, 14, 0.35) 0%, rgba(10, 11, 14, 0.82) 70%, rgba(10, 11, 14, 0.94) 100%)',
      }}
    >
      <div className="obsidian-drawer rounded-xl w-full max-w-[600px] overflow-hidden text-[#ECEEF2]">
        {/* Header & Primary Mission Controls */}
        <div className="p-5 sm:p-6 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#ECEEF2]">
                SELENE
              </h1>
              <p className="text-sm text-[#9BA1AE] mt-1">
                Lunar landing site readiness, horizon ray-tracing, and A* rover traverse planner.
              </p>
            </div>
            <span className="font-mono-tech text-xs text-[#9BA1AE] bg-[#181B22] border border-white/[0.08] px-2.5 py-1 rounded-md shrink-0">
              {epochDisplay} UTC
            </span>
          </div>

          {/* Primary Ergonomic Action Bar */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEnterConsole}
              className="hud-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ECEEF2] hover:bg-white text-[#0A0B0E] text-sm font-semibold cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Open 3D Workspace</span>
            </button>

            <button
              type="button"
              onClick={onLaunchSouthPole}
              className="hud-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-[#ECEEF2] text-sm font-medium cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#9BA1AE]" />
              <span>South Pole (5 m/px)</span>
            </button>

            <button
              type="button"
              onClick={onLaunchRoverPlanner}
              className="hud-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-[#ECEEF2] text-sm font-medium cursor-pointer"
            >
              <Route className="w-3.5 h-3.5 text-[#9BA1AE]" />
              <span>Rover Traverse</span>
            </button>

            <button
              type="button"
              onClick={() => onLaunchViewMode('earth-moon')}
              className="hud-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-[#ECEEF2] text-sm font-medium cursor-pointer"
            >
              <Orbit className="w-3.5 h-3.5 text-[#9BA1AE]" />
              <span>Earth–Moon</span>
            </button>
          </div>
        </div>

        {/* Direct Target Site Selector Table */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-[#ECEEF2]">
              Select Landing Site to Inspect
            </span>
            <span className="text-xs text-[#9BA1AE]">
              {curatedSites.length} targets loaded
            </span>
          </div>

          <div className="max-h-[240px] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0A0B0E] divide-y divide-white/[0.06]">
            {curatedSites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => onLaunchSite(site)}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#181B22] transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#ECEEF2] truncate">
                    {site.name}
                  </div>
                  <div className="text-xs text-[#9BA1AE] truncate mt-0.5">
                    {site.missionTag}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono-tech text-xs text-[#9BA1AE]">
                    {Math.abs(site.lat).toFixed(2)}°{site.lat >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(site.lon).toFixed(1)}°{site.lon >= 0 ? 'E' : 'W'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6C7280] group-hover:text-[#ECEEF2] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Direct Surface Layer Quick-Launch Strip */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#0A0B0E]/60">
          <div className="text-xs font-medium text-[#9BA1AE] mb-2">
            Open directly in planetary layer
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HEATMAP_CONFIGS.filter((h) => h.id !== 'albedo').map((hm) => (
              <button
                key={hm.id}
                type="button"
                onClick={() => onLaunchLayer(hm.id)}
                className="hud-btn px-2.5 py-1 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-xs font-medium text-[#ECEEF2] cursor-pointer"
              >
                {hm.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
