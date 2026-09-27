import { Component, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { KaijuApiService, describeError } from '../../services/kaiju-api.service';
import { Action, LEVEL_COLORS, LEVEL_LABELS, PERMISSIONS, ROLE_LABELS, Transfer, can } from '../../models/kaiju.models';

@Component({
  selector: 'app-dashboard-panel',
  standalone: true,
  template: `
    @if (auth.user(); as user) {
      <div class="space-y-4 text-xs font-mono" data-testid="dashboard">
        <section class="hud-card">
          <div class="text-green-400 font-bold uppercase" data-testid="dashboard-role">{{ roleLabel() }}</div>
          <div class="text-zinc-400">
            {{ user.username }} · {{ user.district ? 'Quartier ' + user.district : 'Ville entière' }}
          </div>
          <div [style.color]="levelColor(context.cityLevel())">
            Niveau ville {{ context.cityLevel() }} — {{ levelLabel(context.cityLevel()) }}
          </div>
        </section>

        @if (error) {
          <div class="hud-error" role="alert">{{ error }}</div>
        }

        <section>
          <h3 class="hud-title">Vos actions au niveau {{ context.cityLevel() }}</h3>
          <ul class="space-y-0.5">
            @for (permission of permissions; track permission.action) {
              <li [class.text-green-400]="allowed(permission.action)" [class.text-zinc-600]="!allowed(permission.action)">
                {{ allowed(permission.action) ? '✓' : '✗' }} {{ permission.label }}
              </li>
            }
          </ul>
        </section>

        @switch (user.role) {
          @case ('QC') {
            <section>
              <h3 class="hud-title">Demandes à traiter ({{ toReview().length }})</h3>
              @for (t of toReview(); track t.id) {
                <div class="hud-card" data-testid="review-card">
                  <div>
                    {{ t.quantity }} × {{ t.resource_name }} · {{ t.source_code }} → {{ t.target_code }}
                    <span class="text-zinc-500">({{ t.source_code === user.district ? 'source' : 'transit' }}, par {{ t.requester_name }})</span>
                  </div>
                  <div class="flex gap-2">
                    <button class="hud-btn" (click)="review(t, true)">Approuver</button>
                    <button class="hud-btn-danger" (click)="review(t, false)">Refuser</button>
                  </div>
                </div>
              } @empty {
                <p class="hud-empty">Aucune demande en attente.</p>
              }
            </section>
            <section>
              <h3 class="hud-title">Stocks du quartier {{ user.district }}</h3>
              <table class="w-full text-[11px]">
                <tr class="text-zinc-500"><th class="text-left">Ressource</th><th class="text-right">Dispo</th><th class="text-right">Transférable</th></tr>
                @for (s of ownStocks(); track s.resource_code) {
                  <tr><td>{{ s.resource_name }}</td><td class="text-right">{{ s.available }}</td><td class="text-right text-green-400">{{ s.transferable }}</td></tr>
                }
              </table>
            </section>
          }
          @case ('LC') {
            <section>
              <h3 class="hud-title">Chaînes de transit en attente ({{ pendingChains().length }})</h3>
              @for (t of pendingChains(); track t.id) {
                <div class="hud-card">
                  <div>{{ t.quantity }} × {{ t.resource_name }} · {{ t.source_code }} → {{ t.transit_code }} → {{ t.target_code }}</div>
                  <div class="text-zinc-500">
                    Source {{ t.source_approved ? '✓' : '…' }} · Transit {{ t.transit_approved ? '✓' : '…' }}
                  </div>
                </div>
              } @empty {
                <p class="hud-empty">Aucune chaîne de transit en attente.</p>
              }
            </section>
            <section>
              <h3 class="hud-title">Convois en route ({{ inTransit().length }})</h3>
              @for (t of inTransit(); track t.id) {
                <div>{{ t.source_code }} → {{ t.target_code }} · {{ t.quantity }} × {{ t.resource_name }}</div>
              }
            </section>
          }
          @case ('CD') {
            <section>
              <h3 class="hud-title">Sévérité par quartier</h3>
              @for (d of context.districts(); track d.code) {
                <div class="flex justify-between">
                  <span>{{ d.code }} · {{ d.name }}</span>
                  <span [style.color]="levelColor(d.disaster_level)">Niveau {{ d.disaster_level }}</span>
                </div>
              }
            </section>
            <section class="space-y-2">
              <h3 class="hud-title">Prérogatives</h3>
              <div class="text-zinc-400">Seuil de rétention actuel : {{ retentionPct() }} %</div>
              <button class="hud-btn w-full" [disabled]="!allowed('LOWER_RETENTION') || retentionPct() === 15" (click)="lowerRetention()">
                Abaisser la rétention à 15 %
              </button>
              <p class="text-zinc-500">La réquisition se fait depuis la fenêtre Transferts (niveau 4+).</p>
            </section>
          }
        }
      </div>
    }
  `
})
export class DashboardPanelComponent {
  auth = inject(AuthService);
  context = inject(CrisisContextService);
  private api = inject(KaijuApiService);

  readonly permissions = PERMISSIONS;
  error = '';

  readonly roleLabel = computed(() => {
    const user = this.auth.user();
    return user ? `${user.role} — ${ROLE_LABELS[user.role]}` : '';
  });

  readonly toReview = computed(() => {
    const district = this.auth.user()?.district;
    return this.context.transfers().filter(
      (t) =>
        t.status === 'PENDING' &&
        ((t.source_code === district && !t.source_approved) ||
          (t.transit_code === district && t.transit_approved === false))
    );
  });

  readonly ownStocks = computed(() =>
    this.context.stocks().filter((s) => s.district_code === this.auth.user()?.district)
  );

  readonly pendingChains = computed(() =>
    this.context.transfers().filter((t) => t.status === 'PENDING' && t.transit_code)
  );

  readonly inTransit = computed(() => this.context.transfers().filter((t) => t.status === 'IN_TRANSIT'));

  readonly retentionPct = computed(() => this.context.stocks()[0]?.retention_pct ?? 30);

  allowed(action: Action): boolean {
    const user = this.auth.user();
    return !!user && can(action, user.role, this.context.cityLevel());
  }

  levelColor(level: number): string {
    return LEVEL_COLORS[level];
  }

  levelLabel(level: number): string {
    return LEVEL_LABELS[level];
  }

  review(transfer: Transfer, approved: boolean): void {
    this.error = '';
    this.api.reviewTransfer(transfer.id, approved).subscribe({
      error: (err: HttpErrorResponse) => (this.error = describeError(err))
    });
  }

  lowerRetention(): void {
    this.error = '';
    this.api.lowerRetention().subscribe({
      error: (err: HttpErrorResponse) => (this.error = describeError(err))
    });
  }
}
