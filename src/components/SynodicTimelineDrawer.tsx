import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OptimalWindowRecommendation, TimelineSample } from '../types/lunar';

interface SynodicTimelineDrawerProps {
  timeline: TimelineSample[];
  currentTimeMs: number;
  anchorTimeMs: number;
  optimalWindows: OptimalWindowRecommendation[];
  siteName: string;
  onScrubTime: (newTimeMs: number) => void;
  onSwitchToRover?: () => void;
}

export const SynodicTimelineDrawer: React.FC<SynodicTimelineDrawerProps> = ({
  timeline,
  currentTimeMs,
  anchorTimeMs,
  optimalWindows,
  siteName,
  onScrubTime,
  onSwitchToRover,
}) => {
  const [expanded, setExpanded] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (timeline.length === 0) return null;

  const startMs = timeline[0].timeMs;
  const endMs = timeline[timeline.length - 1].timeMs;
  const spanMs = Math.max(1, endMs - startMs);
  const cursorPct = Math.max(0, Math.min(100, ((currentTimeMs - startMs) / spanMs) * 100));

  const sunPct = Math.round(
    (timeline.filter((s) => s.sunVisible).length / timeline.length) * 100
  );
  const dtePct = Math.round(
    (timeline.filter((s) => s.earthVisible).length / timeline.length) * 100
  );
  const commTotalPct = Math.round(
    (timeline.filter((s) => s.earthVisible || s.relayCount > 0).length / timeline.length) *
      100
  );

  const scrubFromClientX = (clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onScrubTime(Math.round(startMs + frac * spanMs));
  };

  const formatShortUtc = (ms: number) => {
    const d = new Date(ms);
    return d.toISOString().slice(5, 16).replace('T', ' ') + 'Z';
  };

  return (
    <div className="px-3 py-2 pointer-events-auto">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="hud-btn flex items-center gap-1.5 text-xs font-semibold text-[#ECEEF2] hover:text-white cursor-pointer"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>30-Day Synodic Access Timeline</span>
          </button>
          <span className="hidden sm:inline text-xs text-[#9BA1AE]">
            {siteName}
          </span>
        </div>

        {/* 30-Day Aggregate Duty Metrics + Jump to Optimal Touchdown */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tech">
          <span className="px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.08] text-[#ECEEF2]">
            Sun {sunPct}%
          </span>
          <span className="px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.08] text-[#ECEEF2]">
            DTE {dtePct}%
          </span>
          <span className="px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.08] text-[#ECEEF2]">
            Relay {commTotalPct}%
          </span>

          {optimalWindows.length > 0 && (
            <button
              type="button"
              onClick={() => onScrubTime(optimalWindows[0].startMs + 6 * 3600 * 1000)}
              className="hud-btn px-2.5 py-0.5 rounded bg-[#ECEEF2] text-[#0A0B0E] font-medium hover:bg-white cursor-pointer"
              title={optimalWindows[0].rationale}
            >
              Best Window ({optimalWindows[0].durationHours}h)
            </button>
          )}

          {onSwitchToRover && (
            <button
              type="button"
              onClick={onSwitchToRover}
              className="hud-btn px-2 py-0.5 rounded bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
            >
              Rover Chart
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2.5 select-none">
          <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
            {/* Track Labels */}
            <div className="space-y-1.5 text-[11px] text-[#9BA1AE] pr-1">
              <div className="h-3.5 flex items-center">Solar Power</div>
              <div className="h-3.5 flex items-center">Earth DTE</div>
              <div className="h-3.5 flex items-center">Relay Orbits</div>
              <div className="h-4 flex items-center">Temp (K)</div>
            </div>

            {/* Interactive Scrubbing Canvas / SVG */}
            <div
              ref={barRef}
              onPointerDown={(e) => {
                setIsDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
                scrubFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (isDragging) scrubFromClientX(e.clientX);
              }}
              onPointerUp={() => setIsDragging(false)}
              className="relative cursor-ew-resize bg-[#060911] rounded-md border border-white/10 p-1.5 overflow-hidden"
            >
              <svg
                viewBox={`0 0 ${timeline.length} 66`}
                preserveAspectRatio="none"
                className="w-full h-[68px] block"
              >
                {timeline.map((s, idx) => (
                  <g key={idx}>
                    {/* Track 1: Solar Illumination */}
                    <rect
                      x={idx}
                      y={1}
                      width={1.08}
                      height={11}
                      fill={s.sunVisible ? '#f59e0b' : '#111622'}
                      opacity={s.sunVisible ? 0.9 : 0.8}
                    />
                    {/* Track 2: Direct-to-Earth (DTE) */}
                    <rect
                      x={idx}
                      y={16}
                      width={1.08}
                      height={11}
                      fill={s.earthVisible ? '#38bdf8' : '#18121c'}
                      opacity={s.earthVisible ? 0.88 : 0.8}
                    />
                    {/* Track 3: Relay Constellation Count (1, 2, 3+ relays) */}
                    <rect
                      x={idx}
                      y={31}
                      width={1.08}
                      height={11}
                      fill={
                        s.relayCount >= 2
                          ? '#10b981'
                          : s.relayCount === 1
                          ? '#059669'
                          : '#111622'
                      }
                      opacity={s.relayCount > 0 ? 0.9 : 0.7}
                    />
                  </g>
                ))}

                {/* Track 4: Surface Temperature Sparkline (25 K to 400 K) */}
                <polyline
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="1.6"
                  vectorEffect="non-scaling-stroke"
                  points={timeline
                    .map((s, idx) => {
                      const normT = Math.max(0, Math.min(1, (s.tempK - 25) / 375));
                      const y = 64 - normT * 17;
                      return `${idx},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              </svg>

              {/* Playhead Scrub Cursor */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_#fff]"
                style={{ left: `${cursorPct}%` }}
              >
                <div className="absolute -top-0.5 -left-1.5 w-3.5 h-2 rounded-xs bg-[#fbbf24] border border-white" />
              </div>
            </div>
          </div>

          {/* Date Axis Labels */}
          <div className="grid grid-cols-[100px_1fr] gap-2 mt-1">
            <div className="text-[10px] font-mono-tech text-[#6C7280]">Drag to scrub</div>
            <div className="flex justify-between text-[10px] font-mono-tech text-slate-400">
              <span>{formatShortUtc(startMs)}</span>
              <span>+7.5d</span>
              <span>+15d (Half Synodic)</span>
              <span>+22.5d</span>
              <span>{formatShortUtc(endMs)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

