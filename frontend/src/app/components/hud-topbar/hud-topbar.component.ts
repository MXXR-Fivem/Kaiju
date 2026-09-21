import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrisisContextService, PRESET_OPERATORS } from '../../services/crisis-context.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { HudWindowService } from '../../services/hud-window.service';

@Component({
  selector: 'app-hud-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="fixed top-0 left-0 right-0 h-12 bg-black/95 border-b border-zinc-800 z-50 px-3 flex items-center justify-between text-xs font-mono select-none">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 bg-green-500 animate-pulse"></span>
          <span class="font-bold tracking-widest text-white uppercase text-sm">KAIJU</span>
          <span class="text-[10px] text-zinc-500">// TOKYORK HUD</span>
        </div>

        <div class="h-4 w-px bg-zinc-800"></div>

        <div class="px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider"
             [ngClass]="getDefconClass()">
          DEFCON {{ context.activeDisasterLevel() }} // {{ getDefconLabel() }}
        </div>

        <div class="text-[10px] text-zinc-400 tracking-widest hidden lg:block">
          {{ zuluTime }}
        </div>

        <div class="flex items-center gap-1 text-[10px]"
             [ngClass]="ws.isConnected() ? 'text-green-500' : 'text-red-500'">
          <span>[{{ ws.isConnected() ? 'LINK OK' : 'LINK DOWN' }}]</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button (click)="hud.toggle('inventory')"
                [ngClass]="isWindowOpen('inventory') ? 'bg-green-500 text-black border-green-500' : 'bg-black text-zinc-400 border-zinc-800 hover:border-green-500 hover:text-green-400'"
                class="px-2.5 py-1 border text-[11px] font-bold tracking-wider uppercase transition-colors">
          [STOCKS]
        </button>

        <button (click)="hud.toggle('transfers')"
                [ngClass]="isWindowOpen('transfers') ? 'bg-green-500 text-black border-green-500' : 'bg-black text-zinc-400 border-zinc-800 hover:border-green-500 hover:text-green-400'"
                class="px-2.5 py-1 border text-[11px] font-bold tracking-wider uppercase transition-colors">
          [TRANSFERTS]
        </button>

        <button (click)="hud.toggle('reservations')"
                [ngClass]="isWindowOpen('reservations') ? 'bg-green-500 text-black border-green-500' : 'bg-black text-zinc-400 border-zinc-800 hover:border-green-500 hover:text-green-400'"
                class="px-2.5 py-1 border text-[11px] font-bold tracking-wider uppercase transition-colors">
          [RESERVATIONS]
        </button>

        <button (click)="hud.toggle('calendar')"
                [ngClass]="isWindowOpen('calendar') ? 'bg-green-500 text-black border-green-500' : 'bg-black text-zinc-400 border-zinc-800 hover:border-green-500 hover:text-green-400'"
                class="px-2.5 py-1 border text-[11px] font-bold tracking-wider uppercase transition-colors">
          [CALENDRIER]
        </button>

        <button (click)="hud.toggle('alerts')"
                [ngClass]="isWindowOpen('alerts') ? 'bg-amber-500 text-black border-amber-500' : 'bg-black text-amber-500/80 border-zinc-800 hover:border-amber-500 hover:text-amber-400'"
                class="px-2.5 py-1 border text-[11px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1">
          <span>[ALERTES]</span>
          <span *ngIf="ws.alerts().length > 0" class="text-[9px] px-1 bg-amber-500/20 text-amber-300">
            {{ ws.alerts().length }}
          </span>
        </button>

        <div class="h-4 w-px bg-zinc-800 mx-1"></div>

        <button (click)="hud.resetLayout()"
                title="Reinitialiser la disposition des fenetres tactiques"
                class="px-2 py-1 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white text-[10px] uppercase tracking-wider transition-colors">
          [RESET HUD]
        </button>
      </div>

      <div class="flex items-center gap-2">
        <select [value]="context.currentUser().id"
                (change)="onOperatorChange($event)"
                class="bg-black border border-zinc-700 text-green-400 text-[11px] px-2 py-0.5 tracking-wider focus:outline-none focus:border-green-500">
          <option *ngFor="let op of operators" [value]="op.id">
            [{{ op.role }}] {{ op.name }} {{ op.districtCode ? '(' + op.districtCode + ')' : '(QG)' }}
          </option>
        </select>
      </div>
    </header>
  `
})
export class HudTopbarComponent implements OnInit, OnDestroy {
  context = inject(CrisisContextService);
  ws = inject(KaijuWsService);
  hud = inject(HudWindowService);

  operators = PRESET_OPERATORS;
  zuluTime = '';
  private timer: any;

  ngOnInit(): void {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private updateClock(): void {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.zuluTime = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
  }

  isWindowOpen(id: string): boolean {
    return !!this.hud.windows()[id]?.isOpen;
  }

  onOperatorChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    const found = this.operators.find((o) => o.id === val);
    if (found) {
      this.context.setUser(found);
    }
  }

  getDefconClass(): string {
    const lvl = this.context.activeDisasterLevel();
    if (lvl >= 5) return 'border-red-500 text-red-400 bg-red-950/60 animate-pulse';
    if (lvl === 4) return 'border-red-600 text-red-500 bg-red-950/30';
    if (lvl === 3) return 'border-amber-500 text-amber-400 bg-amber-950/30';
    if (lvl === 2) return 'border-amber-600 text-amber-500 bg-amber-950/20';
    return 'border-green-600 text-green-400 bg-green-950/20';
  }

  getDefconLabel(): string {
    const lvl = this.context.activeDisasterLevel();
    if (lvl >= 5) return 'IMPACT KAIJU ABSOLU';
    if (lvl === 4) return 'TRANSIT OBLIGATOIRE';
    if (lvl === 3) return 'CRISE CRITIQUE';
    if (lvl === 2) return 'PRE-ALERTE';
    return 'NOMINAL';
  }
}
