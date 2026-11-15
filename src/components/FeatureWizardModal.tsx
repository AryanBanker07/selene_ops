import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Layers,
  MapPin,
  Route,
  Satellite,
  X,
} from 'lucide-react';
import { HeatmapMode, ViewportViewMode } from '../types/lunar';

export type WizardStepId = 'sites' | 'layers' | 'readiness' | 'orbits' | 'rover';

export interface WizardStepAction {
  stepId: WizardStepId;
  viewMode?: ViewportViewMode;
  heatmapMode?: HeatmapMode;
  openTab?: 'sites' | 'layers' | 'readiness' | 'orbits' | 'rover' | 'timeline' | 'none';
  focusSouthPole?: boolean;
  startRoverPlanner?: boolean;
}

interface FeatureWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStepAction: (action: WizardStepAction) => void;
  currentHeatmap: HeatmapMode;
  currentViewMode: ViewportViewMode;
}

interface WizardStepDef {
  id: WizardStepId;
  shortLabel: string;
  title: string;
  summary: string;
  bullets: { heading: string; detail: string }[];
  icon: React.ReactNode;
  defaultAction: WizardStepAction;
}

const WIZARD_STEPS: WizardStepDef[] = [
  {
    id: 'sites',
    shortLabel: '1. Sites',
    title: 'Landing Sites & Hybrid 3D Terrain',
    summary:
      'Explore any point on the Moon by clicking directly on the 3D globe or choosing from 10 curated Artemis III, CLPS, and ISRU targets.',
    bullets: [
      {
        heading: 'Local 10 m/px South Pole Pyramid',
        detail:
          'Offline 16-bit NASA LOLA relief models (down to 10 m/px at Artemis Site 01 near Shackleton) render instant crater-rim geometry with zero network delay.',
      },
      {
        heading: 'Live NASA Moon Trek WMTS Streaming',
        detail:
          'Outside the South Pole, zooming closer streams higher-detail NASA equatorial & polar quadtree tiles (zoom z4 to z8) into memory on demand.',
      },
    ],
    icon: <MapPin className="w-4 h-4 text-[#E59934]" />,
    defaultAction: {
      stepId: 'sites',
      viewMode: 'south-pole',
      heatmapMode: 'albedo',
      openTab: 'sites',
    },
  },
  {
    id: 'layers',
    shortLabel: '2. Layers',
    title: '7 Real-Time Multi-Physics Data Layers',
    summary:
      'Switch the GPU surface shader across seven core datasets derived from NASA LROC, LOLA, Diviner, LEND, and orbital geometry.',
    bullets: [
      {
        heading: 'Surface & Resource Constraints',
        detail:
          'Inspect LOLA Elevation relief, Touchdown Slope Hazard (green <= 8 deg safe vs. red scarp), Diviner Surface Temperature (25 K to 395 K), and Neutron Water-Ice (wt% H2O).',
      },
      {
        heading: 'Power & Communications Coverage',
        detail:
          'Toggle Solar Duty Cycle (% sunlit per lunar day) and Direct-to-Earth Visibility across the 27.2-day optical libration cycle.',
      },
    ],
    icon: <Layers className="w-4 h-4 text-[#E59934]" />,
    defaultAction: {
      stepId: 'layers',
      openTab: 'layers',
    },
  },
  {
    id: 'readiness',
    shortLabel: '3. Readiness',
    title: 'Flight Readiness Score (0-100) & 360 Horizon',
    summary:
      'Every pin computes an engineering GO / CAUTION / NO-GO verdict for the exact UTC epoch using 36-azimuth LOLA horizon ray-tracing.',
    bullets: [
      {
        heading: 'Verdict Rules: GO / CAUTION / NO-GO',
        detail:
          'GO means all critical gates pass with score >= 76/100. CAUTION means landable (< 76) with mitigation. NO-GO triggers immediately on any critical failure (sun eclipse, zero DTE/relay comms, or slope > 12 deg).',
      },
      {
        heading: '100-Point Breakdown & Touchdown Windows',
        detail:
          'Weights combine Solar Power (30), Comms (26), Slope (20), Thermal (14), and Ice/Duty Bonus (10). Check the 360 Skyplot and Warp to sunlit windows.',
      },
    ],
    icon: <Activity className="w-4 h-4 text-[#E59934]" />,
    defaultAction: {
      stepId: 'readiness',
      openTab: 'readiness',
    },
  },
  {
    id: 'orbits',
    shortLabel: '4. Orbits',
    title: 'Cislunar Relays, 3D Frames & Time Warp',
    summary:
      'Propagate active lunar orbiters and inspect true Sun-Earth-Moon alignment at any past, present, or future mission epoch.',
    bullets: [
      {
        heading: '5 Tracked Cislunar Spacecraft',
        detail:
          'Monitor real-time elevation, link rate (kbps), and next pass windows for LRO, Danuri, Queqiao-2, CAPSTONE (NRHO), and Lunar Pathfinder.',
      },
      {
        heading: 'Celestial Views & KSP Time Warp',
        detail:
          'Switch between Surface, South Pole, Earth-Moon, and Sun-Earth frames, or use Warp to jump cleanly to upcoming sunlit or Earth-line-of-sight windows.',
      },
    ],
    icon: <Satellite className="w-4 h-4 text-[#E59934]" />,
    defaultAction: {
      stepId: 'orbits',
      openTab: 'orbits',
    },
  },
  {
    id: 'rover',
    shortLabel: '5. Rover',
    title: 'Polar A* Rover Traverse Planner',
    summary:
      'Plan battery-safe surface routes from sunlit ridges into Permanently Shadowed Regions (PSRs) without crater-wall failures.',
    bullets: [
      {
        heading: 'Gnomonic Tangent-Plane A* Routing',
        detail:
          'Unlike direct straight lines across steep crater walls, A* finds hazard-avoiding corridors under your selected rover climb limit (VIPER 15 deg, Artemis LTV 10 deg, CADRE 12 deg).',
      },
      {
        heading: 'Terramechanics Energy & 3D Playback',
        detail:
          'Follow the 4-step workflow to pick Start [A], inspect range, pick Goal [B] (with optional checkpoints), and animate the 3D rover with live SoC % and elevation plots.',
      },
    ],
    icon: <Route className="w-4 h-4 text-[#E59934]" />,
    defaultAction: {
      stepId: 'rover',
      openTab: 'rover',
      startRoverPlanner: true,
    },
  },
];

