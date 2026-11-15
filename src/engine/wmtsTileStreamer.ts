import * as THREE from 'three';

export interface WmtsStreamStatus {
  active: boolean;
  projection: 'EQ' | 'none';
  zoomLevel: number;
  resolutionMetersPerPx: number;
  layerLabel: string;
  tilesLoaded: number;
  tilesTotal: number;
  loading: boolean;
}

const DEG2RAD = Math.PI / 180;
const MOON_RADIUS_M = 1737400.0;

// Global Equirectangular (EPSG:104903) pixel resolution at equator
const EQ_Z0_M_PER_PX = (Math.PI * MOON_RADIUS_M) / 256.0; // ~21320 m/px at z=0

const TILE_PX = 256;
const GRID_TILES = 4; // 4x4 grid => 1024x1024 clipmap
const CANVAS_PX = TILE_PX * GRID_TILES;
const MAX_CACHE_ENTRIES = 192;
const MAX_CONCURRENT_FETCHES = 8;

const TREK_BASE = 'https://trek.nasa.gov/tiles/Moon';

const EQ_LAYER = {
  id: 'EQ/LRO_WAC_Mosaic_Global_303ppd_v02',
  ext: 'jpg',
  maxZ: 8,
  label: 'LROC WAC 100 m/px',
} as const;

interface CacheEntry {
  status: 'loading' | 'loaded' | 'error';
  img?: HTMLImageElement;
}

interface ActiveGridSpec {
  mode: 0 | 2;
  projection: 'EQ' | 'none';
  z: number;
  col0: number;
  row0: number;
  resMPerPx: number;
  layerLabel: string;
  bounds: [number, number, number, number];
}

function tileUrl(layerId: string, z: number, row: number, col: number, ext: string): string {
  return `${TREK_BASE}/${layerId}/1.0.0/default/default028mm/${z}/${row}/${col}.${ext}`;
}

/**
 * Google Maps–style Quadtree Tile Streamer for NASA Moon Trek OGC WMTS (Global EQ).
 *
 * Streams only the 4x4 (1024x1024 px) Equirectangular clipmap centered beneath the camera
 * in RAM when zoomed in outside the South Pole (preserving the dedicated local 3-tier
 * South Polar Stereographic clipmaps untouched).
 */
export class WmtsTileStreamer {
  public readonly texture: THREE.CanvasTexture;
  public committedMode: 0 | 2 = 0;
  public committedBounds: [number, number, number, number] = [0, 0, 1, 1];
  public statusKey = 'init';

  private readonly displayCanvas: HTMLCanvasElement;
  private readonly displayCtx: CanvasRenderingContext2D;
  private readonly stagingCanvas: HTMLCanvasElement;
  private readonly stagingCtx: CanvasRenderingContext2D;

  private readonly cache = new Map<string, CacheEntry>();
  private readonly pendingQueue: Array<{
    key: string;
    url: string;
  }> = [];
  private activeFetches = 0;
  private disposed = false;

  private currentGrid: ActiveGridSpec = {
    mode: 0,
    projection: 'none',
    z: 0,
    col0: 0,
    row0: 0,
    resMPerPx: 0,
    layerLabel: '',
    bounds: [0, 0, 1, 1],
  };

  private tilesLoaded = 0;
  private tilesTotal = 0;
  private isLoading = false;
  private lastGridKey = '';
  private dirtyCompose = false;

