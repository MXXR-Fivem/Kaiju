import { Injectable, computed, signal } from '@angular/core';
import { TacticalLayer, UserRole } from '../models/kaiju.models';

export interface TacticalUser {
  id: string;
  name: string;
  role: UserRole;
  districtCode?: string;
}

export const PRESET_OPERATORS: TacticalUser[] = [
  { id: 'user_cd', name: 'Cmdt. Vance', role: 'CD' },
  { id: 'user_lc', name: 'Maj. Thorne', role: 'LC' },
  { id: 'user_qc_x', name: 'Capt. Mori', role: 'QC', districtCode: 'X' },
  { id: 'user_qc_a', name: 'Capt. Reyes', role: 'QC', districtCode: 'A' },
  { id: 'user_qc_e', name: 'Lt. Chen', role: 'QC', districtCode: 'E' },
  { id: 'user_qc_w', name: 'Sgt. Kowalski', role: 'QC', districtCode: 'W' },
  { id: 'user_qc_z', name: 'Dr. Al-Mansoor', role: 'QC', districtCode: 'Z' },
];

@Injectable({
  providedIn: 'root'
})
export class CrisisContextService {
  readonly currentUser = signal<TacticalUser>(PRESET_OPERATORS[0]);
  readonly activeDisasterLevel = signal<number>(1);
  readonly selectedDistrictCode = signal<string | null>(null);
  readonly activeTacticalLayer = signal<TacticalLayer>('GLOBAL');

  readonly isTransferModalOpen = signal<boolean>(false);
  readonly isReserveModalOpen = signal<boolean>(false);
  readonly isInventoryModalOpen = signal<boolean>(false);
  readonly isCalendarModalOpen = signal<boolean>(false);

  readonly isCD = computed(() => this.currentUser().role === 'CD');
  readonly isLC = computed(() => this.currentUser().role === 'LC');
  readonly isQC = computed(() => this.currentUser().role === 'QC');

  readonly crisisThemeClass = computed(() => {
    const lvl = this.activeDisasterLevel();
    switch (lvl) {
      case 5: return 'theme-disaster-5';
      case 4: return 'theme-disaster-4';
      case 3: return 'theme-disaster-3';
      case 2: return 'theme-disaster-2';
      default: return 'theme-disaster-1';
    }
  });

  setUser(user: TacticalUser): void {
    this.currentUser.set(user);
    if (user.districtCode) {
      this.selectedDistrictCode.set(user.districtCode);
    }
  }

  setDisasterLevel(level: number): void {
    this.activeDisasterLevel.set(Math.max(1, Math.min(5, level)));
  }

  selectDistrict(code: string | null): void {
    this.selectedDistrictCode.set(code);
  }

  setTacticalLayer(layer: TacticalLayer): void {
    this.activeTacticalLayer.set(layer);
  }
}
