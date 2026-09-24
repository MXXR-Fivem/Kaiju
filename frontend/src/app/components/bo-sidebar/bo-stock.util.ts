import { DistrictResourceDetail } from '../../models/kaiju.models';

export const RESOURCE_ORDER: string[] = [
  'WATER',
  'FOOD',
  'MED_KIT',
  'GENERATOR',
  'FUEL',
  'SHELTER',
  'MEDIC',
  'ATV',
  'CLEARING_GEAR',
  'WATER_PURIFIER'
];

export const DISTRICT_CODES: string[] = ['A', 'E', 'W', 'X', 'Z'];

export const DISTRICT_FALLBACK_NAMES: Record<string, string> = {
  A: 'APEX',
  E: 'ECHO',
  W: 'WARDEN',
  X: 'XENO',
  Z: 'ZION'
};

export type StockLevel = 'OK' | 'WATCH' | 'LOW' | 'CRITICAL' | 'NONE';

export interface StockFigures {
  initial: number;
  current: number;
  reserved: number;
  available: number;
  minRetained: number;
  transferable: number;
}

export interface StockGauge {
  capacity: number;
  ratio: number;
  availablePct: number;
  reservedPct: number;
  consumedPct: number;
  thresholdPct: number;
  transferablePct: number;
  belowRetention: boolean;
  level: StockLevel;
}

export interface DistrictSlice {
  code: string;
  name: string;
  figures: StockFigures;
  gauge: StockGauge;
}

export interface StockView {
  code: string;
  name: string;
  unit: string;
  retentionPct: number;
  figures: StockFigures;
  gauge: StockGauge;
  districts: DistrictSlice[];
}

export interface LevelStyle {
  text: string;
  bg: string;
  stroke: string;
  border: string;
  tag: string;
}

export const LEVEL_STYLES: Record<StockLevel, LevelStyle> = {
  OK: {
    text: 'text-green-400',
    bg: 'bg-green-500',
    stroke: 'stroke-green-500',
    border: 'border-green-500/50',
    tag: '[NOMINAL]'
  },
  WATCH: {
    text: 'text-yellow-300',
    bg: 'bg-yellow-400',
    stroke: 'stroke-yellow-400',
    border: 'border-yellow-400/60',
    tag: '[VIGILANCE]'
  },
  LOW: {
    text: 'text-orange-400',
    bg: 'bg-orange-500',
    stroke: 'stroke-orange-500',
    border: 'border-orange-500/60',
    tag: '[TENSION]'
  },
  CRITICAL: {
    text: 'text-red-400',
    bg: 'bg-red-500',
    stroke: 'stroke-red-500',
    border: 'border-red-500/70',
    tag: '[CRITIQUE]'
  },
  NONE: {
    text: 'text-zinc-500',
    bg: 'bg-zinc-600',
    stroke: 'stroke-zinc-600',
    border: 'border-zinc-700',
    tag: '[NEANT]'
  }
};

export function levelForRatio(ratio: number, belowRetention = false): StockLevel {
  if (belowRetention || ratio < 0.3) return 'CRITICAL';
  if (ratio < 0.5) return 'LOW';
  if (ratio < 0.75) return 'WATCH';
  return 'OK';
}

function num(value: unknown): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function figuresOf(item: DistrictResourceDetail): StockFigures {
  const initial = Math.max(0, num(item.initial_quantity));
  const current = Math.max(0, num(item.current_quantity));
  const reserved = Math.max(0, num(item.reserved_quantity));
  const available = Number.isFinite(Number(item.available_quantity))
    ? Number(item.available_quantity)
    : current - reserved;
  const minRetained = Number.isFinite(Number(item.min_retained_quantity))
    ? Number(item.min_retained_quantity)
    : Math.ceil(initial * num(item.min_retention_pct));
  const transferable = Number.isFinite(Number(item.transferable_quantity))
    ? Number(item.transferable_quantity)
    : Math.max(0, available - minRetained);
  return { initial, current, reserved, available, minRetained, transferable };
}

export function sumFigures(list: StockFigures[]): StockFigures {
  return list.reduce<StockFigures>(
    (acc, f) => ({
      initial: acc.initial + f.initial,
      current: acc.current + f.current,
      reserved: acc.reserved + f.reserved,
      available: acc.available + f.available,
      minRetained: acc.minRetained + f.minRetained,
      transferable: acc.transferable + f.transferable
    }),
    { initial: 0, current: 0, reserved: 0, available: 0, minRetained: 0, transferable: 0 }
  );
}

