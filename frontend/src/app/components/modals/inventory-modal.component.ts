import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { DistrictResourceDetail } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inventory-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="context.isInventoryModalOpen()" 
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div class="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-slate-200 overflow-hidden">
        <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sky-400 font-bold">[STOCK]</span>
            <h3 class="font-bold text-sm text-white uppercase tracking-wider">Etat des Reserves Strategiques de Tokyork (10 Ressources)</h3>
          </div>
          <button (click)="context.isInventoryModalOpen.set(false)" class="text-slate-400 hover:text-white text-base">X</button>
        </div>

        <div class="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Filtrer par Quartier :</span>
            <div class="flex gap-1">
              <button (click)="selectedFilter = ''" 
                      class="px-2.5 py-1 rounded border text-[11px]"
                      [ngClass]="selectedFilter === '' ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'">
                Tous
              </button>
              <button *ngFor="let code of ['A', 'E', 'W', 'X', 'Z']"
                      (click)="selectedFilter = code"
                      class="px-2 py-1 rounded border text-[11px]"
                      [ngClass]="selectedFilter === code ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'">
                {{ code }}
              </button>
            </div>
          </div>
          <span class="text-[11px] text-slate-400">
            Mise a jour en direct par WebSocket
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 text-[11px]">
                <th class="py-2 px-3">Secteur</th>
                <th class="py-2 px-3">Ressource</th>
                <th class="py-2 px-3 text-right">Stock Initial</th>
                <th class="py-2 px-3 text-right">Disponible</th>
                <th class="py-2 px-3 text-right">Reserve</th>
                <th class="py-2 px-3 text-right">Seuil Legal</th>
                <th class="py-2 px-3 text-right">Transferable</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of filteredInventory()" 
                  class="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                <td class="py-2 px-3 font-bold text-white">
                  <span class="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 mr-1.5">{{ item.district_code }}</span>
                  <span class="text-slate-300">{{ item.district_name.split(' ')[0] }}</span>
                </td>
                <td class="py-2 px-3 text-slate-200">
                  {{ item.resource_name }}
                  <span class="text-[10px] text-slate-400">({{ item.unit }})</span>
                </td>
                <td class="py-2 px-3 text-right text-slate-400">{{ item.initial_quantity }}</td>
                <td class="py-2 px-3 text-right font-bold" 
                    [ngClass]="item.available_quantity <= item.min_retained_quantity ? 'text-red-400' : 'text-emerald-400'">
                  {{ item.available_quantity }}
                </td>
                <td class="py-2 px-3 text-right text-amber-400">{{ item.reserved_quantity }}</td>
                <td class="py-2 px-3 text-right text-slate-400">
                  {{ item.min_retained_quantity }}
                  <span class="text-[9px] text-slate-400">({{ item.min_retention_pct * 100 }}%)</span>
                </td>
                <td class="py-2 px-3 text-right font-bold text-sky-400">
                  {{ item.transferable_quantity }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button (click)="context.isInventoryModalOpen.set(false)"
                  class="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">
            Fermer
          </button>
        </div>
      </div>
    </div>
  `
})
export class InventoryModalComponent implements OnInit, OnDestroy {
  api = inject(KaijuApiService);
  ws = inject(KaijuWsService);
  context = inject(CrisisContextService);

  inventory: DistrictResourceDetail[] = [];
  selectedFilter = '';
  private subs: Subscription = new Subscription();

  ngOnInit(): void {
    this.loadInventory();

    this.subs.add(
      this.ws.resourceUpdates$.subscribe(() => {
        this.loadInventory();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadInventory(): void {
    this.api.getInventory().subscribe({
      next: (inv) => this.inventory = inv,
      error: () => {}
    });
  }

  filteredInventory(): DistrictResourceDetail[] {
    if (!this.selectedFilter) return this.inventory;
    return this.inventory.filter((i) => i.district_code === this.selectedFilter);
  }
}
