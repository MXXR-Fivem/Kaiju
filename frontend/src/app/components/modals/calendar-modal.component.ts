import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrisisContextService } from '../../services/crisis-context.service';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { TransferRequestDetail } from '../../models/kaiju.models';

@Component({
  selector: 'app-calendar-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="context.isCalendarModalOpen()" 
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div class="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-slate-200 overflow-hidden">
        <!-- Entête -->
        <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sky-400 text-base">📅</span>
            <h3 class="font-bold text-sm text-white uppercase tracking-wider">Calendrier & Chronologie des Opérations de Crise</h3>
          </div>
          <button (click)="context.isCalendarModalOpen.set(false)" class="text-slate-400 hover:text-white text-base">✕</button>
        </div>

        <!-- Planning chronologique -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <div class="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span class="text-slate-400">Heure Opérationnelle Zoulou :</span>
            <span class="font-bold text-sky-400 text-sm tracking-widest">{{ currentTime }}</span>
          </div>

          <!-- Section Convois Logistiques Planifiés -->
          <div class="space-y-2">
            <h4 class="font-bold text-white uppercase text-[11px] tracking-wider text-amber-400">
              Convois Logistiques en Acheminement (Terre & Mer)
            </h4>

            <div *ngIf="transfers.length === 0" class="p-4 rounded bg-slate-950/60 border border-slate-800 text-slate-400 text-center">
              Aucun convoi actuellement planifié dans le couloir de Tokyork.
            </div>

            <div *ngFor="let t of transfers" class="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ t.route_type === 'SEA' ? '🚢' : '🚚' }}</span>
                  <strong class="text-white">{{ t.source_district_code }} ➔ {{ t.target_district_code }}</strong>
                  <span class="text-slate-400">({{ t.quantity }} {{ t.unit }} de {{ t.resource_name }})</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold" 
                      [ngClass]="t.status === 'IN_TRANSIT' ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-slate-800 text-slate-300'">
                  {{ t.status }}
                </span>
              </div>

              <div class="grid grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <div>Route : <strong class="text-slate-200">{{ t.route_type === 'SEA' ? 'Maritime (Temps x2)' : 'Terrestre' }}</strong></div>
                <div>Transit Xeno : <strong class="text-amber-300">{{ t.transit_district_code || 'Direct' }}</strong></div>
                <div>Durée estimée : <strong class="text-sky-300">{{ t.estimated_duration_minutes }} min</strong></div>
              </div>
            </div>
          </div>

          <!-- Section Rotations des Équipes de Secours -->
          <div class="space-y-2 pt-2">
            <h4 class="font-bold text-white uppercase text-[11px] tracking-wider text-sky-400">
              Rotations des Équipes & Postes Avancés
            </h4>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                <div class="font-bold text-white">Relève Secteur Xeno (Centre)</div>
                <div class="text-slate-400 text-[11px]">Équipes médicales et brigades de déblaiement</div>
                <div class="text-emerald-400 text-[10px]">Statut : Opérationnel H24</div>
              </div>
              <div class="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                <div class="font-bold text-white">Corridor Maritime Echo ↔ Zion</div>
                <div class="text-slate-400 text-[11px]">Vedettes côtières et barges de carburant</div>
                <div class="text-sky-400 text-[10px]">Statut : Fenêtre maritime ouverte</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pied -->
        <div class="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button (click)="context.isCalendarModalOpen.set(false)"
                  class="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">
            Fermer
          </button>
        </div>
      </div>
    </div>
  `
})
export class CalendarModalComponent implements OnInit {
  api = inject(KaijuApiService);
  context = inject(CrisisContextService);

  transfers: TransferRequestDetail[] = [];
  currentTime = '';

  ngOnInit(): void {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    this.api.getTransfers().subscribe({
      next: (list) => this.transfers = list
    });
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  }
}
