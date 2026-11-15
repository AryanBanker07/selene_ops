import React, { useState } from 'react';
import { Calendar, Clock, Mountain, Radio, ShieldCheck, Sun } from 'lucide-react';
import {
  OptimalWindowRecommendation,
  SatellitePassWindow,
  SiteEvaluation,
} from '../types/lunar';

interface AiMissionAdvisorProps {
  evaluation: SiteEvaluation;
  passes: SatellitePassWindow[];
  optimalWindows: OptimalWindowRecommendation[];
  onJumpToTime: (ms: number) => void;
}

export const AiMissionAdvisor: React.FC<AiMissionAdvisorProps> = ({
  evaluation,
  passes,
  optimalWindows,
  onJumpToTime,
}) => {
  const [activeCategory, setActiveCategory] = useState<'overview' | 'comms' | 'power'>('overview');

  const isPolar = Math.abs(evaluation.site.lat) > 75;
  const bestFlux = isPolar
    ? evaluation.solarFluxVerticalMastWm2
    : evaluation.solarFluxHorizontalWm2;
  const relayPasses = passes.filter((p) => p.isRelay);
  const topWindow = optimalWindows[0];

  return (
    <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#9BA1AE]" />
          <span className="text-xs font-semibold text-[#ECEEF2]">
            Flight Windows &amp; Subsystem Summary
          </span>
        </div>
        <span
          className={`text-[11px] font-mono-tech px-2 py-0.5 rounded border font-medium ${
            evaluation.overallStatus === 'GO'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
              : evaluation.overallStatus === 'CAUTION'
              ? 'bg-amber-500/10 border-amber-500/35 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/35 text-rose-300'
          }`}
        >
          {evaluation.overallStatus} ({evaluation.readinessScore}/100)
        </span>
      </div>

      {topWindow ? (
        <div className="p-2.5 rounded-lg bg-[#181B22] border border-white/[0.08] flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#ECEEF2]">
              <Calendar className="w-3.5 h-3.5 text-[#E59934] shrink-0" />
              <span>Optimal Window: {topWindow.durationHours}h continuous sun</span>
            </div>
            <div className="text-[#9BA1AE] mt-1 font-mono-tech text-[11px]">
              {new Date(topWindow.startMs).toISOString().slice(0, 16).replace('T', ' ')}Z · DTE{' '}
              {topWindow.dteCoveragePct}% · Relay {topWindow.relayCoveragePct}%
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToTime(topWindow.startMs + 6 * 3600 * 1000)}
            className="hud-btn shrink-0 px-2.5 py-1.5 rounded-md bg-[#ECEEF2] text-[#0A0B0E] hover:bg-white font-medium text-xs cursor-pointer flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>Warp</span>
          </button>
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-[#181B22] border border-white/[0.08] text-xs text-[#9BA1AE]">
          Permanent shadow region — solar touchdown unavailable. RTG power required.
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[#0A0B0E] border border-white/[0.08] text-xs">
        {[
          { id: 'overview' as const, label: 'Synthesis' },
          { id: 'comms' as const, label: 'Comms' },
          { id: 'power' as const, label: 'Power' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id)}
            className={`py-1.5 rounded-md text-center cursor-pointer transition-colors ${
              activeCategory === tab.id
                ? 'bg-[#181B22] text-[#ECEEF2] font-medium'
                : 'text-[#9BA1AE] hover:text-[#ECEEF2]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0A0B0E] rounded-lg border border-white/[0.08] p-3 text-xs leading-relaxed space-y-2 text-[#9BA1AE]">
        {activeCategory === 'overview' && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Mountain className="w-3.5 h-3.5 text-[#9BA1AE] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#ECEEF2] font-medium">Terrain:</span>{' '}
                <span className="font-mono-tech">
                  {evaluation.elevationKm >= 0 ? '+' : ''}
                  {evaluation.elevationKm.toFixed(2)} km
                </span>{' '}
                · Slope{' '}
                <span className="font-mono-tech text-[#ECEEF2]">
                  {evaluation.slopeDeg.toFixed(1)}°
                </span>{' '}
                ({evaluation.slopeDeg <= 8 ? 'Within <8° flight rule' : 'Exceeds 8° caution'})
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sun className="w-3.5 h-3.5 text-[#9BA1AE] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#ECEEF2] font-medium">Illumination:</span>{' '}
                {evaluation.sun.isVisible
                  ? `Sunlit (+${evaluation.sun.elevationDeg.toFixed(1)}°)`
                  : 'Local shadow'}{' '}
                · <span className="font-mono-tech">{evaluation.illuminationDutyPct}%</span> duty ·{' '}
                <span className="font-mono-tech">{evaluation.surfaceTempK} K</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Radio className="w-3.5 h-3.5 text-[#9BA1AE] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#ECEEF2] font-medium">Comms:</span>{' '}
                {evaluation.earth.isVisible
                  ? `DTE Open (+${evaluation.earth.elevationDeg.toFixed(1)}°)`
                  : 'DTE Masked'}{' '}
                · {evaluation.visibleRelays.length} active relay(s) in view
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'comms' && (
          <div className="space-y-1.5">
            <div className="text-[#ECEEF2] font-medium">
              Direct-to-Earth (DTE) &amp; Cislunar Relays
            </div>
            <p>
              DTE Status:{' '}
              {evaluation.earth.isVisible
                ? `Open at +${evaluation.earth.elevationDeg.toFixed(1)}° (clearing +${evaluation.earth.horizonDeg.toFixed(1)}° rim)`
                : `Blocked (${evaluation.earth.elevationDeg.toFixed(1)}° vs +${evaluation.earth.horizonDeg.toFixed(1)}° rim)`}
            </p>
            <p>
              Active Constellation:{' '}
              {evaluation.visibleRelays.length > 0
                ? evaluation.visibleRelays
                    .map(
                      (r) =>
                        `${r.satellite.name.split(' (')[0]} (+${r.elevationDeg.toFixed(0)}°, ${r.instantDataRateMbps} Mbps)`
                    )
                    .join(', ')
                : relayPasses[0]
                ? `Next AOS in ${Math.max(1, Math.round((relayPasses[0].aosTimeMs - evaluation.timestampMs) / 60000))}m (${relayPasses[0].satelliteName.split(' ')[0]})`
                : 'No active pass in next hour'}
            </p>
          </div>
        )}

        {activeCategory === 'power' && (
          <div className="space-y-1.5">
            <div className="text-[#ECEEF2] font-medium">Solar Irradiance &amp; Thermal State</div>
            <p>
              Solar Flux:{' '}
              <span className="font-mono-tech text-[#ECEEF2]">{bestFlux.toFixed(0)} W/m²</span> (
              {evaluation.sun.isVisible
                ? `El +${evaluation.sun.elevationDeg.toFixed(1)}°`
                : 'Local Shadow'}
              ) · Temp <span className="font-mono-tech">{evaluation.surfaceTempK} K</span>
            </p>
            <p>
              Array Configuration: {isPolar ? 'Vertical 1-axis tracking mast' : 'Horizontal deck'} (
              {evaluation.illuminationDutyPct >= 75
                ? 'High polar duty limits eclipse under 55h'
                : 'Requires battery reserve or RHU thermal survival'}
              )
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
