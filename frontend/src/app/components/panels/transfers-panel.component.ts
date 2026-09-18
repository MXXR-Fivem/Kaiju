import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { TransferRequestDetail, District, ResourceType } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transfers-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col font-mono text-xs select-none space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div class="flex gap-1">
          <button (click)="activeTab = 'list'"
                  class="px-2.5 py-1 border text-[11px] uppercase transition-colors"
                  [ngClass]="activeTab === 'list' ? 'bg-green-500 text-black border-green-500 font-bold' : 'border-zinc-800 text-zinc-400 hover:text-white'">
            CONVOIS ACTIFS ({{ transfers.length }})
          </button>
          <button (click)="activeTab = 'create'"
                  class="px-2.5 py-1 border text-[11px] uppercase transition-colors"
                  [ngClass]="activeTab === 'create' ? 'bg-green-500 text-black border-green-500 font-bold' : 'border-zinc-800 text-zinc-400 hover:text-white'">
            + NOUVEL ORDRE
          </button>
        </div>

        <button *ngIf="context.isCD()"
                (click)="triggerRetentionOverride()"
                [disabled]="context.activeDisasterLevel() < 5"
                class="px-2 py-1 border text-[10px] uppercase font-bold tracking-wider transition-colors"
                [ngClass]="context.activeDisasterLevel() >= 5 
                  ? 'border-red-500 bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                  : 'border-zinc-800 text-zinc-600 cursor-not-allowed'">
          [CMD: RETENTION 15%]
        </button>
      </div>

      <div *ngIf="activeTab === 'list'" class="flex-1 overflow-y-auto space-y-2 pr-1">
        <div *ngIf="transfers.length === 0"
             class="p-6 text-center text-zinc-600 text-[11px] border border-dashed border-zinc-900">
          AUCUN CONVOI LOGISTIQUE EN COURS SUR LE RESEAU DE TOKYORK
        </div>

        <div *ngFor="let t of transfers"
             class="p-2.5 bg-black border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.2 border text-[9px] font-bold uppercase tracking-wider"
                    [ngClass]="t.route_type === 'SEA' ? 'border-sky-500 text-sky-400 bg-sky-950/30' : 'border-zinc-700 text-zinc-400'">
                [{{ t.route_type === 'SEA' ? 'MER x2' : 'TERRE' }}]
              </span>
              <span class="font-bold text-white text-xs">
                [{{ t.source_district_code }}] &rarr; [{{ t.target_district_code }}]
              </span>
              <span class="text-zinc-400 text-[11px]">
                {{ t.quantity }} {{ t.unit }} de {{ t.resource_name }}
              </span>
            </div>

            <span class="px-1.5 py-0.2 text-[9px] font-bold border uppercase"
                  [ngClass]="getStatusBadgeClass(t.status)">
              [{{ t.status }}]
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 text-[10px] text-zinc-500 border-t border-zinc-900 pt-1">
            <div>TRANSIT : <strong class="text-zinc-300">{{ t.transit_district_code || 'DIRECT' }}</strong></div>
            <div>DUREE : <strong class="text-zinc-300">{{ t.estimated_duration_minutes }} MIN</strong></div>
            <div>EXPEDITEUR : <strong class="text-zinc-300">{{ t.requester_name }}</strong></div>
          </div>

          <div *ngIf="t.transit_approval_status === 'PENDING' && (context.isLC() || context.isCD())"
               class="pt-1.5 flex gap-2 border-t border-zinc-900">
            <button (click)="reviewTransit(t.id, true)"
                    class="flex-1 py-1 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-bold uppercase text-[10px]">
              APPROUVER TRANSIT XENO
            </button>
            <button (click)="reviewTransit(t.id, false)"
                    class="py-1 px-3 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black uppercase text-[10px]">
              REFUSER
            </button>
          </div>

          <div *ngIf="t.status === 'IN_TRANSIT' && (context.isQC() || context.isCD())"
               class="pt-1.5 border-t border-zinc-900">
            <button (click)="completeDelivery(t.id)"
                    class="w-full py-1 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-bold uppercase text-[10px]">
              CONFIRMER RECEPTION DU CONVOI
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="activeTab === 'create'" class="flex-1 overflow-y-auto pr-1">
        <form (ngSubmit)="submitTransfer()" class="space-y-3">
          <div *ngIf="errorMessage" class="p-2.5 bg-red-950/60 border border-red-600 text-red-200 text-xs space-y-1">
            <div class="font-bold">[REFUS REGLE METIER : {{ errorCode }}]</div>
            <p class="text-[11px] leading-relaxed">{{ errorMessage }}</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-zinc-400 text-[10px] uppercase mb-1">QUARTIER SOURCE :</label>
              <select [(ngModel)]="sourceDistrict" name="src" (change)="onSourceChange()"
                      class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500">
                <option *ngFor="let d of districts" [value]="d.code">
                  [{{ d.code }}] {{ d.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-zinc-400 text-[10px] uppercase mb-1">DESTINATION :</label>
              <select [(ngModel)]="targetDistrict" name="dst"
                      class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500">
                <option *ngFor="let d of districts" [value]="d.code" [disabled]="d.code === sourceDistrict">
                  [{{ d.code }}] {{ d.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-zinc-400 text-[10px] uppercase mb-1">RESSOURCE :</label>
              <select [(ngModel)]="selectedResource" name="res" (change)="onResourceChange()"
                      class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500">
                <option *ngFor="let r of resourceTypes" [value]="r.code">
                  {{ r.name }} ({{ r.unit }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-zinc-400 text-[10px] uppercase mb-1">QUANTITE DEMANDEE :</label>
              <input type="number" [(ngModel)]="quantity" name="qty" min="1" required
                     class="w-full bg-black border border-zinc-700 text-white p-1.5 text-xs focus:outline-none focus:border-green-500" />
            </div>
          </div>

          <div class="p-2 bg-zinc-950 border border-zinc-800 text-[10px] flex items-center justify-between">
            <span class="text-zinc-500">STOCK TRANSFERABLE SUR [{{ sourceDistrict }}] :</span>
            <span class="font-bold text-green-400">{{ availableTransferable }}</span>
          </div>

          <div>
            <label class="block text-zinc-400 text-[10px] uppercase mb-1">VOIE D'ACHEMINEMENT :</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" (click)="routeType = 'LAND'"
                      class="py-1.5 border text-center text-xs font-bold uppercase transition-colors"
                      [ngClass]="routeType === 'LAND' ? 'bg-green-500 text-black border-green-500' : 'border-zinc-800 text-zinc-400 hover:text-white'">
                TERRESTRE (STANDARD)
              </button>
              <button type="button" (click)="routeType = 'SEA'"
                      class="py-1.5 border text-center text-xs font-bold uppercase transition-colors"
                      [ngClass]="routeType === 'SEA' ? 'bg-sky-500 text-black border-sky-500' : 'border-zinc-800 text-zinc-400 hover:text-white'">
                MARITIME (TEMPS x2)
              </button>
            </div>
          </div>

          <button type="submit" [disabled]="isSubmitting"
                  class="w-full py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-bold uppercase tracking-wider text-xs transition-colors">
            {{ isSubmitting ? 'VERIFICATION DES REGLES...' : 'TRANSMETTRE ORDRE DE CONVOI' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class TransfersPanelComponent implements OnInit, OnDestroy {
  context = inject(CrisisContextService);
  private api = inject(KaijuApiService);
  private ws = inject(KaijuWsService);

  activeTab: 'list' | 'create' = 'list';
  transfers: TransferRequestDetail[] = [];
  districts: District[] = [];
  resourceTypes: ResourceType[] = [];

  sourceDistrict = 'X';
  targetDistrict = 'A';
  selectedResource = 'WATER';
  quantity = 100;
  routeType: 'LAND' | 'SEA' = 'LAND';
  availableTransferable = 0;

  isSubmitting = false;
  errorMessage = '';
  errorCode = '';

  private subs = new Subscription();

  ngOnInit(): void {
    this.loadData();

    this.subs.add(
      this.ws.transferUpdates$.subscribe(() => {
        this.loadTransfers();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadData(): void {
    this.loadTransfers();
    this.api.getDistricts().subscribe((d) => (this.districts = d));
    this.api.getResourceTypes().subscribe((r) => {
      this.resourceTypes = r;
      this.checkAvailableTransferable();
    });
  }

  loadTransfers(): void {
    this.api.getTransfers().subscribe((t) => (this.transfers = t));
  }

  onSourceChange(): void {
    if (this.sourceDistrict === this.targetDistrict) {
      this.targetDistrict = this.sourceDistrict === 'A' ? 'X' : 'A';
    }
    this.checkAvailableTransferable();
  }

  onResourceChange(): void {
    this.checkAvailableTransferable();
  }

  checkAvailableTransferable(): void {
    this.api.getInventory(this.sourceDistrict).subscribe((inv) => {
      const match = inv.find((i) => i.resource_code === this.selectedResource);
      if (match) {
        const minRetention = Math.ceil(match.initial_quantity * match.min_retention_pct);
        const avail = match.current_quantity - match.reserved_quantity;
        this.availableTransferable = Math.max(0, avail - minRetention);
      } else {
        this.availableTransferable = 0;
      }
    });
  }

  submitTransfer(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.errorCode = '';

    const payload = {
      requester_id: this.context.currentUser().id,
      source_district: this.sourceDistrict,
      target_district: this.targetDistrict,
      resource_code: this.selectedResource,
      quantity: this.quantity,
      route_type: this.routeType
    };

    this.api.createTransfer(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.activeTab = 'list';
        this.loadTransfers();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorCode = err.error?.error_code || 'ERREUR';
        this.errorMessage = err.error?.message || 'Erreur inconnue de transfert.';
      }
    });
  }

  reviewTransit(id: string, approved: boolean): void {
    this.api.reviewTransit(id, this.context.currentUser().role, approved).subscribe({
      next: () => this.loadTransfers()
    });
  }

  completeDelivery(id: string): void {
    this.api.completeDelivery(id).subscribe({
      next: () => this.loadTransfers()
    });
  }

  triggerRetentionOverride(): void {
    const pwd = 'kaiju-omega-protocol-2026';
    const target = this.context.currentUser().districtCode || 'X';
    this.api.overrideRetention({
      secret_password: pwd,
      district_target: target,
      user_role: 'CD'
    }).subscribe({
      next: () => {
        this.checkAvailableTransferable();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'IN_TRANSIT') return 'border-sky-500 text-sky-400 bg-sky-950/40';
    if (status === 'DELIVERED') return 'border-green-500 text-green-400 bg-green-950/40';
    if (status === 'PENDING') return 'border-amber-500 text-amber-400 bg-amber-950/40';
    return 'border-red-500 text-red-400 bg-red-950/40';
  }
}
