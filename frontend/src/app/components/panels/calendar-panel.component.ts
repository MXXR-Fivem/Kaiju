import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrisisContextService } from '../../services/crisis-context.service';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { TransferRequestDetail } from '../../models/kaiju.models';

@Component({
  selector: 'app-calendar-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col font-mono text-xs select-none space-y-3">
      <div class="p-2 bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px]">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 bg-green-500 animate-ping"></span>
          <span class="text-zinc-400 uppercase">SYNCHRONISATION STRATEGIQUE :</span>
        </div>
        <span class="font-bold text-green-400 tracking-widest">{{ currentTime }}</span>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1">
        <div>
          <div class="text-[10px] text-zinc-500 uppercase tracking-wider pb-1 mb-2 border-b border-zinc-900">
            CHRONOLOGIE DES CONVOIS LOGISTIQUES
          </div>

          <div *ngIf="transfers.length === 0"
               class="p-4 text-center text-zinc-600 text-[11px] border border-dashed border-zinc-900">
            AUCUN CONVOI PLANIFIE DANS LE COULOIR DE TOKYORK
          </div>

          <div class="space-y-2">
            <div *ngFor="let t of transfers" class="p-2 bg-black border border-zinc-800 space-y-1.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="px-1 border text-[9px] uppercase font-bold"
                        [ngClass]="t.route_type === 'SEA' ? 'border-sky-500 text-sky-400' : 'border-zinc-700 text-zinc-300'">
                    [{{ t.route_type === 'SEA' ? 'MER' : 'TERRE' }}]
                  </span>
                  <strong class="text-white text-xs">
                    [{{ t.source_district_code }}] &rarr; [{{ t.target_district_code }}]
                  </strong>
                  <span class="text-zinc-400">
                    ({{ t.quantity }} {{ t.unit }} {{ t.resource_name }})
                  </span>
                </div>

                <span class="text-[9px] px-1.5 py-0.2 border uppercase font-bold"
                      [ngClass]="t.status === 'IN_TRANSIT' ? 'border-sky-500 text-sky-400 bg-sky-950/40' : 'border-zinc-800 text-zinc-400'">
                  {{ t.status }}
                </span>
              </div>

              <div class="grid grid-cols-3 gap-2 text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                <div>ROUTE : <strong class="text-zinc-300">{{ t.route_type === 'SEA' ? 'MARITIME (TEMPS x2)' : 'TERRESTRE' }}</strong></div>
                <div>TRANSIT : <strong class="text-zinc-300">{{ t.transit_district_code || 'DIRECT' }}</strong></div>
                <div>DUREE EST. : <strong class="text-green-400">{{ t.estimated_duration_minutes }} MIN</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] text-zinc-500 uppercase tracking-wider pb-1 mb-2 border-b border-zinc-900">
            PROTOCOLES CRITIQUES PAR NIVEAU
          </div>

          <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div class="p-2 bg-zinc-950 border border-zinc-800 space-y-0.5">
              <span class="text-amber-400 font-bold">[NIVEAU 3]</span>
              <p class="text-zinc-400">Deblocage des transferts directs entre quartiers adjacents.</p>
            </div>
            <div class="p-2 bg-zinc-950 border border-zinc-800 space-y-0.5">
              <span class="text-amber-500 font-bold">[NIVEAU 4]</span>
              <p class="text-zinc-400">Deblocage des transits etendus via le carrefour Xeno (approbation LC requise).</p>
            </div>
            <div class="p-2 bg-zinc-950 border border-zinc-800 space-y-0.5 col-span-2">
              <span class="text-red-500 font-bold">[NIVEAU 5]</span>
              <p class="text-zinc-400">Autorisation exceptionnelle City Director (CD) : retention abaissee a 15%.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CalendarPanelComponent implements OnInit {
  context = inject(CrisisContextService);
  private api = inject(KaijuApiService);

  transfers: TransferRequestDetail[] = [];
  currentTime = '';

  ngOnInit(): void {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    this.api.getTransfers().subscribe((t) => (this.transfers = t));
  }

  private updateTime(): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.currentTime = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC (ZULU)`;
  }
}
