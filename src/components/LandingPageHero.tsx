import React from 'react';
import {
  ArrowRight,
  Compass,
  Crosshair,
  HelpCircle,
  Orbit,
  Route,
} from 'lucide-react';
import { LandingSite, ViewportViewMode } from '../types/lunar';

interface LandingPageHeroProps {
  curatedSites: LandingSite[];
  onEnterConsole: () => void;
  onLaunchSouthPole: () => void;
  onLaunchRoverPlanner: () => void;
  onLaunchSite: (site: LandingSite) => void;
  onLaunchViewMode: (mode: ViewportViewMode) => void;
  onLaunchWizard: () => void;
}

export const LandingPageHero: React.FC<LandingPageHeroProps> = ({
  curatedSites,
  onEnterConsole,
  onLaunchSouthPole,
  onLaunchRoverPlanner,
  onLaunchSite,
  onLaunchViewMode,
  onLaunchWizard,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 h-screen w-screen overflow-hidden flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(10, 11, 14, 0.35) 0%, rgba(10, 11, 14, 0.84) 70%, rgba(10, 11, 14, 0.95) 100%)',
      }}
    >
      <div className="obsidian-drawer rounded-xl w-full max-w-[600px] overflow-hidden text-[#ECEEF2]">
        {/* Header & Primary Mission Controls */}
        <div className="p-5 sm:p-6 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-title text-2xl sm:text-[28px] font-bold tracking-tight text-[#ECEEF2]">
                SELENE
              </h1>
              <p className="text-sm text-[#9BA1AE] mt-1.5 leading-relaxed">
                Lunar landing site readiness analyzer, crater-rim horizon ray-tracer, and A* rover traverse planner.
              </p>
            </div>

            <button
              type="button"
              onClick={onLaunchWizard}
              className="hud-btn shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-xs font-medium text-[#ECEEF2] cursor-pointer"
              title="Open 5-step Feature Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#E59934]" />
              <span>Feature Guide</span>
            </button>
          </div>

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
              <span>South Pole (10 m/px)</span>
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
        <div className="px-5 sm:px-6 py-4">
          <div className="mb-2.5">
            <span className="text-xs font-semibold text-[#ECEEF2]">
              Select Landing Site to Inspect
            </span>
          </div>

          <div className="max-h-[290px] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0A0B0E] divide-y divide-white/[0.06]">
            {curatedSites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => onLaunchSite(site)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#181B22] transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#ECEEF2] truncate">
                    {site.name}
                  </div>
                  <div className="text-xs text-[#9BA1AE] truncate mt-0.5 tabular-nums">
                    {site.missionTag}
                    {site.slopeOverrideDeg !== undefined && site.illuminationOverridePct !== undefined
                      ? ` · Slope ${site.slopeOverrideDeg.toFixed(1)}° · Solar ${site.illuminationOverridePct.toFixed(0)}%`
                      : ''}
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
      </div>
    </div>
  );
};
