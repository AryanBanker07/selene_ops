import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Download,
  Eye,
  Flame,
  Globe,
  Home,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Moon,
  Orbit,
  Pause,
  Play,
  Radio,
  Route,
  Satellite,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  BENCHMARK_ROVER_ROUTES,
  CISLUNAR_SATELLITES,
  CURATED_LANDING_SITES,
  HEATMAP_CONFIGS,
  ROVER_PRESETS,
} from './data/lunarCatalog';
import {
  computeCelestialSystemState,
  formatRelativeEpochDelta,
  formatUtcParts,
} from './engine/celestialEphemeris';
import {
  computeSynodicTimeline,
  evaluateLandingSite,
  findOptimalTouchdownWindows,
  getDemResolutionAt,
  initLolaDemSampler,
  onLolaDemLoaded,
  predictSatellitePasses,
} from './engine/selenography';
import {
  computeRoverRangeEnvelope,
  planRoverTraverse,
} from './engine/roverPlanner';
import { WmtsStreamStatus } from './engine/wmtsTileStreamer';
import { CameraPreset, LunarGlobe3D } from './components/LunarGlobe3D';
import {
  AstroCameraPreset,
  CelestialSystem3D,
} from './components/CelestialSystem3D';
import { MissionEpochModal } from './components/MissionEpochModal';
import { KspActiveWarpBanner, KspWarpMenu } from './components/KspWarpMenu';
import { SunEarthLocatorModal } from './components/SunEarthLocatorModal';
import { PolarHorizonSkyplot } from './components/PolarHorizonSkyplot';
import { SynodicTimelineDrawer } from './components/SynodicTimelineDrawer';
import { SiteComparisonModal } from './components/SiteComparisonModal';
import { AiMissionAdvisor } from './components/AiMissionAdvisor';
import {
  RoverControlsPanel,
  RoverElevationDrawer,
} from './components/RoverMissionPlanner';
import { LandingPageHero } from './components/LandingPageHero';
import {
  ActiveTimeWarpState,
  CandidateCorridorPath,
  HeatmapMode,
  LandingSite,
  ReadinessStatus,
  RoverCoords,
  RoverParams,
  RoverPickMode,
  RoverWorkflowStep,
  ViewportViewMode,
} from './types/lunar';

type RibbonTab =
  | 'none'
  | 'sites'
  | 'layers'
  | 'readiness'
  | 'orbits'
  | 'rover'
  | 'timeline';

const SPEED_OPTIONS = [
  { label: '1×', mult: 1, title: 'Real-time (1s / sec)' },
  { label: '1m/s', mult: 60, title: '60× — Live Cislunar Satellite Motion' },
  { label: '30m/s', mult: 1800, title: '1,800× — Fast Orbiter Passes' },
  { label: '4h/s', mult: 14400, title: '14,400× — Lunar Terminator Sweep' },
  { label: '1d/s', mult: 86400, title: '86,400× — Moon Around Earth (~27s / orbit)' },
  { label: '15d/s', mult: 1296000, title: '1,296,000× — Earth & Moon Around Sun (~24s / yr)' },
];