const QUICK_LAYER_PREVIEWS: { id: HeatmapMode; label: string }[] = [
  { id: 'albedo', label: 'Optical' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'slope', label: 'Slope Hazard' },
  { id: 'temperature', label: 'Temp (K)' },
  { id: 'illumination', label: 'Solar Duty' },
  { id: 'ice', label: 'Water-Ice' },
];

export const FeatureWizardModal: React.FC<FeatureWizardModalProps> = ({
  isOpen,
  onClose,
  onApplyStepAction,
  currentHeatmap,
  currentViewMode,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const onActionRef = useRef(onApplyStepAction);
  const onCloseRef = useRef(onClose);
  onActionRef.current = onApplyStepAction;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      } else if (e.key === 'ArrowRight') {
        setStepIndex((idx) => {
          const next = Math.min(WIZARD_STEPS.length - 1, idx + 1);
          if (next !== idx) onActionRef.current(WIZARD_STEPS[next].defaultAction);
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setStepIndex((idx) => {
          const prev = Math.max(0, idx - 1);
          if (prev !== idx) onActionRef.current(WIZARD_STEPS[prev].defaultAction);
          return prev;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const step = WIZARD_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === WIZARD_STEPS.length - 1;

  const goToStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(WIZARD_STEPS.length - 1, nextIdx));
    setStepIndex(clamped);
    onApplyStepAction(WIZARD_STEPS[clamped].defaultAction);
  };

  return (
    <aside
      aria-label="SELENE Feature Guide"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-[440px] obsidian-drawer rounded-xl border border-white/[0.14] text-[#ECEEF2] shadow-2xl pointer-events-auto overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#111318] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-title font-bold text-xs tracking-wide text-[#E59934]">
            SELENE
          </span>
          <span className="text-xs font-semibold text-[#ECEEF2]">Feature Guide</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono-tech text-[#9BA1AE]">
            Step {stepIndex + 1} of {WIZARD_STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="hud-btn p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
            title="Close Guide (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stepper Tabs */}
      <div className="px-3 py-2 border-b border-white/[0.08] bg-[#0A0B0E] grid grid-cols-5 gap-1">
        {WIZARD_STEPS.map((s, idx) => {
          const active = idx === stepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goToStep(idx)}
              className={`hud-btn py-1 px-1 rounded text-[11px] text-center truncate cursor-pointer ${
                active
                  ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                  : 'text-[#9BA1AE] hover:text-[#ECEEF2] hover:bg-white/[0.05]'
              }`}
            >
              {s.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="p-4 space-y-3 bg-[#111318]">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-[#181B22] border border-white/[0.08]">
            {step.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#ECEEF2]">{step.title}</h3>
            <p className="text-xs text-[#9BA1AE] mt-1 leading-relaxed">
              {step.summary}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {step.bullets.map((b) => (
            <div
              key={b.heading}
              className="rounded-lg bg-[#0A0B0E] border border-white/[0.08] px-3 py-2"
            >
              <div className="text-xs font-semibold text-[#ECEEF2]">{b.heading}</div>
              <p className="text-xs text-[#9BA1AE] mt-0.5 leading-relaxed">{b.detail}</p>
            </div>
          ))}
        </div>

        {/* Live Try-It Controls for Current Step */}
        {step.id === 'sites' && (
          <div className="pt-0.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                onApplyStepAction({
                  stepId: 'sites',
                  viewMode: 'south-pole',
                  openTab: 'sites',
                  focusSouthPole: true,
                })
              }
              className="hud-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-xs font-medium text-[#ECEEF2] cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#E59934]" />
              <span>Preview Shackleton (10 m/px)</span>
            </button>
          </div>
        )}

        {step.id === 'layers' && (
          <div className="pt-0.5">
            <div className="text-[11px] font-medium text-[#9BA1AE] mb-1.5">
              Try a live layer on the 3D Moon:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LAYER_PREVIEWS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() =>
                    onApplyStepAction({
                      stepId: 'layers',
                      viewMode:
                        currentViewMode === 'earth-moon' ||
                        currentViewMode === 'heliocentric'
                          ? 'south-pole'
                          : currentViewMode,
                      heatmapMode: layer.id,
                      openTab: 'layers',
                    })
                  }
                  className={`hud-btn px-2 py-1 rounded text-xs cursor-pointer border ${
                    currentHeatmap === layer.id
                      ? 'bg-[#ECEEF2] text-[#0A0B0E] border-[#ECEEF2] font-semibold'
                      : 'bg-[#181B22] text-[#9BA1AE] hover:text-[#ECEEF2] border-white/[0.08]'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.id === 'readiness' && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() =>
                onApplyStepAction({
                  stepId: 'readiness',
                  viewMode: 'south-pole',
                  openTab: 'readiness',
                })
              }
              className="hud-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-xs font-medium text-[#ECEEF2] cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#E59934]" />
              <span>Open Live Readiness Drawer</span>
            </button>
          </div>
        )}

        {step.id === 'orbits' && (
          <div className="pt-0.5">
            <div className="text-[11px] font-medium text-[#9BA1AE] mb-1.5">
              Preview celestial reference frames:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'lunar-globe', label: 'Surface' },
                  { id: 'earth-moon', label: 'Earth-Moon' },
                  { id: 'heliocentric', label: 'Sun-Earth' },
                ] as const
              ).map((vm) => (
                <button
                  key={vm.id}
                  type="button"
                  onClick={() =>
                    onApplyStepAction({
                      stepId: 'orbits',
                      viewMode: vm.id,
                      openTab: 'orbits',
                    })
                  }
                  className={`hud-btn px-2.5 py-1 rounded text-xs cursor-pointer border ${
                    currentViewMode === vm.id
                      ? 'bg-[#ECEEF2] text-[#0A0B0E] border-[#ECEEF2] font-semibold'
                      : 'bg-[#181B22] text-[#9BA1AE] hover:text-[#ECEEF2] border-white/[0.08]'
                  }`}
                >
                  {vm.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.id === 'rover' && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() =>
                onApplyStepAction({
                  stepId: 'rover',
                  viewMode: 'south-pole',
                  openTab: 'rover',
                  startRoverPlanner: true,
                })
              }
              className="hud-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] text-xs font-medium text-[#ECEEF2] cursor-pointer"
            >
              <Route className="w-3.5 h-3.5 text-[#E59934]" />
              <span>Launch Rover Traverse Workflow</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0A0B0E] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToStep(stepIndex - 1)}
          disabled={isFirst}
          className={`hud-btn inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border ${
            isFirst
              ? 'border-white/[0.05] text-[#6C7280] cursor-not-allowed'
              : 'border-white/[0.1] bg-[#181B22] hover:bg-[#1C2029] text-[#ECEEF2] cursor-pointer'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5">
          {!isLast ? (
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              className="hud-btn inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-[#ECEEF2] hover:bg-white text-[#0A0B0E] text-xs font-semibold cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="hud-btn inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-[#ECEEF2] hover:bg-white text-[#0A0B0E] text-xs font-semibold cursor-pointer"
            >
              <span>Start Exploring</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
