import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { HudWindowService } from '../../services/hud-window.service';
import { DistrictResourceDetail } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inventory-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col font-mono text-xs select-none space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div class="flex items-center gap-1.5">
          <span class="text-zinc-400 text-[10px] uppercase">SECTEUR :</span>
          <button (click)="selectedFilter = ''"
                  class="px-2 py-0.5 border text-[10px] uppercase transition-colors"
                  [ngClass]="selectedFilter === '' ? 'bg-green-500 text-black border-green-500 font-bold' : 'border-zinc-800 text-zinc-400 hover:text-white'">
            TOUS
          </button>
          <button *ngFor="let code of ['A', 'E', 'W', 'X', 'Z']"
                  (click)="selectedFilter = code"
                  class="px-2 py-0.5 border text-[10px] uppercase transition-colors"
                  [ngClass]="selectedFilter === code ? 'bg-green-500 text-black border-green-500 font-bold' : 'border-zinc-800 text-zinc-400 hover:text-white'">
            [{{ code }}]
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="loadInventory()"
                  class="px-2 py-0.5 border border-zinc-800 hover:border-zinc-500 text-zinc-400 hover:text-white text-[10px] uppercase">
            RAFRAICHIR
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto pr-1">
        <table class="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr class="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-wider">
              <th class="py-1.5 px-2">SECTEUR</th>
              <th class="py-1.5 px-2">RESSOURCE</th>
              <th class="py-1.5 px-2 text-right">INIT</th>
              <th class="py-1.5 px-2 text-right">DISPO</th>
              <th class="py-1.5 px-2 text-right">RES</th>
              <th class="py-1.5 px-2 text-right">SEUIL</th>
              <th class="py-1.5 px-2 text-right">TRANSFERABLE</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-900">
            <tr *ngFor="let item of filteredInventory"
                class="hover:bg-zinc-900/60 transition-colors">
              <td class="py-1.5 px-2 font-bold text-white">
                [{{ item.district_code }}]
              </td>
              <td class="py-1.5 px-2">
                <div class="font-bold text-zinc-200">{{ item.resource_name }}</div>
                <div class="text-[9px] text-zinc-500 uppercase">{{ item.resource_code }} // {{ item.unit }}</div>
              </td>
              <td class="py-1.5 px-2 text-right text-zinc-500">
                {{ item.initial_quantity }}
              </td>
              <td class="py-1.5 px-2 text-right font-bold"
                  [ngClass]="item.current_quantity > getMinRetention(item) ? 'text-green-400' : 'text-amber-400'">
                {{ item.current_quantity }}
              </td>
              <td class="py-1.5 px-2 text-right text-zinc-400">
                {{ item.reserved_quantity }}
              </td>
              <td class="py-1.5 px-2 text-right text-zinc-400">
                {{ getMinRetention(item) }}
                <span class="text-[9px] text-zinc-600">({{ (item.min_retention_pct * 100) | number:'1.0-0' }}%)</span>
              </td>
              <td class="py-1.5 px-2 text-right font-bold"
                  [ngClass]="getTransferable(item) > 0 ? 'text-green-500' : 'text-red-500'">
                {{ getTransferable(item) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class InventoryPanelComponent implements OnInit, OnDestroy {
  context = inject(CrisisContextService);
  hud = inject(HudWindowService);
  private api = inject(KaijuApiService);
  private ws = inject(KaijuWsService);

  inventory: DistrictResourceDetail[] = [];
  selectedFilter = '';
  private subs = new Subscription();

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
      next: (data) => {
        this.inventory = data;
      },
      error: () => {}
    });
  }

  get filteredInventory(): DistrictResourceDetail[] {
    const filter = this.selectedFilter || this.context.selectedDistrictCode();
    if (!filter) return this.inventory;
    return this.inventory.filter((item) => item.district_code === filter);
  }

  getMinRetention(item: DistrictResourceDetail): number {
    return Math.ceil(item.initial_quantity * item.min_retention_pct);
  }

  getTransferable(item: DistrictResourceDetail): number {
    const min = this.getMinRetention(item);
    const avail = item.current_quantity - item.reserved_quantity;
    return Math.max(0, avail - min);
  }
}