  constructor() {
    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.width = CANVAS_PX;
    this.displayCanvas.height = CANVAS_PX;
    this.displayCtx = this.displayCanvas.getContext('2d')!;

    this.stagingCanvas = document.createElement('canvas');
    this.stagingCanvas.width = CANVAS_PX;
    this.stagingCanvas.height = CANVAS_PX;
    this.stagingCtx = this.stagingCanvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.displayCanvas);
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.anisotropy = 8;
    this.texture.generateMipmaps = true;
  }

  public dispose(): void {
    this.disposed = true;
    this.pendingQueue.length = 0;
    this.cache.clear();
    this.texture.dispose();
  }

  public getStatus(): WmtsStreamStatus {
    return {
      active: this.currentGrid.mode !== 0,
      projection: this.currentGrid.projection,
      zoomLevel: this.currentGrid.z,
      resolutionMetersPerPx: this.currentGrid.resMPerPx,
      layerLabel: this.currentGrid.layerLabel,
      tilesLoaded: this.tilesLoaded,
      tilesTotal: this.tilesTotal,
      loading: this.isLoading,
    };
  }

  /**
   * Evaluate the current camera focus and altitude, updating the active 4x4 tile window
   * and flushing any newly arrived tiles to the GPU texture.
   */
  public updateView(
    focusLatDeg: number,
    focusLonDeg: number,
    camDist: number,
    enabled: boolean
  ): void {
    if (this.disposed) return;

    if (!enabled) {
      if (this.currentGrid.mode !== 0 || this.committedMode !== 0) {
        this.currentGrid = {
          mode: 0,
          projection: 'none',
          z: 0,
          col0: 0,
          row0: 0,
          resMPerPx: 0,
          layerLabel: '',
          bounds: [0, 0, 1, 1],
        };
        this.committedMode = 0;
        this.tilesLoaded = 0;
        this.tilesTotal = 0;
        this.isLoading = false;
        this.lastGridKey = '';
        this.syncStatusKey();
      }
      return;
    }

    const nextSpec = this.computeGridSpec(focusLatDeg, focusLonDeg, camDist);
    const gridKey = `${nextSpec.mode}:${nextSpec.z}:${nextSpec.col0}:${nextSpec.row0}`;

    if (gridKey !== this.lastGridKey) {
      this.currentGrid = nextSpec;
      this.lastGridKey = gridKey;
      this.dirtyCompose = true;
    }

    if (this.dirtyCompose) {
      this.dirtyCompose = false;
      this.composeActiveGrid();
    }
  }

  private computeGridSpec(
    latDeg: number,
    lonDeg: number,
    camDist: number
  ): ActiveGridSpec {
    // Keep the dedicated local 3-tier South Polar Stereographic clipmaps untouched (<= -76°S)
    if (latDeg > -76.0 && camDist < 1.75) {
      let z = 4;
      if (camDist < 1.075) z = 8;
      else if (camDist < 1.140) z = 7;
      else if (camDist < 1.260) z = 6;
      else if (camDist < 1.450) z = 5;

      const numRows = 1 << z;
      const numCols = 1 << (z + 1);
      const tileDeg = 180.0 / numRows;

      const colFloat = (lonDeg + 180.0) / tileDeg;
      const rowFloat = (90.0 - latDeg) / tileDeg;

      let col0 = Math.round(colFloat) - 2;
      let row0 = Math.max(0, Math.min(numRows - GRID_TILES, Math.round(rowFloat) - 2));

      if (
        this.currentGrid.mode === 2 &&
        this.currentGrid.z === z &&
        Math.abs(colFloat - (this.currentGrid.col0 + 2)) <= 0.85 &&
        Math.abs(rowFloat - (this.currentGrid.row0 + 2)) <= 0.85
      ) {
        col0 = this.currentGrid.col0;
        row0 = this.currentGrid.row0;
      }

      if (col0 >= numCols) col0 -= numCols;
      if (col0 < -GRID_TILES) col0 += numCols;

      const lonMinRad = (-180.0 + col0 * tileDeg) * DEG2RAD;
      const latMaxRad = (90.0 - row0 * tileDeg) * DEG2RAD;
      const spanRad = GRID_TILES * tileDeg * DEG2RAD;
      const latMinRad = latMaxRad - spanRad;

      return {
        mode: 2,
        projection: 'EQ',
        z,
        col0,
        row0,
        resMPerPx: EQ_Z0_M_PER_PX / (1 << z),
        layerLabel: EQ_LAYER.label,
        bounds: [lonMinRad, latMinRad, 1.0 / spanRad, 1.0 / spanRad],
      };
    }

    return {
      mode: 0,
      projection: 'none',
      z: 0,
      col0: 0,
      row0: 0,
      resMPerPx: 0,
      layerLabel: '',
      bounds: [0, 0, 1, 1],
    };
  }

  private composeActiveGrid(): void {
    const spec = this.currentGrid;
    if (spec.mode === 0) {
      this.committedMode = 0;
      this.tilesLoaded = 0;
      this.tilesTotal = 0;
      this.isLoading = false;
      this.syncStatusKey();
      return;
    }

    const ctx = this.stagingCtx;
    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);

    let loadedCount = 0;
    let loadingCount = 0;
    const total = GRID_TILES * GRID_TILES;
    const numCols = 1 << (spec.z + 1);

    for (let rOff = 0; rOff < GRID_TILES; rOff++) {
      for (let cOff = 0; cOff < GRID_TILES; cOff++) {
        const row = spec.row0 + rOff;
        const col = (((spec.col0 + cOff) % numCols) + numCols) % numCols;
        const dx = cOff * TILE_PX;
        const dy = rOff * TILE_PX;

        const res = this.drawTileOrAncestor(
          ctx,
          EQ_LAYER.id,
          EQ_LAYER.ext,
          spec.z,
          EQ_LAYER.maxZ,
          row,
          col,
          dx,
          dy,
          1.0,
          'source-over',
          3
        );
        if (res === 'exact') loadedCount++;
        else if (res === 'loading') loadingCount++;
      }
    }

    this.displayCtx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
    this.displayCtx.drawImage(this.stagingCanvas, 0, 0);
    this.texture.needsUpdate = true;

    this.committedMode = spec.mode;
    this.committedBounds = [...spec.bounds];
    this.tilesLoaded = loadedCount;
    this.tilesTotal = total;
    this.isLoading = loadingCount > 0;
    this.syncStatusKey();
  }

  private drawTileOrAncestor(
    ctx: CanvasRenderingContext2D,
    layerId: string,
    ext: string,
    targetZ: number,
    maxLayerZ: number,
    targetRow: number,
    targetCol: number,
    dx: number,
    dy: number,
    alpha: number,
    compositeOp: GlobalCompositeOperation,
    minAncestorZ: number
  ): 'exact' | 'loading' | 'error' {
    const effZ = Math.min(targetZ, maxLayerZ);
    const zDiff = targetZ - effZ;
    const effRow = targetRow >> zDiff;
    const effCol = targetCol >> zDiff;
    const exactKey = `${layerId}/${effZ}/${effRow}/${effCol}`;
    const exactEntry = this.touchCache(exactKey);

    let drawn = false;
    let resultState: 'exact' | 'loading' | 'error' = 'loading';

    if (exactEntry?.status === 'loaded' && exactEntry.img) {
      this.blitSubTile(
        ctx,
        exactEntry.img,
        zDiff,
        targetRow,
        targetCol,
        dx,
        dy,
        alpha,
        compositeOp
      );
      drawn = true;
      resultState = 'exact';
    } else if (exactEntry?.status === 'error') {
      resultState = 'error';
    } else if (!exactEntry) {
      this.enqueueFetch(exactKey, tileUrl(layerId, effZ, effRow, effCol, ext));
    }

    if (!drawn) {
      for (let ancZ = effZ - 1; ancZ >= minAncestorZ; ancZ--) {
        const steps = targetZ - ancZ;
        const ancRow = targetRow >> steps;
        const ancCol = targetCol >> steps;
        const ancKey = `${layerId}/${ancZ}/${ancRow}/${ancCol}`;
        const ancEntry = this.cache.get(ancKey);
        if (ancEntry?.status === 'loaded' && ancEntry.img) {
          this.blitSubTile(
            ctx,
            ancEntry.img,
            steps,
            targetRow,
            targetCol,
            dx,
            dy,
            alpha,
            compositeOp
          );
          break;
        }
      }
    }

    return resultState;
  }

  private blitSubTile(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    stepsDown: number,
    targetRow: number,
    targetCol: number,
    dx: number,
    dy: number,
    alpha: number,
    compositeOp: GlobalCompositeOperation
  ): void {
    const prevAlpha = ctx.globalAlpha;
    const prevOp = ctx.globalCompositeOperation;
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = compositeOp;

    if (stepsDown <= 0) {
      ctx.drawImage(img, 0, 0, TILE_PX, TILE_PX, dx, dy, TILE_PX, TILE_PX);
    } else {
      const subDiv = 1 << stepsDown;
      const mask = subDiv - 1;
      const sw = TILE_PX / subDiv;
      const sh = TILE_PX / subDiv;
      const sx = (targetCol & mask) * sw;
      const sy = (targetRow & mask) * sh;
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, TILE_PX, TILE_PX);
    }

    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevOp;
  }

  private touchCache(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
    return entry;
  }

  private evictIfNeeded(): void {
    while (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.cache.delete(oldestKey);
    }
  }

  private enqueueFetch(key: string, url: string): void {
    if (this.cache.has(key)) return;
    this.evictIfNeeded();
    this.cache.set(key, { status: 'loading' });
    this.pendingQueue.push({ key, url });
    this.pumpQueue();
  }

  private pumpQueue(): void {
    if (this.disposed) return;

    while (
      this.activeFetches < MAX_CONCURRENT_FETCHES &&
      this.pendingQueue.length > 0
    ) {
      const job = this.pendingQueue.pop()!;
      this.activeFetches++;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.activeFetches = Math.max(0, this.activeFetches - 1);
        if (!this.disposed) {
          this.cache.delete(job.key);
          this.cache.set(job.key, { status: 'loaded', img });
          this.dirtyCompose = true;
          this.pumpQueue();
        }
      };
      img.onerror = () => {
        this.activeFetches = Math.max(0, this.activeFetches - 1);
        if (!this.disposed) {
          this.cache.set(job.key, { status: 'error' });
          this.dirtyCompose = true;
          this.pumpQueue();
        }
      };
      img.src = job.url;
    }
  }

  private syncStatusKey(): void {
    this.statusKey = `${this.currentGrid.mode}|${this.currentGrid.projection}|${this.currentGrid.z}|${this.currentGrid.layerLabel}|${this.tilesLoaded}/${this.tilesTotal}|${this.isLoading ? 1 : 0}`;
  }
}
