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

const DEFAULT_WINDOWS: Record<string, WindowState> = {
  inventory: {
    id: 'inventory',
    title: 'STOCKS & RESSOURCES // DISPONIBILITES PAR QUARTIER',
    isOpen: false,
    isMinimized: false,
    x: 460,
    y: 55,
    width: 540,
    height: 520,
    defaultX: 460,
    defaultY: 55,
    defaultW: 540,
    defaultH: 520,
    zIndex: 30,
    accentColor: 'green'
  },
  transfers: {
    id: 'transfers',
    title: 'LOGISTIQUE // CONVOIS & DEMANDES DE TRANSFERT',
    isOpen: false,
    isMinimized: false,
    x: 480,
    y: 80,
    width: 520,
    height: 500,
    defaultX: 480,
    defaultY: 80,
    defaultW: 520,
    defaultH: 500,
    zIndex: 31,
    accentColor: 'green'
  },
  reservations: {
    id: 'reservations',
    title: 'ALLOCATION // RESERVATION LOCALE D\'URGENCE',
    isOpen: false,
    isMinimized: false,
    x: 360,
    y: 110,
    width: 480,
    height: 460,
    defaultX: 360,
    defaultY: 110,
    defaultW: 480,
    defaultH: 460,
    zIndex: 32,
    accentColor: 'green'
  },
  calendar: {
    id: 'calendar',
    title: 'PLANIFICATION // CALENDRIER OPERATIONNEL DE CRISE',
    isOpen: false,
    isMinimized: false,
    x: 280,
    y: 70,
    width: 600,
    height: 520,
    defaultX: 280,
    defaultY: 70,
    defaultW: 600,
    defaultH: 520,
    zIndex: 33,
    accentColor: 'green'
  },
  alerts: {
    id: 'alerts',
    title: 'RADAR // FLUX D\'ALERTES TACTIQUES',
    isOpen: false,
    isMinimized: false,
    x: 20,
    y: 55,
    width: 420,
    height: 380,
    defaultX: 20,
    defaultY: 55,
    defaultW: 420,
    defaultH: 380,
    zIndex: 34,
    accentColor: 'amber'
  }
};

@Injectable({
  providedIn: 'root'
})
export class HudWindowService {
  private currentZIndex = 40;
  readonly windows = signal<Record<string, WindowState>>(this.loadInitialState());

  private loadInitialState(): Record<string, WindowState> {
    const clone: Record<string, WindowState> = {};
    for (const key of Object.keys(DEFAULT_WINDOWS)) {
      clone[key] = { ...DEFAULT_WINDOWS[key] };
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('kaiju_hud_windows_v1');
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
        window.localStorage.setItem('kaiju_hud_windows_v1', JSON.stringify(toSave));
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
      window.localStorage.removeItem('kaiju_hud_windows_v1');
    }
    const resetMap: Record<string, WindowState> = {};
    for (const key of Object.keys(DEFAULT_WINDOWS)) {
      const def = DEFAULT_WINDOWS[key];
      resetMap[key] = {
        ...def,
        x: def.defaultX,
        y: def.defaultY,
        width: def.defaultW,
        height: def.defaultH,
        isOpen: false,
        zIndex: 30
      };
    }
    this.windows.set(resetMap);
  }
}
