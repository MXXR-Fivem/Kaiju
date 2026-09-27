import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { KaijuApiService, describeError } from '../../services/kaiju-api.service';
import { Reservation } from '../../models/kaiju.models';

function toLocalInput(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-reservations-panel',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="h-full flex flex-col font-mono text-xs space-y-3">
      @if (error) {
        <div class="hud-error" role="alert" data-testid="reservation-error">{{ error }}</div>
      }

      @if (district()) {
        <form (ngSubmit)="submit()" class="space-y-3">
          <h3 class="hud-title">Nouvelle réservation dans le quartier {{ district() }}</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="hud-label">
              <span>Équipe</span>
              <input class="hud-input" name="team" [(ngModel)]="teamName" required />
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
              <input class="hud-input" type="number" min="1" name="quantity" [(ngModel)]="quantity" required />
            </label>
            <div class="hud-label">
              <span>Disponible</span>
              <div class="p-1.5 text-green-400 font-bold">{{ available() }}</div>
            </div>
            <label class="hud-label">
              <span>Début</span>
              <input class="hud-input" type="datetime-local" name="startsAt" [(ngModel)]="startsAt" required />
            </label>
            <label class="hud-label">
              <span>Fin</span>
              <input class="hud-input" type="datetime-local" name="endsAt" [(ngModel)]="endsAt" required />
            </label>
          </div>
          <button type="submit" class="hud-btn w-full py-2" [disabled]="submitting">Réserver</button>
        </form>
      } @else {
        <p class="hud-empty">Les réservations sont gérées par les coordinateurs de quartier (QC).</p>
      }

      <section class="flex-1 overflow-y-auto space-y-2 pr-1">
        <h3 class="hud-title">Réservations actives</h3>
        @for (r of active(); track r.id) {
          <div class="hud-card flex items-center justify-between" data-testid="reservation-card">
            <div>
              <div class="text-white">[{{ r.district_code }}] {{ r.team_name }} · {{ r.quantity }} × {{ r.resource_name }}</div>
              <div class="text-[10px] text-zinc-500">{{ r.starts_at | date: 'dd/MM HH:mm' }} → {{ r.ends_at | date: 'dd/MM HH:mm' }}</div>
            </div>
            @if (r.district_code === district()) {
              <button class="hud-btn" (click)="giveBack(r)">Restituer</button>
            }
          </div>
        } @empty {
          <p class="hud-empty">Aucune réservation active.</p>
        }
      </section>
    </div>
  `
})
export class ReservationsPanelComponent {
  context = inject(CrisisContextService);
  private auth = inject(AuthService);
  private api = inject(KaijuApiService);

  readonly district = computed(() => (this.auth.user()?.role === 'QC' ? this.auth.user()?.district : null));
  readonly active = computed(() => this.context.reservations().filter((r) => r.status === 'ACTIVE'));

  teamName = '';
  resource = 'MEDICAL';
  quantity = 1;
  startsAt = toLocalInput(new Date());
  endsAt = toLocalInput(new Date(Date.now() + 4 * 3600000));
  submitting = false;
  error = '';

  available(): number {
    const district = this.district();
    return district ? this.context.stock(district, this.resource)?.available ?? 0 : 0;
  }

  submit(): void {
    this.submitting = true;
    this.error = '';
    this.api
      .reserve({
        resource: this.resource,
        team_name: this.teamName,
        quantity: this.quantity,
        starts_at: new Date(this.startsAt).toISOString(),
        ends_at: new Date(this.endsAt).toISOString()
      })
      .subscribe({
        next: () => (this.submitting = false),
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.error = describeError(err);
        }
      });
  }

  giveBack(reservation: Reservation): void {
    this.error = '';
    this.api.returnReservation(reservation.id).subscribe({
      error: (err: HttpErrorResponse) => (this.error = describeError(err))
    });
  }
}
