import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { TacticalAlert } from '../../models/kaiju.models';

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col font-mono text-xs select-none">
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 bg-amber-500 animate-pulse"></span>
          <span class="text-zinc-400 text-[10px] uppercase tracking-wider">FLUX TEMPS REEL // WEBSOCKET</span>
        </div>
        <button *ngIf="ws.alerts().length > 0"
                (click)="clearAlerts()"
                class="px-2 py-0.5 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white text-[10px] uppercase">
          EFFACER TOUT
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-2 pr-1">
        <div *ngIf="ws.alerts().length === 0"
             class="p-6 text-center text-zinc-600 text-[11px] border border-dashed border-zinc-900">
          AUCUNE ALERTE ACTIVE SUR LE RESEAU DE TOKYORK
        </div>

        <div *ngFor="let a of ws.alerts()"
             class="p-2.5 bg-black border text-left space-y-1 relative"
             [ngClass]="getAlertBorderClass(a.severity)">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider"
                    [ngClass]="getBadgeClass(a.severity)">
                [{{ a.severity }}]
              </span>
              <span class="font-bold text-[11px] text-white tracking-wide uppercase">{{ a.title }}</span>
            </div>
            <button (click)="ws.dismissAlert(a.id)"
                    class="text-zinc-500 hover:text-white text-[11px] px-1">
              x
            </button>
          </div>

          <p class="text-[11px] text-zinc-300 leading-snug">
            {{ a.message }}
          </p>

          <div class="text-[9px] text-zinc-500 pt-1 flex items-center justify-between">
            <span>HORODATAGE : {{ formatTime(a.timestamp) }}</span>
            <span class="text-green-500">[VERIFIE]</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AlertsPanelComponent {
  ws = inject(KaijuWsService);

  getAlertBorderClass(sev: string): string {
    if (sev === 'CRITICAL') return 'border-red-600 bg-red-950/20';
    if (sev === 'WARNING') return 'border-amber-600 bg-amber-950/20';
    return 'border-zinc-800 bg-zinc-950/40';
  }

  getBadgeClass(sev: string): string {
    if (sev === 'CRITICAL') return 'bg-red-900 text-red-200 border border-red-700';
    if (sev === 'WARNING') return 'bg-amber-900 text-amber-200 border border-amber-700';
    return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
  }

  formatTime(date: Date): string {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  clearAlerts(): void {
    this.ws.alerts.set([]);
  }
}