export function gaugeOf(f: StockFigures): StockGauge {
  const capacity = Math.max(f.initial, f.current, 0);
  if (capacity <= 0) {
    return {
      capacity: 0,
      ratio: 0,
      availablePct: 0,
      reservedPct: 0,
      consumedPct: 0,
      thresholdPct: 0,
      transferablePct: 0,
      belowRetention: false,
      level: 'NONE'
    };
  }
  const available = Math.max(0, f.available);
  const reserved = Math.max(0, Math.min(f.reserved, f.current));
  const availablePct = clampPct((available / capacity) * 100);
  const reservedPct = Math.min(clampPct((reserved / capacity) * 100), 100 - availablePct);
  const consumedPct = Math.max(0, 100 - availablePct - reservedPct);
  const thresholdPct = clampPct((f.minRetained / capacity) * 100);
  const transferablePct = clampPct((Math.max(0, f.transferable) / capacity) * 100);
  const ratio = available / capacity;
  const belowRetention = f.minRetained > 0 && f.available < f.minRetained;
  return {
    capacity,
    ratio,
    availablePct,
    reservedPct,
    consumedPct,
    thresholdPct,
    transferablePct,
    belowRetention,
    level: levelForRatio(ratio, belowRetention)
  };
}

function resourceRank(code: string): number {
  const idx = RESOURCE_ORDER.indexOf(code);
  return idx === -1 ? RESOURCE_ORDER.length : idx;
}

export function buildStockViews(inventory: DistrictResourceDetail[], districtCode: string | null): StockView[] {
  const scoped = districtCode
    ? inventory.filter((item) => item.district_code === districtCode)
    : inventory;

  const groups = new Map<string, DistrictResourceDetail[]>();
  for (const item of scoped) {
    const bucket = groups.get(item.resource_code);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(item.resource_code, [item]);
    }
  }

  const views: StockView[] = [];
  groups.forEach((items, code) => {
    const first = items[0];
    const districts: DistrictSlice[] = items
      .map((item) => {
        const figures = figuresOf(item);
        return {
          code: item.district_code,
          name: item.district_name || DISTRICT_FALLBACK_NAMES[item.district_code] || item.district_code,
          figures,
          gauge: gaugeOf(figures)
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
    const figures = sumFigures(districts.map((d) => d.figures));
    const retentionPct = items.reduce((acc, item) => acc + num(item.min_retention_pct), 0) / items.length;
    views.push({
      code,
      name: first.resource_name || code,
      unit: first.unit || '',
      retentionPct,
      figures,
      gauge: gaugeOf(figures),
      districts
    });
  });

  return views.sort((a, b) => resourceRank(a.code) - resourceRank(b.code) || a.code.localeCompare(b.code));
}

const LEVEL_RANK: Record<StockLevel, number> = { CRITICAL: 0, LOW: 1, WATCH: 2, OK: 3, NONE: 4 };

export function sortByCriticality(views: StockView[]): StockView[] {
  return [...views].sort(
    (a, b) =>
      LEVEL_RANK[a.gauge.level] - LEVEL_RANK[b.gauge.level] ||
      a.gauge.ratio - b.gauge.ratio ||
      resourceRank(a.code) - resourceRank(b.code)
  );
}

export interface StockSummary {
  total: number;
  measured: number;
  availablePct: number;
  reservedPct: number;
  transferablePct: number;
  criticalCount: number;
  lowCount: number;
  watchCount: number;
  availableLevel: StockLevel;
}

export function summarize(views: StockView[]): StockSummary {
  const measured = views.filter((v) => v.gauge.capacity > 0);
  const mean = (pick: (v: StockView) => number): number =>
    measured.length === 0 ? 0 : measured.reduce((acc, v) => acc + pick(v), 0) / measured.length;
  const availablePct = mean((v) => v.gauge.availablePct);
  return {
    total: views.length,
    measured: measured.length,
    availablePct,
    reservedPct: mean((v) => v.gauge.reservedPct),
    transferablePct: mean((v) => v.gauge.transferablePct),
    criticalCount: views.filter((v) => v.gauge.level === 'CRITICAL').length,
    lowCount: views.filter((v) => v.gauge.level === 'LOW').length,
    watchCount: views.filter((v) => v.gauge.level === 'WATCH').length,
    availableLevel: measured.length === 0 ? 'NONE' : levelForRatio(availablePct / 100)
  };
}
