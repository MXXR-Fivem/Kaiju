import { Component, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { KaijuWsService } from '../../services/kaiju-ws.service';

@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  imports: [DatePipe, NgClass],
  template: `
    <div class="h-full flex flex-col font-mono text-xs space-y-2">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
        <span class="text-zinc-400 text-[10px] uppercase tracking-wider">Flux temps réel</span>
        @if (ws.alerts().length > 0) {
          <button class="hud-tab" (click)="ws.alerts.set([])">Effacer</button>
        }
      </div>
      <div class="flex-1 overflow-y-auto space-y-2 pr-1">
        @for (alert of ws.alerts(); track alert.id) {
          <div class="p-2 border space-y-1" [ngClass]="borderClass(alert.severity)" data-testid="alert">
            <div class="flex items-center justify-between">
              <span class="font-bold text-[11px] text-white uppercase">[{{ alert.severity }}] {{ alert.title }}</span>
              <button class="text-zinc-500 hover:text-white px-1" (click)="ws.dismissAlert(alert.id)">x</button>
            </div>
            <p class="text-[11px] text-zinc-300">{{ alert.message }}</p>
            <div class="text-[9px] text-zinc-500">{{ alert.timestamp | date: 'HH:mm:ss' }}</div>
          </div>
        } @empty {
          <p class="hud-empty">Aucune alerte.</p>
        }
      </div>
    </div>
  `
})
export class AlertsPanelComponent {
  ws = inject(KaijuWsService);

  borderClass(severity: string): string {
    if (severity === 'CRITICAL') return 'border-red-600 bg-red-950/20';
    if (severity === 'WARNING') return 'border-amber-600 bg-amber-950/20';
    return 'border-zinc-800 bg-zinc-950/40';
  }
}
