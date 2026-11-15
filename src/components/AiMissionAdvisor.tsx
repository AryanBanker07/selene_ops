import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { OptimalWindowRecommendation } from '../types/lunar';

interface AiMissionAdvisorProps {
  optimalWindows: OptimalWindowRecommendation[];
  onJumpToTime: (ms: number) => void;
}

export const AiMissionAdvisor: React.FC<AiMissionAdvisorProps> = ({
  optimalWindows,
  onJumpToTime,
}) => {
  return (
    <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#9BA1AE]" />
          <span className="text-xs font-semibold text-[#ECEEF2]">
            Optimal Touchdown Windows
          </span>
        </div>
        <span className="text-[11px] text-[#9BA1AE] tabular-nums">
          Next 30 days
        </span>
      </div>

      {optimalWindows.length > 0 ? (
        <div className="space-y-1.5">
          {optimalWindows.slice(0, 4).map((win, idx) => (
            <div
              key={win.startMs}
              className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.08] flex items-center justify-between gap-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-[#ECEEF2] tabular-nums">
                  {idx === 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E59934] shrink-0" />
                  )}
                  <span>{win.durationHours}h continuous sun</span>
                </div>
                <div className="text-[#9BA1AE] mt-1 font-mono-tech text-[11px]">
                  {new Date(win.startMs).toISOString().slice(0, 16).replace('T', ' ')}Z · DTE{' '}
                  {win.dteCoveragePct}% · Relay {win.relayCoveragePct}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJumpToTime(win.startMs + 6 * 3600 * 1000)}
                className="hud-btn shrink-0 px-2.5 py-1.5 rounded-md bg-[#ECEEF2] text-[#0A0B0E] hover:bg-white font-semibold text-xs cursor-pointer flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                <span>Warp</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-[#0A0B0E] border border-white/[0.08] text-xs text-[#9BA1AE] leading-relaxed">
          Permanent shadow region — direct solar touchdown unavailable over the 30-day cycle. Radioisotope (RTG/RHU) power is required for surface survival.
        </div>
      )}
    </div>
  );
};
