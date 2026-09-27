import { Injectable, signal } from '@angular/core';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultX: number;
  defaultY: number;
  defaultW: number;
  defaultH: number;
  zIndex: number;
  accentColor: 'green' | 'amber' | 'red';
}

interface WindowBlueprint {
  id: string;
  title: string;
  offsetX: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  accentColor: 'green' | 'amber' | 'red';
  openByDefault?: boolean;
}

const STORAGE_KEY = 'kaiju_hud_windows_v2';
const LEGACY_STORAGE_KEYS = ['kaiju_hud_windows_v1'];
const BO_SIDEBAR_RATIO = 0.4;
const BO_SIDEBAR_MIN_WIDTH = 360;
const VIEWPORT_MARGIN = 12;
const MIN_WINDOW_WIDTH = 300;
const MIN_WINDOW_HEIGHT = 180;

const WINDOW_BLUEPRINTS: WindowBlueprint[] = [
  {
    id: 'dashboard',
    title: 'TABLEAU DE BORD · PRIORITÉS DU RÔLE',
    offsetX: 16,
    y: 60,
    width: 440,
    height: 560,
    zIndex: 29,
    accentColor: 'green',
    openByDefault: true
  },
  {
    id: 'transfers',
    title: 'LOGISTIQUE · CONVOIS & TRANSFERTS',
    offsetX: 40,
    y: 80,
    width: 520,
    height: 500,
    zIndex: 31,
    accentColor: 'green'
  },
  {
    id: 'reservations',
    title: 'ALLOCATION · RÉSERVATIONS DU QUARTIER',
    offsetX: 70,
    y: 110,
    width: 480,
    height: 460,
    zIndex: 32,
    accentColor: 'green'
  },
  {
    id: 'calendar',
    title: 'PLANIFICATION · CALENDRIER OPÉRATIONNEL',
    offsetX: 100,
    y: 70,
    width: 600,
    height: 520,
    zIndex: 33,
    accentColor: 'green'
  },
  {
    id: 'alerts',
    title: 'ALERTES · FLUX DES URGENCES',
    offsetX: 16,
    y: 60,
    width: 420,
    height: 380,
    zIndex: 34,
    accentColor: 'amber'
  }
];

function viewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  return { width: window.innerWidth || 1440, height: window.innerHeight || 900 };
}

function mapAreaLeft(viewportWidth: number): number {
  return Math.max(BO_SIDEBAR_MIN_WIDTH, Math.round(viewportWidth * BO_SIDEBAR_RATIO));
}

function buildDefaultWindows(): Record<string, WindowState> {
  const viewport = viewportSize();
  const left = mapAreaLeft(viewport.width);
  const mapWidth = Math.max(0, viewport.width - left - VIEWPORT_MARGIN);
  const result: Record<string, WindowState> = {};

  for (const bp of WINDOW_BLUEPRINTS) {
    const width = Math.max(MIN_WINDOW_WIDTH, Math.min(bp.width, mapWidth - VIEWPORT_MARGIN));
    const maxX = viewport.width - width - VIEWPORT_MARGIN;
    const x = Math.max(0, Math.min(left + bp.offsetX, maxX));
    const height = Math.max(MIN_WINDOW_HEIGHT, Math.min(bp.height, viewport.height - bp.y - VIEWPORT_MARGIN));

    result[bp.id] = {
      id: bp.id,
      title: bp.title,
      isOpen: bp.openByDefault ?? false,
      isMinimized: false,
      x,
      y: bp.y,
      width,
      height,
      defaultX: x,
      defaultY: bp.y,
      defaultW: width,
      defaultH: height,
      zIndex: bp.zIndex,
      accentColor: bp.accentColor
    };
  }

  return result;
}

@Injectable({
  providedIn: 'root'
})
export class HudWindowService {
  private currentZIndex = 40;
  readonly windows = signal<Record<string, WindowState>>(this.loadInitialState());

  private loadInitialState(): Record<string, WindowState> {
    const clone = buildDefaultWindows();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(legacyKey);
        }
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          for (const key of Object.keys(parsed)) {
            if (clone[key]) {
              clone[key].x = parsed[key].x ?? clone[key].defaultX;
              clone[key].y = parsed[key].y ?? clone[key].defaultY;
              clone[key].width = parsed[key].width ?? clone[key].defaultW;
              clone[key].height = parsed[key].height ?? clone[key].defaultH;
              clone[key].isOpen = parsed[key].isOpen ?? false;
            }
          }
        }
      } catch {}
    }

    return clone;
  }

  private saveState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const state = this.windows();
        const toSave: Record<string, any> = {};
        for (const key of Object.keys(state)) {
          toSave[key] = {
            x: state[key].x,
            y: state[key].y,
            width: state[key].width,
            height: state[key].height,
            isOpen: state[key].isOpen
          };
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }

  toggle(id: string): void {
    this.windows.update((map) => {
      if (!map[id]) return map;
      const isOpen = !map[id].isOpen;
      const nextZ = isOpen ? ++this.currentZIndex : map[id].zIndex;
      return {
        ...map,
        [id]: {
          ...map[id],
          isOpen,
          zIndex: nextZ
        }
      };
    });
    this.saveState();
  }

  open(id: string): void {
    this.windows.update((map) => {
      if (!map[id]) return map;
      return {
        ...map,
        [id]: {
          ...map[id],
          isOpen: true,
          zIndex: ++this.currentZIndex
        }
      };
    });
    this.saveState();
  }

  close(id: string): void {
    this.windows.update((map) => {
      if (!map[id]) return map;
      return {
        ...map,
        [id]: {
          ...map[id],
          isOpen: false
        }
      };
    });
    this.saveState();
  }

  bringToFront(id: string): void {
    this.windows.update((map) => {
      if (!map[id]) return map;
      return {
        ...map,
        [id]: {
          ...map[id],
          zIndex: ++this.currentZIndex
        }
      };
    });
  }

  updatePosition(id: string, x: number, y: number): void {
    this.windows.update((map) => {
      if (!map[id]) return map;
      return {
        ...map,
        [id]: {
          ...map[id],
          x,
          y
        }
      };
    });
    this.saveState();
  }

  updateSize(id: string, width: number, height: number): void {
    this.windows.update((map) => {
      if (!map[id]) return map;
      return {
        ...map,
        [id]: {
          ...map[id],
          width,
          height
        }
      };
    });
    this.saveState();
  }

  resetLayout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          window.localStorage.removeItem(legacyKey);
        }
      } catch {}
    }
    const defaults = buildDefaultWindows();
    const resetMap: Record<string, WindowState> = {};
    for (const key of Object.keys(defaults)) {
      const def = defaults[key];
      resetMap[key] = {
        ...def,
        x: def.defaultX,
        y: def.defaultY,
        width: def.defaultW,
        height: def.defaultH,
        isOpen: def.isOpen,
        zIndex: 30
      };
    }
    this.windows.set(resetMap);
  }
}
