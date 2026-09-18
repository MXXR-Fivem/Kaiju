import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { District, ResourceType, DistrictResourceDetail } from '../../models/kaiju.models';

@Component({
  selector: 'app-transfer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="context.isTransferModalOpen()" 
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div class="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-mono text-xs text-slate-200">
        <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sky-400 font-bold">[LOG]</span>
            <h3 class="font-bold text-sm text-white">Ordre de Transfert Logistique Inter-Quartiers</h3>
          </div>
          <button (click)="context.isTransferModalOpen.set(false)" class="text-slate-400 hover:text-white text-base">X</button>
        </div>

        <form (ngSubmit)="submitTransfer()" class="p-5 space-y-4">
          <div *ngIf="errorMessage" class="p-3 rounded bg-red-950/80 border border-red-600 text-red-200 space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <span>[REFUS]</span>
              <span>Refus Moteur de Regles [Code: {{ errorCode }}]</span>
            </div>
            <p class="text-[11px] leading-relaxed">{{ errorMessage }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">Quartier Source :</label>
              <select [(ngModel)]="sourceDistrict" name="source" (change)="onSourceChange()"
                      class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sky-300 focus:outline-none focus:border-sky-500">
                <option *ngFor="let d of districts" [value]="d.code">
                  {{ d.name }} ({{ d.code }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Quartier Destination :</label>
              <select [(ngModel)]="targetDistrict" name="target"
                      class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-emerald-300 focus:outline-none focus:border-sky-500">
                <option *ngFor="let d of districts" [value]="d.code" [disabled]="d.code === sourceDistrict">
                  {{ d.name }} ({{ d.code }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Ressource Strategique :</label>
            <select [(ngModel)]="selectedResource" name="resource" (change)="onResourceChange()"
                    class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-sky-500">
              <option *ngFor="let r of resourceTypes" [value]="r.code">
                {{ r.name }} ({{ r.unit }})
              </option>
            </select>
          </div>

          <div *ngIf="selectedStock" class="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
            <div class="flex justify-between text-slate-300">
              <span>Stock Actuel : <strong>{{ selectedStock.current_quantity }} {{ selectedStock.unit }}</strong></span>
              <span>Seuil Legal ({{ selectedStock.min_retention_pct * 100 }}%) : <strong class="text-amber-400">{{ selectedStock.min_retained_quantity }}</strong></span>
            </div>
            <div class="flex justify-between text-sky-400">
              <span>Quantite Transferable Maximale :</span>
              <strong class="text-emerald-400 text-xs">{{ selectedStock.transferable_quantity }} {{ selectedStock.unit }}</strong>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 mb-1">Quantite Demandee :</label>
              <input type="number" [(ngModel)]="quantity" name="qty" min="1" required
                     class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold focus:outline-none focus:border-sky-500" />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Voie de Transit :</label>
              <select [(ngModel)]="routeType" name="route"
                      class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-amber-300 focus:outline-none focus:border-sky-500">
                <option value="LAND">Terrestre (Standard)</option>
                <option value="SEA">Maritime (Baie - Temps x2)</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" (click)="context.isTransferModalOpen.set(false)"
                    class="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
              Annuler
            </button>
            <button type="submit" [disabled]="isSubmitting"
                    class="px-5 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg transition">
              {{ isSubmitting ? 'Validation...' : 'Lancer le Transfert' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class TransferModalComponent implements OnInit {
  api = inject(KaijuApiService);
  context = inject(CrisisContextService);

  districts: District[] = [];
  resourceTypes: ResourceType[] = [];
  inventory: DistrictResourceDetail[] = [];

  sourceDistrict = 'X';
  targetDistrict = 'A';
  selectedResource = 'WATER';
  quantity = 100;
  routeType = 'LAND';

  selectedStock: DistrictResourceDetail | null = null;
  errorMessage: string | null = null;
  errorCode: string | null = null;
  isSubmitting = false;

  ngOnInit(): void {
    this.api.getDistricts().subscribe((d) => {
      this.districts = d;
    });
    this.api.getResourceTypes().subscribe((r) => {
      this.resourceTypes = r;
    });
    this.loadInventory();
  }

  loadInventory(): void {
    this.api.getInventory().subscribe((inv) => {
      this.inventory = inv;
      this.updateSelectedStock();
    });
  }

  onSourceChange(): void {
    this.updateSelectedStock();
  }

  onResourceChange(): void {
    this.updateSelectedStock();
  }

  private updateSelectedStock(): void {
    this.selectedStock = this.inventory.find(
      (i) => i.district_code === this.sourceDistrict && i.resource_code === this.selectedResource
    ) || null;
  }

  submitTransfer(): void {
    this.errorMessage = null;
    this.errorCode = null;
    this.isSubmitting = true;

    this.api.createTransfer({
      requester_id: this.context.currentUser().id,
      source_district: this.sourceDistrict,
      target_district: this.targetDistrict,
      resource_code: this.selectedResource,
      quantity: this.quantity,
      route_type: this.routeType
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.context.isTransferModalOpen.set(false);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorCode = err.error?.error_code || 'HTTP_' + err.status;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation du transfert.';
      }
    });
  }
}
