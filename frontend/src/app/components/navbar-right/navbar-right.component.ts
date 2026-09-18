import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { TransferRequestDetail } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar-right',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="w-96 h-full bg-slate-950/90 border-l border-slate-800/80 backdrop-blur-md flex flex-col justify-between p-4 text-slate-200 z-30 select-none shadow-2xl overflow-hidden">
      <!-- Section Haute : Actions et Convois en transit -->
      <div class="flex flex-col h-2/3 space-y-3 overflow-hidden">
        <!-- En-tête Logistique -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-amber-400">🚛</span>
            <h2 class="font-mono font-bold text-sm tracking-wide text-white uppercase">Flux & Convois</h2>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300">
            {{ transfers.length }} actifs
          </span>
        </div>

        <!-- Boutons d'Action selon le rôle -->
        <div class="grid grid-cols-2 gap-2">
          <button (click)="context.isTransferModalOpen.set(true)"
                  class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold shadow transition">
            <span>➕</span>
            <span>Transfert</span>
          </button>

          <button (click)="context.isReserveModalOpen.set(true)"
                  class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold shadow transition">
            <span>🔒</span>
            <span>Réserver</span>
          </button>
        </div>

        <!-- Bouton Prérogative CD : Dérogation 15% (Visible et actif seulement pour le CD en niveau 5) -->
        <div *ngIf="context.isCD()" class="pt-1">
          <button (click)="triggerRetentionOverride()"
                  [disabled]="context.activeDisasterLevel() < 5"
                  class="w-full py-2 px-3 rounded font-mono text-xs font-bold transition flex items-center justify-center gap-2 border"
                  [ngClass]="context.activeDisasterLevel() >= 5 
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 animate-bounce' 
                    : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'">
            <span>⚡</span>
            <span>Dérogation CD : Rétention à 15%</span>
          </button>
          <div class="text-[10px] text-slate-400 font-mono text-center mt-1">
            {{ context.activeDisasterLevel() >= 5 ? 'Autorisation débloquée : urgence absolue' : 'Verrouillé (Niveau 5 requis)' }}
          </div>
        </div>

        <!-- Liste déroulante des Convois -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
          <div *ngIf="transfers.length === 0" class="p-6 text-center text-xs font-mono text-slate-400">
            Aucun convoi logistique en cours.
          </div>

          <div *ngFor="let t of transfers" 
               class="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-2 text-xs font-mono transition hover:border-slate-700">
            <!-- Entête convoi -->
            <div class="flex items-center justify-between">
              <span class="font-bold text-white flex items-center gap-1.5">
                <span>{{ t.route_type === 'SEA' ? '🚢' : '🚚' }}</span>
                <span>{{ t.source_district_code }} → {{ t.target_district_code }}</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded font-bold" [ngClass]="getStatusBadgeClass(t.status)">
                {{ t.status }}
              </span>
            </div>

            <!-- Détail Ressource & Transit -->
            <div class="text-slate-300 flex items-center justify-between text-[11px]">
              <span>{{ t.quantity }} {{ t.unit }} ({{ t.resource_name }})</span>
              <span class="text-slate-400 text-[10px]">{{ t.estimated_duration_minutes }} min</span>
            </div>

            <!-- Si transit par Xeno -->
            <div *ngIf="t.transit_district_code" class="text-[10px] text-amber-400 flex items-center justify-between">
              <span>Transit obligatoire : <strong>{{ t.transit_district_code }}</strong></span>
              <span class="px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800 text-[9px]">
                {{ t.transit_approval_status }}
              </span>
            </div>

            <!-- Actions d'approbation pour LC ou CD si PENDING -->
            <div *ngIf="t.transit_approval_status === 'PENDING' && (context.isLC() || context.isCD())" 
                 class="pt-1 flex gap-2">
              <button (click)="approveTransit(t.id, true)"
                      class="flex-1 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold">
                Approuver Transit
              </button>
              <button (click)="approveTransit(t.id, false)"
                      class="flex-1 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold">
                Refuser
              </button>
            </div>

            <!-- Action de réception pour le destinataire ou officier -->
            <div *ngIf="t.status === 'IN_TRANSIT'" class="pt-1">
              <button (click)="deliverTransfer(t.id)"
                      class="w-full py-1 rounded bg-slate-800 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 text-[10px] font-bold transition">
                ✓ Confirmer Réception du Convoi
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Basse : Journal des Alertes Tactiques en Direct -->
      <div class="h-1/3 flex flex-col border-t border-slate-800 pt-3 space-y-2 overflow-hidden">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span class="font-mono text-xs font-bold uppercase text-slate-300">Journal d'Alerte Tactique</span>
          </div>
          <span class="text-[10px] font-mono text-slate-400">{{ ws.alerts().length }} msg</span>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div *ngIf="ws.alerts().length === 0" class="text-center text-xs font-mono text-slate-400 pt-4">
            Réseau calme. Aucune alerte critique.
          </div>

          <div *ngFor="let a of ws.alerts()" 
               class="p-2 rounded border text-xs font-mono space-y-1 relative"
               [ngClass]="getAlertClass(a.severity)">
            <div class="flex items-center justify-between">
              <strong class="font-bold">{{ a.title }}</strong>
              <button (click)="ws.dismissAlert(a.id)" class="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <p class="text-[11px] leading-tight opacity-90">{{ a.message }}</p>
          </div>
        </div>
      </div>
    </aside>
  `
})
export class NavbarRightComponent implements OnInit, OnDestroy {
  api = inject(KaijuApiService);
  ws = inject(KaijuWsService);
  context = inject(CrisisContextService);

  transfers: TransferRequestDetail[] = [];
  private subs: Subscription = new Subscription();

  ngOnInit(): void {
    this.loadTransfers();

    // Réception des événements en direct via WebSocket
    this.subs.add(
      this.ws.transferUpdates$.subscribe(() => {
        this.loadTransfers();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadTransfers(): void {
    this.api.getTransfers().subscribe({
      next: (list) => {
        this.transfers = list;
      },
      error: (err) => console.error('Erreur chargement transferts :', err)
    });
  }

  approveTransit(id: string, approved: boolean): void {
    const role = this.context.currentUser().role;
    this.api.reviewTransit(id, role, approved).subscribe({
      next: () => this.loadTransfers(),
      error: (err) => alert(err.error?.message || 'Erreur lors de la revue du transit.')
    });
  }

  deliverTransfer(id: string): void {
    this.api.completeDelivery(id).subscribe({
      next: () => this.loadTransfers(),
      error: (err) => alert(err.error?.message || 'Erreur confirmation livraison.')
    });
  }

  triggerRetentionOverride(): void {
    const target = this.context.currentUser().districtCode || 'X';
    this.api.overrideRetention({
      secret_password: 'kaiju-omega-protocol-2026',
      district_target: target,
      user_role: 'CD'
    }).subscribe({
      next: (res) => alert(`Dérogation accordée : Le seuil de ${target} a été abaissé à 15%.`),
      error: (err) => alert(err.error?.message || 'Action refusée.')
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DELIVERED': return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
      case 'IN_TRANSIT': return 'bg-sky-950 text-sky-300 border border-sky-800 animate-pulse';
      case 'PENDING': return 'bg-amber-950 text-amber-300 border border-amber-800';
      case 'REJECTED': return 'bg-red-950 text-red-300 border border-red-800';
      default: return 'bg-slate-800 text-slate-300';
    }
  }

  getAlertClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-950/80 border-red-600 text-red-200';
      case 'WARNING': return 'bg-amber-950/80 border-amber-600 text-amber-200';
      default: return 'bg-slate-900 border-slate-700 text-slate-300';
    }
  }
}