function statusStyle(status: ReadinessStatus): {
  pill: string;
  dot: string;
  icon: React.ReactNode;
} {
  if (status === 'GO') {
    return {
      pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-400',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    };
  }
  if (status === 'CAUTION') {
    return {
      pill: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      dot: 'bg-amber-400',
      icon: <TriangleAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    };
  }
  return {
    pill: 'bg-rose-500/15 text-rose-300 border-rose-500/45',
    dot: 'bg-rose-500',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  };
}

export function App() {
  // Default mission epoch: 2026-11-04 12:00 UTC
  const [simTimeMs, setSimTimeMs] = useState<number>(() =>
    Date.UTC(2026, 10, 4, 12, 0, 0)
  );
  const [timelineAnchorMs, setTimelineAnchorMs] = useState<number>(() =>
    Date.UTC(2026, 10, 4, 0, 0, 0)
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMult, setSpeedMult] = useState<number>(60); // 1 min/sec default shows live satellite orbital motion smoothly

  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('elevation');
  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('none');
  const [showSubRibbon, setShowSubRibbon] = useState<boolean>(true);
  const toggleRibbonTab = (tab: Exclude<RibbonTab, 'none'>) =>
    setActiveRibbonTab((prev) => (prev === tab ? 'none' : tab));
  const [selectedSite, setSelectedSite] = useState<LandingSite>(
    CURATED_LANDING_SITES[0] // Shackleton Connecting Ridge
  );
  const [compareSite, setCompareSite] = useState<LandingSite>(
    CURATED_LANDING_SITES[1] // Malapert Massif
  );
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(
    'queqiao-2'
  );
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [customLatInput, setCustomLatInput] = useState<string>('-88.20');
  const [customLonInput, setCustomLonInput] = useState<string>('124.50');

  // Rover Traverse Mission Planner State
  const [roverActive, setRoverActive] = useState<boolean>(false);
  const [roverStart, setRoverStart] = useState<RoverCoords>(
    BENCHMARK_ROVER_ROUTES[0].start
  );
  const [roverEnd, setRoverEnd] = useState<RoverCoords>(
    BENCHMARK_ROVER_ROUTES[0].end
  );
  const [roverCheckpoints, setRoverCheckpoints] = useState<RoverCoords[]>([]);
  const [roverParams, setRoverParams] = useState<RoverParams>(
    ROVER_PRESETS[0].params
  );
  const [roverRoutingMode, setRoverRoutingMode] = useState<'astar' | 'direct'>(
    'astar'
  );
  const [roverPickMode, setRoverPickMode] = useState<RoverPickMode>('none');
  const [roverWorkflowStep, setRoverWorkflowStep] =
    useState<RoverWorkflowStep>('idle');
  const [roverMissionEpochMs, setRoverMissionEpochMs] = useState<number>(() =>
    Date.UTC(2026, 10, 4, 12, 0, 0)
  );
  const [roverAnimProgress, setRoverAnimProgress] = useState<number>(0);
  const [isRoverAnimating, setIsRoverAnimating] = useState<boolean>(false);
  const [roverAnimSpeed, setRoverAnimSpeed] = useState<number>(1);
  const [roverChaseCam, setRoverChaseCam] = useState<boolean>(false);
  const [bottomDrawerMode, setBottomDrawerMode] = useState<'synodic' | 'rover'>(
    'synodic'
  );

  // 3D Globe Visual Controls
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showSiteLabels, setShowSiteLabels] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [nightBoost, setNightBoost] = useState<boolean>(true);
  const [trueOrbitScale, setTrueOrbitScale] = useState<boolean>(false);
  const [enableLiveWmts, setEnableLiveWmts] = useState<boolean>(true);
  const [wmtsStatus, setWmtsStatus] = useState<WmtsStreamStatus | null>(null);
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1.35);

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('south-pole');
  const [cameraNonce, setCameraNonce] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewportViewMode>('lunar-globe');
  const [astroPreset, setAstroPreset] =
    useState<AstroCameraPreset>('em-overview');
  const [astroNonce, setAstroNonce] = useState<number>(0);
  const [astroTrueScale, setAstroTrueScale] = useState<boolean>(false);
  const [isEpochModalOpen, setIsEpochModalOpen] = useState<boolean>(false);
  const [isSunEarthModalOpen, setIsSunEarthModalOpen] = useState<boolean>(false);
  const [previewSunEarthPoint, setPreviewSunEarthPoint] = useState<{
    lat: number;
    lon: number;
    label: string;
  } | null>(null);
  const [activeWarp, setActiveWarp] = useState<ActiveTimeWarpState | null>(null);
  const [zenMode, setZenMode] = useState<boolean>(false);

  const simTimeRef = useRef<number>(simTimeMs);
  simTimeRef.current = simTimeMs;

  const [hoverCoords, setHoverCoords] = useState<{
    lat: number;
    lon: number;
    elevKm: number;
  } | null>(null);
  const [demReadyTick, setDemReadyTick] = useState<number>(0);

  // Initialize NASA LOLA DEM raster sampler
  useEffect(() => {
    initLolaDemSampler('/textures/lola_dem.jpg');
    return onLolaDemLoaded(() => setDemReadyTick((t) => t + 1));
  }, []);

  // Simulation Clock Loop (yields while KSP Auto-Warp is active)
  const isWarping = activeWarp !== null;
  useEffect(() => {
    if (!isPlaying || isWarping) return;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dtSec = Math.min(0.1, (now - last) / 1000);
      last = now;
      setSimTimeMs((prev) => prev + dtSec * speedMult * 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, speedMult, isWarping]);

  // Kerbal Space Program (KSP) Smooth Auto-Warp Controller with Proportional Deceleration
  const warpSessionKey = activeWarp
    ? `${activeWarp.startedRealMs}:${activeWarp.targetTimeMs}`
    : '';
  useEffect(() => {
    if (!activeWarp) return;
    const { startTimeMs, targetTimeMs, startedRealMs } = activeWarp;
    let currentSim = simTimeRef.current;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dtSec = Math.min(0.08, Math.max(0.001, (now - last) / 1000));
      last = now;

      const totalSpan = Math.max(1000, Math.abs(targetTimeMs - startTimeMs));
      const rem = targetTimeMs - currentSim;
      const remAbs = Math.abs(rem);

      // Smooth 0.35s ramp-up + KSP proportional deceleration as target approaches
      const elapsedRealMs = Math.max(0, now - startedRealMs);
      const rampIn = Math.min(1, 0.18 + (elapsedRealMs / 350) * 0.82);
      const peakRateMsPerSec = totalSpan / 2.4;
      const decelRateMsPerSec = Math.max(totalSpan * 0.035, remAbs * 2.8);
      const rateMsPerSec = Math.min(peakRateMsPerSec * rampIn, decelRateMsPerSec);
      const stepAbs = Math.min(remAbs, rateMsPerSec * dtSec);

      if (remAbs - stepAbs <= Math.max(250, totalSpan * 0.0008)) {
        simTimeRef.current = targetTimeMs;
        setSimTimeMs(targetTimeMs);
        setRoverMissionEpochMs(targetTimeMs);
        setIsPlaying(false);
        setActiveWarp(null);
        return;
      }

      currentSim += Math.sign(rem) * stepAbs;
      simTimeRef.current = currentSim;
      setSimTimeMs(currentSim);

      const currentRateMult = Math.max(1, rateMsPerSec / 1000);
      const warpArrows = Math.max(
        1,
        Math.min(6, Math.ceil((rateMsPerSec / peakRateMsPerSec) * 6))
      );
      setActiveWarp((prev) =>
        prev ? { ...prev, currentRateMult, warpArrows } : null
      );

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [warpSessionKey]);

  // Escape key aborts active KSP Time Warp, or collapses open ribbon tab when no modal is open
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isEpochModalOpen || isCompareOpen || isSunEarthModalOpen) return;
      if (activeWarp) {
        setActiveWarp(null);
        setIsPlaying(false);
        setRoverMissionEpochMs(simTimeRef.current);
      } else if (activeRibbonTab !== 'none') {
        setActiveRibbonTab('none');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [warpSessionKey, activeWarp, activeRibbonTab, isEpochModalOpen, isCompareOpen, isSunEarthModalOpen]);

  // Keep 30-day timeline window centered/anchored if user jumps far outside [anchor, anchor + 30d]
  useEffect(() => {
    const thirtyDaysMs = 30 * 86400 * 1000;
    if (
      simTimeMs < timelineAnchorMs ||
      simTimeMs > timelineAnchorMs + thirtyDaysMs
    ) {
      setTimelineAnchorMs(simTimeMs - 2 * 86400 * 1000);
    }
  }, [simTimeMs, timelineAnchorMs]);

  // Live Selenographic & Orbital Evaluation
  const evaluation = useMemo(
    () => evaluateLandingSite(selectedSite, simTimeMs, trueOrbitScale),
    [selectedSite, simTimeMs, trueOrbitScale, demReadyTick]
  );

  // Live Heliocentric & Geocentric Celestial System State
  const celestialState = useMemo(
    () => computeCelestialSystemState(simTimeMs),
    [simTimeMs]
  );

  // Recompute 24h upcoming satellite passes every ~10 min of sim time or site change
  const passBucket = Math.floor(simTimeMs / (10 * 60 * 1000));
  const upcomingPasses = useMemo(
    () => predictSatellitePasses(selectedSite, simTimeMs, 24),
    [selectedSite, passBucket, demReadyTick]
  );

  // 30-Day Synodic Timeline & Optimal Touchdown Windows
  const synodicTimeline = useMemo(
    () => computeSynodicTimeline(selectedSite, timelineAnchorMs, 30),
    [selectedSite, timelineAnchorMs, demReadyTick]
  );

  const optimalWindows = useMemo(
    () => findOptimalTouchdownWindows(synodicTimeline, selectedSite),
    [synodicTimeline, selectedSite]
  );

  // Rover Traverse Plan — frozen to the mission epoch so the live clock doesn't re-plan mid-review/animation
  const roverPlan = useMemo(
    () =>
      planRoverTraverse(
        roverStart,
        roverEnd,
        roverParams,
        roverMissionEpochMs,
        roverRoutingMode,
        roverCheckpoints
      ),
    [
      roverStart,
      roverEnd,
      roverParams,
      roverMissionEpochMs,
      roverRoutingMode,
      roverCheckpoints,
      demReadyTick,
    ]
  );

  // Step 4: Operational range envelope + rough possible paths from Start [A] or last Checkpoint
  const roverRangeActive =
    roverWorkflowStep === 'range-explore' ||
    roverWorkflowStep === 'route-ready' ||
    roverWorkflowStep === 'animating';

  const rangeOrigin =
    roverCheckpoints.length > 0
      ? roverCheckpoints[roverCheckpoints.length - 1]
      : roverStart;

  const roverRangeEnvelope = useMemo(
    () =>
      roverRangeActive
        ? computeRoverRangeEnvelope(
            rangeOrigin,
            roverParams,
            roverMissionEpochMs,
            CURATED_LANDING_SITES
          )
        : null,
    [
      roverRangeActive,
      rangeOrigin,
      roverParams,
      roverMissionEpochMs,
      demReadyTick,
    ]
  );

  // Step 6: 60 FPS rover navigation animation loop (~14 s for a full traverse at 1×)
  useEffect(() => {
    if (!isRoverAnimating) return;
    let last = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let reachedEnd = false;
      setRoverAnimProgress((p) => {
        const next = p + (dt / 14) * roverAnimSpeed;
        if (next >= 1) {
          reachedEnd = true;
          return 1;
        }
        return next;
      });
      if (reachedEnd) {
        setIsRoverAnimating(false);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isRoverAnimating, roverAnimSpeed]);

  const stopRoverAnimation = () => {
    setIsRoverAnimating(false);
    setRoverAnimProgress(0);
  };

  // Unified past / present / future UTC mission time setter
  const handleApplyMissionTime = (
    newTimeMs: number,
    syncRoverEpoch = true,
    pauseClock = true
  ) => {
    if (!Number.isFinite(newTimeMs)) return;
    setActiveWarp(null);
    simTimeRef.current = newTimeMs;
    setSimTimeMs(newTimeMs);
    if (syncRoverEpoch) {
      setRoverMissionEpochMs(newTimeMs);
      stopRoverAnimation();
    }
    if (pauseClock) {
      setIsPlaying(false);
    }
  };

  // KSP "Warp To" / "Warp Here" Initiation & Snap Handlers
  const applyWarpViewSwitch = (switchToView?: ViewportViewMode) => {
    if (!switchToView || switchToView === viewMode) return;
    setViewMode(switchToView);
    if (switchToView === 'earth-moon') {
      setAstroPreset('em-overview');
      setAstroNonce((n) => n + 1);
    } else if (switchToView === 'heliocentric') {
      setAstroPreset('helio-overview');
      setAstroNonce((n) => n + 1);
    }
  };

  const handleSnapTime = (
    targetTimeMs: number,
    switchToView?: ViewportViewMode
  ) => {
    if (!Number.isFinite(targetTimeMs)) return;
    applyWarpViewSwitch(switchToView);
    handleApplyMissionTime(targetTimeMs, true, true);
  };

  const handleStartWarp = (
    targetTimeMs: number,
    label: string,
    switchToView?: ViewportViewMode
  ) => {
    if (!Number.isFinite(targetTimeMs)) return;
    applyWarpViewSwitch(switchToView);
    const startMs = simTimeRef.current;
    if (Math.abs(targetTimeMs - startMs) < 1000) {
      handleApplyMissionTime(targetTimeMs, true, true);
      return;
    }
    stopRoverAnimation();
    setIsPlaying(false);
    setActiveWarp({
      label,
      startTimeMs: startMs,
      targetTimeMs,
      startedRealMs: performance.now(),
      currentRateMult: 1,
      warpArrows: 1,
    });
  };

  const handleCancelWarp = () => {
    setActiveWarp(null);
    setIsPlaying(false);
    setRoverMissionEpochMs(simTimeRef.current);
  };

  // Step 1: "Plan Mission" entry point
  const handleOpenPlanMission = () => {
    setActiveRibbonTab('rover');
    setZenMode(false);
    setRoverActive(true);
    setRoverCheckpoints([]);
    stopRoverAnimation();
    setRoverPickMode('none');
    setRoverWorkflowStep('rover-setup');
  };

  const ensureSurfaceView = (targetLat?: number) => {
    setViewMode((prev) => {
      if (prev === 'south-pole') {
        return targetLat !== undefined && targetLat > -70 ? 'lunar-globe' : 'south-pole';
      }
      if (prev === 'lunar-globe') {
        return 'lunar-globe';
      }
      return targetLat !== undefined && targetLat <= -78 ? 'south-pole' : 'lunar-globe';
    });
  };

  // Step 2 -> 3
  const handleConfirmRoverDetails = () => {
    ensureSurfaceView(roverStart.lat);
    setRoverWorkflowStep('select-start');
    setRoverPickMode('pick-start');
  };

  // Step 3 -> 3.5 (locality zoom) -> 3.7 (checkpoints) -> 4 (range + paths) -> 5 (pick end)
  const handleConfirmStartAndZoomLocality = (coords: RoverCoords) => {
    ensureSurfaceView(coords.lat);
    setRoverStart(coords);
    stopRoverAnimation();
    setRoverWorkflowStep('checkpoints');
    setRoverPickMode('pick-checkpoint');
    setBottomDrawerMode('synodic');
    setCameraPreset('rover-locality');
    setCameraNonce((n) => n + 1);
  };

  // Intermediate Checkpoints Handlers
  const handleAddCheckpoint = (coords: RoverCoords) => {
    setRoverCheckpoints((prev) => [...prev, coords]);
    stopRoverAnimation();
  };

  const handleRemoveCheckpoint = (index: number) => {
    setRoverCheckpoints((prev) => prev.filter((_, i) => i !== index));
    stopRoverAnimation();
  };

  const handleReorderCheckpoints = (fromIdx: number, toIdx: number) => {
    setRoverCheckpoints((prev) => {
      if (
        fromIdx < 0 ||
        fromIdx >= prev.length ||
        toIdx < 0 ||
        toIdx >= prev.length
      )
        return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    stopRoverAnimation();
  };

  const handleClearCheckpoints = () => {
    setRoverCheckpoints([]);
    stopRoverAnimation();
  };

  // Step 5: end point chosen -> feasibility review
  const handleSelectEndPoint = (coords: RoverCoords) => {
    setRoverEnd(coords);
    stopRoverAnimation();
    setRoverPickMode('none');
    setRoverWorkflowStep('route-ready');
    setBottomDrawerMode('rover');
  };

  const handleSelectCandidatePath = (path: CandidateCorridorPath) => {
    handleSelectEndPoint(path.endCoords);
  };

  // Step 6: generate rover navigation animation
  const handleStartAnimation = () => {
    ensureSurfaceView(roverStart.lat);
    setRoverAnimProgress(0);
    setRoverWorkflowStep('animating');
    setBottomDrawerMode('rover');
    setRoverChaseCam(true);
    setIsRoverAnimating(true);
  };

  const handleTogglePlayAnimation = () => {
    if (isRoverAnimating) {
      setIsRoverAnimating(false);
      return;
    }
    ensureSurfaceView(roverStart.lat);
    if (roverAnimProgress >= 0.995) setRoverAnimProgress(0);
    if (roverWorkflowStep !== 'animating') setRoverWorkflowStep('animating');
    setIsRoverAnimating(true);
  };

  const handleSelectBenchmarkRoute = (routeId: string) => {
    const found = BENCHMARK_ROVER_ROUTES.find((r) => r.id === routeId);
    if (!found) return;
    ensureSurfaceView(found.start.lat);
    setRoverStart(found.start);
    setRoverEnd(found.end);
    setRoverCheckpoints([]);
    const preset = ROVER_PRESETS.find(
      (p) => p.id === found.recommendedPresetId
    );
    if (preset) setRoverParams({ ...preset.params });
    stopRoverAnimation();
    setRoverPickMode('none');
    setRoverWorkflowStep('route-ready');
    setRoverActive(true);
    setBottomDrawerMode('rover');
    setCameraPreset('rover-route');
    setCameraNonce((n) => n + 1);
  };

  const handleRoverPickPoint = (
    lat: number,
    lon: number,
    label?: string
  ) => {
    if (roverPickMode === 'pick-start') {
      handleConfirmStartAndZoomLocality({
        lat,
        lon,
        label: label || `Start (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      });
    } else if (roverPickMode === 'pick-checkpoint') {
      const cpNum = roverCheckpoints.length + 1;
      handleAddCheckpoint({
        lat,
        lon,
        label: label || `CP ${cpNum} (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      });
    } else if (roverPickMode === 'pick-end') {
      handleSelectEndPoint({
        lat,
        lon,
        label: label || `Goal (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      });
    }
    setRoverActive(true);
  };

  const activeHeatmapConfig = useMemo(
    () => HEATMAP_CONFIGS.find((h) => h.id === heatmapMode) || HEATMAP_CONFIGS[0],
    [heatmapMode]
  );

  const triggerCamera = (preset: CameraPreset, forceMode?: 'lunar-globe' | 'south-pole') => {
    if (forceMode) {
      setViewMode(forceMode);
    } else {
      ensureSurfaceView(selectedSite.lat);
    }
    setCameraPreset(preset);
    setCameraNonce((n) => n + 1);
  };

  const triggerAstroCamera = (preset: AstroCameraPreset) => {
    setAstroPreset(preset);
    setAstroNonce((n) => n + 1);
  };

  const handleSelectSite = (site: LandingSite) => {
    setSelectedSite(site);
    if (viewMode === 'south-pole') {
      if (site.lat > -70) {
        setViewMode('lunar-globe');
      }
      setCameraPreset('site');
      setCameraNonce((n) => n + 1);
    } else if (viewMode === 'lunar-globe') {
      setCameraPreset('site');
      setCameraNonce((n) => n + 1);
    }
  };

  const handleSelectCustomPoint = (
    lat: number,
    lon: number,
    customName?: string
  ) => {
    const coordStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(
      lon
    ).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    const custom: LandingSite = {
      id: `custom-${lat.toFixed(2)}-${lon.toFixed(2)}`,
      name: customName ? `${customName} (${coordStr})` : `Custom Target (${coordStr})`,
      subtitle: customName
        ? 'Sun & Earth Relative Selenographic Target'
        : 'Custom Selenographic Target',
      category: 'custom',
      missionTag: customName ? 'SUN/EARTH PIN' : 'CUSTOM PIN',
      lat,
      lon,
      geology:
        Math.abs(lat) > 78
          ? 'Polar cratered highland terrain sampled directly from NASA LOLA DEM.'
          : 'Lunar regolith sampled directly from NASA LRO LOLA & LROC global mosaics.',
      strategicNotes:
        'Custom landing ellipse evaluated in real time via 36-azimuth LOLA horizon ray-tracing and live Keplerian orbiter propagation.',
    };
    setSelectedSite(custom);
    setCustomLatInput(lat.toFixed(2));
    setCustomLonInput(lon.toFixed(2));
  };

  const handleExportBriefJson = () => {
    const payload = {
      generatedBy: 'SELENE OPS — NASA Space Apps 2026 Lunar Landing Site Navigator',
      epochUtc: new Date(simTimeMs).toISOString(),
      landingSite: evaluation.site,
      readiness: {
        overallStatus: evaluation.overallStatus,
        score: evaluation.readinessScore,
        flightRules: evaluation.flightRules,
      },
      environment: {
        elevationKm: evaluation.elevationKm,
        slopeDeg: evaluation.slopeDeg,
        surfaceTempK: evaluation.surfaceTempK,
        annualIlluminationPct: evaluation.illuminationDutyPct,
        waterIceWtPct: evaluation.waterIceWtPct,
        sunHorizontal: evaluation.sun,
        earthHorizontal: evaluation.earth,
      },
      visibleSatellites: evaluation.activeSatellites
        .filter((s) => s.isVisibleFromSite)
        .map((s) => ({
          name: s.satellite.name,
          altKm: s.altKm,
          elevationDeg: s.elevationDeg,
          azimuthDeg: s.azimuthDeg,
          slantRangeKm: s.slantRangeKm,
          dataRateMbps: s.instantDataRateMbps,
          capabilities: s.satellite.capabilities,
        })),
      next24hPassesCount: upcomingPasses.length,
      recommendedWindows: optimalWindows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selene-ops-${evaluation.site.id}-${new Date(simTimeMs)
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const epochUtcParts = formatUtcParts(simTimeMs);
  const epochRelDelta = formatRelativeEpochDelta(simTimeMs);

  const filteredSites = CURATED_LANDING_SITES.filter((s) =>
    siteFilter === 'all' ? true : s.category === siteFilter
  );

  const selectedSatLive =
    evaluation.activeSatellites.find((s) => s.satellite.id === selectedSatelliteId) ||
    evaluation.activeSatellites[0];

  const overallBadge = statusStyle(evaluation.overallStatus);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070b] space-grid-overlay text-slate-100">
      {/* FULL-SCREEN 3D VIEWPORT: LUNAR GLOBE / SOUTH POLE OR EARTH-MOON OR HELIOCENTRIC SUN-EARTH-MOON */}
      <div className="absolute inset-0 z-0">
        {viewMode === 'lunar-globe' || viewMode === 'south-pole' ? (
          <LunarGlobe3D
            isSouthPoleFocus={viewMode === 'south-pole'}
            heatmapMode={heatmapMode}
            evaluation={evaluation}
            compareSite={isCompareOpen ? compareSite : null}
            curatedSites={CURATED_LANDING_SITES}
            selectedSatelliteId={selectedSatelliteId}
            showOrbits={showOrbits}
            showSiteLabels={showSiteLabels}
            showVectors={showVectors}
            showGrid={showGrid}
            showTerminator={showTerminator}
            nightBoost={nightBoost}
            trueOrbitScale={trueOrbitScale}
            terrainExaggeration={terrainExaggeration}
            cameraPreset={cameraPreset}
            cameraPresetNonce={cameraNonce}
            roverWorkflowStep={roverWorkflowStep}
            roverStartCoords={roverStart}
            roverCheckpoints={roverCheckpoints}
            roverRangeEnvelope={roverRangeEnvelope}
            roverPlan={roverWorkflowStep !== 'idle' || roverActive ? roverPlan : null}
            roverPickMode={roverPickMode}
            roverAnimProgress={roverAnimProgress}
            isRoverAnimating={isRoverAnimating}
            roverChaseCam={roverChaseCam}
            onSelectSite={handleSelectSite}
            onSelectCustomPoint={handleSelectCustomPoint}
            onRoverPickPoint={handleRoverPickPoint}
            onSelectCandidatePath={handleSelectCandidatePath}
            onSelectSatellite={(id) => {
              setSelectedSatelliteId(id);
              setActiveRibbonTab('orbits');
              setZenMode(false);
            }}
            onHoverCoords={setHoverCoords}
            onWarpToTime={(ms, lbl) => handleStartWarp(ms, lbl)}
            onSnapToTime={(ms) => handleSnapTime(ms)}
            previewSunEarthPoint={previewSunEarthPoint}
            enableLiveWmts={enableLiveWmts}
            onWmtsStatusChange={setWmtsStatus}
          />
        ) : (
          <CelestialSystem3D
            mode={viewMode}
            simTimeMs={simTimeMs}
            evaluation={evaluation}
            astroPreset={astroPreset}
            astroPresetNonce={astroNonce}
            truePhysicalScale={astroTrueScale}
            showLabels={showSiteLabels}
            onSwitchToEarthMoon={() => {
              setViewMode('earth-moon');
              setAstroPreset('em-overview');
              setAstroNonce((n) => n + 1);
            }}
            onSwitchToLunarSurface={() => setViewMode('lunar-globe')}
            onWarpToTime={(ms, lbl) => handleStartWarp(ms, lbl)}
            onSnapToTime={(ms) => handleSnapTime(ms)}
          />
        )}
      </div>

      {/* FOREGROUND MISSION CONTROL HUD SHELL (IMPECCABLE: RESTRAINED, READABLE, LEFT-ANCHORED ERGONOMICS) */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between pointer-events-none transition-opacity duration-200 ${
          showLandingPage ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* TOP UNIFIED 2-TIER RIBBON (LEFT-TO-CENTER ERGONOMIC SPINE) */}
        <div className="pointer-events-auto flex flex-col">
          {/* TIER 1: PRIMARY COMMAND RIBBON */}
          <header className="obsidian-ribbon px-3 py-1.5 flex flex-wrap items-center justify-start gap-2">
            {/* Brand Home (Returns to Mission Launcher) */}
            <button
              type="button"
              onClick={() => setShowLandingPage(true)}
              className="hud-btn flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.1] bg-[#181B22] hover:bg-[#1C2029] text-[#ECEEF2] cursor-pointer"
              title="Return to SELENE Mission Launcher"
            >
              <Compass className="w-3.5 h-3.5 text-[#E59934]" />
              <span className="font-semibold text-xs tracking-wide">SELENE</span>
              <Home className="w-3 h-3 text-[#9BA1AE]" />
            </button>

            {/* 4-View Celestial & Polar Frame Pills (Unified Neutral Active State) */}
            <div className="flex items-center gap-0.5 bg-[#0A0B0E] p-0.5 rounded-md border border-white/[0.08]">
              {[
                { id: 'lunar-globe' as ViewportViewMode, label: 'Surface', icon: <Moon className="w-3.5 h-3.5" /> },
                { id: 'south-pole' as ViewportViewMode, label: 'South Pole', icon: <Crosshair className="w-3.5 h-3.5" /> },
                { id: 'earth-moon' as ViewportViewMode, label: 'Earth–Moon', icon: <Orbit className="w-3.5 h-3.5" /> },
                { id: 'heliocentric' as ViewportViewMode, label: 'Sun–Earth', icon: <Sun className="w-3.5 h-3.5" /> },
              ].map((vm) => (
                <button
                  key={vm.id}
                  type="button"
                  onClick={() => {
                    setViewMode(vm.id);
                    if (vm.id === 'south-pole') {
                      setCameraPreset(
                        selectedSite.lat <= -88.8 ? 'sp-shackleton' : 'sp-overview'
                      );
                      setCameraNonce((n) => n + 1);
                    } else if (vm.id === 'earth-moon') {
                      setAstroPreset('em-overview');
                      setAstroNonce((n) => n + 1);
                    } else if (vm.id === 'heliocentric') {
                      setAstroPreset('helio-overview');
                      setAstroNonce((n) => n + 1);
                    }
                  }}
                  className={`hud-btn px-2.5 py-1 rounded text-xs flex items-center gap-1.5 cursor-pointer ${
                    viewMode === vm.id
                      ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                      : 'text-[#9BA1AE] hover:text-[#ECEEF2] hover:bg-white/[0.05]'
                  }`}
                >
                  {vm.icon}
                  <span className="hidden xl:inline">{vm.label}</span>
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-white/[0.1] hidden sm:block" />

            {/* 6 COLLAPSIBLE FUNCTIONAL TABS (DIRECTLY ADJACENT ON THE LEFT SPINE) */}
            {!zenMode && (
              <nav className="flex flex-wrap items-center gap-0.5 bg-[#0A0B0E] p-0.5 rounded-md border border-white/[0.08]">
                {[
                  {
                    id: 'sites' as const,
                    label: 'Sites',
                    badge: evaluation.site.name.split(' ')[0],
                    icon: <MapPin className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'layers' as const,
                    label: 'Layers',
                    badge: activeHeatmapConfig.shortLabel,
                    icon: <Layers className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'readiness' as const,
                    label: 'Readiness',
                    badge: `${evaluation.overallStatus} ${evaluation.readinessScore}`,
                    badgeTone:
                      evaluation.overallStatus === 'GO'
                        ? 'text-emerald-400'
                        : evaluation.overallStatus === 'CAUTION'
                        ? 'text-amber-400'
                        : 'text-rose-400',
                    icon: <Activity className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'orbits' as const,
                    label: 'Orbits',
                    badge: `${evaluation.visibleRelays.length}/4`,
                    icon: <Satellite className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'rover' as const,
                    label: 'Rover',
                    badge:
                      roverWorkflowStep !== 'idle'
                        ? `${roverPlan.totalDistanceKm.toFixed(1)}km`
                        : undefined,
                    icon: <Route className="w-3.5 h-3.5" />,
                  },
                  {
                    id: 'timeline' as const,
                    label: 'Timeline',
                    icon: <Calendar className="w-3.5 h-3.5" />,
                  },
                ].map((tab) => {
                  const isActive = activeRibbonTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === 'rover' && roverWorkflowStep === 'idle') {
                          setRoverActive(true);
                          setRoverWorkflowStep('rover-setup');
                        }
                        toggleRibbonTab(tab.id);
                      }}
                      className={`hud-btn px-2.5 py-1 rounded text-xs flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                          : 'text-[#9BA1AE] hover:text-[#ECEEF2] hover:bg-white/[0.05]'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span
                          className={`hidden 2xl:inline font-mono-tech text-[10.5px] ${
                            isActive ? 'text-[#0A0B0E]/75' : tab.badgeTone || 'text-[#6C7280]'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}

            {/* COMPACT MISSION CLOCK, WARP & UTILITY ACTIONS (PUSHED RIGHT ONLY ON WIDE SCREENS) */}
            <div className="flex items-center gap-1.5 ml-auto tabular-nums">
              <div className="flex items-center gap-1 bg-[#0A0B0E] px-2 py-0.5 rounded-md border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    if (activeWarp) handleCancelWarp();
                    else setIsPlaying((p) => !p);
                  }}
                  className="hud-btn w-6 h-6 rounded bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.1] flex items-center justify-center text-[#ECEEF2] cursor-pointer"
                  title={
                    activeWarp
                      ? 'Abort Time Warp'
                      : isPlaying
                      ? 'Pause Orbital Propagation'
                      : 'Resume Orbital Propagation'
                  }
                >
                  {isPlaying || activeWarp ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyMissionTime(simTimeMs - 86400 * 1000, true, false)}
                  className="hud-btn hidden sm:inline px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-[11px] font-mono-tech text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                  title="Step backward 1 Earth day"
                >
                  -1d
                </button>

                <button
                  type="button"
                  onClick={() => setIsEpochModalOpen(true)}
                  className="hud-btn px-1.5 py-0.5 rounded hover:bg-white/[0.06] flex items-center gap-1 cursor-pointer"
                  title="Set Mission Date & Time (UTC)"
                >
                  <span className="font-mono-tech text-xs text-[#ECEEF2] font-medium">
                    {epochUtcParts.dateStr} {epochUtcParts.timeStr}
                  </span>
                  <span className="text-[10px] font-mono-tech text-[#6C7280]">UTC</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyMissionTime(simTimeMs + 86400 * 1000, true, false)}
                  className="hud-btn hidden sm:inline px-1.5 py-0.5 rounded hover:bg-white/[0.06] text-[11px] font-mono-tech text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                  title="Step forward 1 Earth day"
                >
                  +1d
                </button>

                <div className="hidden lg:flex items-center gap-0.5 pl-1 border-l border-white/[0.08]">
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      title={opt.title}
                      onClick={() => {
                        setActiveWarp(null);
                        setSpeedMult(opt.mult);
                        setIsPlaying(true);
                      }}
                      className={`hud-btn px-1.5 py-0.5 rounded text-[10.5px] font-mono-tech cursor-pointer ${
                        !activeWarp && isPlaying && speedMult === opt.mult
                          ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                          : 'text-[#9BA1AE] hover:text-[#ECEEF2]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <KspWarpMenu
                  simTimeMs={simTimeMs}
                  selectedSite={selectedSite}
                  upcomingPasses={upcomingPasses}
                  optimalWindows={optimalWindows}
                  activeWarp={activeWarp}
                  onStartWarp={handleStartWarp}
                  onSnapTime={handleSnapTime}
                  onCancelWarp={handleCancelWarp}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsSunEarthModalOpen(true)}
                className="hud-btn hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-xs text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                title="Target WRT Sun & Earth"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Sun/Earth</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCompareOpen(true)}
                className="hud-btn hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-xs text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                title="Compare Two Landing Sites"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExportBriefJson}
                className="hud-btn hidden lg:flex items-center px-2 py-1 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-xs text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                title="Export JSON Telemetry Package"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {!zenMode && (
                <button
                  type="button"
                  onClick={() => setShowSubRibbon((v) => !v)}
                  className="hud-btn p-1.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                  title={showSubRibbon ? 'Hide Quick Strip' : 'Show Quick Strip'}
                >
                  {showSubRibbon ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setZenMode((z) => {
                    if (!z) setActiveRibbonTab('none');
                    return !z;
                  });
                }}
                className="hud-btn p-1.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                title={zenMode ? 'Restore Controls' : 'Clean 3D View'}
              >
                {zenMode ? (
                  <Minimize2 className="w-3.5 h-3.5 text-[#E59934]" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </header>

          {/* TIER 2: CO-LOCATED LEFT-ALIGNED CONTEXTUAL QUICK-CONTROLS */}
          {!zenMode && showSubRibbon && (
            <div className="bg-[#0A0B0E]/92 backdrop-blur-md border-b border-white/[0.08] px-3 py-1.5 flex flex-wrap items-center justify-start gap-3 text-xs">
              {viewMode === 'lunar-globe' || viewMode === 'south-pole' ? (
                <>
                  {/* 1-Click Heatmap Pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {HEATMAP_CONFIGS.map((hm) => {
                      const isSel = hm.id === heatmapMode;
                      return (
                        <button
                          key={hm.id}
                          type="button"
                          onClick={() => setHeatmapMode(hm.id)}
                          className={`hud-btn px-2 py-0.5 rounded text-xs cursor-pointer border ${
                            isSel
                              ? 'bg-[#ECEEF2] border-[#ECEEF2] text-[#0A0B0E] font-semibold'
                              : 'bg-transparent border-white/[0.06] text-[#9BA1AE] hover:text-[#ECEEF2] hover:bg-white/[0.05]'
                          }`}
                        >
                          {hm.shortLabel}
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Compact Colorbar */}
                  <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-white/[0.08] font-mono-tech text-[11px] text-[#9BA1AE]">
                    <span>{activeHeatmapConfig.minLabel}</span>
                    <div
                      className="w-24 h-1.5 rounded-full border border-white/10"
                      style={{ background: activeHeatmapConfig.gradientCss }}
                      title={`${activeHeatmapConfig.label} (${activeHeatmapConfig.unit})`}
                    />
                    <span>{activeHeatmapConfig.maxLabel}</span>
                  </div>

                  {/* Inline 3D Relief */}
                  <div className="hidden 2xl:flex items-center gap-1.5 pl-3 border-l border-white/[0.08]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#9BA1AE]" />
                    <span className="text-[11px] text-[#9BA1AE]">Relief</span>
                    <input
                      type="range"
                      min={0}
                      max={3.2}
                      step={0.1}
                      value={terrainExaggeration}
                      onChange={(e) => setTerrainExaggeration(Number(e.target.value))}
                      className="w-16 accent-[#E59934] cursor-pointer"
                    />
                    <span className="font-mono-tech text-[11px] text-[#ECEEF2] w-7">
                      {terrainExaggeration.toFixed(1)}×
                    </span>
                  </div>

                  {/* Camera Presets Co-Located Beside Layer Controls */}
                  <div className="flex flex-wrap items-center gap-1 pl-3 border-l border-white/[0.08]">
                    {(viewMode === 'south-pole'
                      ? [
                          { id: 'sp-overview' as CameraPreset, lbl: 'Cap 90°S' },
                          { id: 'sp-shackleton' as CameraPreset, lbl: 'Shackleton' },
                          { id: 'sp-malapert' as CameraPreset, lbl: 'Malapert' },
                          { id: 'sp-degerlache' as CameraPreset, lbl: 'de Gerlache' },
                          { id: 'sp-mouton' as CameraPreset, lbl: 'Mons Mouton' },
                          { id: 'site' as CameraPreset, lbl: 'Pin' },
                          { id: 'rover-route' as CameraPreset, lbl: 'Rover' },
                        ]
                      : [
                          { id: 'south-pole' as CameraPreset, lbl: 'South Pole' },
                          { id: 'site' as CameraPreset, lbl: 'Focus Pin' },
                          { id: 'nearside' as CameraPreset, lbl: 'Near Side' },
                          { id: 'farside' as CameraPreset, lbl: 'Far Side' },
                          { id: 'rover-route' as CameraPreset, lbl: 'Rover Route' },
                        ]
                    ).map((cam) => (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => triggerCamera(cam.id, viewMode)}
                        className={`hud-btn px-2 py-0.5 rounded text-xs cursor-pointer ${
                          cameraPreset === cam.id
                            ? 'bg-white/[0.14] text-[#ECEEF2] font-medium border border-white/[0.2]'
                            : 'text-[#9BA1AE] hover:text-[#ECEEF2] hover:bg-white/[0.05]'
                        }`}
                      >
                        {cam.lbl}
                      </button>
                    ))}
                  </div>
                </>
              ) : viewMode === 'earth-moon' ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-[#9BA1AE] tabular-nums">
                    <span>
                      Phase{' '}
                      <strong className="text-[#ECEEF2] font-medium">
                        {celestialState.phaseName} ({celestialState.illuminatedFractionPct}%)
                      </strong>
                    </span>
                    <span>
                      Range{' '}
                      <strong className="font-mono-tech text-[#ECEEF2] font-medium">
                        {Math.round(celestialState.earthMoonDistanceKm).toLocaleString()} km
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeedMult(86400);
                        setIsPlaying(true);
                      }}
                      className="hud-btn px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.1] text-[#ECEEF2] text-xs cursor-pointer"
                    >
                      Warp 1d/s
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pl-3 border-l border-white/[0.08]">
                    {[
                      { id: 'em-overview' as AstroCameraPreset, lbl: 'Overview' },
                      { id: 'em-top' as AstroCameraPreset, lbl: 'Ecliptic North' },
                      { id: 'em-nodes' as AstroCameraPreset, lbl: 'Nodes 5.1°' },
                      { id: 'em-moon' as AstroCameraPreset, lbl: 'Moon' },
                      { id: 'em-earth' as AstroCameraPreset, lbl: 'Earth' },
                    ].map((cam) => (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => triggerAstroCamera(cam.id)}
                        className={`hud-btn px-2 py-0.5 rounded cursor-pointer ${
                          astroPreset === cam.id
                            ? 'bg-[#ECEEF2] text-[#0A0B0E] font-medium'
                            : 'text-[#9BA1AE] hover:text-[#ECEEF2]'
                        }`}
                      >
                        {cam.lbl}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAstroTrueScale((s) => !s);
                        setAstroNonce((n) => n + 1);
                      }}
                      className={`hud-btn px-2 py-0.5 rounded border cursor-pointer ${
                        astroTrueScale
                          ? 'bg-[#ECEEF2] text-[#0A0B0E] border-[#ECEEF2] font-medium'
                          : 'bg-[#181B22] text-[#9BA1AE] border-white/[0.1]'
                      }`}
                    >
                      {astroTrueScale ? '1:1 (60 R⊕)' : 'Schematic'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-[#9BA1AE] tabular-nums">
                    <span>
                      Sun–Earth{' '}
                      <strong className="font-mono-tech text-[#ECEEF2] font-medium">
                        {celestialState.earthSunDistanceAu.toFixed(4)} AU
                      </strong>
                    </span>
                    <span className="hidden sm:inline">
                      Season{' '}
                      <strong className="text-[#ECEEF2] font-medium">
                        {celestialState.earthSeasonLabel}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeedMult(1296000);
                        setIsPlaying(true);
                      }}
                      className="hud-btn px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.1] text-[#ECEEF2] text-xs cursor-pointer"
                    >
                      Warp 15d/s
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pl-3 border-l border-white/[0.08]">
                    {[
                      { id: 'helio-overview' as AstroCameraPreset, lbl: '1 AU System' },
                      { id: 'helio-top' as AstroCameraPreset, lbl: 'Top-Down' },
                      { id: 'helio-follow-em' as AstroCameraPreset, lbl: 'Follow Earth–Moon' },
                      { id: 'helio-tilt' as AstroCameraPreset, lbl: 'Axial Tilt' },
                    ].map((cam) => (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => triggerAstroCamera(cam.id)}
                        className={`hud-btn px-2 py-0.5 rounded cursor-pointer ${
                          astroPreset === cam.id
                            ? 'bg-[#ECEEF2] text-[#0A0B0E] font-medium'
                            : 'text-[#9BA1AE] hover:text-[#ECEEF2]'
                        }`}
                      >
                        {cam.lbl}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Active Time-Warp Banner */}
          {activeWarp && (
            <div className="flex justify-start px-3 pt-2">
              <KspActiveWarpBanner
                activeWarp={activeWarp}
                simTimeMs={simTimeMs}
                onSnapNow={() => handleSnapTime(activeWarp.targetTimeMs)}
                onCancel={handleCancelWarp}
              />
            </div>
          )}
        </div>

        {/* MIDDLE AREA: ALL COLLAPSIBLE TAB DRAWERS ANCHORED DIRECTLY BELOW LEFT CONTROL SPINE (MINIMIZES CURSOR TRAVEL) */}
        <div className="flex-1 min-h-0 relative px-3 pt-2.5 pb-2 flex items-start justify-start">
          {!zenMode && activeRibbonTab === 'layers' && (
            <div className="obsidian-drawer rounded-xl w-[368px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-145px)] pointer-events-auto flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#ECEEF2]">
                  Surface Layers &amp; Overlays
                </span>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('none')}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                  title="Collapse panel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="space-y-1.5">
                  {HEATMAP_CONFIGS.map((hm) => {
                    const active = hm.id === heatmapMode;
                    return (
                      <button
                        key={hm.id}
                        type="button"
                        onClick={() => setHeatmapMode(hm.id)}
                        className={`hud-btn w-full text-left p-2.5 rounded-lg border cursor-pointer ${
                          active
                            ? 'bg-[#181B22] border-white/[0.28]'
                            : 'bg-transparent border-white/[0.07] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-semibold ${
                              active ? 'text-[#ECEEF2]' : 'text-[#9BA1AE]'
                            }`}
                          >
                            {hm.label}
                          </span>
                          <span className="text-[11px] font-mono-tech text-[#6C7280]">
                            {hm.unit}
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full rounded-full mt-2 border border-white/10"
                          style={{ background: hm.gradientCss }}
                        />
                        <div className="flex justify-between text-[10px] font-mono-tech text-[#6C7280] mt-1">
                          <span>{hm.minLabel}</span>
                          <span>{hm.midLabel}</span>
                          <span>{hm.maxLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg bg-[#0A0B0E] border border-white/[0.08] space-y-1 text-xs">
                  <div className="font-mono-tech text-[11px] text-[#9BA1AE]">
                    {activeHeatmapConfig.instrument}
                  </div>
                  <p className="text-[#ECEEF2]/80 leading-relaxed">
                    {activeHeatmapConfig.plannerInsight}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/[0.08] space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-[#9BA1AE] mb-1">
                      <span>3D LOLA Terrain Relief</span>
                      <span className="font-mono-tech text-[#ECEEF2]">
                        {terrainExaggeration.toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={3.2}
                      step={0.1}
                      value={terrainExaggeration}
                      onChange={(e) => setTerrainExaggeration(Number(e.target.value))}
                      className="w-full accent-[#E59934] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { label: 'Lat/Lon Grid', val: showGrid, set: setShowGrid },
                      { label: 'LOS Vectors', val: showVectors, set: setShowVectors },
                      { label: 'Orbit Ribbons', val: showOrbits, set: setShowOrbits },
                      { label: 'Site Labels', val: showSiteLabels, set: setShowSiteLabels },
                      { label: 'Day/Night Mask', val: showTerminator, set: setShowTerminator },
                      { label: 'Night Fill Light', val: nightBoost, set: setNightBoost },
                      { label: 'NASA WMTS Live', val: enableLiveWmts, set: setEnableLiveWmts },
                    ].map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => t.set((v) => !v)}
                        className={`hud-btn px-2.5 py-1.5 rounded-md border text-left flex items-center justify-between cursor-pointer ${
                          t.val
                            ? 'bg-[#181B22] border-white/[0.18] text-[#ECEEF2]'
                            : 'bg-transparent border-white/[0.06] text-[#6C7280]'
                        }`}
                      >
                        <span>{t.label}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.val ? 'bg-[#ECEEF2]' : 'bg-[#6C7280]/40'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!zenMode && activeRibbonTab === 'sites' && (
            <div className="obsidian-drawer rounded-xl w-[368px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-145px)] pointer-events-auto flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#ECEEF2]">
                  Landing Sites &amp; Coordinates
                </span>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('none')}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', lbl: 'All (10)' },
                    { id: 'artemis', lbl: 'Artemis III' },
                    { id: 'clps', lbl: 'CLPS' },
                    { id: 'isru', lbl: 'ISRU Ice' },
                    { id: 'historic', lbl: 'Historic' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSiteFilter(cat.id)}
                      className={`hud-btn px-2.5 py-1 rounded text-xs cursor-pointer ${
                        siteFilter === cat.id
                          ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                          : 'bg-[#181B22] text-[#9BA1AE] border border-white/[0.08] hover:text-[#ECEEF2]'
                      }`}
                    >
                      {cat.lbl}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-[#0A0B0E] border border-white/[0.08] space-y-2">
                  <div className="text-xs font-medium text-[#ECEEF2]">Custom Coordinate Pin</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="-90"
                      max="90"
                      value={customLatInput}
                      onChange={(e) => setCustomLatInput(e.target.value)}
                      placeholder="Lat °"
                      className="w-1/2 bg-[#181B22] border border-white/[0.1] rounded px-2.5 py-1.5 text-xs font-mono-tech text-[#ECEEF2] focus:outline-none focus:border-white/30"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="-180"
                      max="180"
                      value={customLonInput}
                      onChange={(e) => setCustomLonInput(e.target.value)}
                      placeholder="Lon °"
                      className="w-1/2 bg-[#181B22] border border-white/[0.1] rounded px-2.5 py-1.5 text-xs font-mono-tech text-[#ECEEF2] focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const lat = Math.max(-90, Math.min(90, Number(customLatInput) || 0));
                        const lon = Math.max(-180, Math.min(180, Number(customLonInput) || 0));
                        handleSelectCustomPoint(lat, lon);
                        triggerCamera('site');
                      }}
                      className="hud-btn px-3 py-1.5 rounded bg-[#ECEEF2] text-[#0A0B0E] font-semibold text-xs cursor-pointer"
                    >
                      Go
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSunEarthModalOpen(true)}
                      className="hud-btn py-1.5 px-2.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-xs font-medium text-[#ECEEF2] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#9BA1AE]" />
                      <span>WRT Sun/Earth</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCompareOpen(true)}
                      className="hud-btn py-1.5 px-2.5 rounded-md bg-[#181B22] hover:bg-[#1C2029] border border-white/[0.08] text-xs font-medium text-[#ECEEF2] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#9BA1AE]" />
                      <span>Compare Sites</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {filteredSites.map((s) => {
                    const isSel = selectedSite.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSite(s)}
                        className={`hud-btn w-full text-left p-2.5 rounded-lg border cursor-pointer ${
                          isSel
                            ? 'bg-[#181B22] border-white/[0.28]'
                            : 'bg-transparent border-white/[0.07] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-[#9BA1AE]">
                            {s.missionTag}
                          </span>
                          <span className="text-[11px] font-mono-tech text-[#9BA1AE]">
                            {Math.abs(s.lat).toFixed(2)}°{s.lat >= 0 ? 'N' : 'S'},{' '}
                            {Math.abs(s.lon).toFixed(1)}°{s.lon >= 0 ? 'E' : 'W'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#ECEEF2] mt-1">{s.name}</div>
                        <div className="text-xs text-[#9BA1AE] line-clamp-2 mt-0.5 leading-snug">
                          {s.strategicNotes}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!zenMode && activeRibbonTab === 'orbits' && (
            <div className="obsidian-drawer rounded-xl w-[368px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-145px)] pointer-events-auto flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#ECEEF2]">
                  Cislunar Constellation &amp; Passes
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTrueOrbitScale((v) => !v)}
                    className={`hud-btn px-2 py-0.5 rounded text-xs border cursor-pointer ${
                      trueOrbitScale
                        ? 'bg-[#ECEEF2] text-[#0A0B0E] border-[#ECEEF2] font-medium'
                        : 'bg-[#181B22] text-[#9BA1AE] border-white/[0.08]'
                    }`}
                  >
                    {trueOrbitScale ? '1:1 Scale' : 'Tactical'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRibbonTab('none')}
                    className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="space-y-1.5">
                  {evaluation.activeSatellites.map((st) => {
                    const sat = st.satellite;
                    const isSel = selectedSatelliteId === sat.id;
                    return (
                      <button
                        key={sat.id}
                        type="button"
                        onClick={() => setSelectedSatelliteId(sat.id)}
                        className={`hud-btn w-full text-left p-2.5 rounded-lg border cursor-pointer ${
                          isSel
                            ? 'bg-[#181B22] border-white/[0.28]'
                            : 'bg-transparent border-white/[0.07] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sat.color }}
                            />
                            <span className="text-xs font-semibold text-[#ECEEF2]">
                              {sat.name.split(' (')[0]}
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10.5px] font-mono-tech font-medium ${
                              st.isVisibleFromSite
                                ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/35'
                                : 'bg-white/[0.04] text-[#6C7280] border border-white/[0.08]'
                            }`}
                          >
                            {st.isVisibleFromSite
                              ? `In View +${st.elevationDeg}°`
                              : `Occulted (${st.elevationDeg}°)`}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 mt-1.5 text-[11px] font-mono-tech text-[#9BA1AE]">
                          <span>Alt {st.altKm.toLocaleString()} km</span>
                          <span>Rng {st.slantRangeKm.toLocaleString()} km</span>
                          <span className="text-right text-[#ECEEF2]">
                            {st.isVisibleFromSite ? `${st.instantDataRateMbps} Mbps` : sat.agency}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedSatLive && (
                  <div className="p-3 rounded-lg bg-[#0A0B0E] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#ECEEF2]">
                        {selectedSatLive.satellite.name}
                      </span>
                      <span className="text-[11px] font-mono-tech text-[#9BA1AE]">
                        T={selectedSatLive.satellite.periodHours}h
                      </span>
                    </div>
                    <div className="text-[11px] font-mono-tech text-[#9BA1AE]">
                      {selectedSatLive.satellite.orbitType} · {selectedSatLive.satellite.bands}
                    </div>
                    <p className="text-xs text-[#9BA1AE] leading-relaxed">
                      {selectedSatLive.satellite.summary}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSatLive.satellite.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.08] text-[11px] text-[#ECEEF2]"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <div className="text-xs font-semibold text-[#ECEEF2] mb-2">
                    Upcoming 24h Access Windows
                  </div>
                  <div className="space-y-1 max-h-[195px] overflow-y-auto pr-0.5">
                    {upcomingPasses.slice(0, 12).map((pw, idx) => {
                      const isNow = simTimeMs >= pw.aosTimeMs && simTimeMs <= pw.losTimeMs;
                      const shortSatName = pw.satelliteName
                        .split(' (')[0]
                        .split(' Relay')[0];
                      return (
                        <button
                          key={`${pw.satelliteId}-${idx}`}
                          type="button"
                          onClick={() => {
                            setSelectedSatelliteId(pw.satelliteId);
                            handleStartWarp(
                              Math.round((pw.aosTimeMs + pw.losTimeMs) / 2),
                              `${shortSatName} Peak Pass (+${pw.maxElevationDeg}°)`
                            );
                          }}
                          className={`hud-btn w-full text-left px-2.5 py-2 rounded-md border text-xs cursor-pointer flex items-center justify-between ${
                            isNow
                              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                              : 'bg-[#0A0B0E] border-white/[0.07] text-[#ECEEF2] hover:bg-[#181B22]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: pw.color }}
                              />
                              <span>{shortSatName}</span>
                            </div>
                            <div className="font-mono-tech text-[11px] text-[#9BA1AE] mt-0.5">
                              {new Date(pw.aosTimeMs).toISOString().slice(11, 16)}Z →{' '}
                              {new Date(pw.losTimeMs).toISOString().slice(11, 16)}Z ({pw.durationMinutes}m)
                            </div>
                          </div>
                          <div className="text-right font-mono-tech text-[11px]">
                            <div className="text-[#ECEEF2]">Max +{pw.maxElevationDeg}°</div>
                            <div className="text-[#9BA1AE]">{pw.peakDataRateMbps} Mbps</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!zenMode && activeRibbonTab === 'rover' && (
            <div className="obsidian-drawer rounded-xl w-[372px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-145px)] pointer-events-auto flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#ECEEF2]">
                  Rover Traverse Planner
                </span>
                <div className="flex items-center gap-1.5">
                  {(roverWorkflowStep === 'route-ready' || roverWorkflowStep === 'animating') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBottomDrawerMode('rover');
                        setActiveRibbonTab('timeline');
                      }}
                      className="px-2 py-0.5 rounded bg-[#181B22] border border-white/[0.12] text-xs text-[#ECEEF2] cursor-pointer"
                    >
                      Elevation Plot
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveRibbonTab('none')}
                    className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <RoverControlsPanel
                workflowStep={roverWorkflowStep}
                startCoords={roverStart}
                endCoords={roverEnd}
                checkpoints={roverCheckpoints}
                roverParams={roverParams}
                routingMode={roverRoutingMode}
                pickMode={roverPickMode}
                rangeEnvelope={roverRangeEnvelope}
                plan={roverPlan}
                animProgress={roverAnimProgress}
                isAnimating={isRoverAnimating}
                animSpeed={roverAnimSpeed}
                chaseCam={roverChaseCam}
                onSetWorkflowStep={(step) => {
                  if (step !== 'animating') setIsRoverAnimating(false);
                  setRoverWorkflowStep(step);
                }}
                onConfirmRoverDetails={handleConfirmRoverDetails}
                onConfirmStartAndZoomLocality={handleConfirmStartAndZoomLocality}
                onAddCheckpoint={handleAddCheckpoint}
                onRemoveCheckpoint={handleRemoveCheckpoint}
                onReorderCheckpoints={handleReorderCheckpoints}
                onClearCheckpoints={handleClearCheckpoints}
                onSelectEndPoint={handleSelectEndPoint}
                onSelectCandidatePath={handleSelectCandidatePath}
                onStartAnimation={handleStartAnimation}
                onTogglePlayAnimation={handleTogglePlayAnimation}
                onReplayAnimation={() => {
                  setRoverAnimProgress(0);
                  setIsRoverAnimating(true);
                }}
                onScrubProgress={(p) => {
                  setIsRoverAnimating(false);
                  setRoverAnimProgress(p);
                }}
                onChangeAnimSpeed={setRoverAnimSpeed}
                onToggleChaseCam={() => setRoverChaseCam((c) => !c)}
                onZoomLocality={() => triggerCamera('rover-locality')}
                onFocusRouteCamera={() => {
                  setRoverChaseCam(false);
                  triggerCamera('rover-route');
                }}
                onSwapEndpoints={() => {
                  const prevA = roverStart;
                  setRoverStart(roverEnd);
                  setRoverEnd(prevA);
                  stopRoverAnimation();
                }}
                onChangeParams={setRoverParams}
                onChangeRoutingMode={setRoverRoutingMode}
                onChangePickMode={(m) => {
                  if (m !== 'none') setViewMode('lunar-globe');
                  setRoverPickMode(m);
                }}
                onSelectBenchmarkRoute={handleSelectBenchmarkRoute}
                missionEpochMs={roverMissionEpochMs}
                simTimeMs={simTimeMs}
                onChangeMissionEpoch={(epochMs, syncSimClock = true) => {
                  if (syncSimClock) {
                    handleApplyMissionTime(epochMs, true, true);
                  } else {
                    setRoverMissionEpochMs(epochMs);
                    stopRoverAnimation();
                  }
                }}
                onOpenEpochModal={() => setIsEpochModalOpen(true)}
                curatedSites={CURATED_LANDING_SITES}
              />
            </div>
          )}

          {!zenMode && activeRibbonTab === 'readiness' && (
            <div className="obsidian-drawer rounded-xl w-[396px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-145px)] pointer-events-auto flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#ECEEF2]">
                  Flight Readiness &amp; Horizon Skyplot
                </span>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('none')}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/[0.08]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono-tech text-[#9BA1AE]">
                      <span>{evaluation.site.missionTag}</span>
                      <span>·</span>
                      <span>
                        {Math.abs(evaluation.site.lat).toFixed(2)}°
                        {evaluation.site.lat >= 0 ? 'N' : 'S'},{' '}
                        {Math.abs(evaluation.site.lon).toFixed(2)}°
                        {evaluation.site.lon >= 0 ? 'E' : 'W'}
                      </span>
                    </div>
                    <h2 className="text-sm font-semibold text-[#ECEEF2] mt-1 truncate">
                      {evaluation.site.name}
                    </h2>
                    <p className="text-xs text-[#9BA1AE] truncate">{evaluation.site.subtitle}</p>
                  </div>

                  <div
                    className={`shrink-0 px-2.5 py-1 rounded-md border text-right font-mono-tech ${overallBadge.pill}`}
                  >
                    <div className="text-xs font-bold">{evaluation.overallStatus}</div>
                    <div className="text-[10.5px] opacity-90">{evaluation.readinessScore}/100</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]">
                    <div className="text-[11px] text-[#9BA1AE]">Elevation</div>
                    <div className="font-mono-tech text-xs font-semibold text-[#ECEEF2] mt-0.5">
                      {evaluation.elevationKm >= 0 ? '+' : ''}
                      {evaluation.elevationKm.toFixed(2)} km
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]">
                    <div className="text-[11px] text-[#9BA1AE]">Slope</div>
                    <div
                      className={`font-mono-tech text-xs font-semibold mt-0.5 ${
                        evaluation.slopeDeg <= 8
                          ? 'text-emerald-300'
                          : evaluation.slopeDeg <= 12
                          ? 'text-amber-300'
                          : 'text-rose-400'
                      }`}
                    >
                      {evaluation.slopeDeg.toFixed(1)}°
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]">
                    <div className="text-[11px] text-[#9BA1AE]">Temp</div>
                    <div className="font-mono-tech text-xs font-semibold text-[#ECEEF2] mt-0.5">
                      {evaluation.surfaceTempK} K
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]">
                    <div className="text-[11px] text-[#9BA1AE]">Solar Duty</div>
                    <div className="font-mono-tech text-xs font-semibold text-[#ECEEF2] mt-0.5">
                      {evaluation.illuminationDutyPct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]">
                    <div className="text-[11px] text-[#9BA1AE]">Water Ice</div>
                    <div className="font-mono-tech text-xs font-semibold text-[#ECEEF2] mt-0.5">
                      {evaluation.waterIceWtPct.toFixed(1)} wt%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]">
                    <div className="text-[11px] text-[#9BA1AE]">Relays Live</div>
                    <div className="font-mono-tech text-xs font-semibold text-[#ECEEF2] mt-0.5">
                      {evaluation.visibleRelays.length} / 4
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#ECEEF2] mb-2">
                    Flight-Rule Checks
                  </div>
                  <div className="space-y-1.5">
                    {evaluation.flightRules.map((fr) => {
                      const st = statusStyle(fr.status);
                      return (
                        <div
                          key={fr.id}
                          className="p-2.5 rounded-lg bg-[#0A0B0E] border border-white/[0.07]"
                          title={fr.detail}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {st.icon}
                              <span className="text-xs font-medium text-[#ECEEF2] truncate">
                                {fr.label}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono-tech text-[#ECEEF2] shrink-0">
                              {fr.valueText}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9BA1AE] mt-1 pl-5 leading-snug">
                            {fr.detail}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <PolarHorizonSkyplot
                  evaluation={evaluation}
                  selectedSatelliteId={selectedSatelliteId}
                  onSelectSatellite={(id) => {
                    setSelectedSatelliteId(id);
                    setActiveRibbonTab('orbits');
                  }}
                />

                <AiMissionAdvisor
                  evaluation={evaluation}
                  passes={upcomingPasses}
                  optimalWindows={optimalWindows}
                  onJumpToTime={(ms) => handleApplyMissionTime(ms, true, true)}
                />
              </div>
            </div>
          )}

          {!zenMode && activeRibbonTab === 'timeline' && (
            <div className="obsidian-drawer rounded-xl w-full max-w-5xl pointer-events-auto overflow-hidden">
              <div className="px-4 py-2 border-b border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBottomDrawerMode('synodic')}
                    className={`hud-btn px-2.5 py-1 rounded text-xs cursor-pointer ${
                      bottomDrawerMode === 'synodic'
                        ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                        : 'text-[#9BA1AE] hover:text-[#ECEEF2]'
                    }`}
                  >
                    30-Day Synodic Forecast
                  </button>
                  {(roverWorkflowStep === 'route-ready' || roverWorkflowStep === 'animating') && (
                    <button
                      type="button"
                      onClick={() => setBottomDrawerMode('rover')}
                      className={`hud-btn px-2.5 py-1 rounded text-xs cursor-pointer ${
                        bottomDrawerMode === 'rover'
                          ? 'bg-[#ECEEF2] text-[#0A0B0E] font-semibold'
                          : 'text-[#9BA1AE] hover:text-[#ECEEF2]'
                      }`}
                    >
                      Rover Elevation &amp; SOC Profile
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRibbonTab('none')}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#9BA1AE] hover:text-[#ECEEF2] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2">
                {bottomDrawerMode === 'rover' &&
                (roverWorkflowStep === 'route-ready' || roverWorkflowStep === 'animating') ? (
                  <RoverElevationDrawer
                    plan={roverPlan}
                    roverParams={roverParams}
                    animProgress={roverAnimProgress}
                    isAnimating={isRoverAnimating}
                    onTogglePlay={handleTogglePlayAnimation}
                    onScrubProgress={(p) => {
                      setIsRoverAnimating(false);
                      setRoverAnimProgress(p);
                      if (roverWorkflowStep !== 'animating') setRoverWorkflowStep('animating');
                    }}
                    onSwitchToSynodic={() => setBottomDrawerMode('synodic')}
                  />
                ) : (
                  <SynodicTimelineDrawer
                    timeline={synodicTimeline}
                    currentTimeMs={simTimeMs}
                    anchorTimeMs={timelineAnchorMs}
                    optimalWindows={optimalWindows}
                    siteName={evaluation.site.name}
                    onScrubTime={(ms) => handleApplyMissionTime(ms, true, true)}
                    onSwitchToRover={() => {
                      setBottomDrawerMode('rover');
                      setActiveRibbonTab('rover');
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ULTRA-SLIM BOTTOM TELEMETRY PILL ONLY */}
        <div className="px-3 pb-2.5 flex justify-center pointer-events-none">
          {viewMode === 'lunar-globe' || viewMode === 'south-pole' ? (
            <div className="obsidian-drawer rounded-full px-3.5 py-1 text-xs font-mono-tech text-[#9BA1AE] flex items-center gap-2.5 pointer-events-auto">
              <Crosshair className="w-3.5 h-3.5 text-[#E59934]" />
              {hoverCoords ? (
                <>
                  <span>
                    LAT{' '}
                    <strong className="text-[#ECEEF2]">
                      {Math.abs(hoverCoords.lat).toFixed(2)}°
                      {hoverCoords.lat >= 0 ? 'N' : 'S'}
                    </strong>
                  </span>
                  <span className="text-white/15">·</span>
                  <span>
                    LON{' '}
                    <strong className="text-[#ECEEF2]">
                      {Math.abs(hoverCoords.lon).toFixed(2)}°
                      {hoverCoords.lon >= 0 ? 'E' : 'W'}
                    </strong>
                  </span>
                  <span className="text-white/15">·</span>
                  <span>
                    LOLA{' '}
                    <strong className="text-[#ECEEF2]">
                      {hoverCoords.elevKm >= 0 ? '+' : ''}
                      {hoverCoords.elevKm.toFixed(2)} km
                    </strong>
                  </span>
                  <span className="text-white/15">·</span>
                  <span className="text-[11px] text-[#9BA1AE]">
                    {getDemResolutionAt(hoverCoords.lat, hoverCoords.lon, false).nsPostingMeters}{' '}
                    m/px
                  </span>
                  {wmtsStatus?.active && (
                    <>
                      <span className="text-white/15">·</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#ECEEF2]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            wmtsStatus.loading ? 'bg-[#E59934] animate-pulse' : 'bg-emerald-400'
                          }`}
                        />
                        WMTS z{wmtsStatus.zoomLevel}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-xs text-[#9BA1AE]">
                  {evaluation.site.name} ·{' '}
                  {viewMode === 'south-pole'
                    ? 'LROC + 16-bit LOLA South Pole (5 m/px)'
                    : wmtsStatus?.active
                    ? `NASA Moon Trek WMTS z${wmtsStatus.zoomLevel} (${
                        wmtsStatus.resolutionMetersPerPx < 10
                          ? wmtsStatus.resolutionMetersPerPx.toFixed(1)
                          : Math.round(wmtsStatus.resolutionMetersPerPx)
                      } m/px)`
                    : 'LOLA Selenographic Terrain Model'}
                </span>
              )}
            </div>
          ) : (
            <div className="obsidian-drawer rounded-full px-3.5 py-1 text-xs font-mono-tech text-[#9BA1AE] flex items-center gap-2.5 pointer-events-auto">
              <span>
                {viewMode === 'earth-moon'
                  ? `Moon Phase: ${celestialState.phaseName} (${celestialState.illuminatedFractionPct}%) · Range ${Math.round(
                      celestialState.earthMoonDistanceKm
                    ).toLocaleString()} km`
                  : `1 AU Heliocentric · Sun–Earth ${celestialState.earthSunDistanceAu.toFixed(
                      4
                    )} AU · ${celestialState.earthSeasonLabel}`}
              </span>
              {viewMode === 'earth-moon' && celestialState.eclipseGeometryNote && (
                <span className="text-rose-300">· {celestialState.eclipseGeometryNote}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDITORIAL LANDING PAGE OVERLAY (INSPIRED BY MAPADOASTRO.COM.BR) */}
      {showLandingPage && (
        <LandingPageHero
          curatedSites={CURATED_LANDING_SITES}
          epochDisplay={`${epochUtcParts.dateStr} ${epochUtcParts.timeStr}`}
          onEnterConsole={() => setShowLandingPage(false)}
          onLaunchSouthPole={() => {
            setShowLandingPage(false);
            setViewMode('south-pole');
            setSelectedSite(CURATED_LANDING_SITES[0]);
            setCameraPreset('sp-shackleton');
            setCameraNonce((n) => n + 1);
          }}
          onLaunchRoverPlanner={() => {
            setShowLandingPage(false);
            handleOpenPlanMission();
          }}
          onLaunchLayer={(mode) => {
            setShowLandingPage(false);
            setHeatmapMode(mode);
            setViewMode('lunar-globe');
            setActiveRibbonTab('layers');
          }}
          onLaunchSite={(site) => {
            setShowLandingPage(false);
            setViewMode(site.lat <= -78 ? 'south-pole' : 'lunar-globe');
            handleSelectSite(site);
            setActiveRibbonTab('readiness');
          }}
          onLaunchViewMode={(mode) => {
            setShowLandingPage(false);
            setViewMode(mode);
            setAstroPreset(mode === 'earth-moon' ? 'em-overview' : 'helio-overview');
            setAstroNonce((n) => n + 1);
          }}
        />
      )}

      {/* SIDE-BY-SIDE SITE & LAUNCH-SLIP COMPARISON MODAL */}
      <SiteComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        primaryEval={evaluation}
        allSites={CURATED_LANDING_SITES}
        compareSite={compareSite}
        onChangeCompareSite={setCompareSite}
      />

      {/* PAST / PRESENT / FUTURE MISSION EPOCH SELECTOR MODAL */}
      <MissionEpochModal
        isOpen={isEpochModalOpen}
        onClose={() => setIsEpochModalOpen(false)}
        simTimeMs={simTimeMs}
        roverMissionEpochMs={roverMissionEpochMs}
        onApplyTime={handleApplyMissionTime}
      />

      {/* MANUAL LUNAR SURFACE & ORBITAL LOCATION WRT SUN & EARTH MODAL */}
      <SunEarthLocatorModal
        isOpen={isSunEarthModalOpen}
        onClose={() => setIsSunEarthModalOpen(false)}
        simTimeMs={simTimeMs}
        onApplyLandingSite={(lat, lon, customName) => {
          handleSelectCustomPoint(lat, lon, customName);
          triggerCamera('site');
          setIsSunEarthModalOpen(false);
        }}
        onApplyRoverStart={(lat, lon, label) => {
          setActiveRibbonTab('rover');
          setRoverActive(true);
          handleConfirmStartAndZoomLocality({ lat, lon, label });
          setIsSunEarthModalOpen(false);
        }}
        onApplyRoverGoal={(lat, lon, label) => {
          setActiveRibbonTab('rover');
          setRoverActive(true);
          handleSelectEndPoint({ lat, lon, label });
          triggerCamera('rover-route');
          setIsSunEarthModalOpen(false);
        }}
        onStartWarp={handleStartWarp}
        onSnapTime={handleSnapTime}
        onChangeSurfacePreview={setPreviewSunEarthPoint}
      />
    </div>
  );
}

export default App;

