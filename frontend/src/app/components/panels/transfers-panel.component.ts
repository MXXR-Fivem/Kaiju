import { Component, computed, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { KaijuApiService, describeError } from '../../services/kaiju-api.service';
import { DISTRICT_CODES, Route, Transfer } from '../../models/kaiju.models';

@Component({
  selector: 'app-transfers-panel',
  standalone: true,
  imports: [DatePipe, FormsModule, NgClass],
  template: `
    <div class="h-full flex flex-col font-mono text-xs space-y-3">
      <div class="flex gap-1 pb-2 border-b border-zinc-800">
        <button class="hud-tab" [class.hud-tab-active]="tab === 'list'" (click)="tab = 'list'">
          Convois ({{ context.transfers().length }})
        </button>
        <button class="hud-tab" [class.hud-tab-active]="tab === 'create'" (click)="tab = 'create'">+ Nouvelle demande</button>
      </div>

      @if (error) {
        <div class="hud-error" role="alert" data-testid="transfer-error">{{ error }}</div>
      }

      @if (tab === 'list') {
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          @for (t of context.transfers(); track t.id) {
            <div class="hud-card" data-testid="transfer-card">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">
                  [{{ t.source_code }}] → {{ t.transit_code ? '[' + t.transit_code + '] → ' : '' }}[{{ t.target_code }}]
                  <span class="text-zinc-400 font-normal">{{ t.quantity }} × {{ t.resource_name }}</span>
                </span>
                <span class="px-1.5 border text-[9px] font-bold" [ngClass]="statusClass(t)">{{ t.status }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                <span>{{ t.route === 'SEA' ? 'Maritime (×2)' : 'Terrestre' }} · {{ t.duration_minutes }} min</span>
                <span>{{ t.is_requisition ? 'Réquisition' : 'Par ' + t.requester_name }}</span>
                <span>
                  @if (t.status === 'PENDING') {
                    Source {{ t.source_approved ? '✓' : '…' }}{{ t.transit_code ? ' · Transit ' + (t.transit_approved ? '✓' : '…') : '' }}
                  } @else if (t.arrival_at) {
                    Arrivée {{ t.arrival_at | date: 'dd/MM HH:mm' }}
                  }
                </span>
              </div>
              @if (canDeliver(t)) {
                <button class="hud-btn w-full" (click)="deliver(t)">Confirmer la réception</button>
              }
            </div>
          } @empty {
            <p class="hud-empty">Aucun convoi.</p>
          }
        </div>
      }

      @if (tab === 'create') {
        <form (ngSubmit)="submit()" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="hud-label">
              <span>Quartier source</span>
              <select class="hud-input" name="source" [(ngModel)]="source">
                @for (code of districtCodes; track code) {
                  <option [value]="code">{{ code }}</option>
                }
              </select>
            </label>
            <label class="hud-label">
              <span>Quartier destinataire</span>
              <select class="hud-input" name="target" [(ngModel)]="target" [disabled]="isQc()">
                @for (code of districtCodes; track code) {
                  <option [value]="code">{{ code }}</option>
                }
              </select>
            </label>
            <label class="hud-label">
              <span>Ressource</span>
              <select class="hud-input" name="resource" [(ngModel)]="resource">
                @for (r of context.resourceTypes(); track r.code) {
                  <option [value]="r.code">{{ r.name }}</option>
                }
              </select>
            </label>
            <label class="hud-label">
              <span>Quantité</span>
              <input class="hud-input" type="number" name="quantity" min="1" [(ngModel)]="quantity" required />
            </label>
            <label class="hud-label">
              <span>Route</span>
              <select class="hud-input" name="route" [(ngModel)]="route">
                <option [ngValue]="null">Automatique</option>
                <option ngValue="LAND">Terrestre</option>
                <option ngValue="SEA">Maritime (E, X, Z)</option>
              </select>
            </label>
            @if (isCd()) {
              <label class="hud-label flex items-end gap-2">
                <input type="checkbox" name="requisition" [(ngModel)]="requisition" />
                <span>Réquisition (sans approbation)</span>
              </label>
            }
          </div>
          <div class="hud-card flex justify-between text-[10px]">
            <span class="text-zinc-500">Transférable depuis {{ source }}</span>
            <span class="font-bold text-green-400">{{ transferable() }}</span>
          </div>
          <button type="submit" class="hud-btn w-full py-2" [disabled]="submitting">Envoyer la demande</button>
        </form>
      }
    </div>
  `
})
export class TransfersPanelComponent {
  context = inject(CrisisContextService);
  private auth = inject(AuthService);
  private api = inject(KaijuApiService);

  readonly districtCodes = DISTRICT_CODES;
  readonly isQc = computed(() => this.auth.user()?.role === 'QC');
  readonly isCd = computed(() => this.auth.user()?.role === 'CD');

  tab: 'list' | 'create' = 'list';
  source = 'X';
  target = this.auth.user()?.district ?? 'A';
  resource = 'MEDICAL';
  quantity = 1;
  route: Route | null = null;
  requisition = false;
  submitting = false;
  error = '';

  transferable(): number {
    return this.context.stock(this.source, this.resource)?.transferable ?? 0;
  }

  canDeliver(transfer: Transfer): boolean {
    const user = this.auth.user();
    return transfer.status === 'IN_TRANSIT' && !!user && (user.role !== 'QC' || user.district === transfer.target_code);
  }

  submit(): void {
    this.submitting = true;
    this.error = '';
    this.api
      .createTransfer({
        source: this.source,
        target: this.target,
        resource: this.resource,
        quantity: this.quantity,
        route: this.route,
        requisition: this.isCd() && this.requisition
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.tab = 'list';
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.error = describeError(err);
        }
      });
  }

  deliver(transfer: Transfer): void {
    this.error = '';
    this.api.deliverTransfer(transfer.id).subscribe({
      error: (err: HttpErrorResponse) => (this.error = describeError(err))
    });
  }

  statusClass(transfer: Transfer): string {
    switch (transfer.status) {
      case 'IN_TRANSIT':
        return 'border-sky-500 text-sky-400';
      case 'DELIVERED':
        return 'border-green-500 text-green-400';
      case 'PENDING':
        return 'border-amber-500 text-amber-400';
      default:
        return 'border-red-500 text-red-400';
    }
  }
}
